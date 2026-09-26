import {
  AdminCardLink,
  AdminPageHeader,
  EmptyState,
  StatusBadge,
} from "@/components/admin/admin-ui";
import { requireAdmin } from "@/features/admin/auth/guard";
import { listAdminCategories } from "@/features/admin/repository";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  await requireAdmin();
  const categories = await listAdminCategories();
  return (
    <main className="admin-content" id="admin-main">
      <AdminPageHeader
        actionHref="/admin/categories/new"
        actionLabel="Добавить категорию"
        description="RU/RO, локализованные slug, иерархия и публикация."
        title="Категории"
      />
      <div className="grid gap-3">
        {categories.length ? (
          categories.map((category) => (
            <AdminCardLink
              badges={
                <>
                  <StatusBadge
                    tone={
                      category.archivedAt
                        ? "danger"
                        : category.isPublished
                          ? "success"
                          : "warning"
                    }
                  >
                    {category.archivedAt
                      ? "Архив"
                      : category.isPublished
                        ? "Опубликована"
                        : "Черновик"}
                  </StatusBadge>
                  <StatusBadge>{category.productCount} товаров</StatusBadge>
                </>
              }
              href={`/admin/categories/${category.id}`}
              key={category.id}
              meta={`${category.translations.ro?.name ?? "RO не заполнен"} · ${category.presentationKey}`}
              title={category.translations.ru?.name ?? "Без названия RU"}
            />
          ))
        ) : (
          <EmptyState
            text="Создайте первую категорию каталога."
            title="Категорий нет"
          />
        )}
      </div>
    </main>
  );
}
