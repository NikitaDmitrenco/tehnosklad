import "server-only";
import {
  getPublicSiteSettings,
  getPublishedCategories,
} from "@/features/catalog/data";
import type {
  CatalogProduct,
  PublicSiteSettings,
} from "@/features/catalog/types";
import { localizedPath, type Locale } from "@/i18n/config";
import type {
  AssistantReference,
  AssistantRequest,
} from "@/features/assistant/types";
import { answerDirectQuestion } from "@/features/assistant/direct-answer";
import { searchAssistantKnowledge } from "@/features/assistant/knowledge";
import {
  MAX_ASSISTANT_PRODUCTS,
  retrieveAssistantProducts,
  type AssistantSearchIntent,
} from "@/features/assistant/retrieval";
import { siteConfig } from "@/config/site";
import {
  getLegalOperatorConfig,
  type LegalOperatorConfig,
} from "@/lib/env/legal";

const MAX_PRODUCTS = MAX_ASSISTANT_PRODUCTS;
const MAX_CONTEXT_CATEGORIES = 30;

function publicContext(
  settings: PublicSiteSettings,
  operator: LegalOperatorConfig,
) {
  return {
    store: {
      name: siteConfig.name,
      address: settings.address,
      phone: settings.phoneDisplay,
      openDays: settings.openDays,
      openTime: settings.openTime,
      closedDay: settings.closedDay,
      contactText: settings.contactText,
    },
    legalOperator: {
      name: operator.name,
      idno: operator.idno,
      legalAddress: operator.legalAddress,
      privacyEmail: operator.privacyEmail,
      responsiblePerson: operator.responsiblePerson,
    },
  };
}

/*
 * The resolved search is part of the grounding: it lets the provider say what
 * the catalog was actually filtered by instead of guessing.
 */
function searchContext(intent: AssistantSearchIntent) {
  return {
    category: intent.categoryName,
    brand: intent.brand,
    availability: intent.availability,
    minPriceMinor: intent.minPriceMinor,
    maxPriceMinor: intent.maxPriceMinor,
    keywords: intent.keywords,
  };
}

function catalogEntry(product: CatalogProduct, locale: Locale) {
  return {
    id: product.id,
    name: product.name,
    category: product.category.name,
    brand: product.brand,
    model: product.model,
    priceMinor: product.priceMinor,
    currency: product.currency,
    stockStatus: product.stockStatus,
    specifications: product.specifications
      .slice(0, 8)
      .map((spec) => ({ label: spec.label, value: spec.displayValue })),
    url: referenceFor(product, locale).url,
  };
}

export async function buildAssistantContext(request: AssistantRequest) {
  const settings = await getPublicSiteSettings(request.locale);
  const operator = getLegalOperatorConfig();
  const direct = answerDirectQuestion(
    request.locale,
    request.question,
    settings,
    operator,
  );
  const baseContext = publicContext(settings, operator);
  if (direct) {
    return {
      products: [],
      references: [],
      knowledge: [],
      settings,
      directAnswer: direct.answer,
      directIntent: direct.intent,
      context: JSON.stringify({
        ...baseContext,
        knowledge: [],
        categories: [],
        catalog: [],
      }),
    };
  }

  const [retrieval, knowledge, categories] = await Promise.all([
    retrieveAssistantProducts(request),
    searchAssistantKnowledge(request.locale, request.question),
    getPublishedCategories(request.locale),
  ]);
  const currentProduct = retrieval.currentProduct;
  // The viewed product leads the grounded catalog so its card can be shown.
  const products = [
    ...(currentProduct ? [currentProduct] : []),
    ...retrieval.products.filter(
      (product) => product.id !== currentProduct?.id,
    ),
  ].slice(0, MAX_PRODUCTS);
  const references = products.map((product) =>
    referenceFor(product, request.locale),
  );
  const catalog = products.map((product) =>
    catalogEntry(product, request.locale),
  );
  return {
    products,
    references,
    knowledge,
    settings,
    directAnswer: null,
    directIntent: null,
    context: JSON.stringify({
      ...baseContext,
      knowledge: knowledge.map(({ id, title, content, source }) => ({
        id,
        title,
        content,
        source,
      })),
      // Published category names let the provider offer a narrower question
      // instead of inventing product groups the store does not carry.
      categories: categories
        .slice(0, MAX_CONTEXT_CATEGORIES)
        .map((category) => category.name),
      search: searchContext(retrieval.intent),
      currentProduct: currentProduct
        ? catalogEntry(currentProduct, request.locale)
        : null,
      catalog,
    }),
  };
}

/*
 * Product references are always assembled from authoritative catalog DTOs.
 * The provider can select IDs but cannot create names, prices or URLs.
 */
export function referenceFor(
  product: CatalogProduct,
  locale: Locale,
): AssistantReference {
  return {
    id: product.id,
    name: product.name,
    category: product.category.name,
    priceMinor: product.priceMinor,
    currency: product.currency,
    stockStatus: product.stockStatus,
    url: localizedPath(locale, `product/${product.slug}`),
  };
}
export function referencesForIds(
  products: CatalogProduct[],
  locale: Locale,
  ids: string[],
): AssistantReference[] {
  const selected = new Set(ids);
  return products
    .filter((product) => selected.has(product.id))
    .slice(0, MAX_PRODUCTS)
    .map((product) => referenceFor(product, locale));
}
