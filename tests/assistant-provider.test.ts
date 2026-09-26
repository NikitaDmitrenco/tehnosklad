import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import {
  AnthropicProvider,
  DeterministicProvider,
  OpenAiCompatibleProvider,
  sanitizeAnswer,
} from "@/features/assistant/provider";
import type { ProviderInput } from "@/features/assistant/types";

const input: ProviderInput = {
  locale: "ru",
  question: "Какой холодильник выбрать?",
  history: [{ role: "user", content: "Покажи холодильники" }],
  context: '{"catalog":[]}',
};

const config = {
  apiKey: "test-key",
  model: "test-model",
  baseUrl: "https://provider.example.test",
  timeoutMs: 2_000,
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function openAiAnswer(payload: unknown) {
  return jsonResponse({
    choices: [{ message: { content: JSON.stringify(payload) } }],
  });
}

function anthropicAnswer(payload: unknown) {
  return jsonResponse({
    stop_reason: "end_turn",
    content: [
      { type: "thinking", thinking: "" },
      { type: "text", text: JSON.stringify(payload) },
    ],
  });
}

function timeoutError() {
  return new DOMException("The operation timed out", "TimeoutError");
}

describe("assistant provider adapters", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("maps upstream failures to the same codes for both adapters", async () => {
    const cases: Array<{
      attempt: () => Response;
      expected: { ok: false; code: string };
    }> = [
      {
        attempt: () => {
          throw timeoutError();
        },
        expected: { ok: false, code: "timeout" },
      },
      {
        attempt: () => jsonResponse({}, 429),
        expected: { ok: false, code: "rate_limited" },
      },
      {
        attempt: () => jsonResponse({}, 503),
        expected: { ok: false, code: "unavailable" },
      },
      {
        attempt: () => jsonResponse({}, 400),
        expected: { ok: false, code: "unavailable" },
      },
    ];

    for (const scenario of cases) {
      for (const provider of [
        new OpenAiCompatibleProvider(config),
        new AnthropicProvider(config),
      ]) {
        vi.stubGlobal(
          "fetch",
          vi.fn(async () => scenario.attempt()),
        );
        await expect(provider.generateGroundedAnswer(input)).resolves.toEqual(
          scenario.expected,
        );
      }
    }
  });

  it("rejects upstream text that is not strict JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({ choices: [{ message: { content: "not json" } }] }),
      ),
    );
    await expect(
      new OpenAiCompatibleProvider(config).generateGroundedAnswer(input),
    ).resolves.toEqual({ ok: false, code: "malformed" });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({ content: [{ type: "text", text: "{oops" }] }),
      ),
    );
    await expect(
      new AnthropicProvider(config).generateGroundedAnswer(input),
    ).resolves.toEqual({ ok: false, code: "malformed" });
  });

  it("rejects a JSON body that violates the answer contract", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => openAiAnswer({ answer: "ok", productIds: "all" })),
    );
    await expect(
      new OpenAiCompatibleProvider(config).generateGroundedAnswer(input),
    ).resolves.toEqual({ ok: false, code: "malformed" });
  });

  it("treats a refused Anthropic turn as an unavailable provider", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({ stop_reason: "refusal", content: [] }, 200),
      ),
    );
    await expect(
      new AnthropicProvider(config).generateGroundedAnswer(input),
    ).resolves.toEqual({ ok: false, code: "unavailable" });
  });

  it("retries once after a server error and keeps the answer", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 500))
      .mockResolvedValueOnce(
        anthropicAnswer({ answer: "Подойдёт эта модель.", productIds: ["a"] }),
      );
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      new AnthropicProvider(config).generateGroundedAnswer(input),
    ).resolves.toEqual({
      ok: true,
      answer: "Подойдёт эта модель.",
      productIds: ["a"],
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("never retries outside the shared timeout budget", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}, 500));
    vi.stubGlobal("fetch", fetchMock);
    const started = Date.now();
    await expect(
      new OpenAiCompatibleProvider({
        ...config,
        timeoutMs: 50,
      }).generateGroundedAnswer(input),
    ).resolves.toEqual({ ok: false, code: "unavailable" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(Date.now() - started).toBeLessThan(1_000);
  });

  it("refuses to buffer an unbounded upstream body", async () => {
    const oversized = `{"choices":[{"message":{"content":"${"a".repeat(200 * 1_024)}"}}]}`;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(oversized, { status: 200 })),
    );
    await expect(
      new OpenAiCompatibleProvider(config).generateGroundedAnswer(input),
    ).resolves.toEqual({ ok: false, code: "malformed" });
  });

  it("calls the Anthropic Messages API with a bounded, grounded request", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        anthropicAnswer({ answer: "Готово.", productIds: [] }),
      );
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      new AnthropicProvider({
        ...config,
        model: "claude-opus-5",
      }).generateGroundedAnswer(input),
    ).resolves.toEqual({ ok: true, answer: "Готово.", productIds: [] });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://provider.example.test/v1/messages");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("test-key");
    expect(headers["anthropic-version"]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(headers).not.toHaveProperty("Authorization");
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.system).toContain("Tehnosklad");
    expect(body.max_tokens).toBeGreaterThan(0);
    // Claude 4.6+ models reject sampling parameters.
    expect(body).not.toHaveProperty("temperature");
    expect(body.messages).toEqual([
      { role: "user", content: "Покажи холодильники" },
      { role: "user", content: expect.stringContaining("Grounding data") },
    ]);
  });

  it("sends only universally valid fields for an unknown model", async () => {
    const sent: string[] = [];
    // A fresh response per call: a body can only be read once.
    const fetchMock = vi.fn((url: string, init: RequestInit) => {
      expect(url).toContain("/v1/messages");
      sent.push(String(init.body));
      return Promise.resolve(
        anthropicAnswer({ answer: "Готово.", productIds: [] }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    for (const model of ["claude-opus-9", "gateway/some-future-model"]) {
      await expect(
        new AnthropicProvider({ ...config, model }).generateGroundedAnswer(
          input,
        ),
      ).resolves.toMatchObject({ ok: true });
    }
    // An unrecognized model must not be sent a parameter it may reject with a
    // 400 on every single request.
    for (const request of sent) {
      const body = JSON.parse(request) as Record<string, unknown>;
      expect(body).not.toHaveProperty("temperature");
      expect(body).not.toHaveProperty("thinking");
      expect(Object.keys(body).sort()).toEqual([
        "max_tokens",
        "messages",
        "model",
        "system",
      ]);
    }
  });

  it("disables reasoning only for the families that accept the toggle", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        anthropicAnswer({ answer: "Готово.", productIds: [] }),
      );
    vi.stubGlobal("fetch", fetchMock);
    await new AnthropicProvider({
      ...config,
      model: "claude-opus-5",
    }).generateGroundedAnswer(input);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body))).toMatchObject({
      thinking: { type: "disabled" },
    });
  });

  it("keeps deterministic sampling for models that still accept it", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        anthropicAnswer({ answer: "Готово.", productIds: [] }),
      );
    vi.stubGlobal("fetch", fetchMock);
    await new AnthropicProvider({
      ...config,
      model: "claude-haiku-4-5",
    }).generateGroundedAnswer(input);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body))).toMatchObject({ temperature: 0 });
  });

  it("bounds the OpenAI-compatible request too", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(openAiAnswer({ answer: "Готово.", productIds: [] }));
    vi.stubGlobal("fetch", fetchMock);
    await new OpenAiCompatibleProvider(config).generateGroundedAnswer(input);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.max_tokens).toBeGreaterThan(0);
    expect(body.temperature).toBe(0);
  });

  it("never answers from the offline provider", async () => {
    await expect(
      new DeterministicProvider().generateGroundedAnswer(),
    ).resolves.toEqual({ ok: false, code: "unavailable" });
  });
});

