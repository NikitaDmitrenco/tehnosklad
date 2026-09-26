import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/features/assistant/service", () => ({ answerAssistant: vi.fn() }));
vi.mock("@/features/assistant/rate-limit", () => ({
  assistantRateLimitSubject: vi.fn(),
  consumeAssistantRateLimit: vi.fn(),
}));

import { POST } from "@/app/api/assistant/route";
import {
  assistantRateLimitSubject,
  consumeAssistantRateLimit,
} from "@/features/assistant/rate-limit";
import { answerAssistant } from "@/features/assistant/service";

const ORIGIN = "https://tehnosklad.example";
const payload = { locale: "ru", question: "Холодильник", history: [] };

function post(
  body: string | object,
  headers: Record<string, string> = {},
): Request {
  return new Request(`${ORIGIN}/api/assistant`, {
    method: "POST",
    headers: {
      origin: ORIGIN,
      "content-type": "application/json",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function mockRateLimit(
  decision: Awaited<ReturnType<typeof consumeAssistantRateLimit>>,
  subject: string | null = "subject-hash",
) {
  vi.mocked(assistantRateLimitSubject).mockReturnValue(subject);
  vi.mocked(consumeAssistantRateLimit).mockResolvedValue(decision);
}

describe("assistant route", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", ORIGIN);
    mockRateLimit("allowed");
    vi.mocked(answerAssistant).mockResolvedValue({
      answer: "Ответ",
      references: [],
      fallbackUsed: false,
      requestId: "00000000-0000-4000-8000-000000000000",
    });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("rejects a foreign origin before doing any work", async () => {
    const response = await POST(post(payload, { origin: "https://evil.test" }));
    expect(response.status).toBe(403);
    expect(answerAssistant).not.toHaveBeenCalled();
  });

  it("rejects a non-JSON content type", async () => {
    const response = await POST(
      post(payload, { "content-type": "text/plain" }),
    );
    expect(response.status).toBe(415);
  });

  it("rejects an oversized body by header and by payload", async () => {
    const declared = await POST(post(payload, { "content-length": "999999" }));
    expect(declared.status).toBe(413);
    const oversized = await POST(
      post({ ...payload, question: "x".repeat(16 * 1_024) }),
    );
    expect(oversized.status).toBe(413);
  });

  it("rejects a malformed JSON body", async () => {
    const response = await POST(post("{not json"));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "invalid_json",
    });
  });

  it("rejects payloads that violate the request contract", async () => {
    expect((await POST(post({ ...payload, extra: 1 }))).status).toBe(422);
    expect(
      (await POST(post({ ...payload, page: { type: "product", id: "42" } })))
        .status,
    ).toBe(422);
    expect(
      (
        await POST(
          post({
            ...payload,
            page: {
              type: "product",
              id: "11111111-1111-4111-8111-111111111111",
              extra: 1,
            },
          }),
        )
      ).status,
    ).toBe(422);
  });

  it("surfaces the rate limit and its retry hint", async () => {
    mockRateLimit("limited");
    const response = await POST(post(payload));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
  });

  it("degrades to a temporary error when the rate limiter is unavailable", async () => {
    mockRateLimit("unavailable");
    expect((await POST(post(payload))).status).toBe(503);
    // A durable deployment without a usable subject must not answer either.
    mockRateLimit("allowed", null);
    expect((await POST(post(payload))).status).toBe(503);
  });

  it("degrades to a temporary error when answering throws", async () => {
    vi.mocked(answerAssistant).mockRejectedValue(new Error("boom"));
    const response = await POST(post(payload));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      code: "temporary_error",
    });
  });

  it("answers a valid request and forwards the page context", async () => {
    const page = {
      type: "product" as const,
      id: "11111111-1111-4111-8111-111111111111",
    };
    const response = await POST(post({ ...payload, page }));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      answer: "Ответ",
    });
    expect(answerAssistant).toHaveBeenCalledWith(
      expect.objectContaining({ locale: "ru", page }),
    );
  });
});
