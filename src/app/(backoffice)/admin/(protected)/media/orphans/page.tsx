import Link from "next/link";

import {
  AdminNotice,
  AdminPageHeader,
  EmptyState,
  StatusBadge,
} from "@/components/admin/admin-ui";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { reconcileImageEntryAction } from "@/features/admin/actions";
import { requireAdmin } from "@/features/admin/auth/guard";
import { scanAdminProductOrphans } from "@/features/admin/repository";

export const dynamic = "force-dynamic";

const labels = {
  orphan_object: "Файл без metadata",
  missing_object: "Metadata без файла",
  pending_metadata: "Незавершённое удаление",
} as const;

export default async function OrphansPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();
  const [entries, query] = await Promise.all([
    scanAdminProductOrphans(),
    searchParams,
  ]);
  return (
    <main className="admin-content" id="admin-main">
      <AdminPageHeader
        description="Сверка product-images Storage и metadata. Исправление всегда повторно проверяет состояние на сервере."
        title="Проверка файлов"
      />
      <AdminNotice {...query} />
      {entries.length ? (
        <div className="grid gap-3">
          {entries.map((entry) => (
            <section
              className="admin-card"
              key={`${entry.state}:${entry.path}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <StatusBadge tone="danger">{labels[entry.state]}</StatusBadge>
                  <p className="mt-3 break-all font-mono text-xs">
                    {entry.path}
                  </p>
                  <Link
                    className="mt-2 inline-block text-sm font-bold underline"
                    href={`/admin/products/${entry.productId}`}
                  >
                    Открыть товар
                  </Link>
                </div>
                <form action={reconcileImageEntryAction}>
                  <input name="path" type="hidden" value={entry.path} />
                  <input name="state" type="hidden" value={entry.state} />
                  <ConfirmSubmitButton
                    message={
                      entry.state === "orphan_object"
                        ? "Удалить orphan-файл из Storage?"
                        : entry.state === "missing_object"
                          ? "Удалить сломанную metadata-запись?"
                          : "Сверить объект и завершить либо отменить удаление?"
                    }
                  >
                    {entry.state === "pending_metadata"
                      ? "Восстановить / завершить"
                      : "Очистить"}
                  </ConfirmSubmitButton>
                </form>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          text="Storage и metadata согласованы."
          title="Orphan-файлов нет"
        />
      )}
    </main>
  );
}
