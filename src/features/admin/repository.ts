import "server-only";

import { requireAdmin } from "@/features/admin/auth/guard";
import { AdminDataError, sanitizeAdminError } from "@/features/admin/errors";
import {
  mapAdminTranslations,
  mapDatabaseBigint,
  type AdminTranslationRow,
} from "@/features/admin/mapper";
import type {
  AdminAssistantKnowledge,
  AdminAssistantLogEntry,
  AdminAssistantLogReport,
  AdminAssistantLogShare,
  AdminAttribute,
  AdminAttributeGroup,
  AdminCategory,
  AdminDashboard,
  AdminLead,
  AdminOrphanEntry,
  AdminProduct,
  AdminSiteSetting,
} from "@/features/admin/types";
import { createServerUserSupabaseClient } from "@/lib/supabase/server";

async function context() {
  await requireAdmin();
  return createServerUserSupabaseClient();
}

// The thrown error stays free of database detail -- it reaches the admin page
// through a redirect query -- so the cause is recorded here instead. A code on
// its own does not say which constraint refused the write.
function fail(resource: string, error: unknown): never {
  const detail = (
    typeof error === "object" && error !== null ? error : {}
  ) as Record<string, unknown>;
  const text = (key: string) =>
    detail[key] === undefined || detail[key] === null
      ? null
      : String(detail[key]);
  console.error("Admin server operation failed", {
    resource,
    code: text("code") ?? "unexpected",
    message: text("message"),
    details: text("details"),
    hint: text("hint"),
  });
  throw sanitizeAdminError(error);
}

export async function listAdminCategories(): Promise<AdminCategory[]> {
  const supabase = await context();
  const [categoriesResult, productsResult] = await Promise.all([
    supabase
      .from("categories")
      .select(
        "id,parent_id,presentation_key,sort_order,is_published,archived_at,image_storage_path,category_translations(locale,name,slug,short_description,description,seo_title,seo_description)",
      )
      .order("sort_order"),
    supabase.from("products").select("id,category_id").is("archived_at", null),
  ]);
  if (categoriesResult.error) fail("categories", categoriesResult.error);
  if (productsResult.error)
    fail("category-product-counts", productsResult.error);
  const counts = new Map<string, number>();
  for (const product of productsResult.data ?? []) {
    counts.set(product.category_id, (counts.get(product.category_id) ?? 0) + 1);
  }
  return (categoriesResult.data ?? []).map((row) => ({
    id: row.id,
    parentId: row.parent_id,
    presentationKey: row.presentation_key,
    sortOrder: row.sort_order,
    isPublished: row.is_published,
    archivedAt: row.archived_at,
    imageStoragePath: row.image_storage_path,
    imagePublicUrl: row.image_storage_path
      ? supabase.storage
          .from("category-images")
          .getPublicUrl(row.image_storage_path).data.publicUrl
      : null,
    translations: mapAdminTranslations(
      row.category_translations as AdminTranslationRow[],
    ),
    productCount: counts.get(row.id) ?? 0,
  })) as AdminCategory[];
}

export async function getAdminCategory(id: string) {
  const categories = await listAdminCategories();
  return categories.find((category) => category.id === id) ?? null;
}

type NamedTranslation = {
  locale: "ru" | "ro";
  name?: string;
  label?: string;
  help_text?: string | null;
  unit_label?: string | null;
};

function localized(
  rows: NamedTranslation[],
  key: "name" | "label",
  locale: "ru" | "ro",
) {
  return rows.find((row) => row.locale === locale)?.[key] ?? null;
}

export async function listAdminAttributeGroups(): Promise<
  AdminAttributeGroup[]
> {
  const supabase = await context();
  const [groups, attributes] = await Promise.all([
    supabase
      .from("attribute_groups")
      .select(
        "id,code,sort_order,is_active,attribute_group_translations(locale,name)",
      )
      .order("sort_order"),
    supabase.from("attributes").select("id,group_id"),
  ]);
  if (groups.error) fail("attribute-groups", groups.error);
  if (attributes.error) fail("attribute-group-counts", attributes.error);
  const counts = new Map<string, number>();
  for (const attribute of attributes.data ?? []) {
    if (attribute.group_id)
      counts.set(attribute.group_id, (counts.get(attribute.group_id) ?? 0) + 1);
  }
  return (groups.data ?? []).map((row) => {
    const translations = row.attribute_group_translations as NamedTranslation[];
    return {
      id: row.id,
      code: row.code,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      nameRu: localized(translations, "name", "ru"),
      nameRo: localized(translations, "name", "ro"),
      attributeCount: counts.get(row.id) ?? 0,
    };
  });
}

