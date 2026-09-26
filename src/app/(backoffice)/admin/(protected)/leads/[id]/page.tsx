import Link from "next/link";
import { notFound } from "next/navigation";

import {
  AdminNotice,
  AdminPageHeader,
  StatusBadge,
} from "@/components/admin/admin-ui";
import { SubmitButton } from "@/components/admin/submit-button";
import {
  retryLeadTelegramDeliveryAction,
  setLeadStatusAction,
} from "@/features/admin/actions";
import { requireAdmin } from "@/features/admin/auth/guard";
import { getAdminLead } from "@/features/admin/repository";
import { isUuid, minorToMoney } from "@/features/admin/validation";

export const dynamic = "force-dynamic";

export default async function LeadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [lead, query] = await Promise.all([getAdminLead(id), searchParams]);
  if (!lead) notFound();
  return (
    <main className="admin-content" id="admin-main">
      <AdminPageHeader
        description={`Заявка ${lead.id} · ${new Date(lead.createdAt).toLocaleString("ru-RU")}`}
        title={lead.name}
      />
      <AdminNotice {...query} />
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="admin-card">
          <h2 className="text-xl font-black">Контакт</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="font-bold text-stone-500">Телефон</dt>
              <dd>
                <a className="underline" href={`tel:${lead.phone}`}>
                  {lead.phone}
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-bold text-stone-500">Telegram</dt>
              <dd>{lead.telegramUsername ?? "Не указан"}</dd>
            </div>
            <div>
              <dt className="font-bold text-stone-500">Комментарий</dt>
              <dd className="whitespace-pre-wrap">{lead.comment ?? "Нет"}</dd>
            </div>
            <div>
              <dt className="font-bold text-stone-500">Источник</dt>
              <dd>
                {lead.source} · {lead.sourcePath} · {lead.locale.toUpperCase()}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-stone-500">Согласие</dt>
              <dd>
                <time dateTime={lead.consentAt}>
                  {new Date(lead.consentAt).toLocaleString("ru-RU")}
                </time>
              </dd>
            </div>
          </dl>
        </section>
        <section className="admin-card">
          <h2 className="text-xl font-black">Snapshot товара</h2>
          {lead.productName ? (
            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="font-bold text-stone-500">Название</dt>
                <dd>{lead.productName}</dd>
              </div>
              <div>
                <dt className="font-bold text-stone-500">Цена при заявке</dt>
                <dd>
                  {minorToMoney(lead.productPriceMinor)} {lead.productCurrency}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-stone-500">Ссылка при заявке</dt>
                <dd>
                  {lead.productPath ? (
                    <Link className="underline" href={lead.productPath}>
                      {lead.productPath}
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              {lead.productId ? (
                <div>
                  <dt className="font-bold text-stone-500">Текущий товар</dt>
                  <dd>
                    <Link
                      className="underline"
                      href={`/admin/products/${lead.productId}`}
                    >
                      Открыть в admin
                    </Link>
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="mt-4 text-sm text-stone-600">
              Заявка не связана с товаром.
            </p>
          )}
        </section>
      </div>
      <section className="admin-card mt-5">
        <h2 className="text-xl font-black">Статус</h2>
        <form
          action={setLeadStatusAction}
          className="mt-4 flex flex-wrap items-end gap-3"
        >
          <input name="lead_id" type="hidden" value={lead.id} />
          <label className="field-label min-w-60">
            Статус
            <select className="field" defaultValue={lead.status} name="status">
              {["new", "in_progress", "contacted", "closed", "spam"].map(
                (status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ),
              )}
            </select>
          </label>
          <SubmitButton>Изменить статус</SubmitButton>
        </form>
        <ol className="mt-6 space-y-3">
          {lead.history.map((item) => (
            <li className="rounded-xl bg-stone-100 p-3 text-sm" key={item.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {item.previousStatus ?? "создана"} →{" "}
                  <strong>{item.status}</strong>
                </span>
                <time dateTime={item.createdAt}>
                  {new Date(item.createdAt).toLocaleString("ru-RU")}
                </time>
              </div>
              <p className="mt-1 text-xs text-stone-500">
                Изменил: {item.changedBy ?? "система"}
              </p>
            </li>
          ))}
        </ol>
      </section>
      <section className="admin-card mt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-black">Telegram delivery</h2>
          {lead.delivery ? (
            <StatusBadge
              tone={
                ["manual_review", "permanent_failure"].includes(
                  lead.delivery.state,
                )
                  ? "danger"
                  : lead.delivery.state === "succeeded"
                    ? "success"
                    : "warning"
              }
            >
              {lead.delivery.state}
            </StatusBadge>
          ) : null}
        </div>
        {lead.delivery ? (
          <>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="font-bold text-stone-500">Попыток</dt>
                <dd>{lead.delivery.attemptCount}</dd>
              </div>
              <div>
                <dt className="font-bold text-stone-500">Message ID</dt>
                <dd>{lead.delivery.providerMessageId ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-bold text-stone-500">Последняя ошибка</dt>
                <dd>{lead.delivery.lastErrorCode ?? "—"}</dd>
              </div>
            </dl>
            <div className="mt-5 space-y-3">
              {lead.delivery.attempts.map((attempt) => (
                <div
                  className="rounded-xl border border-stone-200 p-3 text-sm"
                  key={attempt.id}
                >
                  <strong>
                    Попытка {attempt.attemptNumber}:{" "}
                    {attempt.outcome ?? "processing"}
                  </strong>
                  <p className="mt-1 text-stone-600">
                    HTTP {attempt.providerHttpStatus ?? "—"} · provider code{" "}
                    {attempt.providerErrorCode ?? "—"} ·{" "}
                    {attempt.errorCode ?? "без ошибки"}
                  </p>
                  <time
                    className="mt-1 block text-xs text-stone-500"
                    dateTime={attempt.startedAt}
                  >
                    {new Date(attempt.startedAt).toLocaleString("ru-RU")}
                  </time>
                </div>
              ))}
            </div>
            {lead.delivery.state !== "succeeded" &&
            lead.delivery.state !== "processing" ? (
              <form
                action={retryLeadTelegramDeliveryAction}
                className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
              >
                <input name="lead_id" type="hidden" value={lead.id} />
                {lead.delivery.state === "manual_review" ? (
                  <label className="flex items-start gap-2">
                    <input name="confirm_uncertain" required type="checkbox" />
                    <span>
                      Понимаю риск дубликата: предыдущая попытка могла быть
                      принята Telegram.
                    </span>
                  </label>
                ) : null}
                <div className="mt-3">
                  <SubmitButton>Повторно отправить в Telegram</SubmitButton>
                </div>
              </form>
            ) : null}
          </>
        ) : (
          <p className="mt-4 text-sm text-stone-600">Delivery отсутствует.</p>
        )}
      </section>
    </main>
  );
}
