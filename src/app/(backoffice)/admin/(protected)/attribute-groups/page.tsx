import {
  AdminCardLink,
  AdminPageHeader,
  EmptyState,
  StatusBadge,
} from "@/components/admin/admin-ui";
import { requireAdmin } from "@/features/admin/auth/guard";
import { listAdminAttributeGroups } from "@/features/admin/repository";

export const dynamic = "force-dynamic";

export default async function AttributeGroupsPage() {
  await requireAdmin();
  const groups = await listAdminAttributeGroups();
  return (
    <main className="admin-content" id="admin-main">
      <AdminPageHeader
        actionHref="/admin/attribute-groups/new"
        actionLabel="Добавить группу"
        description="Локализованные группы для структуры характеристик."
        title="Группы характеристик"
      />
      <div className="grid gap-3">
        {groups.length ? (
          groups.map((group) => (
            <AdminCardLink
              badges={
                <>
                  <StatusBadge tone={group.isActive ? "success" : "neutral"}>
                    {group.isActive ? "Активна" : "Выключена"}
                  </StatusBadge>
                  <StatusBadge>
                    {group.attributeCount} характеристик
                  </StatusBadge>
                </>
              }
              href={`/admin/attribute-groups/${group.id}`}
              key={group.id}
              meta={`${group.nameRo ?? "RO не заполнен"} · ${group.code}`}
              title={group.nameRu ?? group.code}
            />
          ))
        ) : (
          <EmptyState
            text="Создайте группу для организации характеристик."
            title="Групп нет"
          />
        )}
      </div>
    </main>
  );
}
