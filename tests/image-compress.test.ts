// Pure-logic tests for src/lib/image-compress.ts: format choice, quality
// ladder, dimension math, file-name alignment and header sniffing. Browser
// APIs (createImageBitmap/canvas) are covered by the e2e suite instead.

import { describe, expect, it } from "vitest";

import {
  alignedFileName,
  decodeFailureReason,
  encodeAttempt,
  fitWithin,
  HEIC_REASON,
  isAnimatedWebp,
  isGif,
  isHeic,
  pickOutputFormat,
  targetDimensions,
  unsupportedReason,
} from "@/lib/image-compress";
import {
  IMAGE_COMPRESS_MAX_ATTEMPTS,
  IMAGE_MAX_SIDE,
  IMAGE_QUALITY_MIN,
  IMAGE_QUALITY_START,
  IMAGE_TARGET_BYTES,
  imageLimits,
} from "@/lib/limits";

function encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function le32(value: number): string {
  return String.fromCharCode(
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  );
}

function webpHeader(flags: number, extraChunks = ""): Uint8Array {
  // VP8X payload: flags byte + 3 reserved + canvas width-1 (3) + height-1 (3).
  const payload = String.fromCharCode(flags) + "\0".repeat(9);
  const body =
    "WEBP" + "VP8X" + le32(10) + payload + extraChunks + "VP8 " + le32(8);
  return encode("RIFF" + le32(body.length) + body);
}

function heicHeader(brand = "heic"): Uint8Array {
  const body = "ftyp" + brand + le32(0) + brand + "mif1";
  return encode(le32(24) + body);
}

describe("limits wiring", () => {
  it("keeps the compression target safely below the hard upload limit", () => {
    expect(IMAGE_MAX_SIDE).toBe(2000);
    expect(IMAGE_TARGET_BYTES).toBe(3.5 * 1024 * 1024);
    expect(IMAGE_TARGET_BYTES).toBeLessThan(imageLimits.maxBytes);
    expect(IMAGE_QUALITY_START).toBe(0.85);
    expect(IMAGE_QUALITY_MIN).toBe(0.6);
    expect(IMAGE_COMPRESS_MAX_ATTEMPTS).toBe(6);
  });
});

describe("fitWithin", () => {
  it("shrinks the long side to the limit and keeps proportions", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 1500, height: 2000 });
  });

  it("never touches images already within the limit", () => {
    expect(fitWithin(1999, 1000)).toEqual({ width: 1999, height: 1000 });
    expect(fitWithin(640, 480)).toEqual({ width: 640, height: 480 });
  });

  it("never produces a zero side", () => {
    expect(fitWithin(10_000, 1, 2)).toEqual({ width: 2, height: 1 });
  });
});

describe("encodeAttempt ladder", () => {
  it("walks quality 0.85 → 0.6 at full size first", () => {
    const qualities = [0, 1, 2, 3].map((attempt) => encodeAttempt(attempt));
    expect(qualities.map((step) => step.quality)).toEqual([
      0.85, 0.75, 0.65, 0.6,
    ]);
    for (const step of qualities) expect(step.scale).toBe(1);
  });

  it("then shrinks the side by 15% and restarts the ladder", () => {
    expect(encodeAttempt(4)).toEqual({ scale: 0.85, quality: 0.85 });
    expect(encodeAttempt(5)).toEqual({ scale: 0.85, quality: 0.75 });
    expect(encodeAttempt(7)).toEqual({ scale: 0.85, quality: 0.6 });
    expect(encodeAttempt(8).scale).toBeCloseTo(0.7225, 10);
  });

  it("stays within the configured quality bounds for every attempt", () => {
    for (let attempt = 0; attempt < 20; attempt++) {
      const { quality } = encodeAttempt(attempt);
      expect(quality).toBeLessThanOrEqual(IMAGE_QUALITY_START);
      expect(quality).toBeGreaterThanOrEqual(IMAGE_QUALITY_MIN);
    }
  });
});

describe("targetDimensions", () => {
  it("fits to IMAGE_MAX_SIDE on the first attempt", () => {
    expect(targetDimensions(4000, 3000, 0)).toEqual({
      width: 2000,
      height: 1500,
    });
  });

  it("applies the side shrink on later attempts", () => {
    expect(targetDimensions(4000, 3000, 4)).toEqual({
      width: 1700,
      height: 1275,
    });
  });
});

