import { describe, expect, it } from "vitest";

import {
  normalizePhone,
  normalizeTelegramUsername,
  validateLeadPayload,
} from "@/features/leads/validation";
import { PRIVACY_NOTICE } from "@/config/privacy";

const valid = {
  locale: "ru",
  source: "product_page",
  sourcePath: "/ru/product/nord-cool-300",
  name: " Анна  Мария ",
  phone: "+373 (69) 166-172",
  telegram: "@anna_test",
  comment: " Интересует доставка ",
  consent: true,
  productId: "20000000-0000-4000-8000-000000000001",
};

describe("lead validation", () => {
  it("normalizes a complete RU/RO-safe submission", () => {
    expect(validateLeadPayload(valid)).toEqual({
      ok: true,
      data: {
        locale: "ru",
        source: "product_page",
        sourcePath: "/ru/product/nord-cool-300",
        name: "Анна Мария",
        phone: "+37369166172",
        telegramUsername: "@anna_test",
        comment: "Интересует доставка",
        productId: "20000000-0000-4000-8000-000000000001",
        privacyNoticeVersion: PRIVACY_NOTICE.storageVersion,
      },
    });
  });

  it("requires contact fields and explicit consent", () => {
    const result = validateLeadPayload({
      ...valid,
      name: "",
      phone: "",
      consent: false,
    });
    expect(result).toEqual({
      ok: false,
      fieldErrors: {
        name: "required",
        phone: "required",
        consent: "consent_required",
      },
    });
  });

  it("rejects letters in phones, unsafe paths and invalid product IDs", () => {
    const result = validateLeadPayload({
      ...valid,
      phone: "+373 abc 1234567",
      sourcePath: "/rubbish",
      productId: "not-a-uuid",
    });
    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { phone: "invalid", product: "invalid" },
    });
  });

  it("enforces Telegram and comment limits", () => {
    const result = validateLeadPayload({
      ...valid,
      telegram: "@bad-name",
      comment: "x".repeat(2001),
    });
    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { telegram: "invalid", comment: "too_long" },
    });
  });

  it("normalizes optional handles and formatted phones deterministically", () => {
    expect(normalizeTelegramUsername(" user_name ")).toBe("@user_name");
    expect(normalizeTelegramUsername("bad-name")).toBeNull();
    expect(normalizePhone("069 166 172")).toBe("069166172");
    expect(normalizePhone("123 abc 4567")).toBeNull();
  });
});
