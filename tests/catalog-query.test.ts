import { describe, expect, it } from "vitest";

import {
  catalogQueryHref,
  hasCatalogFilters,
  isCanonicalCatalogSearchParams,
  parseCatalogSearchParams,
  serializeCatalogSearchParams,
  toCatalogSearchQuery,
} from "@/features/catalog/query";

describe("catalog URL query contract", () => {
  it("normalizes filters into one stable canonical order", () => {
    const raw = {
      sort: "price_desc",
      q: "  Nord   Cool  ",
      price_min: "00100,50",
      price_max: "50",
      attr_energy_class: " A+ ",
      availability: "in_stock",
      page: "02",
    };
    const state = parseCatalogSearchParams(raw);

    expect(state).toMatchObject({
      query: "Nord Cool",
      minPrice: "50",
      maxPrice: "100.5",
      sort: "price_desc",
      page: 2,
      attributes: { energy_class: "A+" },
    });
    expect(serializeCatalogSearchParams(state).toString()).toBe(
      "q=Nord+Cool&availability=in_stock&price_min=50&price_max=100.5&attr_energy_class=A%2B&sort=price_desc&page=2",
    );
    expect(isCanonicalCatalogSearchParams(raw, state)).toBe(false);
    expect(catalogQueryHref("/ru/catalog", state)).toContain("/ru/catalog?");
  });

  it("drops unsupported and repeated values and bounds the page", () => {
    const state = parseCatalogSearchParams({
      q: ["one", "two"],
      brand: "Brand",
      sort: "invalid",
      availability: "unknown",
      page: "99999",
      price_min: "-1",
      attr_BAD: "ignored",
    });

    expect(state).toMatchObject({
      query: "",
      brand: "Brand",
      sort: "popular",
      availability: "",
      page: 1,
      minPrice: "",
      attributes: {},
    });
    expect(hasCatalogFilters(state)).toBe(true);
  });

  it("converts decimal display prices to exact minor units", () => {
    const query = toCatalogSearchQuery(
      parseCatalogSearchParams({ price_min: "0.01", price_max: "7890" }),
    );
    expect(query).toMatchObject({
      minPriceMinor: 1,
      maxPriceMinor: 789000,
      pageSize: 9,
    });
  });
});
