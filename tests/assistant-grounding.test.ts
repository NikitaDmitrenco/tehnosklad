import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { referenceFor, referencesForIds } from "@/features/assistant/grounding";
import type { CatalogProduct } from "@/features/catalog/types";

const product = {
  id: "id-1",
  slug: "safe-product",
  alternateSlug: "safe-product-ro",
  category: {
    id: "c",
    slug: "c",
    alternateSlug: "c",
    presentationKey: "generic",
    name: "Safe",
    shortDescription: "",
    description: "",
    seoTitle: null,
    seoDescription: null,
  },
  brand: "Brand",
  model: "M",
  sku: "S",
  name: "Safe product",
  shortDescription: "",
  description: "",
  seoTitle: null,
  seoDescription: null,
  priceMinor: 12345,
  oldPriceMinor: null,
  currency: "MDL",
  stockStatus: "in_stock",
  isNew: false,
  specifications: [],
  images: [],
  imageTone: "yellow",
} satisfies CatalogProduct;
describe("assistant grounding", () => {
  it("constructs canonical references from catalog DTOs, never model text", () => {
    expect(referenceFor(product, "ro")).toMatchObject({
      url: "/ro/product/safe-product",
      priceMinor: 12345,
    });
    expect(
      referencesForIds([product], "ru", ["id-1", "https://evil.test"]),
    ).toEqual([referenceFor(product, "ru")]);
  });
});
