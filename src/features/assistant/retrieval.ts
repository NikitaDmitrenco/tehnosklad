import "server-only";

import {
  getCatalogFacets,
  getPublishedCategories,
  getPublishedProducts,
  searchPublishedProducts,
} from "@/features/catalog/data";
import {
  normalizeSearchText,
  searchTokenPrefix,
  searchTokens,
} from "@/features/catalog/search-text";
import type {
  CatalogCategory,
  CatalogProduct,
  CatalogSort,
  StockStatus,
} from "@/features/catalog/types";
import type { AssistantRequest } from "@/features/assistant/types";

export const MAX_ASSISTANT_PRODUCTS = 5;
const MAX_QUERY_LENGTH = 100;
const MAX_KEYWORDS = 6;
const MAX_PRICE_MAJOR = 10_000_000;

export type AssistantCatalogFacts = {
  categories: Array<{ id: string; name: string }>;
  brands: string[];
};

export type AssistantSearchIntent = {
  categoryId: string | null;
  categoryName: string | null;
  brand: string | null;
  availability: StockStatus | null;
  minPriceMinor: number | null;
  maxPriceMinor: number | null;
  sort: CatalogSort;
  keywords: string[];
};

export type AssistantRetrieval = {
  intent: AssistantSearchIntent;
  products: CatalogProduct[];
  currentProduct: CatalogProduct | null;
};

/*
 * Question words carry no catalog signal, and the search predicate requires
 * every token to match, so they must not reach the repository as keywords.
 */
const stopWords = new Set([
  // Currency words: the amount itself is parsed into a price range.
  "лей",
  "леев",
  "лея",
  "lei",
  "leu",
  "mdl",
  // Russian
  "или",
  "это",
  "нибудь",
  "либо",
  "для",
  "все",
  "всех",
  "есть",
  "нет",
  "был",
  "была",
  "как",
  "что",
  "чем",
  "кто",
  "где",
  "когда",
  "какой",
  "какая",
  "какие",
  "каком",
  "какую",
  "мне",
  "меня",
  "вас",
  "ваш",
  "ваши",
  "вам",
  "нас",
  "можно",
  "нужен",
  "нужна",
  "нужно",
  "нужны",
  "хочу",
  "хотел",
  "хотела",
  "ищу",
  "искать",
  "подскажите",
  "посоветуйте",
  "подберите",
  "покажите",
  "помогите",
  "пожалуйста",
  "скажите",
  "расскажите",
  "выбрать",
  "выбор",
  "купить",
  "покупка",
  "заказать",
  "заказ",
  "цена",
  "цены",
  "цену",
  "стоит",
  "стоимость",
  "сколько",
  "самый",
  "самая",
  "самое",
  "лучший",
  "лучшая",
  "лучше",
  "хороший",
  "хорошая",
  "хорошие",
  "магазин",
  "магазина",
  "магазине",
  "товар",
  "товары",
  "товаров",
  "техника",
  "техники",
  "вариант",
  "варианты",
  "модель",
  "модели",
  "наличии",
  "наличие",
  "сейчас",
  "тут",
  "здесь",
  "около",
  "примерно",
  "также",
  "ещё",
  "еще",
  // Romanian (diacritics folded)
  "sau",
  "este",
  "sunt",
  "care",
  "ce",
  "cum",
  "cand",
  "unde",
  "cine",
  "pentru",
  "toate",
  "toti",
  "nu",
  "da",
  "imi",
  "mie",
  "dvs",
  "dumneavoastra",
  "vreau",
  "doresc",
  "caut",
  "am",
  "nevoie",
  "recomandati",
  "recomanda",
  "aratati",
  "arata",
  "spuneti",
  "ajutati",
  "rog",
  "putea",
  "poate",
  "pot",
  "cumpar",
  "cumpara",
  "comanda",
  "comand",
  "pret",
  "preturi",
  "costa",
  "cat",
  "cel",
  "cea",
  "mai",
  "bun",
  "buna",
  "bine",
  "magazin",
  "magazinul",
  "produs",
  "produse",
  "tehnica",
  "optiune",
  "optiuni",
  "model",
  "modele",
  "stoc",
  "ceva",
  "cumva",
  "acum",
  "aici",
  "aproximativ",
  "deci",
]);

function normalizeQuestion(value: string) {
  // "10 000" and "10.000" are one number for price parsing.
  return normalizeSearchText(value).replace(
    /(\d)[\s.\u00a0](?=\d{3}(?:\D|$))/g,
    "$1",
  );
}

function priceMinor(value: string | undefined): number | null {
  if (!value) return null;
  const major = Number(value);
  if (!Number.isSafeInteger(major) || major <= 0 || major > MAX_PRICE_MAJOR)
    return null;
  return major * 100;
}

