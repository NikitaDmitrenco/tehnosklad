import { notFound } from "next/navigation";

import { AttributeForm } from "@/components/admin/admin-forms";
import {
  AdminNotice,
  AdminPageHeader,
  StatusBadge,
} from "@/components/admin/admin-ui";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { SubmitButton } from "@/components/admin/submit-button";
import {
  deleteAttributeAction,
  deleteAttributeOptionAction,
  saveAttributeOptionAction,
  setCategoryAttributeAction,
} from "@/features/admin/actions";
import { requireAdmin } from "@/features/admin/auth/guard";
import {
  getAdminAttribute,
  listAdminAttributeGroups,
  listAdminCategories,
} from "@/features/admin/repository";
import { isUuid } from "@/features/admin/validation";

export const dynamic = "force-dynamic";

function OptionForm({
  attributeId,
  option,
}: {
  attributeId: string;
  option?: {
    id: string;
    code: string;
    sortOrder: number;
    isActive: boolean;
    labelRu: string | null;
    labelRo: string | null;
  };
}) {
  return (
    <form
      action={saveAttributeOptionAction}
      className="grid gap-3 rounded-xl border border-stone-200 p-4 sm:grid-cols-2"
    >
      <input name="attribute_id" type="hidden" value={attributeId} />
      {option ? <input name="id" type="hidden" value={option.id} /> : null}
      <label className="field-label">
        Код
        <input
          className="field"
          defaultValue={option?.code}
          name="code"
          pattern="[a-z][a-z0-9_]*"
          required
        />
      </label>
      <label className="field-label">
        Порядок
        <input
          className="field"
          defaultValue={option?.sortOrder ?? 0}
          min={0}
          name="sort_order"
          required
          type="number"
        />
      </label>
      <label className="field-label">
        Label RU
        <input
          className="field"
          defaultValue={option?.labelRu ?? ""}
          maxLength={160}
          name="label_ru"
          required
        />
      </label>
      <label className="field-label">
        Label RO
        <input
          className="field"
          defaultValue={option?.labelRo ?? ""}
          maxLength={160}
          name="label_ro"
          required
        />
      </label>
      <label className="flex min-h-11 items-center gap-3 font-bold">
        <input
          defaultChecked={option?.isActive ?? true}
          name="is_active"
          type="checkbox"
        />{" "}
        Активен
      </label>
      <div className="admin-form-actions">
        <SubmitButton>
          {option ? "Сохранить вариант" : "Добавить вариант"}
        </SubmitButton>
      </div>
    </form>
  );
}

