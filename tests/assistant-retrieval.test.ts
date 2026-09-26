import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import {
  buildAssistantIntent,
  buildAssistantProbes,
  extractAssistantIntent,
  type AssistantCatalogFacts,
} from "@/features/assistant/retrieval";
import { DemoCatalogRepository } from "@/features/catalog/demo-repository";
import type { Locale } from "@/i18n/config";

const facts: AssistantCatalogFacts = {
  categories: [
    { id: "fridges", name: "Холодильники" },
    { id: "washers", name: "Стиральные машины" },
    { id: "dishwashers", name: "Посудомоечные машины" },
    { id: "vacuums", name: "Пылесосы" },
    { id: "robots", name: "Роботы-пылесосы" },
  ],
  brands: ["Samsung", "Bosch", "Cooper&Hunter"],
};

describe("assistant intent extraction", () => {
  it("resolves the category a natural question names", () => {
    expect(
      extractAssistantIntent("Какие холодильники есть в наличии?", facts),
    ).toMatchObject({
      categoryId: "fridges",
      availability: "in_stock",
      keywords: [],
    });
    // The question matches "Пылесосы" completely but "Роботы-пылесосы" partly.
    expect(extractAssistantIntent("Подберите пылесос", facts).categoryId).toBe(
      "vacuums",
    );
    expect(
      extractAssistantIntent("нужен робот-пылесос", facts).categoryId,
    ).toBe("robots");
    expect(
      extractAssistantIntent("нужна стиральная машина", facts).categoryId,
    ).toBe("washers");
  });

  it("reads brand, price bounds and ordering out of the wording", () => {
    expect(
      extractAssistantIntent("холодильник Samsung до 15 000 лей", facts),
    ).toMatchObject({
      categoryId: "fridges",
      brand: "Samsung",
      minPriceMinor: null,
      maxPriceMinor: 1_500_000,
      keywords: [],
    });
    expect(
      extractAssistantIntent("пылесос от 2000 до 5000 лей", facts),
    ).toMatchObject({ minPriceMinor: 200_000, maxPriceMinor: 500_000 });
    expect(
      extractAssistantIntent("посудомойка под заказ", facts).availability,
    ).toBe("on_order");
    expect(extractAssistantIntent("пылесос подешевле", facts).sort).toBe(
      "price_asc",
    );
    expect(extractAssistantIntent("aspirator ieftin", facts).sort).toBe(
      "price_asc",
    );
  });

  it("never forwards a raw price or a matched brand as a keyword", () => {
    const intent = extractAssistantIntent(
      "посоветуйте хороший холодильник Bosch до 20000 лей",
      facts,
    );
    expect(intent.keywords).toEqual([]);
    expect(intent.brand).toBe("Bosch");
  });

  it("inherits the category of the conversation for follow-up questions", () => {
    const intent = buildAssistantIntent(
      {
        locale: "ru",
        question: "а подешевле есть?",
        history: [
          { role: "user", content: "Покажите холодильники Samsung" },
          { role: "assistant", content: "Нашёл несколько моделей" },
        ],
      },
      facts,
    );
    expect(intent).toMatchObject({
      categoryId: "fridges",
      brand: "Samsung",
      sort: "price_asc",
    });
  });
});

describe("assistant probe ladder", () => {
  it("relaxes an over-specific question without dropping user constraints", () => {
    const probes = buildAssistantProbes({
      categoryId: "fridges",
      categoryName: "Холодильники",
      brand: "Samsung",
      availability: null,
      minPriceMinor: null,
      maxPriceMinor: null,
      sort: "popular",
      keywords: ["ноуфрост"],
    });
    expect(probes).toEqual([
      { categoryId: "fridges", brand: "Samsung", query: "ноуфрост" },
      { categoryId: "fridges", brand: "Samsung", query: "" },
      { categoryId: null, brand: "Samsung", query: "холодильники ноуфрост" },
    ]);
  });

  it("issues a single unfiltered probe when the question carries no signal", () => {
    expect(
      buildAssistantProbes({
        categoryId: null,
        categoryName: null,
        brand: null,
        availability: null,
        minPriceMinor: null,
        maxPriceMinor: null,
        sort: "popular",
        keywords: [],
      }),
    ).toEqual([{ categoryId: null, brand: null, query: "" }]);
  });
});

/*
 * End-to-end guard over the demo catalog: before token-aware search the
 * built-in quick questions returned nothing at all, because no product is
 * named "холодильник".
 */
describe("assistant retrieval over the demo catalog", () => {
  const repository = new DemoCatalogRepository();

  async function search(locale: Locale, question: string) {
    const [categories, catalogFacets] = await Promise.all([
      repository.getPublishedCategories(locale),
      repository.getAvailableFilters(locale),
    ]);
    const intent = buildAssistantIntent(
      { locale, question, history: [] },
      {
        categories: categories.map(({ id, name }) => ({ id, name })),
        brands: catalogFacets.brands,
      },
    );
    for (const probe of buildAssistantProbes(intent)) {
      const result = await repository.searchPublishedProducts(
        locale,
        probe.categoryId ?? undefined,
        {
          query: probe.query,
          brand: probe.brand,
          availability: intent.availability,
          minPriceMinor: intent.minPriceMinor,
          maxPriceMinor: intent.maxPriceMinor,
          attributes: {},
          sort: intent.sort,
          page: 1,
          pageSize: 5,
        },
      );
      if (result.products.length) return { intent, products: result.products };
    }
    return { intent, products: [] };
  }

  it.each([
    ["ru", "Какие холодильники есть в наличии?", "Холодильники"],
    ["ru", "Подберите пылесос", "Пылесосы"],
    ["ru", "микроволновка", "Микроволновые печи"],
    ["ro", "Ce frigidere sunt în stoc?", "Frigidere"],
    ["ro", "am nevoie de o mașină de spălat", "Mașini de spălat rufe"],
  ] as const)(
    "answers %s %j with %s products",
    async (locale, question, category) => {
      const { products } = await search(locale, question);
      expect(products.length).toBeGreaterThan(0);
      expect(
        products.every((product) => product.category.name === category),
      ).toBe(true);
    },
  );

  it("honours a stated budget", async () => {
    const { products } = await search("ru", "стиральная машина до 12000 лей");
    expect(products.length).toBeGreaterThan(0);
    expect(products.every((product) => product.priceMinor <= 1_200_000)).toBe(
      true,
    );
  });

  it("falls back to popular products only when nothing was asked for", async () => {
    expect(
      (await search("ru", "посоветуйте что-нибудь")).products,
    ).not.toHaveLength(0);
    expect(
      (await search("ru", "какая у вас гарантия на технику")).products,
    ).toHaveLength(0);
  });
});
