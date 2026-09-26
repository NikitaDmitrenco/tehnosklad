import { AdminNotice, AdminPageHeader } from "@/components/admin/admin-ui";
import { CategoryForm } from "@/components/admin/admin-forms";
import { requireAdmin } from "@/features/admin/auth/guard";
import { listAdminCategories } from "@/features/admin/repository";

export const dynamic = "force-dynamic";

export default async function NewCategoryPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();
  const [categories, query] = await Promise.all([
    listAdminCategories(),
    searchParams,
  ]);
  return (
    <main className="admin-content" id="admin-main">
      <AdminPageHeader
        description="Категория сохраняется атомарно вместе с двумя переводами."
        title="Новая категория"
      />
      <AdminNotice {...query} />
      <CategoryForm categories={categories} />
    </main>
  );
}
