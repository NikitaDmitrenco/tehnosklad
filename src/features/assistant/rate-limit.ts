import "server-only";
import { randomBytes } from "node:crypto";

import { assistantSubjectHash } from "@/features/assistant/security";
import {
  getOptionalAssistantRateLimitSecret,
  hasSupabaseServiceRoleEnvironment,
} from "@/lib/env/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service";

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 8;
const MAX_TRACKED_SUBJECTS = 5_000;

export type AssistantRateLimitDecision = "allowed" | "limited" | "unavailable";

/*
 * Process-local window used when no service-role client is configured, so the
 * assistant still answers (and is still throttled) in demo and local setups.
 * A serverless deployment must configure Supabase to get a durable limit.
 */
const memoryWindows = new Map<string, { windowStart: number; count: number }>();
let ephemeralSecret: string | null = null;

export function assistantRateLimitSubject(headers: Headers): string | null {
  const configured = getOptionalAssistantRateLimitSecret();
  if (configured) return assistantSubjectHash(headers, configured);
  // A durable deployment must not silently fall back to an ephemeral secret.
  if (hasSupabaseServiceRoleEnvironment()) return null;
  ephemeralSecret ??= randomBytes(32).toString("hex");
  return assistantSubjectHash(headers, ephemeralSecret);
}

function consumeInMemory(subjectHash: string): AssistantRateLimitDecision {
  const now = Date.now();
  for (const [key, window] of memoryWindows) {
    if (now - window.windowStart >= WINDOW_MS) memoryWindows.delete(key);
  }
  if (memoryWindows.size >= MAX_TRACKED_SUBJECTS) return "limited";
  const current = memoryWindows.get(subjectHash);
  if (!current || now - current.windowStart >= WINDOW_MS) {
    memoryWindows.set(subjectHash, { windowStart: now, count: 1 });
    return "allowed";
  }
  current.count += 1;
  return current.count <= MAX_REQUESTS_PER_WINDOW ? "allowed" : "limited";
}

export async function consumeAssistantRateLimit(
  subjectHash: string,
): Promise<AssistantRateLimitDecision> {
  if (!hasSupabaseServiceRoleEnvironment()) return consumeInMemory(subjectHash);
  try {
    const { data, error } = await createServiceRoleSupabaseClient().rpc(
      "consume_assistant_rate_limit",
      { subject_hash: subjectHash },
    );
    if (error) return "unavailable";
    return data ? "allowed" : "limited";
  } catch {
    return "unavailable";
  }
}

export function resetAssistantRateLimitForTests() {
  memoryWindows.clear();
  ephemeralSecret = null;
}
