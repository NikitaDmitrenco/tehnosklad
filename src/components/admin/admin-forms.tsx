import {
  CountedInput,
  CountedTextarea,
} from "@/components/admin/counted-fields";
import { IntegerInput, MoneyInput } from "@/components/admin/numeric-fields";
import { SubmitButton } from "@/components/admin/submit-button";
import {
  saveAssistantKnowledgeAction,
  saveAttributeAction,
  saveAttributeGroupAction,
  saveCategoryAction,
  saveProductAction,
  saveProductAttributesAction,
} from "@/features/admin/actions";
import type {
  AdminAssistantKnowledge,
  AdminAttribute,
  AdminAttributeGroup,
  AdminCategory,
  AdminProduct,
} from "@/features/admin/types";
import { minorToMoney } from "@/features/admin/validation";

function TranslationFields({
  locale,
  value,
  product = false,
}: {
  locale: "ru" | "ro";
  value: AdminCategory["translations"]["ru"];
  product?: boolean;
}) {
  const label = locale === "ru" ? "Русский" : "Română";
  return (
    <fieldset className="admin-card admin-form-grid">
      <legend className="px-2 text-lg font-black">{label}</legend>
      <label className="field-label">
        Название
        <input
          className="field"
          defaultValue={value?.name}
          maxLength={240}
          name={`${locale}_name`}
          required
        />
      </label>
      <label className="field-label">
        <span>
          Slug{" "}
          <span className="text-xs font-normal text-stone-500">
            (часть URL-адреса страницы латиницей, например samsung-rb34t602fsa)
          </span>
        </span>
        <input
          className="field"
          defaultValue={value?.slug}
          maxLength={220}
          name={`${locale}_slug`}
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          required
        />
      </label>
      <label className="field-label">
        Краткое описание
        <textarea
          className="field"
          defaultValue={value?.shortDescription}
          maxLength={500}
          name={`${locale}_short_description`}
          required
        />
      </label>
      <label className="field-label">
        Полное описание
        <textarea
          className="field"
          defaultValue={value?.description}
          maxLength={product ? 10000 : 5000}
          name={`${locale}_description`}
          required
        />
      </label>
      <label className="field-label">
        <span>
          SEO title{" "}
          <span className="text-xs font-normal text-stone-500">
            (заголовок страницы для поисковиков Google и Яндекс)
          </span>
        </span>
        <CountedInput
          defaultValue={value?.seoTitle}
          maxLength={70}
          name={`${locale}_seo_title`}
          warningThreshold={55}
        />
      </label>
      <label className="field-label">
        <span>
          SEO description{" "}
          <span className="text-xs font-normal text-stone-500">
            (краткое описание для сниппета в поисковой выдаче Google)
          </span>
        </span>
        <CountedTextarea
          defaultValue={value?.seoDescription}
          maxLength={160}
          name={`${locale}_seo_description`}
          warningThreshold={135}
        />
      </label>
    </fieldset>
  );
}

