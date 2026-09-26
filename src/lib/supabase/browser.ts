"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicEnvironment } from "@/lib/env/public";

export function createBrowserSupabaseClient() {
  const environment = getSupabasePublicEnvironment();
  return createBrowserClient(
    environment.supabaseUrl,
    environment.supabasePublishableKey,
  );
}
