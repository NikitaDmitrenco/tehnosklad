import Link from "next/link";

import {
  AdminCardLink,
  AdminPageHeader,
  EmptyState,
  StatusBadge,
} from "@/components/admin/admin-ui";
import { requireAdmin } from "@/features/admin/auth/guard";
import { listAdminLeads, listAdminProducts } from "@/features/admin/repository";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const [leads, products] = await Promise.all([
    listAdminLeads({
      status: query.status,
      source: query.source,
      locale: query.locale,
      productId: query.product,
      dateFrom: query.date_from,
      dateTo: query.date_to,
      query: query.q,
    }),
    listAdminProducts(),
  ]);
  const exportQuery = new URLSearchParams(
    Object.entries(query).flatMap(([key, value]) =>
      value ? [[key, value]] : [],
    ),
  );
  return (
    <main className="admin-content" id="admin-main">
      <AdminPageHeader
        description="Контактные данные, snapshot товара, история статусов и Telegram delivery."
        title="Заявки"
      />
      <form className="admin-card mb-5 grid gap-3 sm:grid-cols-3" method="get">
        <label className="field-label sm:col-span-2">
          Поиск
          <input
            className="field"
            defaultValue={query.q}
            name="q"
            placeholder="Имя или телефон"
          />
        </label>
        <label className="field-label">
          Статус
          <select
            className="field"
            defaultValue={query.status ?? ""}
            name="status"
          >
            <option value="">Все</option>
            {["new", "in_progress", "contacted", "closed", "spam"].map(
              (status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="field-label">
          Источник
          <select
            className="field"
            defaultValue={query.source ?? ""}
            name="source"
          >
            <option value="">Все</option>
            {[
              "home_contact",
              "contacts_page",
              "home_product_card",
              "catalog_product_card",
              "category_product_card",
              "product_page",
              "similar_product_card",
              "assistant",
            ].map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Язык
          <select
            className="field"
            defaultValue={query.locale ?? ""}
            name="locale"
          >
            <option value="">Все</option>
            <option value="ru">RU</option>
            <option value="ro">RO</option>
          </select>
        </label>
        <label className="field-label">
          Товар
          <select
            className="field"
            defaultValue={query.product ?? ""}
            name="product"
          >
            <option value="">Все</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.translations.ru?.name ?? product.sku}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          С даты
          <input
            className="field"
            defaultValue={query.date_from}
            name="date_from"
            type="date"
          />
        </label>
        <label className="field-label">
          По дату
          <input
            className="field"
            defaultValue={query.date_to}
            name="date_to"
            type="date"
          />
        </label>
        <div className="admin-form-actions sm:col-span-3">
          <button className="button-primary" type="submit">
            Применить
          </button>
          <Link
            className="button-secondary"
            href={`/admin/leads/export?${exportQuery.toString()}`}
          >
            Экспорт CSV
          </Link>
        </div>
      </form>
      <div className="grid gap-3">
        {leads.length ? (
          leads.map((lead) => (
            <AdminCardLink
              badges={
                <>
                  <StatusBadge
                    tone={
                      lead.status === "new"
                        ? "warning"
                        : lead.status === "spam"
                          ? "danger"
                          : lead.status === "closed"
                            ? "success"
                            : "neutral"
                    }
                  >
                    {lead.status}
                  </StatusBadge>
                  {lead.delivery &&
                  ["permanent_failure", "manual_review"].includes(
                    lead.delivery.state,
                  ) ? (
                    <StatusBadge tone="danger">
                      Telegram: {lead.delivery.state}
                    </StatusBadge>
                  ) : null}
                </>
              }
              href={`/admin/leads/${lead.id}`}
              key={lead.id}
              meta={`${lead.phone} · ${lead.locale.toUpperCase()} · ${new Date(lead.createdAt).toLocaleString("ru-RU")}`}
              title={lead.name}
            />
          ))
        ) : (
          <EmptyState
            text="Измените фильтры или дождитесь новой заявки."
            title="Заявок не найдено"
          />
        )}
      </div>
    </main>
  );
}
