import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  LeadDeliveryClaim,
  LeadDeliveryOutcome,
  LeadForTelegram,
  LeadSubmission,
} from "@/features/leads/types";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service";

export type StoredLead = {
  id: string;
  wasCreated: boolean;
};

export type LeadStoreErrorCode =
  | "idempotency_conflict"
  | "rate_limited"
  | "product_unavailable"
  | "persistence_failed";

export class LeadStoreError extends Error {
  constructor(public readonly code: LeadStoreErrorCode) {
    super(code);
    this.name = "LeadStoreError";
  }
}

export type StoreLeadInput = {
  clientRequestId: string;
  submission: LeadSubmission;
  requestHash: string;
  clientFingerprintHash: string;
  phoneHash: string;
};

export type CompleteDeliveryInput = {
  attemptId: string;
  leaseToken: string;
  outcome: LeadDeliveryOutcome;
  errorCode: string | null;
  providerHttpStatus: number | null;
  providerErrorCode: number | null;
  providerMessageId: string | null;
  retryAfterSeconds: number | null;
};

export interface LeadStore {
  submit(input: StoreLeadInput): Promise<StoredLead>;
  claimTelegramDelivery(leadId?: string): Promise<LeadDeliveryClaim | null>;
  getForTelegram(leadId: string): Promise<LeadForTelegram | null>;
  completeTelegramDelivery(input: CompleteDeliveryInput): Promise<void>;
}

function submissionError(message: string | undefined): LeadStoreError {
  if (message?.includes("lead_idempotency_conflict")) {
    return new LeadStoreError("idempotency_conflict");
  }
  if (message?.includes("lead_rate_limited")) {
    return new LeadStoreError("rate_limited");
  }
  if (message?.includes("lead_product_unavailable")) {
    return new LeadStoreError("product_unavailable");
  }
  return new LeadStoreError("persistence_failed");
}

function safeInteger(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

export class SupabaseLeadStore implements LeadStore {
  constructor(private readonly client: SupabaseClient) {}

  async submit(input: StoreLeadInput): Promise<StoredLead> {
    const { submission } = input;
    const { data, error } = await this.client.rpc("submit_public_lead", {
      p_client_request_id: input.clientRequestId,
      p_request_hash: input.requestHash,
      p_client_fingerprint_hash: input.clientFingerprintHash,
      p_phone_hash: input.phoneHash,
      p_locale: submission.locale,
      p_source: submission.source,
      p_source_path: submission.sourcePath,
      p_name: submission.name,
      p_phone: submission.phone,
      p_telegram_username: submission.telegramUsername,
      p_comment: submission.comment,
      p_product_id: submission.productId,
      // The database keeps the legacy column/parameter name for a safe,
      // backward-compatible migration path. The value identifies the privacy
      // notice acknowledged by the visitor, not a marketing consent.
      p_consent_version: submission.privacyNoticeVersion,
    });
    if (error) throw submissionError(error.message);
    const row = (data as Array<Record<string, unknown>> | null)?.[0];
    if (
      !row ||
      typeof row.lead_id !== "string" ||
      typeof row.was_created !== "boolean"
    ) {
      throw new LeadStoreError("persistence_failed");
    }
    return { id: row.lead_id, wasCreated: row.was_created };
  }

  async claimTelegramDelivery(
    leadId?: string,
  ): Promise<LeadDeliveryClaim | null> {
    const { data, error } = await this.client.rpc(
      "claim_lead_telegram_delivery",
      { p_lead_id: leadId ?? null },
    );
    if (error) throw new LeadStoreError("persistence_failed");
    const row = (data as Array<Record<string, unknown>> | null)?.[0];
    if (!row) return null;
    if (
      typeof row.attempt_id !== "string" ||
      typeof row.delivery_id !== "string" ||
      typeof row.lead_id !== "string" ||
      typeof row.lease_token !== "string" ||
      !Number.isInteger(Number(row.attempt_number))
    ) {
      throw new LeadStoreError("persistence_failed");
    }
    return {
      attemptId: row.attempt_id,
      deliveryId: row.delivery_id,
      leadId: row.lead_id,
      attemptNumber: Number(row.attempt_number),
      leaseToken: row.lease_token,
    };
  }

  async getForTelegram(leadId: string): Promise<LeadForTelegram | null> {
    const { data, error } = await this.client
      .from("leads")
      .select(
        "id,created_at,name,phone,telegram_username,comment,locale,source,source_path,product_name_snapshot,product_price_minor,product_currency,product_path_snapshot",
      )
      .eq("id", leadId)
      .maybeSingle();
    if (error) throw new LeadStoreError("persistence_failed");
    if (!data) return null;
    const price =
      data.product_price_minor === null
        ? null
        : safeInteger(data.product_price_minor);
    if (data.product_price_minor !== null && price === null) {
      throw new LeadStoreError("persistence_failed");
    }
    return {
      id: data.id,
      createdAt: data.created_at,
      name: data.name,
      phone: data.phone,
      telegramUsername: data.telegram_username,
      comment: data.comment,
      locale: data.locale,
      source: data.source,
      sourcePath: data.source_path,
      productName: data.product_name_snapshot,
      productPriceMinor: price,
      productCurrency: data.product_currency,
      productPath: data.product_path_snapshot,
    } as LeadForTelegram;
  }

  async completeTelegramDelivery(input: CompleteDeliveryInput) {
    const { error } = await this.client.rpc("complete_lead_telegram_delivery", {
      p_attempt_id: input.attemptId,
      p_lease_token: input.leaseToken,
      p_outcome: input.outcome,
      p_error_code: input.errorCode,
      p_provider_http_status: input.providerHttpStatus,
      p_provider_error_code: input.providerErrorCode,
      p_provider_message_id: input.providerMessageId,
      p_retry_after_seconds: input.retryAfterSeconds,
    });
    if (error) throw new LeadStoreError("persistence_failed");
  }
}

export function createLeadStore(): LeadStore {
  return new SupabaseLeadStore(createServiceRoleSupabaseClient());
}
