import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabasePublicEnvironment } from "@/lib/env/public";

export function createPublicCatalogSupabaseClient() {
  const environment = getSupabasePublicEnvironment();
  return createClient(
    environment.supabaseUrl,
    environment.supabasePublishableKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}
