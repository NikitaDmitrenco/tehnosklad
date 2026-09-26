import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ProductAttributesForm,
  ProductForm,
} from "@/components/admin/admin-forms";
import {
  AdminNotice,
  AdminPageHeader,
  StatusBadge,
} from "@/components/admin/admin-ui";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { SubmitButton } from "@/components/admin/submit-button";
import {
  deleteProductImageAction,
  setProductArchivedAction,
  updateProductImageAction,
  uploadProductImageAction,
} from "@/features/admin/actions";
import { requireAdmin } from "@/features/admin/auth/guard";
import {
  getAdminProduct,
  listAdminAttributes,
  listAdminCategories,
} from "@/features/admin/repository";
import { isUuid } from "@/features/admin/validation";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [product, categories, attributes, query] = await Promise.all([
    getAdminProduct(id),
    listAdminCategories(),
    listAdminAttributes(),
    searchParams,
  ]);
  if (!product) notFound();
  const category = categories.find((item) => item.id === product.categoryId);
  const requiredBindings = attributes.flatMap((attribute) =>
    attribute.bindings
      .filter(
        (binding) =>
          binding.categoryId === product.categoryId && binding.isRequired,
      )
      .map(() => attribute),
  );
  const checklist = [
    [
      Boolean(category?.isPublished && !category.archivedAt),
      "Категория опубликована",
    ],
    [
      Boolean(product.translations.ru && product.translations.ro),
      "Переводы RU и RO заполнены",
    ],
    [
      requiredBindings.every((attribute) =>
        product.values.some((value) => value.attributeId === attribute.id),
      ),
      "Обязательные характеристики заполнены",
    ],
    [
      product.images
        .filter((image) => !image.deletionPendingAt)
        .every((image) => image.altRu && image.altRo),
      "Alt-тексты изображений заполнены",
    ],
  ] as const;
  return (
    <main className="admin-content" id="admin-main">
      <AdminPageHeader
        description={`${product.brand} ${product.model} · ${product.sku}`}
        title={product.translations.ru?.name ?? "Товар"}
      />
      <AdminNotice {...query} />
      <section className="admin-card mb-5">
        <div className="flex flex-wrap items-center gap-2">
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
          <Link
            className="button-secondary"
            href={`/admin/products/${product.id}/preview/ru`}
          >
            Preview RU
          </Link>
          <Link
            className="button-secondary"
            href={`/admin/products/${product.id}/preview/ro`}
          >
            Preview RO
          </Link>
          {product.isPublished &&
          product.translations.ru &&
          product.translations.ro ? (
            <>
              <Link
                className="button-secondary"
                href={`/ru/product/${product.translations.ru.slug}`}
                target="_blank"
              >
                Витрина RU
              </Link>
              <Link
                className="button-secondary"
                href={`/ro/product/${product.translations.ro.slug}`}
                target="_blank"
              >
                Витрина RO
              </Link>
            </>
          ) : null}
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {checklist.map(([ok, label]) => (
            <li className="flex items-center gap-2 text-sm" key={label}>
              <span aria-hidden="true">{ok ? "✓" : "×"}</span>
              <span className={ok ? "text-emerald-800" : "text-red-800"}>
                {label}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <ProductForm categories={categories} product={product} />
      <div className="mt-8">
        <ProductAttributesForm attributes={attributes} product={product} />
      </div>
      <section className="admin-card mt-8 space-y-4">
        <div>
          <h2 className="text-xl font-black">Изображения</h2>
          <p className="mt-1 text-sm text-stone-600">
            JPEG, PNG, WebP или AVIF до 5 МБ. Путь и bucket создаются только
            сервером; overwrite отключён.
          </p>
        </div>
        <form
          action={uploadProductImageAction}
          className="grid gap-3 rounded-xl border border-dashed border-stone-300 p-4 sm:grid-cols-2"
          data-admin-form="image-upload"
        >
          <input name="product_id" type="hidden" value={product.id} />
          <label className="field-label sm:col-span-2">
            Файл
            <input
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="field"
              name="image"
              required
              type="file"
            />
          </label>
          <label className="field-label">
            Alt RU
            <input className="field" maxLength={240} name="alt_ru" required />
          </label>
          <label className="field-label">
            Alt RO
            <input className="field" maxLength={240} name="alt_ro" required />
          </label>
          <label className="field-label">
            Порядок
            <input
              className="field"
              defaultValue={product.images.length * 10}
              min={0}
              name="sort_order"
              required
              type="number"
            />
          </label>
          <label className="flex min-h-11 items-center gap-3 font-bold">
            <input
              defaultChecked={product.images.length === 0}
              name="is_primary"
              type="checkbox"
            />{" "}
            Главное
          </label>
          <div className="admin-form-actions sm:col-span-2">
            <SubmitButton pendingText="Загрузка…">
              Загрузить изображение
            </SubmitButton>
          </div>
        </form>
        <div className="grid gap-4">
          {product.images.map((image) => (
            <div
              className="rounded-xl border border-stone-200 p-4"
              key={image.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <strong className="break-all text-sm">
                    {image.storagePath}
                  </strong>
                  <div className="mt-2 flex gap-2">
                    {image.isPrimary ? (
                      <StatusBadge tone="success">Главное</StatusBadge>
                    ) : null}
                    {image.deletionPendingAt ? (
                      <StatusBadge tone="danger">Ожидает очистки</StatusBadge>
                    ) : null}
                  </div>
                </div>
                <a
                  className="button-secondary"
                  href={image.publicUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Открыть файл
                </a>
              </div>
              {!image.deletionPendingAt ? (
                <>
                  <form
                    action={updateProductImageAction}
                    className="mt-4 grid gap-3 sm:grid-cols-2"
                  >
                    <input name="product_id" type="hidden" value={product.id} />
                    <input name="image_id" type="hidden" value={image.id} />
                    <label className="field-label">
                      Alt RU
                      <input
                        className="field"
                        defaultValue={image.altRu ?? ""}
                        maxLength={240}
                        name="alt_ru"
                        required
                      />
                    </label>
                    <label className="field-label">
                      Alt RO
                      <input
                        className="field"
                        defaultValue={image.altRo ?? ""}
                        maxLength={240}
                        name="alt_ro"
                        required
                      />
                    </label>
                    <label className="field-label">
                      Порядок
                      <input
                        className="field"
                        defaultValue={image.sortOrder}
                        min={0}
                        name="sort_order"
                        required
                        type="number"
                      />
                    </label>
                    <label className="flex min-h-11 items-center gap-3 font-bold">
                      <input
                        defaultChecked={image.isPrimary}
                        name="is_primary"
                        type="checkbox"
                      />{" "}
                      Главное
                    </label>
                    <div className="admin-form-actions sm:col-span-2">
                      <SubmitButton>Сохранить изображение</SubmitButton>
                    </div>
                  </form>
                  <form action={deleteProductImageAction} className="mt-3">
                    <input name="product_id" type="hidden" value={product.id} />
                    <input name="image_id" type="hidden" value={image.id} />
                    <ConfirmSubmitButton message="Удалить изображение из каталога и Storage?">
                      Удалить изображение
                    </ConfirmSubmitButton>
                  </form>
                </>
              ) : (
                <p className="mt-4 text-sm text-stone-600">
                  Завершите очистку через раздел «Проверка файлов».
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
      <section className="admin-card mt-8">
        <h2 className="text-lg font-black">Архив</h2>
        <p className="mt-2 text-sm text-stone-600">
          Архивирование снимает товар с публикации и сохраняет историю URL.
        </p>
        <form
          action={setProductArchivedAction}
          className="mt-4"
          data-admin-form="archive-product"
        >
          <input name="id" type="hidden" value={product.id} />
          <input
            name="archived"
            type="hidden"
            value={product.archivedAt ? "false" : "true"}
          />
          <ConfirmSubmitButton
            message={
              product.archivedAt
                ? "Восстановить товар как черновик?"
                : "Архивировать товар?"
            }
          >
            {product.archivedAt ? "Восстановить" : "Архивировать"}
          </ConfirmSubmitButton>
        </form>
      </section>
    </main>
  );
}
