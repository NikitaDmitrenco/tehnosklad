// Browser-side image auto-compression for admin uploads. No dependencies —
// createImageBitmap, canvas, Blob only. The form calls compressImage() on
// selection and submits the returned file; any failure returns the ORIGINAL
// file plus a human reason, so a bad photo never breaks the form.
//
// Pure helpers (format choice, quality ladder, dimensions, file name,
// header sniffing) are exported for unit tests; they never touch browser
// APIs. The orchestration needs a real browser and must only run there.

import {
  IMAGE_COMPRESS_MAX_ATTEMPTS,
  IMAGE_MAX_SIDE,
  IMAGE_QUALITY_MIN,
  IMAGE_QUALITY_START,
  IMAGE_QUALITY_STEP,
  IMAGE_TARGET_BYTES,
  imageLimits,
} from "@/lib/limits";

export type ImageCompressResult = {
  file: File;
  wasCompressed: boolean;
  before: number;
  after: number;
  width: number;
  height: number;
  error?: string;
};

// Reason texts live here (client-only wording); server error texts in
// src/features/admin/errors.ts are intentionally untouched.
export const HEIC_REASON =
  'Браузер не может открыть этот формат. Сохраните фото как JPG или включите в камере iPhone режим "Наиболее совместимый"';
const GIF_REASON =
  "Это GIF — загрузить его нельзя. Сохраните фото как JPG, PNG или WebP и повторите.";
const ANIMATION_REASON =
  "Это анимация (WebP) — уменьшить её нельзя. Сохраните нужный кадр как JPG или PNG и повторите.";
const DECODE_REASON =
  "Браузер не может открыть это фото. Возможно, файл повреждён или в неизвестном формате — сохраните изображение заново (JPG, PNG или WebP).";
const PROCESS_REASON =
  "Не удалось обработать фото в браузере. Уменьшите его вручную или сохраните как JPG.";

function exhaustedReason(lossless: boolean): string {
  if (lossless)
    return `Не удалось уменьшить изображение до ${imageLimits.maxLabel}: файл с прозрачностью слишком тяжёлый. Уменьшите его в редакторе и повторите.`;
  return `Не удалось уменьшить фото до ${imageLimits.maxLabel} за ${IMAGE_COMPRESS_MAX_ATTEMPTS} попыток. Уменьшите его вручную или сохраните как JPG.`;
}

// After a quality ladder the file is still over the target: shrink the
// longer side by 15% and repeat (rule 4 of the spec).
const SIDE_SHRINK_FACTOR = 0.85;

const HEADER_BYTES = 4096;

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested without browser APIs)

/** Scale down to fit maxSide on the long side; never upscale, keep ratios. */
export function fitWithin(
  width: number,
  height: number,
  maxSide: number = IMAGE_MAX_SIDE,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxSide || longest <= 0) return { width, height };
  const factor = maxSide / longest;
  return {
    width: Math.max(1, Math.round(width * factor)),
    height: Math.max(1, Math.round(height * factor)),
  };
}

function qualityLadder(): number[] {
  const levels: number[] = [];
  let quality = Math.round(IMAGE_QUALITY_START * 100) / 100;
  // 0.85 → 0.75 → 0.65; the next -0.1 step would land below the floor, so
  // the ladder finishes on IMAGE_QUALITY_MIN itself instead of skipping it.
  while (quality > IMAGE_QUALITY_MIN + 1e-9 && levels.length < 50) {
    levels.push(quality);
    quality = Math.round((quality - IMAGE_QUALITY_STEP) * 100) / 100;
  }
  if (levels[levels.length - 1] !== IMAGE_QUALITY_MIN)
    levels.push(IMAGE_QUALITY_MIN);
  return levels;
}

const QUALITY_LADDER = qualityLadder();

/** Quality for attempt N: 0.85 → 0.6, then the side shrinks by 15% and the
 * ladder restarts. scale is relative to the already fitted (≤ max side)
 * dimensions. */
