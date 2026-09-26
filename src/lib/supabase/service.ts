import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseServiceRoleEnvironment } from "@/lib/env/server";

// Deliberately not exported from a barrel. Use only for narrowly scoped server jobs.
export function createServiceRoleSupabaseClient() {
  const environment = getSupabaseServiceRoleEnvironment();
  return createClient(
    environment.supabaseUrl,
    environment.supabaseServiceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}
