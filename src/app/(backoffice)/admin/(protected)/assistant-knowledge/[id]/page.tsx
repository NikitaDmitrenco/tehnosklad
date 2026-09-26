import { notFound } from "next/navigation";

import { AssistantKnowledgeForm } from "@/components/admin/admin-forms";
import { AdminNotice, AdminPageHeader } from "@/components/admin/admin-ui";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { deleteAssistantKnowledgeAction } from "@/features/admin/actions";
import { requireAdmin } from "@/features/admin/auth/guard";
import { getAdminAssistantKnowledge } from "@/features/admin/repository";
import { isUuid } from "@/features/admin/validation";

export const dynamic = "force-dynamic";

export default async function AssistantKnowledgeArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [article, query] = await Promise.all([
    getAdminAssistantKnowledge(id),
    searchParams,
  ]);
  if (!article) notFound();
  return (
    <main className="admin-content" id="admin-main">
      <AdminPageHeader title={article.title} />
      <AdminNotice {...query} />
      <AssistantKnowledgeForm article={article} />
      <section className="admin-card mt-8">
        <h2 className="text-lg font-black">Удаление</h2>
        <p className="mt-2 text-sm text-stone-600">
          Чтобы временно скрыть статью от помощника, снимите галочку «Активна»
          вместо удаления.
        </p>
        <form action={deleteAssistantKnowledgeAction} className="mt-4">
          <input name="id" type="hidden" value={article.id} />
          <ConfirmSubmitButton message="Удалить статью без возможности восстановления?">
            Удалить статью
          </ConfirmSubmitButton>
        </form>
      </section>
    </main>
  );
}
