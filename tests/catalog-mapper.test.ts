import { describe, expect, it } from "vitest";

import { CatalogDataError } from "@/features/catalog/repository";
import {
  mapCategoryRow,
  mapProductRow,
  mapSiteSettings,
} from "@/features/catalog/supabase/mapper";
import type {
  DbCategoryRow,
  DbProductRow,
  DbSpecificationRow,
} from "@/features/catalog/supabase/rows";

const category: DbCategoryRow = {
  id: "category-1",
  presentation_key: "fridge",
  sort_order: 1,
  category_translations: [
    {
      locale: "ru",
      name: "Холодильники",
      slug: "refrigerators",
      short_description: "Коротко",
      description: "Описание",
      seo_title: null,
      seo_description: null,
    },
    {
      locale: "ro",
      name: "Frigidere",
      slug: "frigidere",
      short_description: "Scurt",
      description: "Descriere",
      seo_title: null,
      seo_description: null,
    },
  ],
};

const product: DbProductRow = {
  id: "product-1",
  brand: "Nord",
  model: "Cool 300",
  sku: "SKU-1",
  price_minor: "789000",
  old_price_minor: "849000",
  currency: "MDL",
  availability: "on_order",
  is_new: false,
  sort_order: 1,
  categories: category,
  product_translations: [
    {
      locale: "ru",
      name: "Холодильник",
      slug: "holodilnik",
      short_description: "Коротко",
      description: "Полное описание",
      seo_title: null,
      seo_description: null,
    },
    {
      locale: "ro",
      name: "Frigider",
      slug: "frigider",
      short_description: "Scurt",
      description: "Descriere completă",
      seo_title: null,
      seo_description: null,
    },
  ],
  product_images: [
    {
      id: "image-2",
      storage_path: "product/image-2.webp",
      public_url: "https://example.test/image-2.webp",
      sort_order: 2,
      is_primary: false,
      product_image_translations: [
        { locale: "ru", alt_text: "Сбоку" },
        { locale: "ro", alt_text: "Lateral" },
      ],
    },
    {
      id: "image-1",
      storage_path: "product/image-1.webp",
      public_url: "https://example.test/image-1.webp",
      sort_order: 9,
      is_primary: true,
      product_image_translations: [
        { locale: "ru", alt_text: "Главное" },
        { locale: "ro", alt_text: "Principal" },
      ],
    },
  ],
};

const specification: DbSpecificationRow = {
  id: "value-1",
  product_id: "product-1",
  ordinal: 0,
  text_value_key: null,
  number_value: null,
  boolean_value: null,
  color_value: null,
  product_attribute_value_translations: [],
  products: { category_id: "category-1" },
  attributes: {
    code: "energy_class",
    data_type: "single_select",
    is_filterable: true,
    sort_order: 2,
    category_attributes: [
      {
        category_id: "category-1",
        is_filterable: true,
        sort_order: 3,
      },
    ],
    attribute_translations: [
      { locale: "ru", name: "Класс", unit_label: null },
      { locale: "ro", name: "Clasă", unit_label: null },
    ],
    attribute_groups: {
      code: "general",
      sort_order: 1,
      attribute_group_translations: [
        { locale: "ru", name: "Основные" },
        { locale: "ro", name: "Principale" },
      ],
    },
  },
  attribute_options: {
    code: "a_plus",
    attribute_option_translations: [
      { locale: "ru", label: "A+" },
      { locale: "ro", label: "A+" },
    ],
  },
};

describe("Supabase catalog mapper", () => {
  it("maps money, locale, availability, images and specifications", () => {
    const mapped = mapProductRow(product, [specification], "ro");
    expect(mapped).toMatchObject({
      name: "Frigider",
      slug: "frigider",
      alternateSlug: "holodilnik",
      priceMinor: 789000,
      oldPriceMinor: 849000,
      stockStatus: "on_order",
    });
    expect(mapped.images.map((image) => image.id)).toEqual([
      "image-1",
      "image-2",
    ]);
    expect(mapped.specifications[0]).toMatchObject({
      label: "Clasă",
      displayValue: "A+",
      filterValue: "a_plus",
      isFilterable: true,
    });
  });

  it("fails closed when a translation is absent", () => {
    expect(() =>
      mapCategoryRow(
        {
          ...category,
          category_translations: [category.category_translations[0]!],
        },
        "ro",
      ),
    ).toThrowError(CatalogDataError);
  });

  it("rejects malformed old prices and unsafe amounts", () => {
    expect(() =>
      mapProductRow({ ...product, old_price_minor: "789000" }, [], "ru"),
    ).toThrow(/old_price_minor/);
    expect(() =>
      mapProductRow({ ...product, price_minor: "9007199254740992" }, [], "ru"),
    ).toThrow(/safe integer/);
  });

  it("maps only a complete public settings whitelist", () => {
    expect(
      mapSiteSettings([
        { key: "phone_display", value: "+373" },
        { key: "phone_href", value: "tel:+373" },
        { key: "address", value: "Address" },
        { key: "open_days", value: "Days" },
        { key: "open_time", value: "08:00" },
        { key: "closed_day", value: "Monday" },
        { key: "contact_text", value: "Call" },
      ]),
    ).toMatchObject({ phoneDisplay: "+373", closedDay: "Monday" });
    expect(() => mapSiteSettings([])).toThrow(CatalogDataError);
  });
});
