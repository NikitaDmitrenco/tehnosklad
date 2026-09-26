import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { signInAdmin } from "@/features/admin/auth/actions";
import { getCurrentAdmin } from "@/features/admin/auth/guard";
import { safeAdminRedirectTarget } from "@/features/admin/auth/redirect";
import { getOptionalSupabasePublicEnvironment } from "@/lib/env/public";
import { EnvironmentConfigurationError } from "@/lib/env/shared";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string | string[];
    next?: string | string[];
  }>;
}) {
  const query = await searchParams;
  const next = safeAdminRedirectTarget(
    typeof query.next === "string" ? query.next : undefined,
  );
  let configured = false;
  try {
    configured = getOptionalSupabasePublicEnvironment() !== null;
  } catch (error) {
    if (!(error instanceof EnvironmentConfigurationError)) throw error;
    configured = false;
  }
  if (configured && (await getCurrentAdmin())) redirect(next);

  return (
    <main className="grid min-h-screen place-items-center py-12">
      <PageContainer className="w-full max-w-lg">
        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-9">
          <div className="mb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Техносклад"
              className="h-8 w-auto"
              src="/tehnosklad-logo.svg"
            />
          </div>
          <h1 className="text-2xl font-black">Вход для администратора</h1>
          <p className="mt-3 text-sm text-stone-600">
            Используйте учётную запись Supabase Auth с активной ролью admin.
          </p>
          {!configured ? (
            <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">
              Supabase Auth не настроен. Добавьте публичный URL и publishable
              key согласно docs/supabase-setup.md.
            </p>
          ) : (
            <form action={signInAdmin} className="mt-7 space-y-4">
              <input name="next" type="hidden" value={next} />
              <label className="field-label">
                Email
                <input
                  autoComplete="username"
                  className="field"
                  maxLength={254}
                  name="email"
                  required
                  type="email"
                />
              </label>
              <label className="field-label">
                Пароль
                <input
                  autoComplete="current-password"
                  className="field"
                  maxLength={256}
                  minLength={8}
                  name="password"
                  required
                  type="password"
                />
              </label>
              {query.error ? (
                <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">
                  Вход не выполнен. Проверьте данные и наличие активной роли
                  администратора.
                </p>
              ) : null}
              <button className="button-primary w-full" type="submit">
                Войти
              </button>
            </form>
          )}
        </section>
      </PageContainer>
    </main>
  );
}