export async function getAdminAttributeGroup(id: string) {
  return (
    (await listAdminAttributeGroups()).find((group) => group.id === id) ?? null
  );
}

export async function listAdminAttributes(): Promise<AdminAttribute[]> {
  const supabase = await context();
  const [attributesResult, categories] = await Promise.all([
    supabase
      .from("attributes")
      .select(
        "id,group_id,code,data_type,unit_code,is_filterable,sort_order,is_active,attribute_translations(locale,name,help_text,unit_label),attribute_options(id,code,sort_order,is_active,attribute_option_translations(locale,label)),category_attributes(category_id,is_required,is_filterable,sort_order)",
      )
      .order("sort_order"),
    listAdminCategories(),
  ]);
  if (attributesResult.error) fail("attributes", attributesResult.error);
  const categoryNames = new Map(
    categories.map((category) => [
      category.id,
      category.translations.ru?.name ??
        category.translations.ro?.name ??
        category.id,
    ]),
  );
  return (attributesResult.data ?? []).map((row) => {
    const translations = row.attribute_translations as NamedTranslation[];
    const ru = translations.find((item) => item.locale === "ru");
    const ro = translations.find((item) => item.locale === "ro");
    return {
      id: row.id,
      groupId: row.group_id,
      code: row.code,
      dataType: row.data_type,
      unitCode: row.unit_code,
      isFilterable: row.is_filterable,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      nameRu: ru?.name ?? null,
      nameRo: ro?.name ?? null,
      helpRu: ru?.help_text ?? null,
      helpRo: ro?.help_text ?? null,
      unitRu: ru?.unit_label ?? null,
      unitRo: ro?.unit_label ?? null,
      options: (
        row.attribute_options as Array<{
          id: string;
          code: string;
          sort_order: number;
          is_active: boolean;
          attribute_option_translations: NamedTranslation[];
        }>
      ).map((option) => ({
        id: option.id,
        code: option.code,
        sortOrder: option.sort_order,
        isActive: option.is_active,
        labelRu: localized(option.attribute_option_translations, "label", "ru"),
        labelRo: localized(option.attribute_option_translations, "label", "ro"),
      })),
      bindings: (
        row.category_attributes as Array<{
          category_id: string;
          is_required: boolean;
          is_filterable: boolean | null;
          sort_order: number;
        }>
      ).map((binding) => ({
        categoryId: binding.category_id,
        categoryName:
          categoryNames.get(binding.category_id) ?? binding.category_id,
        isRequired: binding.is_required,
        isFilterable: binding.is_filterable,
        sortOrder: binding.sort_order,
      })),
    } as AdminAttribute;
  });
}

export async function getAdminAttribute(id: string) {
  return (
    (await listAdminAttributes()).find((attribute) => attribute.id === id) ??
    null
  );
}

type ProductListOptions = {
  query?: string;
  categoryId?: string;
  publication?: "published" | "draft" | "archived";
};

const productSelect =
  "id,category_id,brand,model,sku,price_minor,old_price_minor,availability,quantity,is_new,is_published,sort_order,archived_at,product_translations(locale,name,slug,short_description,description,seo_title,seo_description),categories(category_translations(locale,name)),product_images(id,storage_path,sort_order,is_primary,deletion_pending_at,product_image_translations(locale,alt_text)),product_attribute_values(id,attribute_id,ordinal,number_value,boolean_value,option_id,color_value,product_attribute_value_translations(locale,text_value))";

export async function listAdminProducts(
  options: ProductListOptions = {},
): Promise<AdminProduct[]> {
  const supabase = await context();
  let query = supabase
    .from("products")
    .select(productSelect)
    .order("updated_at", { ascending: false });
  if (options.categoryId) query = query.eq("category_id", options.categoryId);
  if (options.publication === "published")
    query = query.eq("is_published", true).is("archived_at", null);
  if (options.publication === "draft")
    query = query.eq("is_published", false).is("archived_at", null);
  if (options.publication === "archived")
    query = query.not("archived_at", "is", null);
  const result = await query.limit(250);
  if (result.error) fail("products", result.error);
  let products = (result.data ?? []).map((row) =>
    mapProduct(row as unknown as ProductRow, supabase),
  );
  const needle = options.query?.trim().toLocaleLowerCase("ru");
  if (needle) {
    products = products.filter((product) =>
      [
        product.brand,
        product.model,
        product.sku,
        product.translations.ru?.name,
        product.translations.ro?.name,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLocaleLowerCase("ru").includes(needle),
        ),
    );
  }
  return products;
}

