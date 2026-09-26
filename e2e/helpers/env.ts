import fs from "node:fs";
import path from "node:path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let envLoaded = false;

export function loadE2EEnvironment() {
  if (envLoaded) return;
  const root = process.cwd();
  const envFiles = [".env.local", ".env"];

  for (const file of envFiles) {
    const fullPath = path.join(root, file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          if (process.env[key] === undefined) {
            process.env[key] = val;
          }
        }
      }
    }
  }
  envLoaded = true;
}

export function getE2EConfig() {
  loadE2EEnvironment();

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "http://127.0.0.1:54321";
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
  const appBaseUrl =
    process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";

  const adminEmail =
    process.env.E2E_ADMIN_EMAIL ||
    process.env.TEST_ADMIN_EMAIL ||
    "admin.e2e@test.local";
  const adminPassword =
    process.env.E2E_ADMIN_PASSWORD ||
    process.env.TEST_ADMIN_PASSWORD ||
    "E2E-Admin-Local-2026!Pass";

  // Strict Safety Guard: E2E MUST only point to localhost / 127.0.0.1
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(supabaseUrl);
  } catch {
    throw new Error(`[E2E Safety] Invalid Supabase URL: ${supabaseUrl}`);
  }

  if (!["localhost", "127.0.0.1"].includes(parsedUrl.hostname)) {
    throw new Error(
      `[E2E Safety Guard Blocked] E2E tests are configured to run ONLY against local Supabase instances. Received external URL: ${supabaseUrl}`,
    );
  }

  return {
    supabaseUrl,
    serviceRoleKey,
    appBaseUrl,
    adminEmail,
    adminPassword,
  };
}

let localSupabaseClient: SupabaseClient | null = null;

export function getLocalAdminSupabase(): SupabaseClient {
  if (localSupabaseClient) return localSupabaseClient;
  const config = getE2EConfig();
  localSupabaseClient = createClient(
    config.supabaseUrl,
    config.serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
  return localSupabaseClient;
}
