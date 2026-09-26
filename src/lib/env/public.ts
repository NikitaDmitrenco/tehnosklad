import {
  EnvironmentConfigurationError,
  requireEnvironmentVariables,
  requireValidUrl,
} from "@/lib/env/shared";

export type SupabasePublicEnvironment = {
  supabaseUrl: string;
  supabasePublishableKey: string;
};

function jwtRole(value: string): string | null {
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (payload.length % 4)) % 4);
    const parsed = JSON.parse(atob(`${payload}${padding}`)) as {
      role?: unknown;
    };
    return typeof parsed.role === "string" ? parsed.role : null;
  } catch {
    return null;
  }
}

export function requireSupabasePublishableKey(
  name: string,
  value: string,
  serviceRoleKey?: string,
): string {
  const normalized = value.trim();
  const role = jwtRole(normalized);
  if (
    normalized.toLowerCase().startsWith("sb_secret_") ||
    role === "service_role" ||
    (serviceRoleKey?.trim() && normalized === serviceRoleKey.trim())
  ) {
    throw new EnvironmentConfigurationError([name]);
  }
  return normalized;
}

function requireSupabaseProjectUrl(value: string): string {
  const normalized = requireValidUrl("NEXT_PUBLIC_SUPABASE_URL", value);
  const url = new URL(normalized);
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new EnvironmentConfigurationError(["NEXT_PUBLIC_SUPABASE_URL"]);
  }
  return url.origin;
}

export function getOptionalSupabasePublicEnvironment(): SupabasePublicEnvironment | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url && !key) return null;
  if (!url || !key) {
    throw new EnvironmentConfigurationError([
      !url
        ? "NEXT_PUBLIC_SUPABASE_URL"
        : "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    ]);
  }
  return {
    supabaseUrl: requireSupabaseProjectUrl(url),
    supabasePublishableKey: requireSupabasePublishableKey(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      key,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
  };
}

export function getSupabasePublicEnvironment(): SupabasePublicEnvironment {
  const environment = getOptionalSupabasePublicEnvironment();
  if (!environment) {
    throw new EnvironmentConfigurationError([
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    ]);
  }
  return environment;
}

export function getSiteUrl(): string {
  const environment = requireEnvironmentVariables({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });
  const value = requireValidUrl(
    "NEXT_PUBLIC_SITE_URL",
    environment.NEXT_PUBLIC_SITE_URL,
  );
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new EnvironmentConfigurationError(["NEXT_PUBLIC_SITE_URL"]);
  }
  return url.origin;
}
