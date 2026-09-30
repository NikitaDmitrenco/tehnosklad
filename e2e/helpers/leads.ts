import { createHash, randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { getE2EConfig, getLocalAdminSupabase } from "./env";
import { buildLeadData } from "./factories/lead";

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export interface CreatedLead {
  id: string;
  name: string;
}

/**
 * Direct service-role lead insert (local-only guard via env.ts).
 * Bypasses the public API rate limits (5/15min IP, 3/hour phone) that a
 * shared localhost IP would otherwise exhaust across parallel tests.
 * DB triggers `record_lead_status` and `create_lead_telegram_delivery` still
 * fire, so history + Telegram outbox rows exist exactly like the API path.
 * The run id goes into `comment` for cleanup.
 */
export async function createLeadDirect(
  runId: string,
  overrides?: {
    status?: "new" | "in_progress" | "contacted" | "closed" | "spam";
  },
): Promise<CreatedLead> {
  const supabase = getLocalAdminSupabase();
  const payload = buildLeadData(runId);
  const name = payload.name;

  const { data, error } = await supabase
    .from("leads")
    .insert({
      client_request_id: randomUUID(),
      request_hash: sha256Hex(`req:${runId}:${name}`),
      client_fingerprint_hash: sha256Hex(`fp:${runId}`),
      phone_hash: sha256Hex(`phone:${payload.phone}:${runId}`),
      status: overrides?.status ?? "new",
      locale: payload.locale,
      source: "contacts_page",
      source_path: `/${payload.locale}`,
      name,
      phone: payload.phone.replace(/[^0-9+]/g, ""),
      comment: `E2E ${runId}`,
      consent_version: "e2e",
    })
    .select("id, name")
    .single();

  if (error || !data) {
    throw new Error(
      `[createLeadDirect] insert failed for ${runId}: ${error?.message}`,
    );
  }
  return { id: data.id as string, name: data.name as string };
}

/**
 * Force the Telegram outbox state for a lead (service role, local-only).
 * Lets tests set up `manual_review` / `permanent_failure` states without a
 * real Telegram provider.
 */
export async function setLeadDeliveryState(
  leadId: string,
  state:
    | "queued"
    | "processing"
    | "retry_wait"
    | "succeeded"
    | "permanent_failure"
    | "manual_review",
  extra?: { attemptCount?: number; lastErrorCode?: string },
): Promise<void> {
  const supabase = getLocalAdminSupabase();
  const patch: Record<string, unknown> = { state };
  if (extra?.attemptCount !== undefined) {
    patch.attempt_count = extra.attemptCount;
  }
  if (extra?.lastErrorCode !== undefined) {
    patch.last_error_code = extra.lastErrorCode;
  }
  const { error } = await supabase
    .from("lead_telegram_deliveries")
    .update(patch)
    .eq("lead_id", leadId);
  if (error) {
    throw new Error(
      `[setLeadDeliveryState] update failed for ${leadId}: ${error.message}`,
    );
  }
}

/**
 * Create a lead through the real public API (LEAD-01/04/05 scenarios).
 * Consumes the shared local rate-limit quota — use sparingly (max ~4 per
 * 15-minute window). Returns the response for status/body assertions.
 */
export async function createLeadViaApi(
  page: Page,
  runId: string,
  overrides?: {
    body?: Record<string, unknown>;
    origin?: string;
    idempotencyKey?: string;
    omitConsent?: boolean;
  },
): Promise<{ status: number; json: () => Promise<unknown> }> {
  const config = getE2EConfig();
  const payload = buildLeadData(runId);
  const body = {
    name: payload.name,
    phone: payload.phone,
    comment: `E2E ${runId}`,
    locale: payload.locale,
    source: "contacts_page",
    sourcePath: `/${payload.locale}`,
    consent: true,
    ...overrides?.body,
  };
  if (overrides?.omitConsent) delete (body as Record<string, unknown>).consent;

  const response = await page.request.post("/api/leads", {
    headers: {
      "Content-Type": "application/json",
      Origin: overrides?.origin ?? config.appBaseUrl,
      "Idempotency-Key": overrides?.idempotencyKey ?? randomUUID(),
    },
    data: body,
    failOnStatusCode: false,
  });
  return { status: response.status(), json: () => response.json() };
}