export default async function AttributePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [attribute, groups, categories, query] = await Promise.all([
    getAdminAttribute(id),
    listAdminAttributeGroups(),
    listAdminCategories(),
    searchParams,
  ]);
  if (!attribute) notFound();
  const supportsOptions = ["single_select", "multi_select"].includes(
    attribute.dataType,
  );
  const unbound = categories.filter(
    (category) =>
      !category.archivedAt &&
      !attribute.bindings.some((binding) => binding.categoryId === category.id),
  );
  return (
    <main className="admin-content" id="admin-main">
      <AdminPageHeader
        description={`Код: ${attribute.code} · тип: ${attribute.dataType}`}
        title={attribute.nameRu ?? attribute.code}
      />
      <AdminNotice {...query} />
      <AttributeForm attribute={attribute} groups={groups} />
      <section className="admin-card mt-8 space-y-4">
        <div>
          <h2 className="text-xl font-black">Варианты</h2>
          <p className="mt-1 text-sm text-stone-600">
            Варианты используются только типами «список» и «множественный
            выбор». Цвет хранится как #RRGGBB.
          </p>
        </div>
        {supportsOptions ? (
          <>
            <div className="space-y-3">
              {attribute.options.map((option) => (
                <div key={option.id}>
                  <OptionForm attributeId={attribute.id} option={option} />
                  <form action={deleteAttributeOptionAction} className="mt-2">
                    <input
                      name="attribute_id"
                      type="hidden"
                      value={attribute.id}
                    />
                    <input name="id" type="hidden" value={option.id} />
                    <ConfirmSubmitButton message="Удалить неиспользуемый вариант?">
                      Удалить вариант
                    </ConfirmSubmitButton>
                  </form>
                </div>
              ))}
            </div>
            <OptionForm attributeId={attribute.id} />
          </>
        ) : (
          <p className="rounded-xl bg-stone-100 p-4 text-sm">
            Для этого типа варианты не поддерживаются.
          </p>
        )}
      </section>
      <section className="admin-card mt-8 space-y-4">
        <div>
          <h2 className="text-xl font-black">Категории</h2>
          <p className="mt-1 text-sm text-stone-600">
            Required/filterable и порядок задаются отдельно для каждой
            категории.
          </p>
        </div>
        {attribute.bindings.map((binding) => (
          <form
            action={setCategoryAttributeAction}
            className="grid items-end gap-3 rounded-xl border border-stone-200 p-4 sm:grid-cols-4"
            key={binding.categoryId}
          >
            <input name="attribute_id" type="hidden" value={attribute.id} />
            <input
              name="category_id"
              type="hidden"
              value={binding.categoryId}
            />
            <input name="enabled" type="hidden" value="true" />
            <div>
              <strong>{binding.categoryName}</strong>
              <div className="mt-1">
                <StatusBadge>Привязана</StatusBadge>
              </div>
            </div>
            <label className="flex min-h-11 items-center gap-2 font-bold">
              <input
                defaultChecked={binding.isRequired}
                name="is_required"
                type="checkbox"
              />{" "}
              Обязательная
            </label>
            <label className="flex min-h-11 items-center gap-2 font-bold">
              <input
                defaultChecked={binding.isFilterable ?? attribute.isFilterable}
                disabled={attribute.dataType === "text"}
                name="is_filterable"
                type="checkbox"
              />{" "}
              Фильтр
            </label>
            <label className="field-label">
              Порядок
              <input
                className="field"
                defaultValue={binding.sortOrder}
                min={0}
                name="sort_order"
                type="number"
              />
            </label>
            <div className="admin-form-actions sm:col-span-4">
              <SubmitButton>Сохранить привязку</SubmitButton>
              <button
                className="button-danger"
                formAction={setCategoryAttributeAction}
                name="enabled_override"
                type="submit"
                value="false"
              >
                Отвязать
              </button>
            </div>
          </form>
        ))}
        {unbound.length ? (
          <form
            action={setCategoryAttributeAction}
            className="grid items-end gap-3 rounded-xl border border-dashed border-stone-300 p-4 sm:grid-cols-4"
          >
            <input name="attribute_id" type="hidden" value={attribute.id} />
            <input name="enabled" type="hidden" value="true" />
            <label className="field-label sm:col-span-2">
              Добавить категорию
              <select className="field" name="category_id">
                {unbound.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.translations.ru?.name ?? category.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Порядок
              <input
                className="field"
                defaultValue={0}
                min={0}
                name="sort_order"
                type="number"
              />
            </label>
            <div className="admin-form-actions">
              <SubmitButton>Привязать</SubmitButton>
            </div>
          </form>
        ) : null}
      </section>
      <section className="admin-card mt-8">
        <h2 className="text-lg font-black">Удаление</h2>
        <p className="mt-2 text-sm text-stone-600">
          Удалить можно только характеристику без привязок и товарных значений.
        </p>
        <form action={deleteAttributeAction} className="mt-4">
          <input name="id" type="hidden" value={attribute.id} />
          <ConfirmSubmitButton message="Удалить неиспользуемую характеристику?">
            Удалить характеристику
          </ConfirmSubmitButton>
        </form>
      </section>
    </main>
  );
}
