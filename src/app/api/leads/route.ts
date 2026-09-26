import { NextResponse } from "next/server";

import { processTelegramDelivery } from "@/features/leads/delivery";
import { createLeadStore, LeadStoreError } from "@/features/leads/repository";
import {
  createLeadSecurityHashes,
  extractClientAddress,
} from "@/features/leads/security";
import { isUuid, validateLeadPayload } from "@/features/leads/validation";
import { isAllowedMutationOrigin } from "@/lib/request-origin";
import {
  getLeadSecurityEnvironment,
  getOptionalTelegramEnvironment,
} from "@/lib/env/server";

const MAX_BODY_BYTES = 16 * 1024;

function json(body: object, status: number, headers?: HeadersInit) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

function sameOrigin(request: Request): boolean {
  try {
    return isAllowedMutationOrigin(request.headers.get("origin"));
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return json({ ok: false, code: "forbidden" }, 403);
  }
  if (
    request.headers.get("content-type")?.split(";", 1)[0] !== "application/json"
  ) {
    return json({ ok: false, code: "unsupported_media_type" }, 415);
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return json({ ok: false, code: "payload_too_large" }, 413);
  }

  let rawBody: string;
  let body: unknown;
  try {
    rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return json({ ok: false, code: "payload_too_large" }, 413);
    }
    body = JSON.parse(rawBody);
  } catch {
    return json({ ok: false, code: "invalid_json" }, 400);
  }
  const record =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};
  if (typeof record.companyWebsite === "string" && record.companyWebsite) {
    return json({ ok: true }, 202);
  }

  const clientRequestId = request.headers.get("idempotency-key")?.trim() ?? "";
  if (!isUuid(clientRequestId)) {
    return json({ ok: false, code: "invalid_idempotency_key" }, 400);
  }
  const validation = validateLeadPayload(body);
  if (!validation.ok) {
    return json(
      {
        ok: false,
        code: "validation_error",
        fieldErrors: validation.fieldErrors,
      },
      422,
    );
  }

  let secret: string;
  try {
    secret = getLeadSecurityEnvironment().leadHashSecret;
  } catch {
    return json({ ok: false, code: "temporary_error" }, 503);
  }
  const hashes = createLeadSecurityHashes(
    validation.data,
    extractClientAddress(request.headers),
    secret,
  );
  let store: ReturnType<typeof createLeadStore>;
  let stored: Awaited<ReturnType<typeof store.submit>>;
  try {
    store = createLeadStore();
    stored = await store.submit({
      clientRequestId,
      submission: validation.data,
      ...hashes,
    });
  } catch (error) {
    if (error instanceof LeadStoreError) {
      if (error.code === "rate_limited") {
        return json(
          { ok: false, code: "rate_limited", retryAfterSeconds: 900 },
          429,
          { "Retry-After": "900" },
        );
      }
      if (error.code === "idempotency_conflict") {
        return json({ ok: false, code: "idempotency_conflict" }, 409);
      }
      if (error.code === "product_unavailable") {
        return json(
          {
            ok: false,
            code: "validation_error",
            fieldErrors: { product: "invalid" },
          },
          422,
        );
      }
    }
    console.error("Lead persistence failed", { code: "persistence_failed" });
    return json({ ok: false, code: "temporary_error" }, 503);
  }

  let telegram: ReturnType<typeof getOptionalTelegramEnvironment> = null;
  try {
    telegram = getOptionalTelegramEnvironment();
  } catch {
    telegram = null;
  }
  try {
    await processTelegramDelivery(store, telegram, stored.id);
    await processTelegramDelivery(store, telegram);
  } catch {
    console.error("Lead delivery processing failed", {
      code: "delivery_processing_failed",
      leadId: stored.id,
    });
  }
  return json({ ok: true }, stored.wasCreated ? 201 : 200);
}
