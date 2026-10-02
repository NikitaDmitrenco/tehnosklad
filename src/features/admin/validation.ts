import { randomUUID } from "node:crypto";

import { AdminDataError, type AdminErrorParams } from "@/features/admin/errors";
import {
  checkImageFileSize,
  checkImageFileType,
  resolveMimeType,
} from "@/features/admin/image-check";
import type { AdminAttributeDataType } from "@/features/admin/types";
import { codeLimit, imageLimits, productLimits } from "@/lib/limits";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const codePattern = /^[a-z][a-z0-9_]*$/;

// Extends AdminDataError so the redirect serializes the specific code (and
// its limit/actual params) instead of collapsing everything into the generic
// "validation" banner. `field` names the offending form control.
export class AdminValidationError extends AdminDataError {
  constructor(
    public readonly field = "form",
    code = "validation",
    params: AdminErrorParams = {},
  ) {
    super(code, "validation", { field, ...params });
    this.name = "AdminValidationError";
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

export function slugValue(
  formData: FormData,
  name: string,
  max: number = productLimits.slug,
) {
  const value = requiredText(formData, name, 1, max);
  if (!slugPattern.test(value)) throw new AdminValidationError(name);
  return value;
}

export function codeValue(formData: FormData, name: string) {
  const value = requiredText(formData, name, 1, codeLimit);
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
  "image/jpeg": { extension: "jpg", format: "jpeg" },
  "image/png": { extension: "png", format: "png" },
  "image/webp": { extension: "webp", format: "webp" },
  "image/avif": { extension: "avif", format: "avif" },
} as const;

// Coarse format sniffing from the first bytes. Returns null when the bytes
// are not a recognisable image at all (text, random data…).
function detectImageFormat(header: Uint8Array): string | null {
  const ascii = (start: number, end: number) =>
    new TextDecoder().decode(header.slice(start, end));
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff)
    return "jpeg";
  if (
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47
  )
    return "png";
  if (ascii(0, 4) === "GIF8") return "gif";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  if (ascii(4, 8) === "ftyp") {
    const brand = ascii(8, 12);
    if (brand.startsWith("avif") || brand.startsWith("avis")) return "avif";
    if (
      brand.startsWith("heic") ||
      brand.startsWith("heix") ||
      brand.startsWith("hevc") ||
      brand.startsWith("hevx")
    )
      return "heic";
    return "ftyp"; // ISO-BMFF with an unknown brand (e.g. mif1)
  }
  return null;
}

export async function validateProductImage(file: File) {
  const sizeProblem = checkImageFileSize(file);
  if (sizeProblem)
    throw new AdminValidationError(
      "image",
      sizeProblem.code,
      sizeProblem.params,
    );
  const typeProblem = checkImageFileType(file);
  if (typeProblem)
    throw new AdminValidationError(
      "image",
      typeProblem.code,
      typeProblem.params,
    );

  const mimeType = resolveMimeType(file.name, file.type);
  const definition =
    allowedImages[mimeType as keyof typeof allowedImages] ??
    allowedImages["image/png"];
  const header = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const detected = detectImageFormat(header);
  // Bytes are not an image at all, or they are a different format than the
  // extension/MIME claims (GIF named .png, PNG named .jpg, HEIC, …).
  const formatMismatch =
    detected === null ||
    (detected !== definition.format &&
      !(detected === "ftyp" && definition.format === "avif"));
  if (formatMismatch)
    throw new AdminValidationError("image", "upload_extension_mismatch");
  return { extension: definition.extension, mimeType };
}

export function createProductImagePath(productId: string, extension: string) {
  if (
    !uuidPattern.test(productId) ||
    !imageLimits.extensions.includes(extension)
  )
    throw new AdminValidationError("imagePath");
  return `${productId}/${randomUUID()}.${extension}`;
}

export function createCategoryImagePath(extension: string) {
  if (!imageLimits.extensions.includes(extension))
    throw new AdminValidationError("imagePath");
  return `categories/${randomUUID()}.${extension}`;
}

export function isUuid(value: string) {
  return uuidPattern.test(value);
}
