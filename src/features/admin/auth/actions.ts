"use server";

import { redirect } from "next/navigation";

import { getCurrentAdmin } from "@/features/admin/auth/guard";
import { safeAdminRedirectTarget } from "@/features/admin/auth/redirect";
import { createServerUserSupabaseClient } from "@/lib/supabase/server";

function loginError(next: string): never {
  const search = new URLSearchParams({ error: "credentials", next });
  redirect(`/admin/login?${search.toString()}`);
}

export async function signInAdmin(formData: FormData): Promise<never> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeAdminRedirectTarget(String(formData.get("next") ?? ""));
  if (
    email.length > 254 ||
    !email.includes("@") ||
    password.length < 8 ||
    password.length > 256
  ) {
    loginError(next);
  }

  const supabase = await createServerUserSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) loginError(next);

  const admin = await getCurrentAdmin();
  if (!admin) {
    await supabase.auth.signOut({ scope: "local" });
    loginError(next);
  }
  redirect(next);
}

export async function signOutAdmin(): Promise<never> {
  const supabase = await createServerUserSupabaseClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/admin/login");
}