type ProductRow = {
  id: string;
  category_id: string;
  brand: string;
  model: string;
  sku: string;
  price_minor: string | number;
  old_price_minor: string | number | null;
  availability: AdminProduct["availability"];
  quantity: number | null;
  is_new: boolean;
  is_published: boolean;
  sort_order: number;
  archived_at: string | null;
  product_translations: AdminTranslationRow[];
  categories: { category_translations: NamedTranslation[] } | null;
  product_images: Array<{
    id: string;
    storage_path: string;
    sort_order: number;
    is_primary: boolean;
    deletion_pending_at: string | null;
    product_image_translations: Array<{
      locale: "ru" | "ro";
      alt_text: string;
    }>;
  }>;
  product_attribute_values: Array<{
    id: string;
    attribute_id: string;
    ordinal: number;
    number_value: string | number | null;
    boolean_value: boolean | null;
    option_id: string | null;
    color_value: string | null;
    product_attribute_value_translations: Array<{
      locale: "ru" | "ro";
      text_value: string;
    }>;
  }>;
};

function mapProduct(
  row: ProductRow,
  supabase: Awaited<ReturnType<typeof createServerUserSupabaseClient>>,
): AdminProduct {
  const categoryTranslations = embedList(row.categories?.category_translations);
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName:
      localized(categoryTranslations, "name", "ru") ??
      localized(categoryTranslations, "name", "ro") ??
      row.category_id,
    brand: row.brand,
    model: row.model,
    sku: row.sku,
    priceMinor: mapDatabaseBigint(row.price_minor)!,
    oldPriceMinor: mapDatabaseBigint(row.old_price_minor),
    availability: row.availability,
    quantity: row.quantity,
    isNew: row.is_new,
    isPublished: row.is_published,
    sortOrder: row.sort_order,
    archivedAt: row.archived_at,
    translations: mapAdminTranslations(row.product_translations),
    images: row.product_images
      .map((image) => ({
        id: image.id,
        storagePath: image.storage_path,
        publicUrl: supabase.storage
          .from("product-images")
          .getPublicUrl(image.storage_path).data.publicUrl,
        sortOrder: image.sort_order,
        isPrimary: image.is_primary,
        deletionPendingAt: image.deletion_pending_at,
        altRu:
          image.product_image_translations.find((item) => item.locale === "ru")
            ?.alt_text ?? null,
        altRo:
          image.product_image_translations.find((item) => item.locale === "ro")
            ?.alt_text ?? null,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder),
    values: row.product_attribute_values.map((value) => ({
      id: value.id,
      attributeId: value.attribute_id,
      ordinal: value.ordinal,
      textRu:
        value.product_attribute_value_translations.find(
          (item) => item.locale === "ru",
        )?.text_value ?? null,
      textRo:
        value.product_attribute_value_translations.find(
          (item) => item.locale === "ro",
        )?.text_value ?? null,
      numberValue:
        value.number_value === null ? null : String(value.number_value),
      booleanValue: value.boolean_value,
      optionId: value.option_id,
      colorValue: value.color_value,
    })),
  };
}

export async function getAdminProduct(id: string) {
  const supabase = await context();
  const result = await supabase
    .from("products")
    .select(productSelect)
    .eq("id", id)
    .maybeSingle();
  if (result.error) fail("product", result.error);
  return result.data
    ? mapProduct(result.data as unknown as ProductRow, supabase)
    : null;
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const supabase = await context();
  const [
    products,
    active,
    out,
    categories,
    leads,
    telegram,
    knowledge,
    recent,
  ] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true)
      .is("archived_at", null),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("availability", "out_of_stock")
      .is("archived_at", null),
    supabase
      .from("categories")
      .select("id", { count: "exact", head: true })
      .is("archived_at", null),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    supabase
      .from("lead_telegram_deliveries")
      .select("id", { count: "exact", head: true })
      .in("state", ["permanent_failure", "manual_review"]),
    supabase
      .from("assistant_knowledge")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    listAdminLeads({ limit: 5 }),
  ]);
  for (const result of [
    products,
    active,
    out,
    categories,
    leads,
    telegram,
    knowledge,
  ]) {
    if (result.error) fail("dashboard", result.error);
  }
  return {
    productsTotal: products.count ?? 0,
    productsActive: active.count ?? 0,
    productsOutOfStock: out.count ?? 0,
    categoriesTotal: categories.count ?? 0,
    newLeads: leads.count ?? 0,
    telegramErrors: telegram.count ?? 0,
    knowledgeActive: knowledge.count ?? 0,
    recentLeads: recent,
  };
}

