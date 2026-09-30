import { getLocalAdminSupabase } from "./env";

export interface NonAdminUser {
  id: string;
  email: string;
  password: string;
}

/**
 * Creates a local Auth user with an active profile but WITHOUT a user_roles
 * row (non-admin). Password is generated at runtime and must never be logged
 * or written to files. Local-only: getLocalAdminSupabase() refuses non-local
 * Supabase URLs. Delete afterwards with deleteNonAdminUser().
 */
export async function createNonAdminUser(runId: string): Promise<NonAdminUser> {
  const supabase = getLocalAdminSupabase();
  const slug = runId.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const email = `non-admin.${slug}@tehnosklad.local`;
  const password = `N0nAdm-${Math.random().toString(36).slice(2, 10)}-${Date.now()}-x9`;

  // Remove leftovers from a previous aborted run with the same run id.
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr)
    throw new Error(`[non-admin] listUsers failed: ${listErr.message}`);
  const existing = list.users.find((u) => u.email === email);
  if (existing) {
    const { error: delErr } = await supabase.auth.admin.deleteUser(existing.id);
    if (delErr)
      throw new Error(`[non-admin] deleteUser failed: ${delErr.message}`);
  }

  const { data: created, error: createErr } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
  if (createErr || !created.user) {
    throw new Error(
      `[non-admin] createUser failed: ${createErr?.message ?? "no user"}`,
    );
  }

  const { error: profileErr } = await supabase.from("profiles").upsert({
    id: created.user.id,
    display_name: "E2E Non-Admin",
    is_active: true,
  });
  if (profileErr) {
    throw new Error(`[non-admin] profile upsert failed: ${profileErr.message}`);
  }

  // Deliberately NO user_roles row: the user must fail the admin guard.
  return { id: created.user.id, email, password };
}

export async function deleteNonAdminUser(userId: string): Promise<void> {
  const supabase = getLocalAdminSupabase();
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    console.warn(
      `[non-admin] Warning: failed to delete user ${userId}: ${error.message}`,
    );
  }
}
