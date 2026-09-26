import { NextResponse } from "next/server";
import { answerAssistant } from "@/features/assistant/service";
import {
  assistantRateLimitSubject,
  consumeAssistantRateLimit,
} from "@/features/assistant/rate-limit";
import { validateAssistantPayload } from "@/features/assistant/validation";
import { isAllowedMutationOrigin } from "@/lib/request-origin";
const MAX_BODY_BYTES = 8 * 1024;
function json(body: object, status: number, headers?: HeadersInit) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}
export async function POST(request: Request) {
  if (!isAllowedMutationOrigin(request.headers.get("origin")))
    return json({ ok: false, code: "forbidden" }, 403);
  if (
    request.headers.get("content-type")?.split(";", 1)[0] !== "application/json"
  )
    return json({ ok: false, code: "unsupported_media_type" }, 415);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES)
    return json({ ok: false, code: "payload_too_large" }, 413);
  let body: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES)
      return json({ ok: false, code: "payload_too_large" }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, code: "invalid_json" }, 400);
  }
  const validation = validateAssistantPayload(body);
  if (!validation.ok) return json({ ok: false, code: "validation_error" }, 422);
  try {
    const subjectHash = assistantRateLimitSubject(request.headers);
    if (!subjectHash) return json({ ok: false, code: "temporary_error" }, 503);
    const decision = await consumeAssistantRateLimit(subjectHash);
    if (decision === "unavailable")
      return json({ ok: false, code: "temporary_error" }, 503);
    if (decision === "limited")
      return json(
        { ok: false, code: "rate_limited", retryAfterSeconds: 60 },
        429,
        { "Retry-After": "60" },
      );
  } catch {
    return json({ ok: false, code: "temporary_error" }, 503);
  }
  try {
    return json({ ok: true, ...(await answerAssistant(validation.data)) }, 200);
  } catch {
    return json({ ok: false, code: "temporary_error" }, 503);
  }
}
