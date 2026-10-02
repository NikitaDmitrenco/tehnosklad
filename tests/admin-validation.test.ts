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
    // Valid PNG magic but the header itself is cut short (< 12 bytes).
    await expect(validateProductImage(truncated)).rejects.toMatchObject({
      code: "upload_corrupted",
    });
  });

  it("accepts a well-formed PNG header", async () => {
    await expect(
      validateProductImage(imageFile(pngHeader, "ok.png", "image/png")),
    ).resolves.toEqual({ extension: "png", mimeType: "image/png" });
  });
});
