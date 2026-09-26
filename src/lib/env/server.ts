import "server-only";

import {
  EnvironmentConfigurationError,
  requireEnvironmentVariables,
  requireValidUrl,
} from "@/lib/env/shared";

export function getSupabaseServiceRoleEnvironment() {
  const environment = requireEnvironmentVariables({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  return {
    supabaseUrl: requireValidUrl(
      "NEXT_PUBLIC_SUPABASE_URL",
      environment.NEXT_PUBLIC_SUPABASE_URL,
    ),
    supabaseServiceRoleKey: environment.SUPABASE_SERVICE_ROLE_KEY,
  };
}

/*
 * Probe instead of require: assistant telemetry, knowledge and the durable
 * rate limit are optional capabilities, not preconditions for an answer.
 */
export function hasSupabaseServiceRoleEnvironment(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

export function getLeadSecurityEnvironment() {
  const environment = requireEnvironmentVariables({
    LEAD_IP_HASH_SECRET: process.env.LEAD_IP_HASH_SECRET,
  });
  if (environment.LEAD_IP_HASH_SECRET.trim().length < 32) {
    throw new EnvironmentConfigurationError(["LEAD_IP_HASH_SECRET"]);
  }
  return { leadHashSecret: environment.LEAD_IP_HASH_SECRET.trim() };
}

export type TelegramEnvironment = {
  botToken: string;
  chatId: string;
};

export function getOptionalTelegramEnvironment(): TelegramEnvironment | null {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!botToken && !chatId) return null;
  if (
    !botToken ||
    !chatId ||
    !/^\d{5,15}:[A-Za-z0-9_-]{20,}$/.test(botToken) ||
    !/^-?\d+$/.test(chatId)
  ) {
    throw new EnvironmentConfigurationError([
      "TELEGRAM_BOT_TOKEN",
      "TELEGRAM_CHAT_ID",
    ]);
  }
  return { botToken, chatId };
}

const ANTHROPIC_DEFAULT_BASE_URL = "https://api.anthropic.com";

export type AssistantUpstreamEnvironment = {
  apiKey: string;
  model: string;
  baseUrl: string;
  timeoutMs: number;
};

export type AssistantEnvironment =
  | { provider: "fallback"; timeoutMs: number }
  | ({ provider: "openai-compatible" } & AssistantUpstreamEnvironment)
  | ({ provider: "anthropic" } & AssistantUpstreamEnvironment);

export function getAssistantEnvironment(): AssistantEnvironment {
  const provider = (process.env.AI_PROVIDER ?? "fallback").trim().toLowerCase();
  const timeoutRaw = process.env.AI_TIMEOUT_MS?.trim();
  const timeoutMs = timeoutRaw ? Number(timeoutRaw) : 8_000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 15_000) {
    throw new EnvironmentConfigurationError(["AI_TIMEOUT_MS"]);
  }
  if (provider === "fallback") return { provider, timeoutMs };
  if (provider === "openai-compatible") {
    const environment = requireEnvironmentVariables({
      AI_PROVIDER_API_KEY: process.env.AI_PROVIDER_API_KEY,
      AI_MODEL: process.env.AI_MODEL,
      AI_PROVIDER_BASE_URL: process.env.AI_PROVIDER_BASE_URL,
    });
    return {
      provider,
      apiKey: environment.AI_PROVIDER_API_KEY,
      model: environment.AI_MODEL,
      baseUrl: requireValidUrl(
        "AI_PROVIDER_BASE_URL",
        environment.AI_PROVIDER_BASE_URL,
      ).replace(/\/$/, ""),
      timeoutMs,
    };
  }
  if (provider === "anthropic") {
    const environment = requireEnvironmentVariables({
      AI_PROVIDER_API_KEY: process.env.AI_PROVIDER_API_KEY,
      AI_MODEL: process.env.AI_MODEL,
    });
    // The Anthropic API host is well known; an override exists only for
    // gateways and is given without the versioned `/v1` path.
    const baseUrl = process.env.AI_PROVIDER_BASE_URL?.trim();
    return {
      provider,
      apiKey: environment.AI_PROVIDER_API_KEY,
      model: environment.AI_MODEL,
      baseUrl: (baseUrl
        ? requireValidUrl("AI_PROVIDER_BASE_URL", baseUrl)
        : ANTHROPIC_DEFAULT_BASE_URL
      ).replace(/\/$/, ""),
      timeoutMs,
    };
  }
  throw new EnvironmentConfigurationError(["AI_PROVIDER"]);
}

export function getAssistantRateLimitSecret(): string {
  const secret = getOptionalAssistantRateLimitSecret();
  if (!secret)
    throw new EnvironmentConfigurationError(["AI_RATE_LIMIT_SECRET"]);
  return secret;
}

/*
 * The assistant must also answer in demo/local setups that have no secret at
 * all; an invalid secret stays a configuration error.
 */
export function getOptionalAssistantRateLimitSecret(): string | null {
  const secret = process.env.AI_RATE_LIMIT_SECRET?.trim();
  if (!secret) return null;
  if (secret.length < 32) {
    throw new EnvironmentConfigurationError(["AI_RATE_LIMIT_SECRET"]);
  }
  return secret;
}
