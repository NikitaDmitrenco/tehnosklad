import { AssistantKnowledgeForm } from "@/components/admin/admin-forms";
import { AdminNotice, AdminPageHeader } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/features/admin/auth/guard";

export const dynamic = "force-dynamic";

export default async function NewAssistantKnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  return (
    <main className="admin-content" id="admin-main">
      <AdminPageHeader
        description="Статью нужно добавить отдельно для каждого языка."
        title="Новая статья базы знаний"
      />
      <AdminNotice {...query} />
      <AssistantKnowledgeForm />
    </main>
  );
}
