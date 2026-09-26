import { getE2EConfig, getLocalAdminSupabase } from "./env";

export interface TestAdminCredentials {
  userId: string;
  email: string;
  password: string;
}

/**
 * Ensures a dedicated test administrator exists in the local Supabase instance
 * with an active profile (is_active = true) and the 'admin' role in user_roles.
 */
export async function ensureTestAdminUser(): Promise<TestAdminCredentials> {
  const config = getE2EConfig();
  const supabase = getLocalAdminSupabase();

  const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    throw new Error(
      `[E2E Auth Setup] Failed to list users: ${listErr.message}`,
    );
  }

  let userId: string;
  const existing = list.users.find((u) => u.email === config.adminEmail);

  if (existing) {
    userId = existing.id;
    const { error: updateErr } = await supabase.auth.admin.updateUserById(
      userId,
      {
        password: config.adminPassword,
        email_confirm: true,
      },
    );
    if (updateErr) {
      throw new Error(
        `[E2E Auth Setup] Failed to update user password: ${updateErr.message}`,
      );
    }
  } else {
    const { data: created, error: createErr } =
      await supabase.auth.admin.createUser({
        email: config.adminEmail,
        password: config.adminPassword,
        email_confirm: true,
      });
    if (createErr || !created.user) {
      throw new Error(
        `[E2E Auth Setup] Failed to create user: ${createErr?.message}`,
      );
    }
    userId = created.user.id;
  }

  // Ensure active profile exists
  const { error: profileErr } = await supabase.from("profiles").upsert({
    id: userId,
    display_name: "E2E Administrator",
    is_active: true,
  });
  if (profileErr) {
    throw new Error(
      `[E2E Auth Setup] Failed to upsert admin profile: ${profileErr.message}`,
    );
  }

  // Ensure 'admin' role exists
  const { error: roleErr } = await supabase.from("user_roles").upsert({
    user_id: userId,
    role: "admin",
  });
  if (roleErr) {
    throw new Error(
      `[E2E Auth Setup] Failed to upsert admin user_role: ${roleErr.message}`,
    );
  }

  return {
    userId,
    email: config.adminEmail,
    password: config.adminPassword,
  };
}
