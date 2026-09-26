import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { hasActiveAdminRole } from "@/features/admin/auth/role";
import { safeAdminRedirectTarget } from "@/features/admin/auth/redirect";
import { parseCatalogDataSource } from "@/lib/env/catalog";
import {
  getOptionalSupabasePublicEnvironment,
  getSupabasePublicEnvironment,
  requireSupabasePublishableKey,
} from "@/lib/env/public";
import {
  getLeadSecurityEnvironment,
  getOptionalTelegramEnvironment,
} from "@/lib/env/server";
import {
  EnvironmentConfigurationError,
  requireValidUrl,
} from "@/lib/env/shared";

describe("admin security helpers", () => {
  it("requires both an active profile and the exact admin role", () => {
    expect(hasActiveAdminRole({ is_active: true }, { role: "admin" })).toBe(
      true,
    );
    expect(hasActiveAdminRole({ is_active: false }, { role: "admin" })).toBe(
      false,
    );
    expect(
      hasActiveAdminRole({ is_active: true }, { role: "authenticated" }),
    ).toBe(false);
    expect(hasActiveAdminRole(null, { role: "admin" })).toBe(false);
  });

  it("allows only local admin redirect targets", () => {
    expect(safeAdminRedirectTarget("/admin/products?draft=1")).toBe(
      "/admin/products?draft=1",
    );
    for (const unsafe of [
      "https://evil.test/admin",
      "//evil.test/admin",
      "/catalog",
      "/administrator",
      "/admin%2F..%2Fcatalog",
      "/admin/login",
      "/admin/login/",
      "/admin/login/reset",
    ]) {
      expect(safeAdminRedirectTarget(unsafe)).toBe("/admin");
    }
  });
});

describe("catalog source environment", () => {
  it("defaults to demo only in development and test", () => {
    expect(parseCatalogDataSource(undefined, "development")).toBe("demo");
    expect(parseCatalogDataSource(undefined, "test")).toBe("demo");
    expect(() => parseCatalogDataSource(undefined, "production")).toThrow(
      EnvironmentConfigurationError,
    );
  });

  it("requires a recognized explicit source", () => {
    expect(parseCatalogDataSource("supabase", "production")).toBe("supabase");
    expect(() => parseCatalogDataSource("demo", "production")).toThrow(
      EnvironmentConfigurationError,
    );
    expect(() => parseCatalogDataSource("fallback", "test")).toThrow(
      EnvironmentConfigurationError,
    );
  });
});

describe("Supabase public environment", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("permits a completely absent optional config", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(getOptionalSupabasePublicEnvironment()).toBeNull();
    expect(() => getSupabasePublicEnvironment()).toThrow(
      EnvironmentConfigurationError,
    );
  });

  it("rejects partial or invalid Supabase config", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(() => getOptionalSupabasePublicEnvironment()).toThrow(
      EnvironmentConfigurationError,
    );
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "not-a-url");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable");
    expect(() => getSupabasePublicEnvironment()).toThrow(
      EnvironmentConfigurationError,
    );
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      "https://project.supabase.co/rest/v1",
    );
    expect(() => getSupabasePublicEnvironment()).toThrow(
      EnvironmentConfigurationError,
    );
  });

  it("rejects secret and service-role keys in the public variable", () => {
    const servicePayload = btoa(JSON.stringify({ role: "service_role" }))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    expect(() =>
      requireSupabasePublishableKey("PUBLIC_KEY", "sb_secret_example"),
    ).toThrow(EnvironmentConfigurationError);
    expect(() =>
      requireSupabasePublishableKey(
        "PUBLIC_KEY",
        `header.${servicePayload}.signature`,
      ),
    ).toThrow(EnvironmentConfigurationError);
    expect(() =>
      requireSupabasePublishableKey("PUBLIC_KEY", "same-key", "same-key"),
    ).toThrow(EnvironmentConfigurationError);
    expect(
      requireSupabasePublishableKey("PUBLIC_KEY", "sb_publishable_ok"),
    ).toBe("sb_publishable_ok");
  });
});

describe("lead delivery environment", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("requires a sufficiently long private lead hash secret", () => {
    vi.stubEnv("LEAD_IP_HASH_SECRET", "short");
    expect(() => getLeadSecurityEnvironment()).toThrow(
      EnvironmentConfigurationError,
    );
    vi.stubEnv("LEAD_IP_HASH_SECRET", "a".repeat(32));
    expect(getLeadSecurityEnvironment()).toEqual({
      leadHashSecret: "a".repeat(32),
    });
  });

  it("allows Telegram to be disabled but rejects partial configuration", () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    vi.stubEnv("TELEGRAM_CHAT_ID", "");
    expect(getOptionalTelegramEnvironment()).toBeNull();

    vi.stubEnv("TELEGRAM_BOT_TOKEN", "123456:abcdefghijklmnopqrstuvwxyz_ABCD");
    expect(() => getOptionalTelegramEnvironment()).toThrow(
      EnvironmentConfigurationError,
    );

    vi.stubEnv("TELEGRAM_CHAT_ID", "-1001234567890");
    expect(getOptionalTelegramEnvironment()).toEqual({
      botToken: "123456:abcdefghijklmnopqrstuvwxyz_ABCD",
      chatId: "-1001234567890",
    });
  });
});

describe("production URL environment", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("requires HTTPS in production while retaining local development support", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => requireValidUrl("URL", "http://example.test")).toThrow(
      EnvironmentConfigurationError,
    );
    expect(requireValidUrl("URL", "https://example.test")).toBe(
      "https://example.test",
    );
    expect(requireValidUrl("URL", "http://127.0.0.1:3100")).toBe(
      "http://127.0.0.1:3100",
    );
    expect(requireValidUrl("URL", "http://localhost:3100")).toBe(
      "http://localhost:3100",
    );
  });
});
