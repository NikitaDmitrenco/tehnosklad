import { describe, expect, it } from "vitest";

import {
  AdminValidationError,
  createProductImagePath,
  validateProductImage,
} from "@/features/admin/validation";

const productId = "20000000-0000-4000-8000-000000000001";

describe("admin Storage validation", () => {
  it("validates JPEG structure and creates an immutable server path", async () => {
    // Structurally valid minimal JPEG: SOI + two length-prefixed segments +
    // EOI (the magic-only 12-byte stub is now correctly rejected as
    // truncated — see the structure verification in validation.ts).
    const file = new File(
      [
        new Uint8Array([
          0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0xaa, 0xaa, 0xff, 0xe1, 0x00,
          0x04, 0xbb, 0xbb, 0xff, 0xd9,
        ]),
      ],
      "photo.jpg",
      { type: "image/jpeg" },
    );
    await expect(validateProductImage(file)).resolves.toEqual({
      extension: "jpg",
      mimeType: "image/jpeg",
    });
    expect(createProductImagePath(productId, "jpg")).toMatch(
      /^20000000-0000-4000-8000-000000000001\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jpg$/,
    );
  });

  it("rejects MIME spoofing and unsupported paths", async () => {
    const spoofed = new File([new Uint8Array(16)], "photo.jpg", {
      type: "image/jpeg",
    });
    await expect(validateProductImage(spoofed)).rejects.toBeInstanceOf(
      AdminValidationError,
    );
    expect(() => createProductImagePath("../product", "jpg")).toThrow(
      AdminValidationError,
    );
    expect(() => createProductImagePath(productId, "svg")).toThrow(
      AdminValidationError,
    );
  });

  it("rejects files larger than the bucket limit", async () => {
    const oversized = new File(
      [new Uint8Array(5 * 1024 * 1024 + 1)],
      "large.png",
      {
        type: "image/png",
      },
    );
    await expect(validateProductImage(oversized)).rejects.toBeInstanceOf(
      AdminValidationError,
    );
  });
});
