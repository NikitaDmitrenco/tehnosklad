import type { AdminCategory } from "@/features/admin/types";

export type AdminTranslationRow = {
  locale: "ru" | "ro";
  name: string;
  slug: string;
  short_description: string;
  description: string;
  seo_title: string | null;
  seo_description: string | null;
};

export function mapAdminTranslations(rows: AdminTranslationRow[]) {
  const map = { ru: null, ro: null } as AdminCategory["translations"];
  for (const row of rows) {
    map[row.locale] = {
      name: row.name,
      slug: row.slug,
      shortDescription: row.short_description,
      description: row.description,
      seoTitle: row.seo_title ?? "",
      seoDescription: row.seo_description ?? "",
    };
  }
  return map;
}

export function mapDatabaseBigint(value: string | number | null) {
  return value === null ? null : String(value);
}
