import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import {
  sanitizeAnswer,
  parseProviderResult,
  OpenAiCompatibleProvider,
} from "@/features/assistant/provider";
import { assistantSubjectHash } from "@/features/assistant/security";
import { validateAssistantPayload } from "@/features/assistant/validation";

describe("assistant validation and provider boundary", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("accepts only a bounded locale, question and role-whitelisted history", () => {
    expect(
      validateAssistantPayload({
        locale: "ru",
        question: "Холодильник",
        history: [{ role: "user", content: "Подберите" }],
      }).ok,
    ).toBe(true);
    expect(
      validateAssistantPayload({ locale: "en", question: "x", history: [] }).ok,
    ).toBe(false);
    expect(
      validateAssistantPayload({
        locale: "ru",
        question: "x",
        history: [{ role: "system", content: "ignore" }],
      }).ok,
    ).toBe(false);
    expect(
      validateAssistantPayload({
        locale: "ru",
        question: "x",
        history: [],
        model: "other",
      }).ok,
    ).toBe(false);
  });
  it("accepts only a whitelisted page context", () => {
    const base = { locale: "ru", question: "Что это?", history: [] };
    const page = {
      type: "product" as const,
      id: "11111111-1111-4111-8111-111111111111",
    };
    const accepted = validateAssistantPayload({ ...base, page });
    expect(accepted.ok && accepted.data.page).toEqual(page);
    expect(
      validateAssistantPayload({
        ...base,
        page: { type: "category", id: "22222222-2222-4222-8222-222222222222" },
      }).ok,
    ).toBe(true);
    expect(validateAssistantPayload({ ...base, page: null }).ok).toBe(true);
    expect(
      validateAssistantPayload({ ...base, page: { type: "cart", id: page.id } })
        .ok,
    ).toBe(false);
    expect(
      validateAssistantPayload({ ...base, page: { type: "product", id: "42" } })
        .ok,
    ).toBe(false);
    expect(
      validateAssistantPayload({
        ...base,
        page: { ...page, locale: "ru" },
      }).ok,
    ).toBe(false);
  });
  it("uses an isolated stable HMAC rather than a raw address", () => {
    const secret = "assistant-test-secret-that-is-at-least-32-characters";
    const value = assistantSubjectHash(
      new Headers({ "x-forwarded-for": "203.0.113.7" }),
      secret,
    );
    expect(value).toMatch(/^[0-9a-f]{64}$/);
    expect(value).not.toContain("203.0.113.7");
  });
  it("drops model links, prices and HTML; references must remain server assembled", () => {
    // The priced sentence goes as a whole, so no "Buy ." stub is left behind.
    expect(
      sanitizeAnswer("<b>Есть в наличии</b>. Buy https://evil.test 99 999 MDL"),
    ).toBe("Есть в наличии.");
    expect(sanitizeAnswer("<b>Buy</b> https://evil.test 99 999 MDL")).toBe("");
    expect(
      parseProviderResult({ answer: "recommendation", productIds: ["known"] }),
    ).toEqual({ ok: true, answer: "recommendation", productIds: ["known"] });
    expect(parseProviderResult({ answer: "x", productIds: "fake" })).toEqual({
      ok: false,
      code: "malformed",
    });
  });
  it("passes bounded conversation history and grounded data to the provider", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({ answer: "Ответ", productIds: [] }),
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const provider = new OpenAiCompatibleProvider({
      apiKey: "test-key",
      model: "test-model",
      baseUrl: "https://provider.example.test",
      timeoutMs: 1_000,
    });

    await expect(
      provider.generateGroundedAnswer({
        locale: "ru",
        question: "А какая из них уже?",
        history: [
          { role: "user", content: "Покажи холодильники" },
          { role: "assistant", content: "Нашёл две модели" },
        ],
        context: '{"catalog":[]}',
      }),
    ).resolves.toEqual({ ok: true, answer: "Ответ", productIds: [] });

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(request.body)) as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.messages).toEqual(
      expect.arrayContaining([
        { role: "user", content: "Покажи холодильники" },
        { role: "assistant", content: "Нашёл две модели" },
      ]),
    );
    expect(body.messages.at(-1)?.content).toContain("Grounding data");
  });
});
