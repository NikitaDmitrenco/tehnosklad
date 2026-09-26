"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { ContactDialog } from "@/components/public/contact-dialog";
import { formatPrice } from "@/features/catalog/logic";
import type { PublicSiteSettings } from "@/features/catalog/types";
import { localizedPath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

type Reference = {
  id: string;
  name: string;
  priceMinor: number;
  stockStatus: string;
  url: string;
};
type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  references?: Reference[];
  fallbackUsed?: boolean;
};
type RequestError =
  | { code: "rate_limited"; retryAfterSeconds: number | null }
  | { code: "unavailable" };
type AssistantApiResponse = {
  ok?: boolean;
  code?: string;
  answer?: string;
  references?: unknown;
  fallbackUsed?: boolean;
  retryAfterSeconds?: number;
};
/** Page the visitor is reading, sent to the assistant as extra grounding. */
export type AssistantPageContext = { type: "product" | "category"; id: string };
export type AssistantWidgetProps = {
  locale: Locale;
  dictionary: Dictionary;
  settings: PublicSiteSettings;
  page?: AssistantPageContext | null;
  onClose: () => void;
};

const HISTORY_LIMIT = 6;
const STORED_MESSAGE_LIMIT = 20;
const STORED_BYTES_LIMIT = 32_000;
const WELCOME_ID = "welcome";

let messageCounter = 0;
// Temporary compatibility with the server before the `page` field ships:
// once the endpoint rejects it, the rest of the session skips it.
let pageFieldAccepted = true;

function storageKey(locale: Locale) {
  return `tehnosklad.assistant.${locale}`;
}
function createMessage(
  role: Message["role"],
  content: string,
  extra?: Omit<Message, "id" | "role" | "content">,
): Message {
  messageCounter += 1;
  return {
    id: `${Date.now().toString(36)}-${messageCounter}`,
    role,
    content,
    ...extra,
  };
}
function welcomeMessage(dictionary: Dictionary): Message {
  return {
    id: WELCOME_ID,
    role: "assistant",
    content: dictionary.assistant.welcome,
  };
}
function parseReferences(value: unknown): Reference[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const references = value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const reference = item as Record<string, unknown>;
    if (
      typeof reference.id !== "string" ||
      typeof reference.name !== "string" ||
      typeof reference.url !== "string" ||
      typeof reference.priceMinor !== "number" ||
      typeof reference.stockStatus !== "string"
    )
      return [];
    return [
      {
        id: reference.id,
        name: reference.name,
        url: reference.url,
        priceMinor: reference.priceMinor,
        stockStatus: reference.stockStatus,
      },
    ];
  });
  return references.length > 0 ? references : undefined;
}
function parseMessage(value: unknown): Message | null {
  if (!value || typeof value !== "object") return null;
  const message = value as Record<string, unknown>;
  if (
    typeof message.id !== "string" ||
    typeof message.content !== "string" ||
    (message.role !== "user" && message.role !== "assistant")
  )
    return null;
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    references: parseReferences(message.references),
    fallbackUsed: message.fallbackUsed === true,
  };
}
// Session storage keeps the conversation across open/close of the widget.
// Private browsing modes may throw on every access, so nothing here may fail.
function readStoredMessages(locale: Locale): Message[] | null {
  try {
    const raw = window.sessionStorage.getItem(storageKey(locale));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const messages = parsed
      .map(parseMessage)
      .filter((message): message is Message => message !== null)
      .slice(-STORED_MESSAGE_LIMIT);
    return messages.length > 0 ? messages : null;
  } catch {
    return null;
  }
}
function writeStoredMessages(locale: Locale, messages: Message[]) {
  try {
    let stored = messages.slice(-STORED_MESSAGE_LIMIT);
    let payload = JSON.stringify(stored);
    while (stored.length > 1 && payload.length > STORED_BYTES_LIMIT) {
      stored = stored.slice(1);
      payload = JSON.stringify(stored);
    }
    if (payload.length > STORED_BYTES_LIMIT) {
      window.sessionStorage.removeItem(storageKey(locale));
      return;
    }
    window.sessionStorage.setItem(storageKey(locale), payload);
  } catch {
    // Storage is unavailable or full: the conversation stays in memory only.
  }
}
function clearStoredMessages(locale: Locale) {
  try {
    window.sessionStorage.removeItem(storageKey(locale));
  } catch {
    // Nothing to clean up when storage is unavailable.
  }
}
function availabilityLabel(stockStatus: string, dictionary: Dictionary) {
  if (stockStatus === "in_stock") return dictionary.common.inStock;
  if (stockStatus === "on_order") return dictionary.common.onOrder;
  return dictionary.common.outOfStock;
}
function referencePrice(priceMinor: number, locale: Locale) {
  return Number.isSafeInteger(priceMinor) && priceMinor >= 0
    ? formatPrice(priceMinor, locale)
    : null;
}
function errorText(error: RequestError, dictionary: Dictionary) {
  if (error.code !== "rate_limited") return dictionary.assistant.unavailable;
  return error.retryAfterSeconds && error.retryAfterSeconds > 0
    ? dictionary.assistant.rateLimitedSeconds.replace(
        "{seconds}",
        String(Math.ceil(error.retryAfterSeconds)),
      )
    : dictionary.assistant.rateLimited;
}

