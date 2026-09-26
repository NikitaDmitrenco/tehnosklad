import {
  AdminCardLink,
  AdminPageHeader,
  EmptyState,
  StatusBadge,
} from "@/components/admin/admin-ui";
import { requireAdmin } from "@/features/admin/auth/guard";
import {
  listAdminCategories,
  listAdminProducts,
} from "@/features/admin/repository";
import { minorToMoney } from "@/features/admin/validation";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    publication?: string;
  }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const publication = ["published", "draft", "archived"].includes(
    query.publication ?? "",
  )
    ? (query.publication as "published" | "draft" | "archived")
    : undefined;
  const [products, categories] = await Promise.all([
    listAdminProducts({
      query: query.q,
      categoryId: query.category,
      publication,
    }),
    listAdminCategories(),
  ]);
  return (
    <main className="admin-content" id="admin-main">
      <AdminPageHeader
        actionHref="/admin/products/new"
        actionLabel="Добавить товар"
        description="Поиск, статусы, цены и полный редактор каталога."
        title="Товары"
      />
      <form className="admin-card mb-5 grid gap-3 sm:grid-cols-4" method="get">
        <label className="field-label sm:col-span-2">
          Поиск
          <input
            className="field"
            defaultValue={query.q}
            name="q"
            placeholder="Название, бренд, модель или SKU"
          />
        </label>
        <label className="field-label">
          Категория
          <select
            className="field"
            defaultValue={query.category ?? ""}
            name="category"
          >
            <option value="">Все</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.translations.ru?.name ?? category.id}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Статус
          <select
            className="field"
            defaultValue={query.publication ?? ""}
            name="publication"
          >
            <option value="">Все</option>
            <option value="published">Опубликованные</option>
            <option value="draft">Черновики</option>
            <option value="archived">Архив</option>
          </select>
        </label>
        <div className="admin-form-actions sm:col-span-4">
          <button className="button-primary" type="submit">
            Применить
          </button>
        </div>
      </form>
      <div className="grid gap-3">
        {products.length ? (
          products.map((product) => (
            <AdminCardLink
              badges={
                <>
                  <StatusBadge
                    tone={
                      product.archivedAt
                        ? "danger"
                        : product.isPublished
                          ? "success"
                          : "warning"
                    }
                  >
                    {product.archivedAt
                      ? "Архив"
                      : product.isPublished
                        ? "Опубликован"
                        : "Черновик"}
                  </StatusBadge>
                  <StatusBadge
                    tone={
                      product.availability === "out_of_stock"
                        ? "danger"
                        : "neutral"
                    }
                  >
                    {product.availability}
                  </StatusBadge>
                </>
              }
              href={`/admin/products/${product.id}`}
              key={product.id}
              meta={`${product.brand} ${product.model} · ${product.sku} · ${minorToMoney(product.priceMinor)} MDL`}
              title={product.translations.ru?.name ?? "Без названия RU"}
            />
          ))
        ) : (
          <EmptyState
            text={
              query.q || query.category || query.publication
                ? "Измените параметры поиска."
                : "Создайте первый товар как черновик."
            }
            title={
              query.q || query.category || query.publication
                ? "Ничего не найдено"
                : "Товаров нет"
            }
          />
        )}
      </div>
    </main>
  );
}
