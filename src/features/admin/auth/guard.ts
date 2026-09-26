import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { hasActiveAdminRole } from "@/features/admin/auth/role";
import { createServerUserSupabaseClient } from "@/lib/supabase/server";

export type AdminSession = {
  id: string;
  email: string;
  role: "admin";
};

export const getCurrentAdmin = cache(async (): Promise<AdminSession | null> => {
  const supabase = await createServerUserSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user?.id || !user.email) return null;

  const [profileResult, roleResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("is_active")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  if (profileResult.error || roleResult.error) return null;
  if (!hasActiveAdminRole(profileResult.data, roleResult.data)) return null;

  return { id: user.id, email: user.email, role: "admin" };
});

export async function requireAdmin(): Promise<AdminSession> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
