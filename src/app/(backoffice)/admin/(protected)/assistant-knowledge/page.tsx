import {
  AdminCardLink,
  AdminNotice,
  AdminPageHeader,
  EmptyState,
  StatusBadge,
} from "@/components/admin/admin-ui";
import { requireAdmin } from "@/features/admin/auth/guard";
import { listAdminAssistantKnowledge } from "@/features/admin/repository";

export const dynamic = "force-dynamic";

export default async function AssistantKnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();
  const [articles, query] = await Promise.all([
    listAdminAssistantKnowledge(),
    searchParams,
  ]);
  return (
    <main className="admin-content" id="admin-main">
      <AdminPageHeader
        actionHref="/admin/assistant-knowledge/new"
        actionLabel="Добавить статью"
        description="Ответы помощника о доставке, оплате, гарантии и возврате. Помощник использует только эти тексты и не придумывает условия магазина."
        title="База знаний помощника"
      />
      <AdminNotice {...query} />
      <div className="grid gap-3">
        {articles.length ? (
          articles.map((article) => (
            <AdminCardLink
              badges={
                <>
                  <StatusBadge tone={article.isActive ? "success" : "neutral"}>
                    {article.isActive ? "Активна" : "Выключена"}
                  </StatusBadge>
                  <StatusBadge>
                    {article.locale === "ru" ? "Русский" : "Română"}
                  </StatusBadge>
                </>
              }
              href={`/admin/assistant-knowledge/${article.id}`}
              key={article.id}
              meta={article.content.slice(0, 120)}
              title={article.title}
            />
          ))
        ) : (
          <EmptyState
            text="Пока помощник отвечает только по каталогу, контактам и юридическим документам. Добавьте статьи об условиях магазина."
            title="Статей нет"
          />
        )}
      </div>
    </main>
  );
}
