import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
vi.mock("@/features/assistant/grounding", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/assistant/grounding")>()),
  buildAssistantContext: vi.fn(),
}));
vi.mock("@/lib/env/server", () => ({
  getAssistantEnvironment: vi.fn(),
  hasSupabaseServiceRoleEnvironment: () => true,
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceRoleSupabaseClient: vi.fn(),
}));

import { buildAssistantContext } from "@/features/assistant/grounding";
import { answerAssistant } from "@/features/assistant/service";
import type {
  AssistantRequest,
  AssistantResponse,
} from "@/features/assistant/types";
import type {
  CatalogProduct,
  PublicSiteSettings,
} from "@/features/catalog/types";
import { getAssistantEnvironment } from "@/lib/env/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service";

const product = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "fridge",
  alternateSlug: "frigider",
  category: {
    id: "22222222-2222-4222-8222-222222222222",
    slug: "fridges",
    alternateSlug: "frigidere",
    presentationKey: "generic",
    name: "Холодильники",
    shortDescription: "",
    description: "",
    seoTitle: null,
    seoDescription: null,
  },
  brand: "Brand",
  model: "M",
  sku: "S",
  name: "Холодильник",
  shortDescription: "",
  description: "",
  seoTitle: null,
  seoDescription: null,
  priceMinor: 949_900,
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

const request: AssistantRequest = {
  locale: "ru",
  question: "Какой холодильник выбрать?",
  history: [],
};

const inserts: Array<Record<string, unknown>> = [];

function groundedContext(overrides: Record<string, unknown> = {}) {
  return {
    products: [product],
    references: [
      {
        id: product.id,
        name: product.name,
        category: product.category.name,
        priceMinor: product.priceMinor,
        currency: "MDL" as const,
        stockStatus: "in_stock" as const,
        url: "/ru/product/fridge",
      },
    ],
    knowledge: [],
    settings,
    directAnswer: null,
    directIntent: null,
    context: '{"catalog":[]}',
    ...overrides,
  };
}

function providerResponse(payload: unknown, status = 200) {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify(payload) } }],
    }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

async function flushTelemetry() {
  await vi.waitFor(() => expect(inserts.length).toBeGreaterThan(0));
}

describe("assistant orchestration", () => {
  beforeEach(() => {
    inserts.length = 0;
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.mocked(createServiceRoleSupabaseClient).mockReturnValue({
      from: () => ({
        insert: async (row: Record<string, unknown>) => {
          inserts.push(row);
          return { error: null };
        },
      }),
    } as unknown as ReturnType<typeof createServiceRoleSupabaseClient>);
    vi.mocked(buildAssistantContext).mockResolvedValue(
      groundedContext() as Awaited<ReturnType<typeof buildAssistantContext>>,
    );
    vi.mocked(getAssistantEnvironment).mockReturnValue({
      provider: "openai-compatible",
      apiKey: "key",
      model: "model",
      baseUrl: "https://provider.example.test",
      timeoutMs: 2_000,
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns the provider answer with server-assembled references", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        providerResponse({
          answer: "Подойдёт эта модель.",
          productIds: [product.id],
        }),
      ),
    );
    const response: AssistantResponse = await answerAssistant(request);
    expect(response).toMatchObject({
      answer: "Подойдёт эта модель.",
      fallbackUsed: false,
    });
    expect(response.references).toEqual([
      expect.objectContaining({ id: product.id, priceMinor: 949_900 }),
    ]);
    await flushTelemetry();
    expect(inserts[0]).toMatchObject({ outcome: "provider_success" });
  });

  it("still shows retrieved cards when the provider cites no product", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        providerResponse({ answer: "Вот что нашлось.", productIds: [] }),
      ),
    );
    const response = await answerAssistant(request);
    expect(response.fallbackUsed).toBe(false);
    expect(response.references).toHaveLength(1);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        providerResponse({
          answer: "Вот что нашлось.",
          productIds: ["unknown"],
        }),
      ),
    );
    const unknownIds = await answerAssistant(request);
    expect(unknownIds.fallbackUsed).toBe(false);
    expect(unknownIds.references).toHaveLength(1);
  });

  it("falls back to the grounded answer when the provider fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 503 })),
    );
    const response = await answerAssistant(request);
    expect(response.fallbackUsed).toBe(true);
    expect(response.answer).toContain("карточках ниже");
    expect(response.references).toHaveLength(1);
    await flushTelemetry();
    expect(inserts[0]).toMatchObject({
      outcome: "unavailable",
      provider: "openai-compatible",
      fallback_used: true,
    });
  });

  it("separates the configured offline mode from a provider incident", async () => {
    vi.mocked(getAssistantEnvironment).mockReturnValue({
      provider: "fallback",
      timeoutMs: 2_000,
    });
    const response = await answerAssistant(request);
    expect(response.fallbackUsed).toBe(true);
    await flushTelemetry();
    expect(inserts[0]).toMatchObject({
      outcome: "deterministic_fallback",
      provider: "fallback",
    });
    expect(String(inserts[0]?.outcome)).toMatch(/^[a-z0-9_]{1,80}$/);
  });

  it("answers store questions deterministically without calling a provider", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(buildAssistantContext).mockResolvedValue(
      groundedContext({
        directAnswer: "Магазин находится по адресу: Chișinău.",
        directIntent: "store_info",
      }) as Awaited<ReturnType<typeof buildAssistantContext>>,
    );
    const response = await answerAssistant(request);
    expect(response).toMatchObject({
      answer: "Магазин находится по адресу: Chișinău.",
      references: [],
      fallbackUsed: false,
    });
    expect(fetchMock).not.toHaveBeenCalled();
    await flushTelemetry();
    expect(inserts[0]).toMatchObject({ outcome: "store_info" });
  });
});
