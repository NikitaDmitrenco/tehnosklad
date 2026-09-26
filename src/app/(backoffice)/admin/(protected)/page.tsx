import Link from "next/link";

import { AdminPageHeader, StatusBadge } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/features/admin/auth/guard";
import { getAdminDashboard } from "@/features/admin/repository";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();
  const dashboard = await getAdminDashboard();
  const cards = [
    ["Всего товаров", dashboard.productsTotal, "/admin/products"],
    [
      "Опубликовано",
      dashboard.productsActive,
      "/admin/products?publication=published",
    ],
    ["Нет в наличии", dashboard.productsOutOfStock, "/admin/products"],
    ["Категории", dashboard.categoriesTotal, "/admin/categories"],
    ["Новые заявки", dashboard.newLeads, "/admin/leads?status=new"],
    ["Ошибки Telegram", dashboard.telegramErrors, "/admin/leads"],
    [
      "Статьи базы знаний",
      dashboard.knowledgeActive,
      "/admin/assistant-knowledge",
    ],
  ] as const;
  return (
    <main className="admin-content" id="admin-main">
      <AdminPageHeader
        title="Панель управления"
        description="Состояние каталога, заявок, Telegram delivery и базы знаний помощника."
      />
      <section
        aria-label="Статистика"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        {cards.map(([label, value, href]) => (
          <Link className="admin-stat-card" href={href} key={label}>
            <span className="text-sm font-bold text-stone-600">{label}</span>
            <strong className="mt-2 text-3xl font-black">{value}</strong>
          </Link>
        ))}
      </section>
      <section className="admin-card mt-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-black">Последние заявки</h2>
          <Link className="text-sm font-bold underline" href="/admin/leads">
            Все заявки
          </Link>
        </div>
        <div className="mt-4 divide-y divide-stone-200">
          {dashboard.recentLeads.length ? (
            dashboard.recentLeads.map((lead) => (
              <Link
                className="flex flex-wrap items-center justify-between gap-3 py-4"
                href={`/admin/leads/${lead.id}`}
                key={lead.id}
              >
                <div>
                  <strong>{lead.name}</strong>
                  <p className="text-sm text-stone-600">{lead.phone}</p>
                </div>
                <StatusBadge
                  tone={lead.status === "new" ? "warning" : "neutral"}
                >
                  {lead.status}
                </StatusBadge>
              </Link>
            ))
          ) : (
            <p className="py-6 text-sm text-stone-600">Заявок пока нет.</p>
          )}
        </div>
      </section>
    </main>
  );
}
