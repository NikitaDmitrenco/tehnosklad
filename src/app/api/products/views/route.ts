import { NextResponse } from "next/server";
import { recordProductView } from "@/features/catalog/data";
import { isAllowedMutationOrigin } from "@/lib/request-origin";

const MAX_BODY_BYTES = 4 * 1024;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Simple in-memory rate limiting per client IP (max 30 requests per minute)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

function json(body: object, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
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

  const contentType = request.headers.get("content-type")?.split(";", 1)[0];
  if (contentType !== "application/json") {
    return json({ ok: false, code: "unsupported_media_type" }, 415);
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return json({ ok: false, code: "payload_too_large" }, 413);
  }

  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";

  if (isRateLimited(clientIp)) {
    return json({ ok: false, code: "too_many_requests" }, 429);
  }

  let body: unknown;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return json({ ok: false, code: "payload_too_large" }, 413);
    }
    body = JSON.parse(rawBody);
  } catch {
    return json({ ok: false, code: "invalid_json" }, 400);
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).productId !== "string"
  ) {
    return json({ ok: false, code: "invalid_payload" }, 400);
  }

  const productId = (body as Record<string, unknown>).productId as string;
  if (!UUID_REGEX.test(productId)) {
    return json({ ok: false, code: "invalid_product_id" }, 400);
  }

  try {
    await recordProductView(productId);
    return json({ ok: true }, 200);
  } catch (error) {
    console.error("Error in product view API route", error);
    return json({ ok: false, code: "internal_error" }, 500);
  }
}
