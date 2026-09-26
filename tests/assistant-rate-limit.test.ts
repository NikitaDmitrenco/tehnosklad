import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import {
  assistantRateLimitSubject,
  consumeAssistantRateLimit,
  resetAssistantRateLimitForTests,
} from "@/features/assistant/rate-limit";

const headers = (address: string) =>
  new Headers({ "x-vercel-forwarded-for": address });

describe("assistant rate limit without a service-role client", () => {
  beforeEach(() => {
    resetAssistantRateLimitForTests();
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.AI_RATE_LIMIT_SECRET;
  });
  afterEach(() => resetAssistantRateLimitForTests());

  it("derives a stable hashed subject instead of refusing to answer", () => {
    const first = assistantRateLimitSubject(headers("203.0.113.7"));
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(first).toBe(assistantRateLimitSubject(headers("203.0.113.7")));
    expect(first).not.toBe(assistantRateLimitSubject(headers("203.0.113.8")));
  });

  it("still throttles per subject in the process-local window", async () => {
    const subject = assistantRateLimitSubject(headers("203.0.113.7"))!;
    const other = assistantRateLimitSubject(headers("203.0.113.8"))!;
    const decisions = [];
    for (let attempt = 0; attempt < 9; attempt += 1)
      decisions.push(await consumeAssistantRateLimit(subject));
    expect(decisions.filter((decision) => decision === "allowed")).toHaveLength(
      8,
    );
    expect(decisions.at(-1)).toBe("limited");
    await expect(consumeAssistantRateLimit(other)).resolves.toBe("allowed");
  });

  it("refuses an ephemeral secret once Supabase is configured", () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    expect(assistantRateLimitSubject(headers("203.0.113.7"))).toBeNull();
  });
});
