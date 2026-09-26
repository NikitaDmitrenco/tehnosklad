import { randomUUID } from "node:crypto";

import type { AdminAttributeDataType } from "@/features/admin/types";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const codePattern = /^[a-z][a-z0-9_]*$/;

export class AdminValidationError extends Error {
  constructor(public readonly field = "form") {
    super("validation");
  }
}

export function requiredText(
  formData: FormData,
  name: string,
  min: number,
  max: number,
): string {
  const value = String(formData.get(name) ?? "").trim();
  if (value.length < min || value.length > max)
    throw new AdminValidationError(name);
  return value;
}

export function optionalText(
  formData: FormData,
  name: string,
  max: number,
): string | null {
  const value = String(formData.get(name) ?? "").trim();
  if (!value) return null;
  if (value.length > max) throw new AdminValidationError(name);
  return value;
}

export function uuidValue(value: FormDataEntryValue | null, field: string) {
  const parsed = String(value ?? "");
  if (!uuidPattern.test(parsed)) throw new AdminValidationError(field);
  return parsed;
}

export function optionalUuidValue(
  value: FormDataEntryValue | null,
  field: string,
) {
  const parsed = String(value ?? "");
  if (!parsed) return null;
  return uuidValue(value, field);
}

export function integerValue(
  value: FormDataEntryValue | null,
  field: string,
  min = 0,
  max = 1_000_000,
): number {
  const raw = String(value ?? "");
  if (!/^\d+$/.test(raw)) throw new AdminValidationError(field);
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max)
    throw new AdminValidationError(field);
  return parsed;
}

export function localeValue(formData: FormData, name: string): "ru" | "ro" {
  const value = String(formData.get(name) ?? "");
  if (value !== "ru" && value !== "ro") throw new AdminValidationError(name);
  return value;
}

export function checkboxValue(formData: FormData, name: string): boolean {
  return formData.get(name) === "on";
}

export function slugValue(formData: FormData, name: string, max = 220) {
  const value = requiredText(formData, name, 1, max);
  if (!slugPattern.test(value)) throw new AdminValidationError(name);
  return value;
}

export function codeValue(formData: FormData, name: string) {
  const value = requiredText(formData, name, 1, 80);
  if (!codePattern.test(value)) throw new AdminValidationError(name);
  return value;
}

export function moneyToMinor(value: FormDataEntryValue | null): string {
  const normalized = String(value ?? "")
    .trim()
    .replace(",", ".");
  const match = normalized.match(/^(0|[1-9]\d{0,12})(?:\.(\d{1,2}))?$/);
  if (!match) throw new AdminValidationError("price");
  const minor =
    BigInt(match[1]!) * BigInt(100) +
    BigInt((match[2] ?? "").padEnd(2, "0") || "0");
  if (minor > BigInt("9007199254740991"))
    throw new AdminValidationError("price");
  return minor.toString();
}

export function minorToMoney(value: string | number | null): string {
  if (value === null) return "";
  const minor = BigInt(String(value));
  const whole = minor / BigInt(100);
  const cents = (minor % BigInt(100)).toString().padStart(2, "0");
  return cents === "00" ? whole.toString() : `${whole}.${cents}`;
}

export function optionalMoneyToMinor(
  value: FormDataEntryValue | null,
): string | null {
  return String(value ?? "").trim() ? moneyToMinor(value) : null;
}

export function attributeDataType(value: FormDataEntryValue | null) {
  const allowed: AdminAttributeDataType[] = [
    "text",
    "number",
    "boolean",
    "single_select",
    "multi_select",
    "color",
  ];
  const parsed = String(value ?? "") as AdminAttributeDataType;
  if (!allowed.includes(parsed)) throw new AdminValidationError("dataType");
  return parsed;
}

const allowedImages = {
  "image/jpeg": { extension: "jpg", signatures: [[0xff, 0xd8, 0xff]] },
  "image/png": { extension: "png", signatures: [[0x89, 0x50, 0x4e, 0x47]] },
  "image/webp": { extension: "webp", signatures: [[0x52, 0x49, 0x46, 0x46]] },
  "image/avif": { extension: "avif", signatures: [[0x00, 0x00, 0x00]] },
} as const;

export async function validateProductImage(file: File) {
  const definition = allowedImages[file.type as keyof typeof allowedImages];
  if (!definition || file.size < 12 || file.size > 5 * 1024 * 1024)
    throw new AdminValidationError("image");
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const signatureMatches = definition.signatures.some((signature) =>
    signature.every((byte, index) => header[index] === byte),
  );
  const containerMatches =
    file.type === "image/webp"
      ? new TextDecoder().decode(header.slice(8, 12)) === "WEBP"
      : file.type === "image/avif"
        ? new TextDecoder().decode(header.slice(4, 12)).includes("ftyp")
        : true;
  if (!signatureMatches || !containerMatches)
    throw new AdminValidationError("image");
  return { extension: definition.extension, mimeType: file.type };
}

export function createProductImagePath(productId: string, extension: string) {
  if (
    !uuidPattern.test(productId) ||
    !["jpg", "png", "webp", "avif"].includes(extension)
  )
    throw new AdminValidationError("imagePath");
  return `${productId}/${randomUUID()}.${extension}`;
}

export function createCategoryImagePath(extension: string) {
  if (!["jpg", "png", "webp", "avif"].includes(extension))
    throw new AdminValidationError("imagePath");
  return `categories/${randomUUID()}.${extension}`;
}

export function isUuid(value: string) {
  return uuidPattern.test(value);
}
