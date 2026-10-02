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

// ---------------------------------------------------------------------------
// Full structural verification (no external libraries):
//   PNG  — signature, IHDR dimensions, every chunk with a CRC-32 check,
//          presence of IDAT, exact end at IEND;
//   JPEG — starts with SOI, ends with EOI, marker chain up to SOS is intact,
//          dimensions from the SOF marker;
//   WebP — RIFF-declared size equals the real file size, bitstream dimensions;
//   AVIF — ISO-BMFF box walk to the ispe box for dimensions.
// Anything else throws "upload_corrupted"; a header-declared canvas above
// imageLimits.maxPixels throws "upload_resolution_too_large".

function corruptedImage(): AdminValidationError {
  return new AdminValidationError("image", "upload_corrupted");
}

function resolutionError(width: number, height: number): AdminValidationError {
  const megapixels = ((width * height) / 1_000_000)
    .toFixed(1)
    .replace(".", ",");
  return new AdminValidationError("image", "upload_resolution_too_large", {
    actual: megapixels,
    limit: imageLimits.maxPixelsLabel,
  });
}

function assertPixelLimit(width: number, height: number): void {
  if (!width || !height) throw corruptedImage();
  if (width * height > imageLimits.maxPixels)
    throw resolutionError(width, height);
}

// CRC-32 (ISO 3309 / ITU-T V.42) with the reversed polynomial 0xEDB88320.
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++)
    crc = crcTable[(crc ^ bytes[i]!) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function asciiAt(buffer: Uint8Array, start: number, end: number): string {
  return new TextDecoder().decode(buffer.subarray(start, end));
}

function verifyPng(buffer: Uint8Array): void {
  if (buffer.length < 8 + 25) throw corruptedImage(); // sig + IHDR at minimum
  const view = new DataView(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );
  let offset = 8;
  let sawIdat = false;
  while (offset + 12 <= buffer.length) {
    const length = view.getUint32(offset);
    const type = asciiAt(buffer, offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (length > 0x7fffffff || dataEnd + 4 > buffer.length)
      throw corruptedImage(); // truncated chunk
    if (type === "IHDR") {
      if (offset !== 8 || length !== 13) throw corruptedImage();
      // Dimensions first: a tiny crafted file with a huge canvas must be
      // rejected as resolution, not as a broken CRC.
      assertPixelLimit(
        view.getUint32(dataStart),
        view.getUint32(dataStart + 4),
      );
    }
    if (crc32(buffer.subarray(offset + 4, dataEnd)) !== view.getUint32(dataEnd))
      throw corruptedImage();
    if (type === "IDAT") sawIdat = true;
    offset = dataEnd + 4;
    if (type === "IEND") {
      if (length !== 0 || !sawIdat || offset !== buffer.length)
        throw corruptedImage();
      return;
    }
  }
  throw corruptedImage(); // no IEND: the file is cut short
}

const sofMarkers = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function verifyJpeg(buffer: Uint8Array): void {
  if (buffer.length < 4) throw corruptedImage();
  // Ends with EOI — a truncated download loses the last two bytes.
  if (buffer[buffer.length - 2] !== 0xff || buffer[buffer.length - 1] !== 0xd9)
    throw corruptedImage();
  const view = new DataView(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );
  let offset = 2; // skip SOI (already verified by the sniffer)
  while (offset + 1 < buffer.length) {
    if (buffer[offset] !== 0xff) throw corruptedImage();
    const marker = buffer[offset + 1]!;
    if (marker === 0xff) {
      offset += 1; // fill byte
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    if (marker === 0xd9) {
      if (offset + 2 !== buffer.length) throw corruptedImage(); // junk after EOI
      return;
    }
    if (marker === 0xda) return; // SOS: entropy data; EOI already verified
    if (offset + 4 > buffer.length) throw corruptedImage();
    const length = view.getUint16(offset + 2);
    if (length < 2 || offset + 2 + length > buffer.length)
      throw corruptedImage();
    if (sofMarkers.has(marker)) {
      if (length < 8) throw corruptedImage();
      assertPixelLimit(view.getUint16(offset + 5), view.getUint16(offset + 7));
    }
    offset += 2 + length;
  }
  throw corruptedImage();
}

function verifyWebp(buffer: Uint8Array): void {
  if (buffer.length < 12) throw corruptedImage();
  const view = new DataView(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );
  // RIFF-declared size must equal the real file size (little-endian).
  if (view.getUint32(4, true) + 8 !== buffer.length) throw corruptedImage();
  let offset = 12;
  let width = 0;
  let height = 0;
  while (offset + 8 <= buffer.length) {
    const fourcc = asciiAt(buffer, offset, offset + 4);
    const size = view.getUint32(offset + 4, true);
    const dataStart = offset + 8;
    const dataEnd = dataStart + size;
    if (dataEnd > buffer.length) throw corruptedImage();
    if (fourcc === "VP8X" && size >= 10) {
      width =
        1 +
        (view.getUint8(dataStart + 4) |
          (view.getUint8(dataStart + 5) << 8) |
          (view.getUint8(dataStart + 6) << 16));
      height =
        1 +
        (view.getUint8(dataStart + 7) |
          (view.getUint8(dataStart + 8) << 8) |
          (view.getUint8(dataStart + 9) << 16));
      break;
    }
    if (fourcc === "VP8 " && size >= 10) {
      if (
        view.getUint8(dataStart + 3) !== 0x9d ||
        view.getUint8(dataStart + 4) !== 0x01 ||
        view.getUint8(dataStart + 5) !== 0x2a
      )
        throw corruptedImage();
      width = view.getUint16(dataStart + 6, true) & 0x3fff;
      height = view.getUint16(dataStart + 8, true) & 0x3fff;
      break;
    }
    if (fourcc === "VP8L" && size >= 5) {
      if (view.getUint8(dataStart) !== 0x2f) throw corruptedImage();
      const bits = view.getUint32(dataStart + 1, true);
      width = (bits & 0x3fff) + 1;
      height = ((bits >>> 14) & 0x3fff) + 1;
      break;
    }
    offset = dataEnd + (size % 2); // chunks are padded to even sizes
  }
  if (!width || !height) throw corruptedImage();
  assertPixelLimit(width, height);
}

const avifContainerBoxes = new Set([
  "meta",
  "iprp",
  "ipco",
  "moov",
  "trak",
  "mdia",
  "minf",
  "stbl",
]);

function findAvifIspe(
  view: DataView,
  buffer: Uint8Array,
  start: number,
  end: number,
): { width: number; height: number } | null {
  let offset = start;
  while (offset + 8 <= end) {
    let size = view.getUint32(offset);
    const type = asciiAt(buffer, offset + 4, offset + 8);
    let headerSize = 8;
    if (size === 1) {
      if (offset + 16 > end) return null;
      size = Number(view.getBigUint64(offset + 8));
      headerSize = 16;
    } else if (size === 0) {
      size = end - offset;
    }
    if (size < headerSize || offset + size > end) return null;
    if (type === "ispe" && size >= headerSize + 12) {
      // FullBox: 4 bytes version/flags, then width and height (big-endian).
      return {
        width: view.getUint32(offset + headerSize + 4),
        height: view.getUint32(offset + headerSize + 8),
      };
    }
    if (avifContainerBoxes.has(type)) {
      // `meta` is a FullBox: its children start after 4 extra bytes.
      const childrenStart = offset + headerSize + (type === "meta" ? 4 : 0);
      const found = findAvifIspe(view, buffer, childrenStart, offset + size);
      if (found) return found;
    }
    offset += size;
  }
  return null;
}

function verifyAvif(buffer: Uint8Array): void {
  if (buffer.length < 16) throw corruptedImage();
  const view = new DataView(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );
  const dimensions = findAvifIspe(view, buffer, 0, buffer.length);
  if (!dimensions) throw corruptedImage(); // no ispe: truncated or not an AVIF
  assertPixelLimit(dimensions.width, dimensions.height);
}

async function verifyImageStructure(format: string, file: File): Promise<void> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  switch (format) {
    case "png":
      return verifyPng(buffer);
    case "jpeg":
      return verifyJpeg(buffer);
    case "webp":
      return verifyWebp(buffer);
    case "avif":
      return verifyAvif(buffer);
    default:
      return;
  }
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
  await verifyImageStructure(definition.format, file);
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
