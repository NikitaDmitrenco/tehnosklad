import "server-only";
import { randomUUID } from "node:crypto";
import {
  buildAssistantContext,
  referencesForIds,
} from "@/features/assistant/grounding";
import { fallbackAnswer } from "@/features/assistant/fallback";
import {
  AnthropicProvider,
  DeterministicProvider,
  OpenAiCompatibleProvider,
} from "@/features/assistant/provider";
import type {
  AssistantRequest,
  AssistantResponse,
} from "@/features/assistant/types";
import {
  getAssistantEnvironment,
  hasSupabaseServiceRoleEnvironment,
} from "@/lib/env/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service";

function durationBucket(start: number) {
  const elapsed = Date.now() - start;
  return elapsed < 250 ? "lt_250" : elapsed < 1_000 ? "lt_1000" : "gte_1000";
}

function recordTelemetry(input: {
  requestId: string;
  locale: AssistantRequest["locale"];
  outcome: string;
  provider: string;
  started: number;
  fallbackUsed: boolean;
  referenceCount: number;
}) {
  const telemetry = {
    requestId: input.requestId,
    outcome: input.outcome,
    provider: input.provider,
    duration: durationBucket(input.started),
    fallbackUsed: input.fallbackUsed,
    referenceCount: input.referenceCount,
  };
  console.info("Assistant request", telemetry);
  // Demo and local setups have no telemetry sink; the console line is enough.
  if (!hasSupabaseServiceRoleEnvironment()) return;
  // Best effort only: the assistant remains available if telemetry is down.
  void (async () => {
    const { error } = await createServiceRoleSupabaseClient()
      .from("assistant_logs")
      .insert({
        request_id: input.requestId,
        locale: input.locale,
        outcome: input.outcome,
        provider: input.provider,
        duration_bucket: telemetry.duration,
        fallback_used: input.fallbackUsed,
        reference_count: input.referenceCount,
      });
    if (error)
      console.error("Assistant telemetry failed", {
        code: "assistant_telemetry_failed",
      });
  })().catch(() =>
    console.error("Assistant telemetry failed", {
      code: "assistant_telemetry_failed",
    }),
  );
}

export async function answerAssistant(
  request: AssistantRequest,
): Promise<AssistantResponse> {
  const requestId = randomUUID();
  const started = Date.now();
  const grounding = await buildAssistantContext(request);
  if (grounding.directAnswer) {
    recordTelemetry({
      requestId,
      locale: request.locale,
      outcome: grounding.directIntent ?? "direct_answer",
      provider: "deterministic",
      started,
      fallbackUsed: false,
      referenceCount: 0,
    });
    return {
      requestId,
      answer: grounding.directAnswer,
      references: [],
      fallbackUsed: false,
    };
  }
  const environment = getAssistantEnvironment();
  const provider =
    environment.provider === "openai-compatible"
      ? new OpenAiCompatibleProvider(environment)
      : environment.provider === "anthropic"
        ? new AnthropicProvider(environment)
        : new DeterministicProvider();
  const result = await provider.generateGroundedAnswer({
    locale: request.locale,
    question: request.question,
    history: request.history,
    context: grounding.context,
  });
  const fallbackUsed = !result.ok;
  /*
   * A successful answer that cites no known product still shows the cards that
   * retrieval found: the provider only selects ids, it never decides whether
   * the grounded catalog results are worth showing.
   */
  const citedReferences = result.ok
    ? referencesForIds(grounding.products, request.locale, result.productIds)
    : [];
  const references =
    result.ok && citedReferences.length
      ? citedReferences
      : grounding.references;
  const answer = result.ok
    ? result.answer
    : fallbackAnswer(
        request.locale,
        references,
        grounding.knowledge,
        grounding.settings,
      );
  recordTelemetry({
    requestId,
    locale: request.locale,
    /*
     * The offline default is a configured mode, not an incident: it gets its
     * own outcome so provider incidents stay visible in `assistant_logs`.
     */
    outcome: result.ok
      ? "provider_success"
      : environment.provider === "fallback"
        ? "deterministic_fallback"
        : result.code,
    provider: environment.provider,
    started,
    fallbackUsed,
    referenceCount: references.length,
  });
  return { requestId, answer, references, fallbackUsed };
}