export function encodeAttempt(attempt: number): {
  scale: number;
  quality: number;
} {
  const rungs = QUALITY_LADDER.length;
  const shrinks = Math.floor(Math.max(0, attempt) / rungs);
  const index = Math.max(0, attempt) % rungs;
  return {
    scale: Math.pow(SIDE_SHRINK_FACTOR, shrinks),
    quality: QUALITY_LADDER[index] ?? IMAGE_QUALITY_START,
  };
}

/** Output dimensions for attempt N (fit to IMAGE_MAX_SIDE, then shrink). */
export function targetDimensions(
  sourceWidth: number,
  sourceHeight: number,
  attempt: number,
): { width: number; height: number } {
  const base = fitWithin(sourceWidth, sourceHeight);
  const { scale } = encodeAttempt(attempt);
  return {
    width: Math.max(1, Math.round(base.width * scale)),
    height: Math.max(1, Math.round(base.height * scale)),
  };
}

// Rule 4/5: no transparency → JPEG; transparency → stays PNG, or stays WebP
// when the source already was WebP (alpha survives the encode).
export function pickOutputFormat(
  sourceType: string,
  hasAlpha: boolean,
): "image/jpeg" | "image/png" | "image/webp" {
  if (!hasAlpha) return "image/jpeg";
  return sourceType.toLowerCase() === "image/webp" ? "image/webp" : "image/png";
}

function extensionFor(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg"; // image/jpeg and anything else canvas handed back
}

/** Rule 7: the name must match the format that was actually encoded. */
export function alignedFileName(
  originalName: string,
  mimeType: string,
): string {
  const extension = extensionFor(mimeType);
  const dot = originalName.lastIndexOf(".");
  const base = dot > 0 ? originalName.slice(0, dot) : originalName;
  const safeBase = base.trim() || "image";
  return `${safeBase}.${extension}`;
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return new TextDecoder().decode(bytes.subarray(start, end));
}

export function isGif(header: Uint8Array): boolean {
  return ascii(header, 0, 4) === "GIF8";
}

export function isHeic(header: Uint8Array, sourceType: string): boolean {
  const type = sourceType.toLowerCase();
  if (type === "image/heic" || type === "image/heif") return true;
  if (header.length < 12 || ascii(header, 4, 8) !== "ftyp") return false;
  const brand = ascii(header, 8, 12);
  return (
    brand.startsWith("heic") ||
    brand.startsWith("heix") ||
    brand.startsWith("hevc") ||
    brand.startsWith("hevx")
  );
}

// Chunk-walk the RIFF header: the ANIM flag sits in VP8X, the ANIM/ANMF
// chunks follow it. Naively searching the bytes would false-positive on
// random VP8 payload data.
export function isAnimatedWebp(header: Uint8Array): boolean {
  if (
    header.length < 16 ||
    ascii(header, 0, 4) !== "RIFF" ||
    ascii(header, 8, 12) !== "WEBP"
  )
    return false;
  const view = new DataView(
    header.buffer,
    header.byteOffset,
    header.byteLength,
  );
  let offset = 12;
  while (offset + 8 <= header.length) {
    const fourcc = ascii(header, offset, offset + 4);
    const size = view.getUint32(offset + 4, true);
    if (fourcc === "ANIM" || fourcc === "ANMF") return true;
    if (fourcc === "VP8X" && size >= 10) {
      const flags = view.getUint8(offset + 8);
      if ((flags & 0x10) !== 0) return true; // animation bit
    }
    offset += 8 + size + (size % 2);
  }
  return false;
}

/** Rule 6: sources the browser must not re-encode → a reason, else null. */
export function unsupportedReason(
  header: Uint8Array,
  sourceType: string,
): string | null {
  if (isGif(header)) return GIF_REASON;
  if (isAnimatedWebp(header)) return ANIMATION_REASON;
  if (isHeic(header, sourceType)) return HEIC_REASON;
  return null;
}

/** Why createImageBitmap refused the file; HEIC gets its dedicated text. */
export function decodeFailureReason(
  header: Uint8Array,
  sourceType: string,
): string {
  if (isHeic(header, sourceType)) return HEIC_REASON;
  return DECODE_REASON;
}

