import { describe, expect, it } from "vitest";

import {
  AdminValidationError,
  attributeDataType,
  codeValue,
  integerValue,
  slugValue,
} from "@/features/admin/validation";

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
