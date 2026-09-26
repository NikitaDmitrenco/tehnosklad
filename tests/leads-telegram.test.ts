import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  escapeTelegramHtml,
  formatLeadTelegramMessage,
  sendLeadToTelegram,
} from "@/features/leads/telegram";
import type { LeadForTelegram } from "@/features/leads/types";

const lead: LeadForTelegram = {
  id: "90000000-0000-4000-8000-000000000001",
  createdAt: "2026-08-05T12:00:00.000Z",
  name: "Иван <Admin>",
  phone: "+37369123456",
  telegramUsername: "@ivan_test",
  comment: "Доставка & подъём",
  locale: "ru",
  source: "product_page",
  sourcePath: "/ru/product/nord-cool-300",
  productName: "Nord > Cool",
  productPriceMinor: 789000,
  productCurrency: "MDL",
  productPath: "/ru/product/nord-cool-300",
};

const environment = {
  botToken: "123456:abcdefghijklmnopqrstuvwxyz_ABCDE",
  chatId: "-1001234567890",
};

describe("Telegram lead delivery", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://tehnosklad.example";
  });
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  it("escapes user HTML and includes authoritative product context", () => {
    const message = formatLeadTelegramMessage(lead);
    expect(escapeTelegramHtml("<&>")).toBe("&lt;&amp;&gt;");
    expect(message).toContain("Иван &lt;Admin&gt;");
    expect(message).toContain("Доставка &amp; подъём");
    expect(message).toContain("7 890 MDL");
    expect(message).toContain(
      'href="https://tehnosklad.example/ru/product/nord-cool-300"',
    );
    expect(message).toContain(lead.id);
    expect(message.length).toBeLessThanOrEqual(4090);
  });

  it("records missing configuration as a permanent failure", async () => {
    await expect(sendLeadToTelegram(null, "message")).resolves.toMatchObject({
      outcome: "permanent_failure",
      errorCode: "telegram_config_missing",
    });
  });

  it("classifies a Telegram 429 as the only safe automatic retry", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: false,
          error_code: 429,
          parameters: { retry_after: 42 },
        }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      ),
    ) as typeof fetch;
    await expect(
      sendLeadToTelegram(environment, "message", fetcher),
    ).resolves.toMatchObject({
      outcome: "retryable_failure",
      retryAfterSeconds: 42,
      providerErrorCode: 429,
    });
  });

  it("treats 5xx as uncertain to prevent duplicate notifications", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: false }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;
    await expect(
      sendLeadToTelegram(environment, "message", fetcher),
    ).resolves.toMatchObject({
      outcome: "uncertain_failure",
      errorCode: "telegram_server_uncertain",
    });
  });

  it("returns the provider message ID after a successful send", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: { message_id: 123 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const fetcher = fetchMock as unknown as typeof fetch;
    await expect(
      sendLeadToTelegram(environment, "message", fetcher),
    ).resolves.toMatchObject({
      outcome: "succeeded",
      providerMessageId: "123",
    });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain(environment.botToken);
    expect(String(init?.body)).not.toContain('parse_mode":"Markdown');
  });
});
