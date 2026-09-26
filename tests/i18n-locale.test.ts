import { describe, expect, it } from "vitest";

import { pathForLocale } from "@/i18n/config";
import { resolveEntryLocale } from "@/i18n/locale-cookie";

describe("resolveEntryLocale", () => {
  it("prefers a saved locale over the browser languages", () => {
    expect(resolveEntryLocale("ro", "ru-RU,ru;q=0.9")).toBe("ro");
  });

  it("falls back to the browser languages when nothing is saved", () => {
    expect(resolveEntryLocale(undefined, "ro-MD,ro;q=0.9,en;q=0.8")).toBe("ro");
  });

  it("honours the quality order of the browser languages", () => {
    expect(resolveEntryLocale(undefined, "en;q=0.9,ru;q=0.3,ro;q=0.8")).toBe(
      "ro",
    );
  });

  it("ignores languages the site does not serve", () => {
    expect(resolveEntryLocale(undefined, "en-GB,de;q=0.9")).toBe("ru");
  });

  it("ignores a zero quality language", () => {
    expect(resolveEntryLocale(undefined, "ro;q=0,en;q=0.8")).toBe("ru");
  });

  it("ignores an unknown saved locale", () => {
    expect(resolveEntryLocale("de", "ro")).toBe("ro");
  });

  it("falls back to the default locale without any signal", () => {
    expect(resolveEntryLocale(undefined, null)).toBe("ru");
  });

  it("survives a malformed header", () => {
    expect(resolveEntryLocale(undefined, ";;;q=,,")).toBe("ru");
  });
});

describe("pathForLocale", () => {
  it("rewrites the locale segment and keeps the rest of the path", () => {
    expect(pathForLocale("/ru/product/holodilnik", "ro")).toBe(
      "/ro/product/holodilnik",
    );
  });

  it("keeps a path that is only a locale", () => {
    expect(pathForLocale("/ru", "ro")).toBe("/ro");
  });

  it("falls back to the locale root for an unprefixed path", () => {
    expect(pathForLocale("/", "ro")).toBe("/ro");
    expect(pathForLocale("/admin/products", "ro")).toBe("/ro");
  });
});