type LeadFilters = {
  status?: string;
  source?: string;
  locale?: string;
  productId?: string;
  dateFrom?: string;
  dateTo?: string;
  query?: string;
  limit?: number;
};

const leadSelect =
  "id,status,locale,source,source_path,name,phone,telegram_username,comment,product_id,product_name_snapshot,product_price_minor,product_currency,product_path_snapshot,consent_at,created_at,lead_status_history(id,previous_status,status,changed_by,created_at),lead_telegram_deliveries(state,attempt_count,delivered_at,provider_message_id,last_error_code,lead_delivery_attempts(id,attempt_number,outcome,provider_http_status,provider_error_code,error_code,started_at,finished_at))";

export async function listAdminLeads(
  filters: LeadFilters = {},
): Promise<AdminLead[]> {
  const supabase = await context();
  let query = supabase
    .from("leads")
    .select(leadSelect)
    .order("created_at", { ascending: false });
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.source) query = query.eq("source", filters.source);
  if (filters.locale) query = query.eq("locale", filters.locale);
  if (filters.productId) query = query.eq("product_id", filters.productId);
  if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
  if (filters.dateTo)
    query = query.lte("created_at", `${filters.dateTo}T23:59:59.999Z`);
  const result = await query.limit(filters.limit ?? 100);
  if (result.error) fail("leads", result.error);
  let leads = (result.data ?? []).map((row) =>
    mapLead(row as unknown as LeadRow),
  );
  const needle = filters.query?.trim().toLocaleLowerCase("ru");
  if (needle) {
    leads = leads.filter((lead) =>
      [lead.name, lead.phone].some((value) =>
        value.toLocaleLowerCase("ru").includes(needle),
      ),
    );
  }
  return leads;
}

type LeadDeliveryAttemptRow = Record<string, unknown>;

type LeadDeliveryRow = Record<string, unknown> & {
  // to-many embed, but normalized defensively in case the PostgREST shape
  // changes (see embedObject/embedList below).
  lead_delivery_attempts:
    LeadDeliveryAttemptRow | LeadDeliveryAttemptRow[] | null;
};

type LeadRow = Record<string, unknown> & {
  lead_status_history:
    Array<Record<string, unknown>> | Record<string, unknown> | null;
  // lead_id is UNIQUE (stage_5 migration), so PostgREST embeds the delivery
  // as a single OBJECT, not an array. Reading it with [0] yielded undefined
  // and the page claimed «Delivery отсутствует» although the outbox row
  // existed (BUG-05) — both shapes are accepted here.
  lead_telegram_deliveries: LeadDeliveryRow | LeadDeliveryRow[] | null;
};