export function CategoryForm({
  category,
  categories,
}: {
  category?: AdminCategory;
  categories: AdminCategory[];
}) {
  return (
    <form
      action={saveCategoryAction}
      className="space-y-5"
      data-admin-form="category-save"
    >
      {category ? <input name="id" type="hidden" value={category.id} /> : null}
      <section className="admin-card admin-form-grid admin-form-grid--2">
        <label className="field-label">
          Родительская категория
          <select
            className="field"
            defaultValue={category?.parentId ?? ""}
            name="parent_id"
          >
            <option value="">Без родителя</option>
            {categories
              .filter((item) => item.id !== category?.id && !item.archivedAt)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.translations.ru?.name ??
                    item.translations.ro?.name ??
                    item.id}
                </option>
              ))}
          </select>
        </label>
        <label className="field-label">
          Presentation key
          <select
            className="field"
            defaultValue={category?.presentationKey ?? "generic"}
            name="presentation_key"
          >
            <option value="generic">generic</option>
            <option value="fridge">fridge</option>
            <option value="stove">stove</option>
            <option value="vacuum">vacuum</option>
          </select>
          <span className="admin-help">
            Для новых типов используйте generic.
          </span>
        </label>
        <label className="field-label">
          <span>
            Порядок{" "}
            <span className="text-xs font-normal text-stone-500">
              (позиция для сортировки в каталоге: чем меньше число — тем выше
              категория)
            </span>
          </span>
          <IntegerInput
            defaultValue={category?.sortOrder ?? 0}
            name="sort_order"
            required
          />
        </label>
        <label className="flex min-h-11 items-center gap-3 font-bold">
          <input
            defaultChecked={category?.isPublished}
            name="is_published"
            type="checkbox"
          />{" "}
          Опубликована
        </label>
      </section>
      <div className="grid gap-5 xl:grid-cols-2">
        <TranslationFields
          locale="ru"
          value={category?.translations.ru ?? null}
        />
        <TranslationFields
          locale="ro"
          value={category?.translations.ro ?? null}
        />
      </div>
      <div className="admin-form-actions">
        <SubmitButton>Сохранить категорию</SubmitButton>
      </div>
    </form>
  );
}

export function AttributeGroupForm({ group }: { group?: AdminAttributeGroup }) {
  return (
    <form
      action={saveAttributeGroupAction}
      className="admin-card admin-form-grid admin-form-grid--2"
    >
      {group ? <input name="id" type="hidden" value={group.id} /> : null}
      <label className="field-label">
        Код
        <input
          className="field"
          defaultValue={group?.code}
          maxLength={80}
          name="code"
          pattern="[a-z][a-z0-9_]*"
          required
        />
      </label>
      <label className="field-label">
        Порядок
        <IntegerInput
          defaultValue={group?.sortOrder ?? 0}
          name="sort_order"
          required
        />
      </label>
      <label className="field-label">
        Название RU
        <input
          className="field"
          defaultValue={group?.nameRu ?? ""}
          maxLength={160}
          name="name_ru"
          required
        />
      </label>
      <label className="field-label">
        Название RO
        <input
          className="field"
          defaultValue={group?.nameRo ?? ""}
          maxLength={160}
          name="name_ro"
          required
        />
      </label>
      <label className="flex min-h-11 items-center gap-3 font-bold">
        <input
          defaultChecked={group?.isActive ?? true}
          name="is_active"
          type="checkbox"
        />{" "}
        Активна
      </label>
      <div className="admin-form-actions sm:col-span-2">
        <SubmitButton>Сохранить группу</SubmitButton>
      </div>
    </form>
  );
}