const rangePatterns = [
  /(?:от|de\s+la|incepand\s+de\s+la)\s+(\d+)\s*(?:лей|lei|mdl)?\s*(?:до|pana\s+la|la)\s+(\d+)/u,
  /(?:между|intre)\s+(\d+)\s*(?:лей|lei|mdl)?\s*(?:и|si)\s+(\d+)/u,
  /(\d+)\s*[-–—]\s*(\d+)\s*(?:лей|lei|mdl)/u,
];
const maximumPatterns = [
  /(?:до|дешевле|не\s+дороже|максимум|в\s+пределах|бюджет(?:\s+до)?)\s+(\d+)/u,
  /(?:pana\s+la|sub|maxim|maximum|buget(?:\s+de)?)\s+(\d+)/u,
];
const minimumPatterns = [
  /(?:от|дороже|не\s+дешевле|минимум)\s+(\d+)/u,
  /(?:de\s+la|peste|minim|minimum)\s+(\d+)/u,
];

function extractPriceRange(question: string) {
  for (const pattern of rangePatterns) {
    const match = question.match(pattern);
    if (!match) continue;
    const first = priceMinor(match[1]);
    const second = priceMinor(match[2]);
    if (first !== null && second !== null)
      return {
        minPriceMinor: Math.min(first, second),
        maxPriceMinor: Math.max(first, second),
      };
  }
  for (const pattern of maximumPatterns) {
    const value = priceMinor(question.match(pattern)?.[1]);
    if (value !== null) return { minPriceMinor: null, maxPriceMinor: value };
  }
  for (const pattern of minimumPatterns) {
    const value = priceMinor(question.match(pattern)?.[1]);
    if (value !== null) return { minPriceMinor: value, maxPriceMinor: null };
  }
  return { minPriceMinor: null, maxPriceMinor: null };
}

function extractAvailability(question: string): StockStatus | null {
  if (/(?:под\s+заказ|la\s+comanda)/u.test(question)) return "on_order";
  if (
    /(?:в\s+наличии|есть\s+в\s+наличи|имеется\s+в\s+наличи|in\s+stoc|pe\s+stoc|disponibil)/u.test(
      question,
    )
  )
    return "in_stock";
  return null;
}

function extractSort(question: string): CatalogSort {
  if (
    /(?:подешевле|дешевле|недорог|бюджетн|самый\s+дешев|самая\s+дешев|mai\s+ieftin|ieftin|buget)/u.test(
      question,
    )
  )
    return "price_asc";
  return "popular";
}

function extractBrand(question: string, brands: string[]): string | null {
  for (const brand of brands) {
    const normalized = normalizeSearchText(brand).trim();
    if (normalized.length < 2) continue;
    const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (
      new RegExp(
        `(?:^|[^\\p{L}\\p{N}])${escaped}(?:[^\\p{L}\\p{N}]|$)`,
        "u",
      ).test(question)
    )
      return brand;
  }
  return null;
}

function tokensMatch(left: string, right: string) {
  if (left === right) return true;
  if (left.length < 4 || right.length < 4) return false;
  return (
    left.startsWith(searchTokenPrefix(right)) ||
    right.startsWith(searchTokenPrefix(left))
  );
}

function extractCategory(
  questionTokens: string[],
  categories: AssistantCatalogFacts["categories"],
) {
  let best: { id: string; name: string; score: number } | null = null;
  for (const category of categories) {
    const categoryTokens = searchTokens(category.name);
    if (!categoryTokens.length) continue;
    const matched = categoryTokens.filter((categoryToken) =>
      questionTokens.some((questionToken) =>
        tokensMatch(questionToken, categoryToken),
      ),
    ).length;
    if (!matched) continue;
    // Prefer the category that the question matches most completely, so
    // "пылесос" resolves to "Пылесосы" rather than "Роботы-пылесосы".
    const score = matched / categoryTokens.length + matched / 100;
    if (!best || score > best.score)
      best = { id: category.id, name: category.name, score };
  }
  return best;
}

export function extractAssistantIntent(
  question: string,
  facts: AssistantCatalogFacts,
): AssistantSearchIntent {
  const normalized = normalizeQuestion(question);
  const tokens = searchTokens(normalized);
  const category = extractCategory(tokens, facts.categories);
  const brand = extractBrand(normalized, facts.brands);
  const brandTokens = brand ? searchTokens(brand) : [];
  const categoryTokens = category ? searchTokens(category.name) : [];
  const keywords = tokens
    .filter(
      (token) =>
        !stopWords.has(token) &&
        !/^\d+$/.test(token) &&
        !brandTokens.some((brandToken) => tokensMatch(token, brandToken)) &&
        !categoryTokens.some((categoryToken) =>
          tokensMatch(token, categoryToken),
        ),
    )
    .slice(0, MAX_KEYWORDS);
  return {
    categoryId: category?.id ?? null,
    categoryName: category?.name ?? null,
    brand,
    availability: extractAvailability(normalized),
    ...extractPriceRange(normalized),
    sort: extractSort(normalized),
    keywords,
  };
}

