import { isLocale, type Locale } from "@/i18n/config";
import type {
  AssistantHistoryMessage,
  AssistantPageContext,
  AssistantRequest,
} from "@/features/assistant/types";

const MAX_QUESTION = 600;
const MAX_HISTORY = 6;
const MAX_HISTORY_CHARS = 1_800;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanText(value: unknown, maximum: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.length > 0 && normalized.length <= maximum
    ? normalized
    : null;
}

/*
 * The page context is a closed shape: unknown keys, a foreign type or an
 * identifier that is not a UUID are rejected rather than repaired. An absent
 * field and an explicit null both mean "no page context".
 */
function readPageContext(
  value: unknown,
): { ok: true; page: AssistantPageContext | undefined } | { ok: false } {
  if (value === undefined || value === null)
    return { ok: true, page: undefined };
  if (!value || typeof value !== "object" || Array.isArray(value))
    return { ok: false };
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => key !== "type" && key !== "id"))
    return { ok: false };
  if (record.type !== "product" && record.type !== "category")
    return { ok: false };
  if (typeof record.id !== "string" || !UUID_PATTERN.test(record.id))
    return { ok: false };
  return { ok: true, page: { type: record.type, id: record.id } };
}

export function validateAssistantPayload(
  value: unknown,
): { ok: true; data: AssistantRequest } | { ok: false } {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return { ok: false };
  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).some(
      (key) => !["locale", "question", "history", "page"].includes(key),
    )
  )
    return { ok: false };
  const page = readPageContext(record.page);
  if (!page.ok) return { ok: false };
  if (typeof record.locale !== "string" || !isLocale(record.locale))
    return { ok: false };
  const question = cleanText(record.question, MAX_QUESTION);
  if (
    !question ||
    !Array.isArray(record.history) ||
    record.history.length > MAX_HISTORY
  )
    return { ok: false };
  let count = 0;
  const history: AssistantHistoryMessage[] = [];
  for (const item of record.history) {
    if (!item || typeof item !== "object" || Array.isArray(item))
      return { ok: false };
    const message = item as Record<string, unknown>;
    if (Object.keys(message).some((key) => key !== "role" && key !== "content"))
      return { ok: false };
    if (message.role !== "user" && message.role !== "assistant")
      return { ok: false };
    const content = cleanText(message.content, 400);
    if (!content) return { ok: false };
    count += content.length;
    if (count > MAX_HISTORY_CHARS) return { ok: false };
    history.push({ role: message.role, content });
  }
  return {
    ok: true,
    data: {
      locale: record.locale as Locale,
      question,
      history,
      ...(page.page ? { page: page.page } : {}),
    },
  };
}