export function AttributeForm({
  attribute,
  groups,
}: {
  attribute?: AdminAttribute;
  groups: AdminAttributeGroup[];
}) {
  return (
    <form action={saveAttributeAction} className="space-y-5">
      {attribute ? (
        <input name="id" type="hidden" value={attribute.id} />
      ) : null}
      <section className="admin-card admin-form-grid admin-form-grid--2">
        <label className="field-label">
          Код
          <input
            className="field"
            defaultValue={attribute?.code}
            maxLength={80}
            name="code"
            pattern="[a-z][a-z0-9_]*"
            required
          />
        </label>
        <label className="field-label">
          Группа
          <select
            className="field"
            defaultValue={attribute?.groupId ?? ""}
            name="group_id"
          >
            <option value="">Без группы</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.nameRu ?? group.code}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Тип
          <select
            className="field"
            defaultValue={attribute?.dataType ?? "text"}
            name="data_type"
          >
            <option value="text">Текст</option>
            <option value="number">Число</option>
            <option value="boolean">Да/нет</option>
            <option value="single_select">Список</option>
            <option value="multi_select">Множественный выбор</option>
            <option value="color">Цвет (#RRGGBB)</option>
          </select>
          <span className="admin-help">
            Тип нельзя менять после появления значений или вариантов. Range
            текущей моделью не поддерживается.
          </span>
        </label>
        <label className="field-label">
          Код единицы
          <input
            className="field"
            defaultValue={attribute?.unitCode ?? ""}
            maxLength={80}
            name="unit_code"
            pattern="[a-z][a-z0-9_]*"
          />
        </label>
        <label className="field-label">
          Порядок
          <IntegerInput
            defaultValue={attribute?.sortOrder ?? 0}
            name="sort_order"
            required
          />
        </label>
        <div className="grid gap-2">
          <label className="flex min-h-11 items-center gap-3 font-bold">
            <input
              defaultChecked={attribute?.isActive ?? true}
              name="is_active"
              type="checkbox"
            />{" "}
            Активна
          </label>
          <label className="flex min-h-11 items-center gap-3 font-bold">
            <input
              defaultChecked={attribute?.isFilterable}
              name="is_filterable"
              type="checkbox"
            />{" "}
            Фильтруемая
          </label>
        </div>
      </section>
      <div className="grid gap-5 xl:grid-cols-2">
        {(["ru", "ro"] as const).map((locale) => (
          <fieldset className="admin-card admin-form-grid" key={locale}>
            <legend className="px-2 text-lg font-black">
              {locale.toUpperCase()}
            </legend>
            <label className="field-label">
              Название
              <input
                className="field"
                defaultValue={
                  locale === "ru"
                    ? (attribute?.nameRu ?? "")
                    : (attribute?.nameRo ?? "")
                }
                maxLength={160}
                name={`${locale}_name`}
                required
              />
            </label>
            <label className="field-label">
              Подсказка
              <textarea
                className="field"
                defaultValue={
                  locale === "ru"
                    ? (attribute?.helpRu ?? "")
                    : (attribute?.helpRo ?? "")
                }
                maxLength={500}
                name={`${locale}_help`}
              />
            </label>
            <label className="field-label">
              Обозначение единицы
              <input
                className="field"
                defaultValue={
                  locale === "ru"
                    ? (attribute?.unitRu ?? "")
                    : (attribute?.unitRo ?? "")
                }
                maxLength={40}
                name={`${locale}_unit`}
              />
            </label>
          </fieldset>
        ))}
      </div>
      <div className="admin-form-actions">
        <SubmitButton>Сохранить характеристику</SubmitButton>
      </div>
    </form>
  );
}