/*
 * Follow-up questions ("а подешевле?") carry no category of their own, so
 * unset fields inherit from the most recent earlier question.
 */
function mergeIntents(
  current: AssistantSearchIntent,
  previous: AssistantSearchIntent[],
): AssistantSearchIntent {
  const merged = { ...current };
  for (const earlier of previous) {
    if (!merged.categoryId && earlier.categoryId) {
      merged.categoryId = earlier.categoryId;
      merged.categoryName = earlier.categoryName;
    }
    merged.brand ??= earlier.brand;
    merged.availability ??= earlier.availability;
    if (merged.minPriceMinor === null && merged.maxPriceMinor === null) {
      merged.minPriceMinor = earlier.minPriceMinor;
      merged.maxPriceMinor = earlier.maxPriceMinor;
    }
    if (!merged.keywords.length) merged.keywords = earlier.keywords;
  }
  return merged;
}

export function buildAssistantIntent(
  request: AssistantRequest,
  facts: AssistantCatalogFacts,
): AssistantSearchIntent {
  const earlier = request.history
    .filter((message) => message.role === "user")
    .slice(-2)
    .reverse()
    .map((message) => extractAssistantIntent(message.content, facts));
  return mergeIntents(extractAssistantIntent(request.question, facts), earlier);
}

type Probe = {
  categoryId: string | null;
  brand: string | null;
  query: string;
};

/*
 * Bounded relaxation ladder: the strictest probe first, then the variants
 * that recover from an over-specific keyword or a wrong category guess.
 */
export function buildAssistantProbes(intent: AssistantSearchIntent): Probe[] {
  const query = intent.keywords.join(" ").slice(0, MAX_QUERY_LENGTH);
  const probes: Probe[] = [
    { categoryId: intent.categoryId, brand: intent.brand, query },
  ];
  if (query && (intent.categoryId || intent.brand))
    probes.push({
      categoryId: intent.categoryId,
      brand: intent.brand,
      query: "",
    });
  if (intent.categoryId && intent.categoryName)
    // The category guess can be wrong; keep its wording as free text instead.
    probes.push({
      categoryId: null,
      brand: intent.brand,
      query: [...searchTokens(intent.categoryName), ...intent.keywords]
        .join(" ")
        .slice(0, MAX_QUERY_LENGTH),
    });
  return probes.filter(
    (probe, index, all) =>
      all.findIndex(
        (candidate) =>
          candidate.categoryId === probe.categoryId &&
          candidate.brand === probe.brand &&
          candidate.query === probe.query,
      ) === index,
  );
}

/*
 * The page the widget sits on is the weakest category signal: a category named
 * in the question wins, then the one inherited from the conversation, and only
 * a question that resolved to no category at all falls back to the page.
 */
export function applyPageScope(
  intent: AssistantSearchIntent,
  category: { id: string; name: string } | null,
): AssistantSearchIntent {
  if (!category || intent.categoryId) return intent;
  return { ...intent, categoryId: category.id, categoryName: category.name };
}

function pageCategory(
  request: AssistantRequest,
  categories: CatalogCategory[],
): CatalogCategory | null {
  if (request.page?.type !== "category") return null;
  const id = request.page.id;
  return categories.find((category) => category.id === id) ?? null;
}

/*
 * The product of a product page is grounded alongside the search results, so a
 * question like "does it fit?" has the viewed product in context.
 */
async function pageProduct(
  request: AssistantRequest,
): Promise<CatalogProduct | null> {
  if (request.page?.type !== "product") return null;
  const id = request.page.id;
  try {
    const products = await getPublishedProducts(request.locale);
    return products.find((product) => product.id === id) ?? null;
  } catch {
    // Page context is an optimization; the assistant still answers without it.
    console.error("Assistant page product unavailable", {
      code: "assistant_page_product_unavailable",
    });
    return null;
  }
}

export async function retrieveAssistantProducts(
  request: AssistantRequest,
): Promise<AssistantRetrieval> {
  const [categories, facets, currentProduct] = await Promise.all([
    getPublishedCategories(request.locale),
    getCatalogFacets(request.locale),
    pageProduct(request),
  ]);
  const intent = applyPageScope(
    buildAssistantIntent(request, {
      categories: categories.map(({ id, name }) => ({ id, name })),
      brands: facets.brands,
    }),
    currentProduct?.category ?? pageCategory(request, categories),
  );
  for (const probe of buildAssistantProbes(intent)) {
    const result = await searchPublishedProducts(
      request.locale,
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
        pageSize: MAX_ASSISTANT_PRODUCTS,
      },
    );
    if (result.products.length)
      return {
        intent,
        products: result.products.slice(0, MAX_ASSISTANT_PRODUCTS),
        currentProduct,
      };
  }
  return { intent, products: [], currentProduct };
}
