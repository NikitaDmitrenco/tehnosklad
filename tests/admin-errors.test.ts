import { describe, expect, it } from "vitest";

import { adminErrorMessage, sanitizeAdminError } from "@/features/admin/errors";

describe("admin error sanitization", () => {
  it("maps known integrity errors to a safe message", () => {
    const error = sanitizeAdminError({
      code: "P0001",
      message: "Published product is missing a required attribute",
      details: "secret SQL details",
    });
    expect(error.code).toBe("missing a required attribute");
    expect(error.message).toContain("обязательные характеристики");
    expect(error.message).not.toContain("secret");
  });

  it("explains a slug held by another entity instead of failing blankly", () => {
    // The trigger raises 23505 with its own wording, so the generic
    // unique-violation branch used to swallow it.
    const error = sanitizeAdminError({
      code: "23505",
      message: "category slug is reserved by another category",
    });
    expect(adminErrorMessage(error.code)).toContain("уже занят другой");
  });

  it("keeps a message for every code it hands to the page", () => {
    for (const code of [
      "duplicate",
      "in_use",
      "validation",
      "upload_invalid",
      "operation_failed",
    ]) {
      expect(adminErrorMessage(code)).not.toBe("Операция не выполнена.");
    }
  });

  it("does not expose unknown SQL, tokens or stack traces", () => {
    const error = sanitizeAdminError({
      code: "XX000",
      message: "token=secret select * from private.table",
      stack: "private stack",
    });
    expect(error.code).toBe("operation_failed");
    expect(error.message).toBe(
      "Операция не выполнена. Проверьте данные и повторите попытку.",
    );
  });
});