describe("pickOutputFormat", () => {
  it("encodes opaque photos as JPEG regardless of the source", () => {
    expect(pickOutputFormat("image/jpeg", false)).toBe("image/jpeg");
    expect(pickOutputFormat("image/png", false)).toBe("image/jpeg");
    expect(pickOutputFormat("image/webp", false)).toBe("image/jpeg");
    expect(pickOutputFormat("image/avif", false)).toBe("image/jpeg");
  });

  it("keeps transparency: PNG stays PNG, WebP stays WebP", () => {
    expect(pickOutputFormat("image/png", true)).toBe("image/png");
    expect(pickOutputFormat("image/webp", true)).toBe("image/webp");
    // An alpha-carrying source with no lossless browser encoder of its own
    // (JPEG/AVIF) falls back to PNG so the alpha is not lost.
    expect(pickOutputFormat("image/avif", true)).toBe("image/png");
    expect(pickOutputFormat("image/jpeg", true)).toBe("image/png");
  });
});

describe("alignedFileName", () => {
  it("matches the extension to the encoded type", () => {
    expect(alignedFileName("photo.png", "image/jpeg")).toBe("photo.jpg");
    expect(alignedFileName("photo.jpeg", "image/jpeg")).toBe("photo.jpg");
    expect(alignedFileName("photo.PNG", "image/webp")).toBe("photo.webp");
    expect(alignedFileName("a.b.webp", "image/png")).toBe("a.b.png");
  });

  it("handles names without an extension", () => {
    expect(alignedFileName("снимок", "image/webp")).toBe("снимок.webp");
    expect(alignedFileName("", "image/jpeg")).toBe("image.jpg");
  });
});

describe("header sniffing", () => {
  it("recognises GIF", () => {
    expect(isGif(encode("GIF89a...."))).toBe(true);
    expect(isGif(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
  });

  it("recognises HEIC by brand and by declared type", () => {
    expect(isHeic(heicHeader(), "image/heic")).toBe(true);
    expect(isHeic(heicHeader(), "")).toBe(true);
    expect(isHeic(heicHeader("heix"), "application/octet-stream")).toBe(true);
    expect(isHeic(encode(le32(24) + "ftypavif"), "image/avif")).toBe(false);
    expect(isHeic(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), "image/png")).toBe(
      false,
    );
  });

  it("recognises animated WebP but not static WebP", () => {
    expect(isAnimatedWebp(webpHeader(0x10))).toBe(true); // VP8X anim flag
    const withAnimChunk = webpHeader(0x00, "ANIM" + le32(6) + "\0".repeat(6));
    expect(isAnimatedWebp(withAnimChunk)).toBe(true);
    expect(isAnimatedWebp(webpHeader(0x04))).toBe(false); // alpha only
    expect(isAnimatedWebp(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(
      false,
    );
  });
});

describe("unsupportedReason / decodeFailureReason", () => {
  it("returns the dedicated HEIC text verbatim", () => {
    const expected =
      'Браузер не может открыть этот формат. Сохраните фото как JPG или включите в камере iPhone режим "Наиболее совместимый"';
    expect(HEIC_REASON).toBe(expected);
    expect(unsupportedReason(heicHeader(), "image/heic")).toBe(expected);
    expect(decodeFailureReason(heicHeader(), "image/heic")).toBe(expected);
  });

  it("names GIF and animation explicitly", () => {
    expect(unsupportedReason(encode("GIF89a"), "image/gif")).toContain("GIF");
    expect(unsupportedReason(webpHeader(0x10), "image/webp")).toContain(
      "анимация",
    );
  });

  it("lets compressible sources through", () => {
    expect(unsupportedReason(webpHeader(0x04), "image/webp")).toBeNull();
    expect(unsupportedReason(new Uint8Array(64), "image/jpeg")).toBeNull();
  });

  it("explains a generic decode failure", () => {
    const reason = decodeFailureReason(new Uint8Array(64), "image/jpeg");
    expect(reason).toContain("не может открыть");
    expect(reason).toContain("JPG, PNG или WebP");
  });
});
