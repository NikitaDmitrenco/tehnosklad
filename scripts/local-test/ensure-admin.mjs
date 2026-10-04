#!/usr/bin/env node

/**
 * Idempotent script to create/ensure a local test admin user.
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.
 * Refuses to run against non-localhost URLs.
 *
 * Usage: node scripts/local-test/ensure-admin.mjs
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

// ---- Parse .env.local ----
function loadEnv(file) {
  const vars = {};
  try {
    const content = readFileSync(file, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      vars[key] = val;
    }
  } catch {}
  return vars;
}

const env = {
  ...loadEnv(resolve(root, ".env")),
  ...loadEnv(resolve(root, ".env.local")),
};

const supabaseUrl =
  env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const serviceRoleKey =
  env.SUPABASE_SERVICE_ROLE_KEY ||
  env.SUPABASE_SECRET_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const adminEmail =
  env.E2E_ADMIN_EMAIL || env.TEST_ADMIN_EMAIL || "admin.e2e@tehnosklad.local";
const adminPassword = env.E2E_ADMIN_PASSWORD || env.TEST_ADMIN_PASSWORD;

if (!adminPassword) {
  console.error(
    "[ensure-admin] No password found. Set E2E_ADMIN_PASSWORD in .env.local",
  );
  process.exit(1);
}

// ---- Safety: refuse non-localhost ----
let parsedUrl;
try {
  parsedUrl = new URL(supabaseUrl);
} catch {
  console.error(`[ensure-admin] Invalid Supabase URL: ${supabaseUrl}`);
  process.exit(1);
}
if (!["localhost", "127.0.0.1", "[::1]"].includes(parsedUrl.hostname)) {
  console.error(
    `[ensure-admin] Refusing: NEXT_PUBLIC_SUPABASE_URL must be localhost/127.0.0.1. Got: ${supabaseUrl}`,
  );
  process.exit(1);
}

// ---- Create Supabase admin client ----
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---- Upsert auth user ----
const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
if (listErr) {
  console.error(`[ensure-admin] Failed to list users: ${listErr.message}`);
  process.exit(1);
}

let userId;
const existing = list.users.find((u) => u.email === adminEmail);

if (existing) {
  userId = existing.id;
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password: adminPassword,
    email_confirm: true,
  });
  if (error) {
    console.error(`[ensure-admin] Failed to update user: ${error.message}`);
    process.exit(1);
  }
  console.log(`[ensure-admin] Updated existing user ${adminEmail} (${userId})`);
} else {
  const { data, error } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
  });
  if (error || !data?.user) {
    console.error(
      `[ensure-admin] Failed to create user: ${error?.message ?? "unknown"}`,
    );
    process.exit(1);
  }
  userId = data.user.id;
  console.log(`[ensure-admin] Created user ${adminEmail} (${userId})`);
}

// ---- Upsert profile (is_active = true) ----
const { error: profileErr } = await supabase.from("profiles").upsert(
  {
    id: userId,
    display_name: "E2E Administrator",
    is_active: true,
  },
  { onConflict: "id" },
);
if (profileErr) {
  console.error(
    `[ensure-admin] Failed to upsert profile: ${profileErr.message}`,
  );
  process.exit(1);
}

// ---- Upsert admin role ----
const { error: roleErr } = await supabase.from("user_roles").upsert(
  {
    user_id: userId,
    role: "admin",
  },
  { onConflict: "user_id" },
);
if (roleErr) {
  console.error(
    `[ensure-admin] Failed to upsert user_role: ${roleErr.message}`,
  );
  process.exit(1);
}

// ---- Verify ----
const { data: profile, error: verifyProfileErr } = await supabase
  .from("profiles")
  .select("id, is_active")
  .eq("id", userId)
  .single();

const { data: role, error: verifyRoleErr } = await supabase
  .from("user_roles")
  .select("user_id, role")
  .eq("user_id", userId)
  .single();

if (
  verifyProfileErr ||
  !profile?.is_active ||
  verifyRoleErr ||
  role?.role !== "admin"
) {
  console.error("[ensure-admin] Verification failed!");
  console.error("  profile:", profile, verifyProfileErr);
  console.error("  role:", role, verifyRoleErr);
  process.exit(1);
}

console.log(`[ensure-admin] Verified: profile.is_active=true, role=admin`);
console.log(`[ensure-admin] Done. Credentials: ${adminEmail}`);
