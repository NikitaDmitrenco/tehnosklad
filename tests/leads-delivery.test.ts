import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { processTelegramDelivery } from "@/features/leads/delivery";
import type { LeadStore } from "@/features/leads/repository";

function store(): LeadStore {
  return {
    submit: vi.fn(),
    claimTelegramDelivery: vi.fn().mockResolvedValue({
      attemptId: "attempt",
      deliveryId: "delivery",
      leadId: "lead",
      attemptNumber: 1,
      leaseToken: "lease",
    }),
    getForTelegram: vi.fn().mockResolvedValue({
      id: "lead",
      createdAt: "2026-08-05T12:00:00.000Z",
      name: "Ana",
      phone: "+37369123456",
      telegramUsername: null,
      comment: null,
      locale: "ro",
      source: "contacts_page",
      sourcePath: "/ro/contacts",
      productName: null,
      productPriceMinor: null,
      productCurrency: null,
      productPath: null,
    }),
    completeTelegramDelivery: vi.fn().mockResolvedValue(undefined),
  };
}

describe("lead delivery orchestration", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://tehnosklad.example";
  });
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  it("does nothing when another worker already owns the delivery", async () => {
    const target = store();
    target.claimTelegramDelivery = vi.fn().mockResolvedValue(null);
    await expect(processTelegramDelivery(target, null, "lead")).resolves.toBe(
      false,
    );
    expect(target.getForTelegram).not.toHaveBeenCalled();
    expect(target.completeTelegramDelivery).not.toHaveBeenCalled();
  });

  it("persists a configuration failure after the lead was claimed", async () => {
    const target = store();
    await expect(processTelegramDelivery(target, null, "lead")).resolves.toBe(
      true,
    );
    expect(target.claimTelegramDelivery).toHaveBeenCalledWith("lead");
    expect(target.completeTelegramDelivery).toHaveBeenCalledWith({
      attemptId: "attempt",
      leaseToken: "lease",
      outcome: "permanent_failure",
      errorCode: "telegram_config_missing",
      providerHttpStatus: null,
      providerErrorCode: null,
      providerMessageId: null,
      retryAfterSeconds: null,
    });
  });
});
