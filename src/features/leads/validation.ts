import { isLocale } from "@/i18n/config";
import {
  leadSources,
  type LeadFieldErrors,
  type LeadSource,
  type LeadSubmission,
} from "@/features/leads/types";
import { PRIVACY_NOTICE } from "@/config/privacy";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const telegramPattern = /^[A-Za-z0-9_]{5,32}$/;
const phoneCharacters = /^[+0-9\s().-]+$/;
const controlCharacters = /[\u0000-\u001f\u007f]/;

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function normalizedText(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}

export function normalizePhone(value: string): string | null {
  const input = value.trim();
  if (input.length > 32 || !phoneCharacters.test(input)) return null;
  const digits = input.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return input.startsWith("+") ? `+${digits}` : digits;
}

export function normalizeTelegramUsername(value: string): string | null {
  const input = value.trim().replace(/^@/, "");
  if (!input) return null;
  return telegramPattern.test(input) ? `@${input}` : null;
}

export type LeadValidationResult =
  | { ok: true; data: LeadSubmission }
  | { ok: false; fieldErrors: LeadFieldErrors };

export function validateLeadPayload(value: unknown): LeadValidationResult {
  const body =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  const fieldErrors: LeadFieldErrors = {};

  const rawName = text(body.name) ?? "";
  const name = normalizedText(rawName);
  if (!name) fieldErrors.name = "required";
  else if (name.length < 2 || name.length > 100 || controlCharacters.test(name))
    fieldErrors.name = name.length > 100 ? "too_long" : "invalid";

  const rawPhone = text(body.phone) ?? "";
  const phone = normalizePhone(rawPhone);
  if (!rawPhone.trim()) fieldErrors.phone = "required";
  else if (!phone) fieldErrors.phone = "invalid";

  const rawTelegram = text(body.telegram) ?? "";
  const telegramUsername = normalizeTelegramUsername(rawTelegram);
  if (rawTelegram.trim() && !telegramUsername) {
    fieldErrors.telegram = "invalid";
  }

  const rawComment = text(body.comment) ?? "";
  const comment = rawComment.normalize("NFKC").trim();
  if (comment.length > 2000 || controlCharacters.test(comment)) {
    fieldErrors.comment = comment.length > 2000 ? "too_long" : "invalid";
  }

  if (body.consent !== true) fieldErrors.consent = "consent_required";

  const locale = text(body.locale) ?? "";
  const source = text(body.source) ?? "";
  const sourcePath = text(body.sourcePath) ?? "";
  const productId = text(body.productId);
  if (!isLocale(locale)) fieldErrors.product = "invalid";
  if (!leadSources.includes(source as LeadSource)) {
    fieldErrors.product = "invalid";
  }
  if (
    !isLocale(locale) ||
    sourcePath.length > 500 ||
    !(sourcePath === `/${locale}` || sourcePath.startsWith(`/${locale}/`)) ||
    sourcePath.startsWith("//") ||
    controlCharacters.test(sourcePath) ||
    sourcePath.includes("?") ||
    sourcePath.includes("#")
  ) {
    fieldErrors.product = "invalid";
  }
  if (productId && !uuidPattern.test(productId)) {
    fieldErrors.product = "invalid";
  }

  if (Object.keys(fieldErrors).length || !phone || !isLocale(locale)) {
    return { ok: false, fieldErrors };
  }
  return {
    ok: true,
    data: {
      locale,
      source: source as LeadSource,
      sourcePath,
      name,
      phone,
      telegramUsername,
      comment: comment || null,
      productId: productId || null,
      privacyNoticeVersion: PRIVACY_NOTICE.storageVersion,
    },
  };
}

export function isUuid(value: string): boolean {
  return uuidPattern.test(value);
}
