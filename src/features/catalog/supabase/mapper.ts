import { CatalogDataError } from "@/features/catalog/repository";
import type {
  CatalogCategory,
  CatalogFacets,
  CatalogProduct,
  CatalogSitemapEntry,
  ProductSpecification,
  PublicSiteSettings,
} from "@/features/catalog/types";
import type { Locale } from "@/i18n/config";
import type {
  DbCatalogFacetsRow,
  DbCategoryRow,
  DbProductRow,
  DbSiteSettingRow,
  DbSpecificationRow,
} from "@/features/catalog/supabase/rows";

function integrity(message: string): never {
  throw new CatalogDataError("invalid_data", message);
}

function translationFor<T extends { locale: Locale }>(
  translations: T[],
  locale: Locale,
  entity: string,
): T {
  const matches = translations.filter(
    (translation) => translation.locale === locale,
  );
  if (matches.length !== 1) {
    throw new CatalogDataError(
      "missing_translation",
      `${entity} requires exactly one ${locale} translation`,
    );
  }
  return matches[0]!;
}

function alternateLocale(locale: Locale): Locale {
  return locale === "ru" ? "ro" : "ru";
}

function minorUnits(value: number | string, field: string): number {
  let parsed: bigint;
  try {
    parsed = BigInt(value);
  } catch {
    return integrity(`${field} must be an integer`);
  }
  if (parsed < BigInt(0) || parsed > BigInt(Number.MAX_SAFE_INTEGER)) {
    return integrity(`${field} is outside the safe integer range`);
  }
  return Number(parsed);
}

export function mapCategoryRow(
  row: DbCategoryRow,
  locale: Locale,
): CatalogCategory {
  const translation = translationFor(
    row.category_translations,
    locale,
    `Category ${row.id}`,
  );
  const alternate = translationFor(
    row.category_translations,
    alternateLocale(locale),
    `Category ${row.id}`,
  );
  return {
    id: row.id,
    slug: translation.slug,
    alternateSlug: alternate.slug,
    presentationKey: row.presentation_key,
    name: translation.name,
    shortDescription: translation.short_description,
    description: translation.description,
    seoTitle: translation.seo_title,
    seoDescription: translation.seo_description,
    imageUrl: null,
  };
}

function displaySpecification(row: DbSpecificationRow, locale: Locale): string {
  const attribute = row.attributes;
  const translation = translationFor(
    attribute.attribute_translations,
    locale,
    `Attribute ${attribute.code}`,
  );
  switch (attribute.data_type) {
    case "text":
      return translationFor(
        row.product_attribute_value_translations,
        locale,
        `Attribute value ${row.id}`,
      ).text_value;
    case "number": {
      if (row.number_value === null) return integrity("Missing number value");
      const suffix = translation.unit_label ? ` ${translation.unit_label}` : "";
      return `${row.number_value}${suffix}`;
    }
    case "boolean":
      if (row.boolean_value === null) return integrity("Missing boolean value");
      return row.boolean_value
        ? locale === "ru"
          ? "Да"
          : "Da"
        : locale === "ru"
          ? "Нет"
          : "Nu";
    case "single_select":
    case "multi_select":
      if (!row.attribute_options) return integrity("Missing select option");
      return translationFor(
        row.attribute_options.attribute_option_translations,
        locale,
        `Attribute option ${row.attribute_options.code}`,
      ).label;
    case "color":
      if (!row.color_value) return integrity("Missing color value");
      return row.color_value;
  }
}

function filterSpecification(row: DbSpecificationRow): string {
  switch (row.attributes.data_type) {
    case "text":
      if (!row.text_value_key) return integrity("Missing text value key");
      return row.text_value_key;
    case "number":
      if (row.number_value === null) return integrity("Missing number value");
      return String(row.number_value)
        .replace(/(\.\d*?)0+$/, "$1")
        .replace(/\.$/, "");
    case "boolean":
      if (row.boolean_value === null) return integrity("Missing boolean value");
      return String(row.boolean_value);
    case "single_select":
    case "multi_select":
      if (!row.attribute_options) return integrity("Missing select option");
      return row.attribute_options.code;
    case "color":
      if (!row.color_value) return integrity("Missing color value");
      return row.color_value.toLowerCase();
  }
}

export function mapSpecificationRow(
  row: DbSpecificationRow,
  locale: Locale,
): ProductSpecification {
  const attributeTranslation = translationFor(
    row.attributes.attribute_translations,
    locale,
    `Attribute ${row.attributes.code}`,
  );
  const group = row.attributes.attribute_groups;
  const bindings = row.attributes.category_attributes.filter(
    (binding) => binding.category_id === row.products.category_id,
  );
  if (bindings.length !== 1) {
    return integrity("Attribute requires exactly one category binding");
  }
  const binding = bindings[0]!;
  return {
    code: row.attributes.code,
    groupCode: group?.code ?? null,
    groupName: group
      ? translationFor(
          group.attribute_group_translations,
          locale,
          `Attribute group ${group.code}`,
        ).name
      : null,
    label: attributeTranslation.name,
    displayValue: displaySpecification(row, locale),
    filterValue: filterSpecification(row),
    dataType: row.attributes.data_type,
    isFilterable: binding.is_filterable ?? row.attributes.is_filterable,
    sortOrder:
      (group?.sort_order ?? 0) * 1_000_000 +
      binding.sort_order * 1000 +
      row.ordinal,
  };
}

