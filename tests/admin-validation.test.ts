import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { adminErrorText } from "@/features/admin/errors";
import { checkImageFile } from "@/features/admin/image-check";
import {
  AdminValidationError,
  attributeDataType,
  codeValue,
  integerValue,
  slugValue,
  validateProductImage,
} from "@/features/admin/validation";
import { formatMegabytes, imageLimits } from "@/lib/limits";

describe("admin form validation", () => {
  it("accepts canonical slugs, codes, integers and supported attribute types", () => {
    const form = new FormData();
    form.set("slug", "frigidere-mari");
    form.set("code", "energy_class");
    expect(slugValue(form, "slug")).toBe("frigidere-mari");
    expect(codeValue(form, "code")).toBe("energy_class");
    expect(integerValue("42", "sort")).toBe(42);
    expect(attributeDataType("multi_select")).toBe("multi_select");
  });

  it.each(["Frigidere", "bad slug", "-slug", "slug-"])(
    "rejects unsafe slug %s",
    (slug) => {
      const form = new FormData();
      form.set("slug", slug);
      expect(() => slugValue(form, "slug")).toThrow(AdminValidationError);
    },
  );

  it("does not pretend that range is supported", () => {
    expect(() => attributeDataType("range")).toThrow(AdminValidationError);
  });
});

const pngHeader = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13,
]);

function imageFile(
  bytes: Uint8Array<ArrayBuffer>,
  name: string,
  type: string,
): File {
  return new File([bytes], name, { type });
}

describe("image validation explains size, type and content", () => {
  it("rejects an oversized file with actual size and limit", async () => {
    const file = imageFile(
      new Uint8Array(imageLimits.maxBytes + 1),
      "big.png",
      "image/png",
    );
    await expect(validateProductImage(file)).rejects.toMatchObject({
      code: "upload_too_large",
    });
    expect(
      adminErrorText("upload_too_large", {
        actual: formatMegabytes(file.size),
        limit: imageLimits.maxLabel,
      }),
    ).toBe(
      `Файл ${formatMegabytes(file.size)}, максимум ${imageLimits.maxLabel}. Уменьшите фото или сохраните как JPG.`,
    );
    // The client-side gate must produce the identical message.
    expect(checkImageFile(file)).toEqual({
      code: "upload_too_large",
      params: {
        actual: formatMegabytes(file.size),
        limit: imageLimits.maxLabel,
      },
    });
  });

  it("rejects a disallowed format with the allowed list and an iPhone hint", async () => {
    const file = imageFile(new Uint8Array(64), "photo.heic", "image/heif");
    await expect(validateProductImage(file)).rejects.toMatchObject({
      code: "upload_type_not_allowed",
    });
    const message = adminErrorText("upload_type_not_allowed", {
      actual: "HEIC",
      allowed: imageLimits.allowedLabel,
    });
    expect(message).toContain("Недопустимый формат файла: HEIC");
    expect(message).toContain(imageLimits.allowedLabel);
    expect(message).toContain("HEIC");
  });

  it("separates content that does not match the extension from corruption", async () => {
    const text = new Uint8Array(64).fill(0x41);
    await expect(
      validateProductImage(imageFile(text, "notes.png", "image/png")),
    ).rejects.toMatchObject({ code: "upload_extension_mismatch" });

    const truncated = imageFile(pngHeader.slice(0, 8), "shot.png", "image/png");
    // Valid PNG magic but the file is below the 12-byte minimum.
    await expect(validateProductImage(truncated)).rejects.toMatchObject({
      code: "upload_corrupted",
    });
  });
});

// ---------------------------------------------------------------------------
// Structural verification (task "Truncated PNG"): full parse without external
// libraries; fixtures live under e2e/fixtures/images.

const fixturesDir = path.join(process.cwd(), "e2e", "fixtures", "images");
const fixtureMimeTypes: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

function fixtureBytes(relative: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(fs.readFileSync(path.join(fixturesDir, relative)));
}

function fixtureFile(relative: string): File {
  const name = relative.split("/").pop()!;
  const extension = name.split(".").pop()!.toLowerCase();
  return new File([fixtureBytes(relative)], name, {
    type: fixtureMimeTypes[extension]!,
  });
}

function truncatedFile(
  relative: string,
  dropBytes: number,
  name: string,
  type: string,
): File {
  const full = fixtureBytes(relative);
  return new File([full.slice(0, full.length - dropBytes)], name, { type });
}

describe("image structure verification", () => {
  it("accepts valid files of every format", async () => {
    for (const relative of [
      "valid/product-photo-800x600.png",
      "valid/product-photo-800x600.jpg",
      "valid/product-photo-800x600.webp",
      "valid/product-photo-800x600.avif",
    ]) {
      await expect(
        validateProductImage(fixtureFile(relative)),
      ).resolves.toBeTruthy();
    }
  });

  it("rejects a truncated file of every format", async () => {
    // PNG: header intact, body cut short — no IEND at the end.
    await expect(
      validateProductImage(
        fixtureFile("invalid/corrupt-truncated-png-valid-header.png"),
      ),
    ).rejects.toMatchObject({ code: "upload_corrupted" });
    // JPEG: missing EOI (last two bytes cut off).
    await expect(
      validateProductImage(
        truncatedFile(
          "valid/product-photo-800x600.jpg",
          16,
          "cut.jpg",
          "image/jpeg",
        ),
      ),
    ).rejects.toMatchObject({ code: "upload_corrupted" });
    // WebP: RIFF-declared size no longer matches the real file size.
    await expect(
      validateProductImage(
        truncatedFile(
          "valid/product-photo-800x600.webp",
          8,
          "cut.webp",
          "image/webp",
        ),
      ),
    ).rejects.toMatchObject({ code: "upload_corrupted" });
    // AVIF: cut inside the container header so the meta/ispe boxes are
    // incomplete (ispe normally sits near the start, a tail cut is not enough).
    const avif = fixtureBytes("valid/product-photo-800x600.avif");
    await expect(
      validateProductImage(
        new File([avif.slice(0, 40)], "cut.avif", { type: "image/avif" }),
      ),
    ).rejects.toMatchObject({ code: "upload_corrupted" });
  });

  it("rejects a PNG whose chunk CRC is broken", async () => {
    const png = fixtureBytes("valid/product-photo-800x600.png");
    // IHDR CRC occupies bytes 29..32 (8 signature + 4 length + 4 type + 13 data).
    png[32] ^= 0xff;
    await expect(
      validateProductImage(
        new File([png], "broken.png", { type: "image/png" }),
      ),
    ).rejects.toMatchObject({ code: "upload_corrupted" });
  });

  it("rejects a small file declaring a huge resolution", async () => {
    // Crafted PNG: signature + IHDR claiming 8000×6000 (48 MP > 25 MP limit).
    const crafted = new Uint8Array(8 + 8 + 13 + 4);
    crafted.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const view = new DataView(crafted.buffer);
    view.setUint32(8, 13);
    crafted.set([0x49, 0x48, 0x44, 0x52], 12); // "IHDR"
    view.setUint32(16, 8000);
    view.setUint32(20, 6000);
    await expect(
      validateProductImage(
        new File([crafted], "huge.png", { type: "image/png" }),
      ),
    ).rejects.toMatchObject({ code: "upload_resolution_too_large" });
    expect(
      adminErrorText("upload_resolution_too_large", {
        actual: "48,0",
        limit: imageLimits.maxPixelsLabel,
      }),
    ).toBe(
      "Разрешение изображения 48,0 Мпикс, максимум 25 Мпикс. Уменьшите фото перед загрузкой.",
    );
  });
});
