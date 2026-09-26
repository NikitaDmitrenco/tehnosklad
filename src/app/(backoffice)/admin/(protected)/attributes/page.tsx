import {
  AdminCardLink,
  AdminPageHeader,
  EmptyState,
  StatusBadge,
} from "@/components/admin/admin-ui";
import { requireAdmin } from "@/features/admin/auth/guard";
import { listAdminAttributes } from "@/features/admin/repository";

export const dynamic = "force-dynamic";

export default async function AttributesPage() {
  await requireAdmin();
  const attributes = await listAdminAttributes();
  return (
    <main className="admin-content" id="admin-main">
      <AdminPageHeader
        actionHref="/admin/attributes/new"
        actionLabel="Добавить характеристику"
        description="Типы, переводы, варианты и привязки к категориям."
        title="Характеристики"
      />
      <div className="grid gap-3">
        {attributes.length ? (
          attributes.map((attribute) => (
            <AdminCardLink
              badges={
                <>
                  <StatusBadge
                    tone={attribute.isActive ? "success" : "neutral"}
                  >
                    {attribute.isActive ? "Активна" : "Выключена"}
                  </StatusBadge>
                  <StatusBadge>{attribute.dataType}</StatusBadge>
                  <StatusBadge>
                    {attribute.bindings.length} категорий
                  </StatusBadge>
                </>
              }
              href={`/admin/attributes/${attribute.id}`}
              key={attribute.id}
              meta={`${attribute.nameRo ?? "RO не заполнен"} · ${attribute.code}`}
              title={attribute.nameRu ?? attribute.code}
            />
          ))
        ) : (
          <EmptyState
            text="Создайте характеристики и затем привяжите их к категориям."
            title="Характеристик нет"
          />
        )}
      </div>
    </main>
  );
}