describe("assistant answer sanitizing", () => {
  it("removes Cyrillic prices that the ASCII word boundary used to miss", () => {
    // `\b` never matched "лей", so the old pattern left such prices in place.
    expect(sanitizeAnswer("Цена 9 499 лей. Есть в наличии.")).toBe(
      "Есть в наличии.",
    );
    expect(sanitizeAnswer("Стоит 12 000 леев. Доставка бесплатна.")).toBe(
      "Доставка бесплатна.",
    );
    expect(sanitizeAnswer("Costă 9 499 lei. Este în stoc.")).toBe(
      "Este în stoc.",
    );
    // A plain number is not a price and must survive.
    expect(sanitizeAnswer("Вмещает 300 литров.")).toBe("Вмещает 300 литров.");
  });

  it("drops the whole sentence that carries a price, not just the token", () => {
    expect(
      sanitizeAnswer(
        "Этот холодильник стоит 9 499 лей. Он вмещает 300 литров.",
      ),
    ).toBe("Он вмещает 300 литров.");
    expect(
      sanitizeAnswer("Acest frigider costă 9 499 lei! Are 300 litri."),
    ).toBe("Are 300 litri.");
  });

  it("keeps the remaining text readable", () => {
    expect(
      sanitizeAnswer(
        "Есть две модели. Вторая дороже: 12 000 MDL. Обе в наличии.",
      ),
    ).toBe("Есть две модели. Обе в наличии.");
  });

  it("degrades to an empty answer when the only sentence quoted a price", () => {
    // parseProviderResult turns this into `malformed`, so the caller replies
    // with the deterministic grounded answer instead of an empty bubble.
    expect(sanitizeAnswer("Он стоит 9 499 лей")).toBe("");
  });

  it("always removes links and HTML without dropping the sentence", () => {
    expect(
      sanitizeAnswer(
        "<b>Смотрите</b> каталог https://evil.test и [тут](https://evil.test).",
      ),
    ).toBe("Смотрите каталог и.");
  });
});
