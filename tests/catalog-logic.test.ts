import { describe, expect, it } from "vitest";

import {
  defaultCatalogFilters,
  filterProducts,
  formatPrice,
  getDiscountPercent,
} from "@/features/catalog/logic";
import type { CatalogProduct } from "@/features/catalog/types";

function createTestProduct(partial: Partial<CatalogProduct>): CatalogProduct {
  return {
    id: "p1",
    slug: "p1",
    alternateSlug: "p1",
    category: {
      id: "vacuums",
      slug: "vacuums",
      alternateSlug: "vacuums",
      presentationKey: "vacuum",
      name: "Пылесосы",
      shortDescription: "Пылесосы",
      description: "Пылесосы",
      seoTitle: null,
      seoDescription: null,
    },
    brand: "TestBrand",
    model: "Model 1",
    sku: "SKU-1",
    name: "Пылесос Test 1",
    shortDescription: "Коротко",
    description: "Описание",
    seoTitle: null,
    seoDescription: null,
    priceMinor: 219000,
    oldPriceMinor: null,
    currency: "MDL",
    stockStatus: "in_stock",
    isNew: false,
    specifications: [],
    images: [],
    imageTone: "blue",
    ...partial,
  };
}

describe("catalog business logic", () => {
  it("formats integer minor units as MDL", () => {
    expect(formatPrice(789000, "ru")).toMatch(/7.?890 MDL/);
    expect(formatPrice(12345, "ro")).toContain("123,45");
    expect(() => formatPrice(-1, "ru")).toThrow(RangeError);
  });

  it("only returns a valid discount", () => {
    expect(getDiscountPercent(80000, 100000)).toBe(20);
    expect(getDiscountPercent(100000, 100000)).toBeNull();
    expect(getDiscountPercent(100000, 90000)).toBeNull();
  });

  it("filters major-unit input against minor-unit prices", () => {
    const products: CatalogProduct[] = [
      createTestProduct({ id: "p1", priceMinor: 289000 }),
      createTestProduct({ id: "p2", priceMinor: 219000 }),
      createTestProduct({ id: "p3", priceMinor: 249000 }),
      createTestProduct({ id: "p4", priceMinor: 150000 }),
    ];
    const filtered = filterProducts(
      products,
      {
        ...defaultCatalogFilters,
        categoryId: "vacuums",
        minPrice: "2000",
        sort: "price_asc",
      },
      "ru",
    );
    expect(filtered.map((product) => product.priceMinor)).toEqual([
      219000, 249000, 289000,
    ]);
  });

  it("keeps Romanian demo values localized", () => {
    const product = createTestProduct({
      name: "Frigider Nord Cool 300",
      specifications: [
        {
          code: "c1",
          groupCode: "general",
          groupName: "General",
          label: "Capacitate",
          displayValue: "300 l",
          filterValue: "300 l",
          dataType: "text",
          isFilterable: false,
          sortOrder: 1,
        },
        {
          code: "c2",
          groupCode: "general",
          groupName: "General",
          label: "Clasă",
          displayValue: "A",
          filterValue: "A",
          dataType: "text",
          isFilterable: false,
          sortOrder: 2,
        },
        {
          code: "c3",
          groupCode: "general",
          groupName: "General",
          label: "Caracteristică",
          displayValue: "două compartimente",
          filterValue: "două compartimente",
          dataType: "text",
          isFilterable: false,
          sortOrder: 3,
        },
      ],
    });
    expect(product.name).toContain("Frigider");
    expect(product.specifications[2]!.displayValue).toBe("două compartimente");
  });

  it.each([
    ["number_value", "350", "number"],
    ["boolean_value", "true", "boolean"],
    ["select_value", "a_plus", "single_select"],
    ["multi_value", "eco", "multi_select"],
    ["color_value", "#ffffff", "color"],
  ] as const)(
    "filters %s by its canonical value",
    (code, filterValue, dataType) => {
      const product = createTestProduct({
        specifications: [
          {
            code,
            groupCode: "general",
            groupName: "General",
            label: "Localized label",
            displayValue: "Localized value",
            filterValue,
            dataType,
            isFilterable: true,
            sortOrder: 1,
          },
        ],
      });
      expect(
        filterProducts(
          [product],
          {
            ...defaultCatalogFilters,
            attributes: { [code]: filterValue },
          },
          "ro",
        ),
      ).toHaveLength(1);
    },
  );
});