export function mapProductRow(
  row: DbProductRow,
  specificationRows: DbSpecificationRow[],
  locale: Locale,
): CatalogProduct {
  const translation = translationFor(
    row.product_translations,
    locale,
    `Product ${row.id}`,
  );
  const alternate = translationFor(
    row.product_translations,
    alternateLocale(locale),
    `Product ${row.id}`,
  );
  const priceMinor = minorUnits(row.price_minor, "price_minor");
  const oldPriceMinor =
    row.old_price_minor === null
      ? null
      : minorUnits(row.old_price_minor, "old_price_minor");
  if (oldPriceMinor !== null && oldPriceMinor <= priceMinor) {
    return integrity("old_price_minor must exceed price_minor");
  }
  if (row.currency !== "MDL") return integrity("Unsupported currency");

  return {
    id: row.id,
    slug: translation.slug,
    alternateSlug: alternate.slug,
    category: mapCategoryRow(row.categories, locale),
    brand: row.brand,
    model: row.model,
    sku: row.sku,
    name: translation.name,
    shortDescription: translation.short_description,
    description: translation.description,
    seoTitle: translation.seo_title,
    seoDescription: translation.seo_description,
    priceMinor,
    oldPriceMinor,
    currency: "MDL",
    stockStatus: row.availability,
    isNew: row.is_new,
    specifications: specificationRows
      .filter((specification) => specification.product_id === row.id)
      .map((specification) => mapSpecificationRow(specification, locale))
      .toSorted((a, b) => a.sortOrder - b.sortOrder),
    images: row.product_images
      .map((image) => ({
        id: image.id,
        url: image.public_url,
        storagePath: image.storage_path,
        alt: translationFor(
          image.product_image_translations,
          locale,
          `Product image ${image.id}`,
        ).alt_text,
        isPrimary: image.is_primary,
        sortOrder: image.sort_order,
      }))
      .toSorted(
        (a, b) =>
          Number(b.isPrimary) - Number(a.isPrimary) ||
          a.sortOrder - b.sortOrder,
      )
      .map((image) => ({
        id: image.id,
        url: image.url,
        storagePath: image.storagePath,
        alt: image.alt,
        isPrimary: image.isPrimary,
      })),
    imageTone: ["yellow", "blue", "mint", "coral"][
      row.id.charCodeAt(row.id.length - 1) % 4
    ] as CatalogProduct["imageTone"],
  };
}

// Postgres folds the filters; ordering stays here so brands and options keep
// the order the application has always produced, whatever collation the
// database runs.
export function mapCatalogFacetsRow(row: DbCatalogFacetsRow): CatalogFacets {
  return {
    brands: row.brands.toSorted(),
    availability: row.availability.toSorted(),
    minPriceMinor: row.min_price_minor,
    maxPriceMinor: row.max_price_minor,
    attributes: row.attributes.map((attribute) => ({
      code: attribute.code,
      label: attribute.label,
      dataType: attribute.data_type,
      options: attribute.options.toSorted((left, right) =>
        left.label.localeCompare(right.label),
      ),
    })),
  };
}

// An entry needs both locales to produce a URL and its alternate, so one that
// cannot be linked in both is left out rather than throwing: a half-translated
// row must not take the whole sitemap down.
export function mapSitemapEntries(
  rows: Array<{
    id: string;
    translations: Array<{ locale: Locale; slug: string }>;
  }>,
): CatalogSitemapEntry[] {
  return rows.flatMap((row) => {
    const ru = row.translations.find((item) => item.locale === "ru")?.slug;
    const ro = row.translations.find((item) => item.locale === "ro")?.slug;
    return ru && ro ? [{ id: row.id, slugs: { ru, ro } }] : [];
  });
}

const settingKeys: Record<keyof PublicSiteSettings, string> = {
  phoneDisplay: "phone_display",
  phoneHref: "phone_href",
  address: "address",
  openDays: "open_days",
  openTime: "open_time",
  closedDay: "closed_day",
  contactText: "contact_text",
};

export function mapSiteSettings(rows: DbSiteSettingRow[]): PublicSiteSettings {
  return Object.fromEntries(
    Object.entries(settingKeys).map(([property, key]) => {
      const matches = rows.filter((row) => row.key === key);
      if (matches.length !== 1) {
        throw new CatalogDataError(
          "invalid_data",
          `Public setting ${key} is missing or duplicated`,
        );
      }
      return [property, matches[0]!.value];
    }),
  ) as PublicSiteSettings;
}