// PostgREST returns an object for a to-one embed and an array for a to-many
// embed; unique constraints can flip the expected shape between versions.
function embedObject<T>(value: T | T[] | null | undefined): T | null {
  if (value === null || value === undefined) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function embedList<T>(value: T | T[] | null | undefined): T[] {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function mapLead(row: LeadRow): AdminLead {
  const delivery = embedObject(row.lead_telegram_deliveries);
  return {
    id: String(row.id),
    status: row.status as AdminLead["status"],
    locale: row.locale as AdminLead["locale"],
    source: String(row.source),
    sourcePath: String(row.source_path),
    name: String(row.name),
    phone: String(row.phone),
    telegramUsername: row.telegram_username
      ? String(row.telegram_username)
      : null,
    comment: row.comment ? String(row.comment) : null,
    productId: row.product_id ? String(row.product_id) : null,
    productName: row.product_name_snapshot
      ? String(row.product_name_snapshot)
      : null,
    productPriceMinor:
      row.product_price_minor === null ? null : String(row.product_price_minor),
    productCurrency: row.product_currency ? String(row.product_currency) : null,
    productPath: row.product_path_snapshot
      ? String(row.product_path_snapshot)
      : null,
    consentAt: String(row.consent_at),
    createdAt: String(row.created_at),
    history: embedList(row.lead_status_history)
      .map((item) => ({
        id: String(item.id),
        previousStatus: item.previous_status as AdminLead["status"] | null,
        status: item.status as AdminLead["status"],
        changedBy: item.changed_by ? String(item.changed_by) : null,
        createdAt: String(item.created_at),
      }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    delivery: delivery
      ? {
          state: String(delivery.state),
          attemptCount: Number(delivery.attempt_count),
          deliveredAt: delivery.delivered_at
            ? String(delivery.delivered_at)
            : null,
          providerMessageId: delivery.provider_message_id
            ? String(delivery.provider_message_id)
            : null,
          lastErrorCode: delivery.last_error_code
            ? String(delivery.last_error_code)
            : null,
          attempts: embedList(delivery.lead_delivery_attempts).map((item) => ({
            id: String(item.id),
            attemptNumber: Number(item.attempt_number),
            outcome: item.outcome ? String(item.outcome) : null,
            providerHttpStatus:
              item.provider_http_status === null
                ? null
                : Number(item.provider_http_status),
            providerErrorCode:
              item.provider_error_code === null
                ? null
                : Number(item.provider_error_code),
            errorCode: item.error_code ? String(item.error_code) : null,
            startedAt: String(item.started_at),
            finishedAt: item.finished_at ? String(item.finished_at) : null,
          })),
        }
      : null,
  };
}

export async function getAdminLead(id: string) {
  const supabase = await context();
  const result = await supabase
    .from("leads")
    .select(leadSelect)
    .eq("id", id)
    .maybeSingle();
  if (result.error) fail("lead", result.error);
  return result.data ? mapLead(result.data as unknown as LeadRow) : null;
}

const settingLabels: Record<string, string> = {
  phone_display: "Телефон для отображения",
  phone_href: "Ссылка tel:",
  address: "Адрес",
  open_days: "Рабочие дни",
  open_time: "Время работы",
  closed_day: "Выходной",
  contact_text: "Контактный текст",
};

export async function listAdminSiteSettings(): Promise<AdminSiteSetting[]> {
  const supabase = await context();
  const result = await supabase
    .from("site_settings")
    .select("key,locale,value")
    .order("key");
  if (result.error) fail("site-settings", result.error);
  return Object.keys(settingLabels).map((key) => ({
    key,
    label: settingLabels[key]!,
    ru:
      result.data?.find((row) => row.key === key && row.locale === "ru")
        ?.value ?? "",
    ro:
      result.data?.find((row) => row.key === key && row.locale === "ro")
        ?.value ?? "",
  }));
}

export async function scanAdminProductOrphans(): Promise<AdminOrphanEntry[]> {
  const supabase = await context();
  const metadataResult = await supabase
    .from("product_images")
    .select("product_id,storage_path,deletion_pending_at");
  if (metadataResult.error) fail("image-metadata", metadataResult.error);
  const metadata = metadataResult.data ?? [];
  const metadataPaths = new Set(metadata.map((row) => row.storage_path));
  const objectPaths = new Set<string>();
  const rootResult = await supabase.storage
    .from("product-images")
    .list("", { limit: 1000 });
  if (rootResult.error) fail("storage-root", rootResult.error);
  for (const folder of rootResult.data ?? []) {
    if (!/^[0-9a-f-]{36}$/i.test(folder.name)) continue;
    const files = await supabase.storage
      .from("product-images")
      .list(folder.name, { limit: 1000 });
    if (files.error) fail("storage-folder", files.error);
    for (const file of files.data ?? []) {
      if (file.id) objectPaths.add(`${folder.name}/${file.name}`);
    }
  }
  const entries: AdminOrphanEntry[] = [];
  for (const path of objectPaths) {
    if (!metadataPaths.has(path))
      entries.push({
        productId: path.split("/")[0]!,
        path,
        state: "orphan_object",
      });
  }
  for (const row of metadata) {
    if (row.deletion_pending_at)
      entries.push({
        productId: row.product_id,
        path: row.storage_path,
        state: "pending_metadata",
      });
    else if (!objectPaths.has(row.storage_path))
      entries.push({
        productId: row.product_id,
        path: row.storage_path,
        state: "missing_object",
      });
  }
  return entries.sort((a, b) => a.path.localeCompare(b.path));
}

export async function listAdminAssistantKnowledge(): Promise<
  AdminAssistantKnowledge[]
> {
  const supabase = await context();
  const { data, error } = await supabase
    .from("assistant_knowledge")
    .select("id,locale,title,content,is_active,updated_at")
    .order("locale")
    .order("updated_at", { ascending: false });
  if (error) fail("assistant-knowledge", error);
  return (data ?? []).map((row) => ({
    id: row.id,
    locale: row.locale,
    title: row.title,
    content: row.content,
    isActive: row.is_active,
    updatedAt: row.updated_at,
  })) as AdminAssistantKnowledge[];
}

export async function getAdminAssistantKnowledge(id: string) {
  return (
    (await listAdminAssistantKnowledge()).find(
      (article) => article.id === id,
    ) ?? null
  );
}

/*
 * Telemetry rows are small and already indexed by `created_at desc`, so the
 * period summary is aggregated in the server component instead of a dedicated
 * RPC. The cap keeps a busy period from loading an unbounded result set; the
 * exact period total is counted separately so the page can say when the
 * breakdown covers only the most recent requests.
 */
const ASSISTANT_LOG_SAMPLE_LIMIT = 5000;
const ASSISTANT_LOG_RECENT_LIMIT = 20;

function assistantLogShares(
  entries: AdminAssistantLogEntry[],
  pick: (entry: AdminAssistantLogEntry) => string,
): AdminAssistantLogShare[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const key = pick(entry);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({
      key,
      count,
      share: entries.length ? count / entries.length : 0,
    }))
    .sort(
      (left, right) =>
        right.count - left.count || left.key.localeCompare(right.key),
    );
}

export async function getAdminAssistantLogReport(
  days: number,
): Promise<AdminAssistantLogReport> {
  const supabase = await context();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const [totalResult, sampleResult] = await Promise.all([
    supabase
      .from("assistant_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since),
    supabase
      .from("assistant_logs")
      .select(
        "id,request_id,locale,outcome,provider,duration_bucket,fallback_used,reference_count,created_at",
      )
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(ASSISTANT_LOG_SAMPLE_LIMIT),
  ]);
  if (totalResult.error) fail("assistant-logs", totalResult.error);
  if (sampleResult.error) fail("assistant-logs", sampleResult.error);
  const entries = (sampleResult.data ?? []).map((row) => ({
    id: row.id,
    requestId: row.request_id,
    locale: row.locale,
    outcome: row.outcome,
    provider: row.provider,
    durationBucket: row.duration_bucket,
    fallbackUsed: row.fallback_used,
    referenceCount: row.reference_count,
    createdAt: row.created_at,
  })) as AdminAssistantLogEntry[];
  const fallbackCount = entries.filter((entry) => entry.fallbackUsed).length;
  const references = entries.reduce(
    (total, entry) => total + entry.referenceCount,
    0,
  );
  return {
    days,
    since,
    total: totalResult.count ?? entries.length,
    analyzed: entries.length,
    truncated: entries.length === ASSISTANT_LOG_SAMPLE_LIMIT,
    fallbackCount,
    fallbackShare: entries.length ? fallbackCount / entries.length : 0,
    averageReferences: entries.length ? references / entries.length : 0,
    outcomes: assistantLogShares(entries, (entry) => entry.outcome),
    providers: assistantLogShares(entries, (entry) => entry.provider),
    durations: assistantLogShares(entries, (entry) => entry.durationBucket),
    locales: assistantLogShares(entries, (entry) => entry.locale),
    recent: entries.slice(0, ASSISTANT_LOG_RECENT_LIMIT),
  };
}

export async function callAdminRpc(
  name: string,
  parameters: Record<string, unknown>,
) {
  const supabase = await context();
  const result = await supabase.rpc(name, parameters);
  if (result.error) fail(name, result.error);
  return { supabase, data: result.data };
}

export async function adminClientForStorage() {
  return {
    admin: await requireAdmin(),
    supabase: await createServerUserSupabaseClient(),
  };
}

export { AdminDataError };
