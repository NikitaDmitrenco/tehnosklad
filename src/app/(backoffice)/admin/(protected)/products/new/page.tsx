import { ProductForm } from "@/components/admin/admin-forms";
import { AdminNotice, AdminPageHeader } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/features/admin/auth/guard";
import { listAdminCategories } from "@/features/admin/repository";

export const dynamic = "force-dynamic";

export default async function NewProductPage({
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
        description="Создайте базовый товар. Характеристики и фотографии добавляются после первого сохранения."
        title="Новый товар"
      />
      <AdminNotice {...query} />
      <ProductForm categories={categories} />
    </main>
  );
}