export function ProductForm({
  product,
  categories,
}: {
  product?: AdminProduct;
  categories: AdminCategory[];
}) {
  return (
    <form
      action={saveProductAction}
      className="space-y-5"
      data-admin-form="product-save"
    >
      {product ? <input name="id" type="hidden" value={product.id} /> : null}
      <section className="admin-card admin-form-grid admin-form-grid--2">
        <label className="field-label">
          Категория
          <select
            className="field"
            defaultValue={product?.categoryId ?? ""}
            name="category_id"
            required
          >
            <option disabled value="">
              Выберите категорию
            </option>
            {categories
              .filter((category) => !category.archivedAt)
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.translations.ru?.name ?? category.id}
                  {category.isPublished ? "" : " — черновик"}
                </option>
              ))}
          </select>
        </label>
        <label className="field-label">
          <span>
            Бренд{" "}
            <span className="text-xs font-normal text-stone-500">
              (производитель техники, например Samsung, Bosch, LG)
            </span>
          </span>
          <input
            className="field"
            defaultValue={product?.brand}
            maxLength={120}
            name="brand"
            required
          />
        </label>
        <label className="field-label">
          <span>
            Модель{" "}
            <span className="text-xs font-normal text-stone-500">
              (название или номер модели, например RB34T602FSA)
            </span>
          </span>
          <input
            className="field"
            defaultValue={product?.model}
            maxLength={160}
            name="model"
            required
          />
        </label>
        <label className="field-label">
          <span>
            SKU{" "}
            <span className="text-xs font-normal text-stone-500">
              (уникальный артикул / код товара, например TS-REF-0001)
            </span>
          </span>
          <input
            className="field"
            defaultValue={product?.sku}
            maxLength={80}
            name="sku"
            required
          />
        </label>
        <label className="field-label">
          <span>
            Новая цена, MDL{" "}
            <span className="text-xs font-normal text-stone-500">
              (текущая актуальная цена продажи в леях)
            </span>
          </span>
          <MoneyInput
            defaultValue={product ? minorToMoney(product.priceMinor) : ""}
            name="price"
            required
          />
        </label>
        <label className="field-label">
          <span>
            Старая цена, MDL{" "}
            <span className="text-xs font-normal text-stone-500">
              (цена до скидки в леях, заполняется только если есть акция)
            </span>
          </span>
          <MoneyInput
            defaultValue={product ? minorToMoney(product.oldPriceMinor) : ""}
            name="old_price"
          />
        </label>
        <label className="field-label">
          Наличие
          <select
            className="field"
            defaultValue={product?.availability ?? "in_stock"}
            name="availability"
          >
            <option value="in_stock">В наличии</option>
            <option value="out_of_stock">Нет в наличии</option>
            <option value="on_order">Под заказ</option>
          </select>
        </label>
        <label className="field-label">
          Количество
          <IntegerInput
            defaultValue={product?.quantity ?? ""}
            name="quantity"
          />
        </label>
        <label className="field-label">
          <span>
            Порядок{" "}
            <span className="text-xs font-normal text-stone-500">
              (позиция для сортировки в каталоге: чем меньше число — тем выше
              товар)
            </span>
          </span>
          <IntegerInput
            defaultValue={product?.sortOrder ?? 0}
            name="sort_order"
            required
          />
        </label>
        <div className="flex flex-wrap items-center gap-5 self-end pb-1.5">
          <label className="flex items-center gap-2 font-bold cursor-pointer select-none">
            <input
              defaultChecked={product?.isNew}
              name="is_new"
              type="checkbox"
            />{" "}
            Новинка
          </label>
          <label className="flex items-center gap-2 font-bold cursor-pointer select-none">
            <input
              defaultChecked={product?.isPublished}
              name="is_published"
              type="checkbox"
            />{" "}
            Опубликован
          </label>
        </div>
      </section>
      <div className="grid gap-5 xl:grid-cols-2">
        <TranslationFields
          locale="ru"
          product
          value={product?.translations.ru ?? null}
        />
        <TranslationFields
          locale="ro"
          product
          value={product?.translations.ro ?? null}
        />
      </div>
      <div className="admin-form-actions">
        <SubmitButton>Сохранить товар</SubmitButton>
      </div>
    </form>
  );
}

