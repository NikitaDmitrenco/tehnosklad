import Link from "next/link";

import {
  AdminPageHeader,
  EmptyState,
  StatusBadge,
} from "@/components/admin/admin-ui";
import { requireAdmin } from "@/features/admin/auth/guard";
import { getAdminAssistantLogReport } from "@/features/admin/repository";
import type { AdminAssistantLogShare } from "@/features/admin/types";

export const dynamic = "force-dynamic";

const periods = [7, 30, 90] as const;
const DEFAULT_PERIOD = 7;

const durationLabels: Record<string, string> = {
  lt_250: "Быстрее 250 мс",
  lt_1000: "250 мс — 1 с",
  gte_1000: "Дольше 1 с",
};

const localeLabels: Record<string, string> = {
  ru: "Русский",
  ro: "Română",
};

const providerLabels: Record<string, string> = {
  deterministic: "Детерминированный ответ (без AI)",
  fallback: "Встроенный режим (без AI)",
  "openai-compatible": "Внешний AI-провайдер",
};

const outcomeLabels: Record<string, string> = {
  provider_success: "Ответ AI-провайдера",
  unavailable: "Провайдер недоступен",
  rate_limited: "Провайдер вернул лимит",
  malformed: "Некорректный ответ провайдера",
  store_info: "Контакты, адрес или график",
  legal_info: "Юридические документы",
  direct_answer: "Прямой ответ из настроек",
};

function percent(share: number) {
  return `${(share * 100).toFixed(share >= 0.1 ? 0 : 1)}%`;
}

function ShareList({
  items,
  labels,
  title,
}: {
  items: AdminAssistantLogShare[];
  labels?: Record<string, string>;
  title: string;
}) {
  return (
    <section className="admin-card">
      <h2 className="text-lg font-black">{title}</h2>
      {items.length ? (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.key}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-bold">
                  {labels?.[item.key] ?? item.key}
                </span>
                <span className="text-sm text-stone-600">
                  {item.count} · {percent(item.share)}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-stone-100">
                <div
                  className="h-1.5 rounded-full bg-stone-800"
                  style={{ width: `${Math.max(item.share * 100, 2)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-stone-600">Данных за период нет.</p>
      )}
    </section>
  );
}

export default async function AssistantLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const requested = Number(query.days);
  const days = periods.find((period) => period === requested) ?? DEFAULT_PERIOD;
  const report = await getAdminAssistantLogReport(days);
  const cards = [
    ["Всего запросов", String(report.total)],
    [
      "Ответы без AI-провайдера",
      `${percent(report.fallbackShare)} · ${report.fallbackCount}`,
    ],
    ["Товаров в ответе в среднем", report.averageReferences.toFixed(1)],
  ] as const;
  return (
    <main className="admin-content" id="admin-main">
      <AdminPageHeader
        description="Обезличенная телеметрия помощника: запросы, результат, провайдер, скорость и число показанных товаров. Тексты вопросов и IP не сохраняются."
        title="Статистика помощника"
      />
      <nav aria-label="Период" className="mb-5 flex flex-wrap gap-2">
        {periods.map((period) => (
          <Link
            aria-current={period === days ? "page" : undefined}
            className={period === days ? "button-primary" : "button-secondary"}
            href={`/admin/assistant-logs?days=${period}`}
            key={period}
          >
            {period} дней
          </Link>
        ))}
      </nav>
      {report.total ? (
        <>
          <section
            aria-label="Сводка"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            {cards.map(([label, value]) => (
              <div className="admin-stat-card" key={label}>
                <span className="text-sm font-bold text-stone-600">
                  {label}
                </span>
                <strong className="mt-2 text-3xl font-black">{value}</strong>
              </div>
            ))}
          </section>
          {report.truncated ? (
            <p className="mt-4 text-sm text-stone-600">
              Разбивка построена по последним {report.analyzed} запросам периода
              из {report.total}.
            </p>
          ) : null}
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <ShareList
              items={report.outcomes}
              labels={outcomeLabels}
              title="Результат ответа"
            />
            <ShareList
              items={report.providers}
              labels={providerLabels}
              title="Провайдер"
            />
            <ShareList
              items={report.durations}
              labels={durationLabels}
              title="Скорость ответа"
            />
            <ShareList
              items={report.locales}
              labels={localeLabels}
              title="Язык вопроса"
            />
          </div>
          <section className="admin-card mt-6">
            <h2 className="text-xl font-black">Последние запросы</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[46rem] text-left text-sm">
                <thead className="text-xs uppercase text-stone-600">
                  <tr>
                    <th className="py-2 pr-4 font-black">Время</th>
                    <th className="py-2 pr-4 font-black">Язык</th>
                    <th className="py-2 pr-4 font-black">Результат</th>
                    <th className="py-2 pr-4 font-black">Провайдер</th>
                    <th className="py-2 pr-4 font-black">Скорость</th>
                    <th className="py-2 pr-4 font-black">Товаров</th>
                    <th className="py-2 font-black">Запрос</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {report.recent.map((entry) => (
                    <tr key={entry.id}>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString("ru-RU")}
                      </td>
                      <td className="py-3 pr-4">
                        {entry.locale.toUpperCase()}
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge
                          tone={entry.fallbackUsed ? "warning" : "success"}
                        >
                          {outcomeLabels[entry.outcome] ?? entry.outcome}
                        </StatusBadge>
                      </td>
                      <td className="py-3 pr-4">
                        {providerLabels[entry.provider] ?? entry.provider}
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        {durationLabels[entry.durationBucket] ??
                          entry.durationBucket}
                      </td>
                      <td className="py-3 pr-4">{entry.referenceCount}</td>
                      <td className="py-3 font-mono text-xs">
                        {entry.requestId.slice(0, 8)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <EmptyState
          text="За выбранный период помощнику не задавали вопросов либо телеметрия не пишется: она требует service-role ключа и не ведётся в demo-режиме."
          title="Запросов нет"
        />
      )}
    </main>
  );
}
