import { describe, expect, it } from "vitest";

import {
  adminErrorMessage,
  sanitizeAdminError,
  serializeAdminError,
} from "@/features/admin/errors";

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

  // BUG-04: both directions of the publication tree trigger must explain the
  // cause and the next step instead of the generic operation_failed.
  it.each([
    [
      "Published child category requires a published parent",
      "Нельзя опубликовать подкатегорию, пока родительская категория не опубликована. Сначала опубликуйте родительскую.",
    ],
    [
      "Published child categories require an active parent",
      "Нельзя снять категорию с публикации или архивировать её, пока есть опубликованные подкатегории. Сначала снимите с публикации подкатегории.",
    ],
    [
      "Published products require a published category",
      "Сначала опубликуйте выбранную категорию.",
    ],
    [
      "Options require a select attribute",
      "Варианты поддерживаются только у характеристик типа «Список» или «Множественный выбор».",
    ],
  ])("maps %s to a human message", (raw, expected) => {
    const error = sanitizeAdminError({ code: "P0001", message: raw });
    expect(error.code).toBe(raw);
    expect(adminErrorMessage(error.code)).toBe(expected);
  });

  it("explains any *_not_found RPC error with one clear message", () => {
    const error = sanitizeAdminError({
      code: "P0002",
      message: "product_image_not_found",
    });
    expect(error.code).toBe("not_found");
    expect(adminErrorMessage(error.code)).toBe(
      "Запись не найдена — возможно, её удалили в другой вкладке. Обновите страницу и повторите.",
    );
  });

  it("keeps the specific knowledge-base not-found text", () => {
    const error = sanitizeAdminError({
      code: "P0002",
      message: "assistant_knowledge_not_found",
    });
    expect(adminErrorMessage(error.code)).toBe(
      "Статья базы знаний не найдена.",
    );
  });

  // DOC-03 safety net: a CHECK violation that slipped past the client and
  // server validators still names the field and the limit.
  it("maps a CHECK violation to the field name and its limit", () => {
    const error = sanitizeAdminError({
      code: "23514",
      message:
        'new row for relation "category_translations" violates check constraint "category_translations_name_check"',
    });
    expect(error.code).toBe("field_too_long");
    expect(adminErrorMessage(serializeAdminError(error))).toBe(
      "Поле «Название»: максимум 160 символов.",
    );
  });

  it("falls back to a generic check message for unknown constraints", () => {
    const error = sanitizeAdminError({
      code: "23514",
      message:
        'new row for relation "products" violates check constraint "products_check"',
    });
    expect(error.code).toBe("check_failed");
    expect(adminErrorMessage(serializeAdminError(error))).toBe(
      "Значение не проходит проверку данных — сократите введённый текст и повторите.",
    );
  });

  it("still explains the parent-cycle 23514 through its message", () => {
    const error = sanitizeAdminError({
      code: "23514",
      message: "category_parent_cycle",
    });
    expect(error.code).toBe("category_parent_cycle");
    expect(adminErrorMessage(error.code)).toBe(
      "Категория не может быть собственным потомком.",
    );
  });
});