export function ProductAttributesForm({
  product,
  attributes,
}: {
  product: AdminProduct;
  attributes: AdminAttribute[];
}) {
  const bound = attributes.filter((attribute) =>
    attribute.bindings.some(
      (binding) => binding.categoryId === product.categoryId,
    ),
  );
  return (
    <form
      action={saveProductAttributesAction}
      className="admin-card admin-form-grid"
    >
      <input name="product_id" type="hidden" value={product.id} />
      <div>
        <h2 className="text-xl font-black">Характеристики</h2>
        <p className="mt-1 text-sm text-stone-600">
          Список зависит от категории. Пустые необязательные значения будут
          удалены.
        </p>
      </div>
      {bound.length ? (
        bound.map((attribute) => {
          const binding = attribute.bindings.find(
            (item) => item.categoryId === product.categoryId,
          )!;
          const values = product.values.filter(
            (value) => value.attributeId === attribute.id,
          );
          const name = `attribute_${attribute.id}`;
          return (
            <fieldset
              className="rounded-xl border border-stone-200 p-4"
              key={attribute.id}
            >
              <legend className="px-2 font-black">
                {attribute.nameRu ?? attribute.code}
                {binding.isRequired ? " *" : ""}
              </legend>
              {attribute.dataType === "text" ? (
                <div className="admin-form-grid admin-form-grid--2">
                  <label className="field-label">
                    RU
                    <input
                      className="field"
                      defaultValue={values[0]?.textRu ?? ""}
                      maxLength={500}
                      name={`${name}_ru`}
                    />
                  </label>
                  <label className="field-label">
                    RO
                    <input
                      className="field"
                      defaultValue={values[0]?.textRo ?? ""}
                      maxLength={500}
                      name={`${name}_ro`}
                    />
                  </label>
                </div>
              ) : attribute.dataType === "boolean" ? (
                <select
                  className="field"
                  defaultValue={
                    values[0]?.booleanValue === null ||
                    values[0]?.booleanValue === undefined
                      ? ""
                      : String(values[0].booleanValue)
                  }
                  name={name}
                >
                  <option value="">Не задано</option>
                  <option value="true">Да</option>
                  <option value="false">Нет</option>
                </select>
              ) : attribute.dataType === "single_select" ? (
                <select
                  className="field"
                  defaultValue={values[0]?.optionId ?? ""}
                  name={name}
                >
                  <option value="">Не задано</option>
                  {attribute.options
                    .filter((option) => option.isActive)
                    .map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.labelRu ?? option.code}
                      </option>
                    ))}
                </select>
              ) : attribute.dataType === "multi_select" ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {attribute.options
                    .filter((option) => option.isActive)
                    .map((option) => (
                      <label
                        className="flex min-h-11 items-center gap-3"
                        key={option.id}
                      >
                        <input
                          defaultChecked={values.some(
                            (value) => value.optionId === option.id,
                          )}
                          name={name}
                          type="checkbox"
                          value={option.id}
                        />
                        {option.labelRu ?? option.code}
                      </label>
                    ))}
                </div>
              ) : (
                <input
                  className="field"
                  defaultValue={
                    attribute.dataType === "number"
                      ? (values[0]?.numberValue ?? "")
                      : (values[0]?.colorValue ?? "")
                  }
                  name={name}
                  placeholder={
                    attribute.dataType === "color" ? "#FFFFFF" : undefined
                  }
                />
              )}
            </fieldset>
          );
        })
      ) : (
        <p className="rounded-xl bg-stone-100 p-4 text-sm">
          К категории не привязаны характеристики.
        </p>
      )}
      <div className="admin-form-actions">
        <SubmitButton>Сохранить характеристики</SubmitButton>
      </div>
    </form>
  );
}

export function AssistantKnowledgeForm({
  article,
}: {
  article?: AdminAssistantKnowledge;
}) {
  return (
    <form
      action={saveAssistantKnowledgeAction}
      className="admin-card admin-form-grid admin-form-grid--2"
    >
      {article ? <input name="id" type="hidden" value={article.id} /> : null}
      <label className="field-label">
        Язык
        <select
          className="field"
          defaultValue={article?.locale ?? "ru"}
          name="locale"
        >
          <option value="ru">Русский</option>
          <option value="ro">Română</option>
        </select>
      </label>
      <label className="flex min-h-11 items-center gap-3 font-bold">
        <input
          defaultChecked={article?.isActive ?? true}
          name="is_active"
          type="checkbox"
        />{" "}
        Активна
      </label>
      <label className="field-label sm:col-span-2">
        <span>
          Заголовок{" "}
          <span className="text-xs font-normal text-stone-500">
            (по нему помощник находит статью, например «Доставка»)
          </span>
        </span>
        <CountedInput
          defaultValue={article?.title}
          maxLength={160}
          name="title"
          required
        />
      </label>
      <label className="field-label sm:col-span-2">
        <span>
          Текст ответа{" "}
          <span className="text-xs font-normal text-stone-500">
            (помощник отвечает только тем, что здесь написано)
          </span>
        </span>
        <CountedTextarea
          defaultValue={article?.content}
          maxLength={5000}
          name="content"
          required
          rows={8}
        />
      </label>
      <div className="admin-form-actions sm:col-span-2">
        <SubmitButton>Сохранить статью</SubmitButton>
      </div>
    </form>
  );
}
