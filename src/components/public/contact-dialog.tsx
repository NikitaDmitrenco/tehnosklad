"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { CopyPhoneButton } from "@/components/public/copy-phone-button";
import type { PublicSiteSettings } from "@/features/catalog/types";
import type {
  LeadField,
  LeadFieldErrors,
  LeadSource,
} from "@/features/leads/types";
import { validateLeadPayload } from "@/features/leads/validation";
import { localizedPath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

type Errors = Partial<Record<LeadField, string>>;
type SubmitState = "idle" | "submitting" | "success" | "error";

function localizedErrors(
  errors: LeadFieldErrors,
  dictionary: Dictionary,
): Errors {
  const result: Errors = {};
  for (const [field, code] of Object.entries(errors) as Array<
    [LeadField, LeadFieldErrors[LeadField]]
  >) {
    if (field === "name") {
      result.name =
        code === "required"
          ? dictionary.contactModal.required
          : dictionary.contactModal.nameError;
    } else if (field === "phone") {
      result.phone = dictionary.contactModal.phoneError;
    } else if (field === "telegram") {
      result.telegram = dictionary.contactModal.telegramError;
    } else if (field === "comment") {
      result.comment = dictionary.contactModal.commentError;
    } else if (field === "consent") {
      result.consent = dictionary.contactModal.consentError;
    }
  }
  return result;
}

type LeadApiResponse = {
  ok?: boolean;
  code?: string;
  fieldErrors?: LeadFieldErrors;
};

export function ContactDialog({
  dictionary,
  locale,
  source,
  product,
  settings,
  onClose,
}: {
  dictionary: Dictionary;
  locale: Locale;
  source: LeadSource;
  product?: { id: string; name: string };
  settings: PublicSiteSettings;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const submittingRef = useRef(false);
  const requestIdRef = useRef<string | null>(null);
  const [tab, setTab] = useState<"now" | "request">("now");
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<SubmitState>("idle");
  const [requestError, setRequestError] = useState<string | null>(null);
  const submitting = state === "submitting";

  useEffect(() => {
    closeRef.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submittingRef.current) onClose();
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            "button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled])",
          ),
        );
        const first = focusable[0];
        const last = focusable.at(-1);
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
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);

  useEffect(() => {
    if (state === "success") successRef.current?.focus();
  }, [state]);

  function focusFirstError() {
    requestAnimationFrame(() => {
      dialogRef.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    const data = new FormData(event.currentTarget);
    const payload = {
      name: String(data.get("name") ?? ""),
      phone: String(data.get("phone") ?? ""),
      telegram: String(data.get("telegram") ?? ""),
      comment: String(data.get("comment") ?? ""),
      consent: data.get("consent") === "on",
      companyWebsite: String(data.get("companyWebsite") ?? ""),
      locale,
      source,
      sourcePath: pathname || localizedPath(locale),
      productId: product?.id ?? null,
    };
    const validation = validateLeadPayload(payload);
    if (!validation.ok) {
      setErrors(localizedErrors(validation.fieldErrors, dictionary));
      setRequestError(null);
      setState("idle");
      focusFirstError();
      return;
    }

    submittingRef.current = true;
    setErrors({});
    setRequestError(null);
    setState("submitting");
    requestIdRef.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": requestIdRef.current,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(12_000),
      });
      const result = (await response
        .json()
        .catch(() => ({}))) as LeadApiResponse;
      if (response.ok && result.ok === true) {
        setState("success");
        return;
      }
      if (result.code === "validation_error" && result.fieldErrors) {
        setErrors(localizedErrors(result.fieldErrors, dictionary));
        setRequestError(
          result.fieldErrors.product
            ? dictionary.contactModal.genericError
            : null,
        );
        setState("error");
        focusFirstError();
        return;
      }
      setRequestError(
        result.code === "rate_limited"
          ? dictionary.contactModal.rateLimited
          : dictionary.contactModal.genericError,
      );
      setState("error");
    } catch {
      setRequestError(dictionary.contactModal.genericError);
      setState("error");
    } finally {
      submittingRef.current = false;
    }
  }

  return (
    <div
      className="fixed inset-0 z-70 flex items-end justify-center bg-black/45 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:items-center"
      role="presentation"
    >
      <div
        aria-labelledby="contact-dialog-title"
        aria-modal="true"
        ref={dialogRef}
        className="max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto overscroll-contain rounded-2xl bg-white p-5 shadow-2xl sm:p-7"
        role="dialog"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id="contact-dialog-title" className="text-2xl font-black">
            {dictionary.contactModal.title}
          </h2>
          <button
            ref={closeRef}
            aria-label={dictionary.actions.close}
            className="icon-button"
            disabled={submitting}
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        {state === "success" ? (
          <div className="py-10 text-center" role="status">
            <h3 className="text-2xl font-black" ref={successRef} tabIndex={-1}>
              {dictionary.contactModal.successTitle}
            </h3>
            <p className="mt-3 text-stone-600">
              {dictionary.contactModal.success}
            </p>
            <button
              className="button-primary mt-7"
              type="button"
              onClick={onClose}
            >
              {dictionary.actions.close}
            </button>
          </div>
        ) : (
          <>
            <div
              aria-label={dictionary.contactModal.title}
              className="mt-5 grid grid-cols-2 rounded-xl bg-stone-100 p-1"
              role="tablist"
            >
              <button
                aria-controls="contact-now-panel"
                aria-selected={tab === "now"}
                className={`min-h-[1.875rem] rounded-[100vmax] font-bold ${tab === "now" ? "bg-white shadow-sm" : ""}`}
                disabled={submitting}
                role="tab"
                type="button"
                onClick={() => setTab("now")}
              >
                {dictionary.contactModal.now}
              </button>
              <button
                aria-controls="contact-request-panel"
                aria-selected={tab === "request"}
                className={`min-h-[1.875rem] rounded-[100vmax] font-bold ${tab === "request" ? "bg-white shadow-sm" : ""}`}
                disabled={submitting}
                role="tab"
                type="button"
                onClick={() => setTab("request")}
              >
                {dictionary.contactModal.request}
              </button>
            </div>
            {tab === "now" ? (
              <div
                className="space-y-5 py-6"
                id="contact-now-panel"
                role="tabpanel"
              >
                <div>
                  <p className="text-sm font-bold text-stone-500">
                    {dictionary.contactModal.phoneTitle}
                  </p>
                  <a
                    className="mt-1 block text-2xl font-black hover:underline"
                    href={settings.phoneHref}
                  >
                    {settings.phoneDisplay}
                  </a>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a className="button-primary" href={settings.phoneHref}>
                    {dictionary.actions.call}
                  </a>
                  <CopyPhoneButton
                    copy={dictionary.actions.copy}
                    copied={dictionary.actions.copied}
                    phone={settings.phoneDisplay}
                  />
                </div>
                <div className="rounded-xl bg-stone-100 p-4">
                  <p className="font-bold">
                    {dictionary.contactModal.hoursTitle}
                  </p>
                  <p className="mt-1 text-stone-600">
                    {settings.openDays}: {settings.openTime}
                  </p>
                  <p className="text-stone-600">{settings.closedDay}</p>
                </div>
              </div>
            ) : (
              <form
                aria-busy={submitting}
                className="space-y-4 py-6"
                id="contact-request-panel"
                onSubmit={submit}
                role="tabpanel"
              >
                <p className="text-sm text-stone-600">
                  {product?.name ?? dictionary.contactModal.formTitle}
                </p>
                <label className="field-label">
                  {dictionary.contactModal.name}
                  <input
                    aria-describedby={
                      errors.name ? "lead-name-error" : undefined
                    }
                    aria-invalid={Boolean(errors.name)}
                    autoComplete="name"
                    className="field"
                    disabled={submitting}
                    maxLength={100}
                    name="name"
                  />
                  {errors.name ? (
                    <span className="field-error" id="lead-name-error">
                      {errors.name}
                    </span>
                  ) : null}
                </label>
                <label className="field-label">
                  {dictionary.contactModal.phone}
                  <input
                    aria-describedby={
                      errors.phone ? "lead-phone-error" : undefined
                    }
                    aria-invalid={Boolean(errors.phone)}
                    autoComplete="tel"
                    className="field"
                    disabled={submitting}
                    inputMode="tel"
                    maxLength={32}
                    name="phone"
                    type="tel"
                  />
                  {errors.phone ? (
                    <span className="field-error" id="lead-phone-error">
                      {errors.phone}
                    </span>
                  ) : null}
                </label>
                <label className="field-label">
                  {dictionary.contactModal.telegram}
                  <input
                    aria-describedby={
                      errors.telegram ? "lead-telegram-error" : undefined
                    }
                    aria-invalid={Boolean(errors.telegram)}
                    autoComplete="off"
                    className="field"
                    disabled={submitting}
                    maxLength={33}
                    name="telegram"
                  />
                  {errors.telegram ? (
                    <span className="field-error" id="lead-telegram-error">
                      {errors.telegram}
                    </span>
                  ) : null}
                </label>
                <label className="field-label">
                  {dictionary.contactModal.comment}
                  <textarea
                    aria-describedby={
                      errors.comment ? "lead-comment-error" : undefined
                    }
                    aria-invalid={Boolean(errors.comment)}
                    className="field min-h-24"
                    disabled={submitting}
                    maxLength={2000}
                    name="comment"
                  />
                  {errors.comment ? (
                    <span className="field-error" id="lead-comment-error">
                      {errors.comment}
                    </span>
                  ) : null}
                </label>
                <div
                  aria-hidden="true"
                  className="absolute -left-[10000px] h-px w-px overflow-hidden"
                >
                  <label>
                    Company website
                    <input
                      autoComplete="off"
                      name="companyWebsite"
                      tabIndex={-1}
                    />
                  </label>
                </div>
                <label className="flex min-h-[1.875rem] cursor-pointer gap-3 rounded-[100vmax] p-1 text-sm focus-within:bg-amber-50">
                  <input
                    aria-describedby={
                      errors.consent ? "lead-consent-error" : undefined
                    }
                    aria-invalid={Boolean(errors.consent)}
                    className="mt-0.5 size-5 shrink-0 accent-stone-950"
                    disabled={submitting}
                    name="consent"
                    type="checkbox"
                  />
                  <span>
                    {dictionary.contactModal.consent}{" "}
                    <Link
                      className="font-semibold underline underline-offset-2"
                      href={localizedPath(locale, "personal-data")}
                    >
                      {dictionary.footer.personalData}
                    </Link>
                    {" · "}
                    <Link
                      className="font-semibold underline underline-offset-2"
                      href={localizedPath(locale, "privacy")}
                    >
                      {dictionary.footer.privacy}
                    </Link>
                    {errors.consent ? (
                      <span
                        className="field-error block"
                        id="lead-consent-error"
                      >
                        {errors.consent}
                      </span>
                    ) : null}
                  </span>
                </label>
                <button
                  className="button-primary w-full"
                  disabled={submitting}
                  type="submit"
                >
                  {submitting
                    ? dictionary.contactModal.sending
                    : dictionary.contactModal.submit}
                </button>
                {requestError ? (
                  <p
                    className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
                    role="alert"
                  >
                    {requestError}
                  </p>
                ) : null}
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
