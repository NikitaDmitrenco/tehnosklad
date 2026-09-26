import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { PRIVACY_NOTICE } from "@/config/privacy";
import { SupabaseLeadStore } from "@/features/leads/repository";
import type { LeadSubmission } from "@/features/leads/types";

describe("lead privacy notice audit trail", () => {
  it("stores the stable notice identifier with the lead RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          lead_id: "20000000-0000-4000-8000-000000000001",
          was_created: true,
        },
      ],
      error: null,
    });
    const client = { rpc } as unknown as SupabaseClient;
    const store = new SupabaseLeadStore(client);
    const submission: LeadSubmission = {
      locale: "ro",
      source: "contacts_page",
      sourcePath: "/ro/contacts",
      name: "Ana",
      phone: "+37369123456",
      telegramUsername: null,
      comment: null,
      productId: null,
      privacyNoticeVersion: PRIVACY_NOTICE.storageVersion,
    };

    await store.submit({
      clientRequestId: "10000000-0000-4000-8000-000000000001",
      requestHash: "a".repeat(64),
      clientFingerprintHash: "b".repeat(64),
      phoneHash: "c".repeat(64),
      submission,
    });

    expect(rpc).toHaveBeenCalledWith(
      "submit_public_lead",
      expect.objectContaining({
        p_locale: "ro",
        p_source: "contacts_page",
        p_consent_version: PRIVACY_NOTICE.storageVersion,
      }),
    );
  });
});
