import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
// `@/features/catalog/data` calls `unstable_cache`, which is unavailable
// outside the Next.js runtime, so the catalog boundary is mocked away.
vi.mock("@/features/catalog/data", () => ({
  getCatalogFacets: vi.fn(),
  getPublicSiteSettings: vi.fn(),
  getPublishedCategories: vi.fn(),
  getPublishedProducts: vi.fn(),
  searchPublishedProducts: vi.fn(),
}));
vi.mock("@/features/assistant/knowledge", () => ({
  searchAssistantKnowledge: vi.fn(async () => []),
}));

import { buildAssistantContext } from "@/features/assistant/grounding";
import type { AssistantRequest } from "@/features/assistant/types";
import {
  getCatalogFacets,
  getPublicSiteSettings,
  getPublishedCategories,
  getPublishedProducts,
  searchPublishedProducts,
} from "@/features/catalog/data";
import type {
  CatalogCategory,
  CatalogProduct,
  PublicSiteSettings,
} from "@/features/catalog/types";

const fridges: CatalogCategory = {
  id: "22222222-2222-4222-8222-222222222222",
  slug: "fridges",
  alternateSlug: "frigidere",
  presentationKey: "generic",
  name: "Холодильники",
  shortDescription: "",
  description: "",
  seoTitle: null,
  seoDescription: null,
};
const washers: CatalogCategory = {
  ...fridges,
  id: "33333333-3333-4333-8333-333333333333",
  slug: "washers",
  alternateSlug: "masini",
  name: "Стиральные машины",
};

const product = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "washer-x",
  alternateSlug: "washer-x-ro",
  category: washers,
  brand: "Brand",
  model: "X",
  sku: "S",
  name: "Стиральная машина X",
  shortDescription: "",
  description: "",
  seoTitle: null,
  seoDescription: null,
  priceMinor: 500_000,
  oldPriceMinor: null,
  currency: "MDL",
  stockStatus: "in_stock",
  isNew: false,
  specifications: [],
  images: [],
  imageTone: "yellow",
} satisfies CatalogProduct;

const settings: PublicSiteSettings = {
  phoneDisplay: "+373 22 000 000",
  phoneHref: "+37322000000",
  address: "Chișinău",
  openDays: "Пн-Сб",
  openTime: "09:00-18:00",
  closedDay: "Воскресенье — выходной",
  contactText: "",
};

function request(overrides: Partial<AssistantRequest> = {}): AssistantRequest {
  return {
    locale: "ru",
    question: "Он хорошо отжимает?",
    history: [],
    ...overrides,
  };
}

function searchResult(products: CatalogProduct[]) {
  return {
    products,
    total: products.length,
    page: 1,
    pageSize: 5,
    pageCount: 1,
  };
}

function scopeOfFirstSearch() {
  return vi.mocked(searchPublishedProducts).mock.calls[0]?.[1];
}

describe("assistant page context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPublicSiteSettings).mockResolvedValue(settings);
    vi.mocked(getPublishedCategories).mockResolvedValue([fridges, washers]);
    vi.mocked(getPublishedProducts).mockResolvedValue([product]);
    vi.mocked(getCatalogFacets).mockResolvedValue({
      brands: ["Brand"],
      availability: ["in_stock"],
      minPriceMinor: null,
      maxPriceMinor: null,
      attributes: [],
    });
    vi.mocked(searchPublishedProducts).mockResolvedValue(
      searchResult([product]),
    );
  });

  it("searches the whole catalog when no page context is sent", async () => {
    await buildAssistantContext(request());
    expect(scopeOfFirstSearch()).toBeUndefined();
  });

  it("scopes retrieval to the category of the current page", async () => {
    await buildAssistantContext(
      request({ page: { type: "category", id: fridges.id } }),
    );
    expect(scopeOfFirstSearch()).toBe(fridges.id);
  });

  it("prefers a category named in the question over the current page", async () => {
    await buildAssistantContext(
      request({
        question: "А холодильник такой есть?",
        page: { type: "category", id: washers.id },
      }),
    );
    expect(scopeOfFirstSearch()).toBe(fridges.id);
  });

  it("keeps inheriting the category from the conversation", async () => {
    await buildAssistantContext(
      request({
        question: "А подешевле?",
        history: [{ role: "user", content: "Покажите холодильники" }],
        page: { type: "category", id: washers.id },
      }),
    );
    expect(scopeOfFirstSearch()).toBe(fridges.id);
  });

  it("grounds a product page with the product and its category", async () => {
    const grounding = await buildAssistantContext(
      request({ page: { type: "product", id: product.id } }),
    );
    expect(scopeOfFirstSearch()).toBe(washers.id);
    const context = JSON.parse(grounding.context) as {
      currentProduct: { id: string; url: string } | null;
    };
    expect(context.currentProduct).toMatchObject({
      id: product.id,
      url: "/ru/product/washer-x",
    });
    expect(grounding.references[0]).toMatchObject({ id: product.id });
    // The viewed product is grounded once, not twice.
    expect(grounding.products).toHaveLength(1);
  });

  it("ignores a page that no longer resolves to a published entity", async () => {
    vi.mocked(getPublishedProducts).mockResolvedValue([]);
    const grounding = await buildAssistantContext(
      request({
        page: { type: "product", id: "44444444-4444-4444-8444-444444444444" },
      }),
    );
    expect(scopeOfFirstSearch()).toBeUndefined();
    expect(
      (JSON.parse(grounding.context) as { currentProduct: unknown })
        .currentProduct,
    ).toBeNull();
  });

  it("answers without page context when the catalog lookup fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(getPublishedProducts).mockRejectedValue(new Error("down"));
    const grounding = await buildAssistantContext(
      request({ page: { type: "product", id: product.id } }),
    );
    expect(scopeOfFirstSearch()).toBeUndefined();
    expect(grounding.products).toHaveLength(1);
  });
});
