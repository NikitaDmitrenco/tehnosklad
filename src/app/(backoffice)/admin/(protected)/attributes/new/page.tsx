import { AttributeForm } from "@/components/admin/admin-forms";
import { AdminNotice, AdminPageHeader } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/features/admin/auth/guard";
import { listAdminAttributeGroups } from "@/features/admin/repository";

export const dynamic = "force-dynamic";

export default async function NewAttributePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();
  const [groups, query] = await Promise.all([
    listAdminAttributeGroups(),
    searchParams,
  ]);
  return (
    <main className="admin-content" id="admin-main">
      <AdminPageHeader
        description="Сначала создайте метаданные RU/RO. Варианты и категории появятся после сохранения."
        title="Новая характеристика"
      />
      <AdminNotice {...query} />
      <AttributeForm groups={groups} />
    </main>
  );
}
