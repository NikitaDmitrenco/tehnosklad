import Link from "next/link";
import type { ReactNode } from "react";

import { AdminNavigation } from "@/components/admin/admin-navigation";
import { signOutAdmin } from "@/features/admin/auth/actions";
import { requireAdmin } from "@/features/admin/auth/guard";

export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const admin = await requireAdmin();
  return (
    <div className="min-h-screen bg-stone-100 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <a className="skip-link" href="#admin-main">
        К содержимому
      </a>
      <div className="hidden border-r border-stone-800 bg-stone-950 p-4 text-white lg:block">
        <div className="px-3 py-3 pb-5">
          <Link
            aria-label="Техносклад Админ"
            className="inline-block"
            href="/admin"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Техносклад"
              className="h-8 w-auto"
              src="/tehnosklad-logo-white.svg"
            />
          </Link>
        </div>
        <AdminNavigation />
      </div>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="lg:hidden">
                <AdminNavigation />
              </div>
              <div>
                <p className="font-black">Tehnosklad Admin</p>
                <p className="hidden text-xs text-stone-600 sm:block">
                  {admin.email} · {admin.role}
                </p>
              </div>
            </div>
            <form action={signOutAdmin}>
              <button className="button-secondary" type="submit">
                Выйти
              </button>
            </form>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