export function AssistantWidget({
  locale,
  dictionary,
  settings,
  page,
  onClose,
}: AssistantWidgetProps) {
  const [messages, setMessages] = useState<Message[]>(
    () => readStoredMessages(locale) ?? [welcomeMessage(dictionary)],
  );
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<RequestError | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const controller = useRef<AbortController | null>(null);
  const lastQuestion = useRef("");
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      // The lead form on top runs its own escape handling and focus trap.
      if (contactOpen) return;
      if (event.key === "Escape" && !pending) onClose();
      if (event.key === "Tab" && dialog.current) {
        const nodes = Array.from(
          dialog.current.querySelectorAll<HTMLElement>(
            "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
          ),
        );
        const first = nodes[0],
          last = nodes.at(-1);
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [contactOpen, onClose, pending]);
  useEffect(() => {
    // Focus moves to the dialog once, never on later state changes.
    dialog.current?.querySelector<HTMLElement>("button")?.focus();
  }, []);
  useEffect(() => {
    writeStoredMessages(locale, messages);
  }, [locale, messages]);
  useEffect(() => {
    const node = list.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, pending, error]);
  function close() {
    if (pending) return;
    onClose();
  }
  function cancelAndClose() {
    controller.current?.abort();
    onClose();
  }
  function clearConversation() {
    controller.current?.abort();
    controller.current = null;
    clearStoredMessages(locale);
    setMessages([welcomeMessage(dictionary)]);
    setQuestion("");
    setPending(false);
    setError(null);
    lastQuestion.current = "";
  }
  const ask = useCallback(
    async function ask(text: string, options?: { echo?: boolean }) {
      const trimmed = text.trim();
      if (!trimmed || pending) return;
      const echo = options?.echo ?? true;
      lastQuestion.current = trimmed;
      // On a retry the failed question is already the last rendered message.
      const previous = echo ? messages : messages.slice(0, -1);
      const history = previous
        .slice(-HISTORY_LIMIT)
        .map(({ role, content }) => ({ role, content }));
      if (echo)
        setMessages((current) => [...current, createMessage("user", trimmed)]);
      setQuestion("");
      setPending(true);
      setError(null);
      const requestController = new AbortController();
      controller.current = requestController;
      const send = async (withPage: boolean) => {
        const response = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locale,
            question: trimmed,
            history,
            ...(withPage && page ? { page } : {}),
          }),
          signal: requestController.signal,
        });
        const data = (await response
          .json()
          .catch(() => ({}))) as AssistantApiResponse;
        return { response, data };
      };
      try {
        const withPage = Boolean(page) && pageFieldAccepted;
        let { response, data } = await send(withPage);
        // Temporary compatibility: the `page` field is accepted only after the
        // server-side change lands, until then it fails payload validation.
        if (withPage && !response.ok && data.code === "validation_error") {
          pageFieldAccepted = false;
          ({ response, data } = await send(false));
        }
        if (!response.ok || data.ok !== true) {
          setError(
            data.code === "rate_limited"
              ? {
                  code: "rate_limited",
                  retryAfterSeconds:
                    typeof data.retryAfterSeconds === "number"
                      ? data.retryAfterSeconds
                      : null,
                }
              : { code: "unavailable" },
          );
          return;
        }
        setMessages((current) => [
          ...current,
          createMessage("assistant", String(data.answer ?? ""), {
            references: parseReferences(data.references),
            fallbackUsed: data.fallbackUsed === true,
          }),
        ]);
      } catch (requestError) {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return;
        }
        setError({ code: "unavailable" });
      } finally {
        if (controller.current === requestController) {
          setPending(false);
          controller.current = null;
        }
      }
    },
    [locale, messages, page, pending],
  );
  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(question);
  }
  function handleQuestionKeyDown(
    event: ReactKeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (event.nativeEvent.isComposing) return;
    event.preventDefault();
    void ask(question);
  }
  const discussedProduct = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const reference = messages[index]?.references?.[0];
      if (reference) return { id: reference.id, name: reference.name };
    }
    return undefined;
  }, [messages]);
  // Only the newest answer, the loading note and the error live inside the
  // polite region, so screen readers announce them instead of re-reading the
  // whole conversation on every update.
  const liveFrom =
    messages.at(-1)?.role === "assistant"
      ? messages.length - 1
      : messages.length;
  const showQuickQuestions = messages.every(
    (message) => message.role === "assistant",
  );
  const renderMessage = (message: Message) => (
    <div
      key={message.id}
      className={message.role === "user" ? "text-right" : "text-left"}
    >
      <p className="inline-block rounded-xl bg-stone-100 px-3 py-2 text-sm">
        {message.content}
      </p>
      {message.fallbackUsed ? (
        <p className="mt-1 text-xs text-stone-500">
          {dictionary.assistant.fallback}
        </p>
      ) : null}
      {message.references?.map((reference) => {
        const price = referencePrice(reference.priceMinor, locale);
        return (
          <Link
            key={reference.id}
            href={reference.url}
            aria-label={`${dictionary.assistant.product}: ${reference.name}`}
            className="mt-2 block rounded-lg border p-2 text-sm font-medium hover:bg-stone-50"
          >
            {reference.name}
            {price ? (
              <span className="ml-2 text-stone-600">{price}</span>
            ) : null}
            <span className="mt-1 block text-xs font-normal text-stone-600">
              {availabilityLabel(reference.stockStatus, dictionary)}
            </span>
          </Link>
        );
      })}
    </div>
  );
  return (
    <>
      <div
        className="fixed inset-0 z-60 flex items-end justify-center bg-black/40 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:items-center"
        role="presentation"
      >
        <section
          ref={dialog}
          role="dialog"
          aria-modal="true"
          aria-label={dictionary.assistant.title}
          className="flex max-h-[min(88dvh,640px)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-2xl"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold">{dictionary.assistant.title}</h2>
            <button
              type="button"
              onClick={close}
              aria-label={dictionary.assistant.close}
              className="icon-button shrink-0"
            >
              ×
            </button>
          </div>
          <p className="mt-2 text-xs text-stone-600">
            {dictionary.assistant.disclaimer}
          </p>
          <div
            className="mt-3 min-h-24 flex-1 space-y-3 overflow-y-auto"
            ref={list}
          >
            {showQuickQuestions ? (
              <div className="flex flex-wrap gap-2">
                {dictionary.assistant.quickQuestions.map((quick) => (
                  <button
                    className="min-h-[1.875rem] rounded-full border px-3 py-2 text-left text-xs font-medium"
                    key={quick}
                    onClick={() => void ask(quick)}
                    type="button"
                  >
                    {quick}
                  </button>
                ))}
              </div>
            ) : null}
            {messages.slice(0, liveFrom).map(renderMessage)}
            <div aria-live="polite" className="space-y-3">
              {messages.slice(liveFrom).map(renderMessage)}
              {pending ? (
                <p className="text-sm text-stone-600">
                  {dictionary.assistant.loading}
                </p>
              ) : null}
              {error ? (
                <div className="space-y-2">
                  <p className="text-sm text-red-700">
                    {errorText(error, dictionary)}
                  </p>
                  {lastQuestion.current ? (
                    <button
                      className="underline text-sm"
                      disabled={pending}
                      onClick={() =>
                        void ask(lastQuestion.current, { echo: false })
                      }
                      type="button"
                    >
                      {dictionary.assistant.retry}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          <form className="mt-3 flex items-start gap-2" onSubmit={submit}>
            <div className="min-w-0 flex-1">
              <textarea
                aria-label={dictionary.assistant.placeholder}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={handleQuestionKeyDown}
                maxLength={600}
                rows={2}
                placeholder={dictionary.assistant.placeholder}
                className="min-h-[40px] max-h-[287px] w-full resize-y rounded border p-2 text-sm"
              />
            </div>
            <button type="submit" disabled={pending} className="button-primary">
              {dictionary.assistant.send}
            </button>
          </form>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <button
              type="button"
              onClick={cancelAndClose}
              className="underline"
            >
              {dictionary.assistant.cancel}
            </button>
            <button
              type="button"
              onClick={clearConversation}
              className="underline"
            >
              {dictionary.assistant.clear}
            </button>
            <Link
              className="underline"
              href={localizedPath(locale, "catalog")}
              onClick={cancelAndClose}
            >
              {dictionary.assistant.catalog}
            </Link>
            <button
              className="underline"
              onClick={() => setContactOpen(true)}
              type="button"
            >
              {dictionary.assistant.leaveRequest}
            </button>
          </div>
        </section>
      </div>
      {contactOpen ? (
        <ContactDialog
          dictionary={dictionary}
          locale={locale}
          settings={settings}
          source="assistant"
          product={discussedProduct}
          onClose={() => setContactOpen(false)}
        />
      ) : null}
    </>
  );
}
