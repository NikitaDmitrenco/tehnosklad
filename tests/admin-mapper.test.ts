import { describe, expect, it } from "vitest";

import {
  mapAdminTranslations,
  mapDatabaseBigint,
} from "@/features/admin/mapper";

describe("admin mapping", () => {
  it("keeps RU and RO independent without a fallback", () => {
    const mapped = mapAdminTranslations([
      {
        locale: "ru",
        name: "Холодильник",
        slug: "holodilnik",
        short_description: "Кратко",
        description: "Описание",
        seo_title: null,
        seo_description: null,
      },
    ]);
    expect(mapped.ru?.name).toBe("Холодильник");
    expect(mapped.ro).toBeNull();
  });

  it("preserves bigint values as decimal strings", () => {
    expect(mapDatabaseBigint("9007199254740991")).toBe("9007199254740991");
    expect(mapDatabaseBigint(null)).toBeNull();
  });
});