// ---------------------------------------------------------------------------
// Browser orchestration

function canvasHasAlpha(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): boolean {
  try {
    const { data } = context.getImageData(0, 0, width, height);
    for (let index = 3; index < data.length; index += 4)
      if (data[index] !== 255) return true;
    return false;
  } catch {
    return false; // unreadable pixels → treat as opaque (JPEG output)
  }
}

async function encodeFrame(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  sourceType: string,
  quality: number,
  knownAlpha: boolean | null,
): Promise<{ blob: Blob | null; type: string; hasAlpha: boolean }> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return { blob: null, type: "", hasAlpha: knownAlpha ?? false };
  context.drawImage(bitmap, 0, 0, width, height);
  const hasAlpha =
    knownAlpha === null ? canvasHasAlpha(context, width, height) : knownAlpha;
  const type = pickOutputFormat(sourceType, hasAlpha);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, type === "image/png" ? undefined : quality),
  );
  return { blob, type, hasAlpha };
}

/**
 * Shrink `file` so it fits imageLimits.maxBytes and IMAGE_MAX_SIDE.
 * Returns the untouched original when nothing needs to change; on any
 * failure returns the original file with `error` describing why.
 */
export async function compressImage(file: File): Promise<ImageCompressResult> {
  const before = file.size;
  const keep = (
    error?: string,
    width = 0,
    height = 0,
  ): ImageCompressResult => ({
    file,
    wasCompressed: false,
    before,
    after: before,
    width,
    height,
    ...(error ? { error } : {}),
  });

  let header: Uint8Array;
  try {
    header = new Uint8Array(await file.slice(0, HEADER_BYTES).arrayBuffer());
  } catch {
    return keep(decodeFailureReason(new Uint8Array(0), file.type));
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return keep(decodeFailureReason(header, file.type));
  }

  try {
    const sourceWidth = bitmap.width;
    const sourceHeight = bitmap.height;

    // Rule 1: within both size and resolution → return the original as-is.
    if (
      file.size <= imageLimits.maxBytes &&
      sourceWidth <= IMAGE_MAX_SIDE &&
      sourceHeight <= IMAGE_MAX_SIDE
    )
      return {
        file,
        wasCompressed: false,
        before,
        after: before,
        width: sourceWidth,
        height: sourceHeight,
      };

    // Rule 6: GIF / animation / HEIC are never re-encoded.
    const gate = unsupportedReason(header, file.type);
    if (gate) return keep(gate, sourceWidth, sourceHeight);

    let hasAlpha: boolean | null = null;
    let lastScale: number | null = null;
    let result: ImageCompressResult | null = null;

    for (let attempt = 0; attempt < IMAGE_COMPRESS_MAX_ATTEMPTS; attempt++) {
      const { width, height } = targetDimensions(
        sourceWidth,
        sourceHeight,
        attempt,
      );
      const { scale, quality } = encodeAttempt(attempt);
      // Lossless output: a repeat of the same dimensions cannot get smaller,
      // so skip the wasted encode (attempts 1..3 repeat attempt 0, etc.).
      if (hasAlpha === true && lastScale === scale) continue;

      const encoded = await encodeFrame(
        bitmap,
        width,
        height,
        file.type,
        quality,
        hasAlpha,
      );
      hasAlpha = encoded.hasAlpha;
      lastScale = scale;
      if (!encoded.type) throw new Error("canvas unavailable");
      if (!encoded.blob) continue; // encode failed → next attempt
      if (encoded.blob.size <= IMAGE_TARGET_BYTES) {
        const compressed = new File(
          [encoded.blob],
          alignedFileName(file.name, encoded.type),
          {
            type: encoded.type,
            lastModified: Date.now(),
          },
        );
        result = {
          file: compressed,
          wasCompressed: true,
          before,
          after: compressed.size,
          width,
          height,
        };
        break;
      }
    }

    if (result) return result;
    return keep(exhaustedReason(hasAlpha === true), sourceWidth, sourceHeight);
  } catch {
    return keep(PROCESS_REASON);
  } finally {
    bitmap.close();
  }
}
