import { getLocalAdminSupabase } from "./env";

/**
 * Read-only service-role queries for asserting DB state from tests.
 * getLocalAdminSupabase() refuses to run unless Supabase URL is localhost/127.0.0.1
 * (safety guard in helpers/env.ts), so these helpers can never touch a remote project.
 */
export const adminRead = {
  async getCategoryTranslation(slug: string) {
    const supabase = getLocalAdminSupabase();
    const { data, error } = await supabase
      .from("category_translations")
      .select(
        "category_id, name, slug, short_description, locale, category:categories(*)",
      )
      .eq("slug", slug)
      .maybeSingle();
    if (error)
      throw new Error(`[adminRead] category slug ${slug}: ${error.message}`);
    return data;
  },

  async getCategoryById(categoryId: string) {
    const supabase = getLocalAdminSupabase();
    const { data, error } = await supabase
      .from("categories")
      .select("*, translations:category_translations(*)")
      .eq("id", categoryId)
      .maybeSingle();
    if (error)
      throw new Error(`[adminRead] category ${categoryId}: ${error.message}`);
    return data;
  },

  async countCategoriesByRunSlug(runId: string) {
    const supabase = getLocalAdminSupabase();
    const { count, error } = await supabase
      .from("category_translations")
      .select("category_id", { count: "exact", head: true })
      .ilike("slug", `%${runId}%`);
    if (error)
      throw new Error(
        `[adminRead] count categories ${runId}: ${error.message}`,
      );
    return count ?? 0;
  },

  async countSlugRoutesForCategory(categoryId: string) {
    const supabase = getLocalAdminSupabase();
    // category_slug_routes has no id column: PK is (locale, slug).
    const { count, error } = await supabase
      .from("category_slug_routes")
      .select("slug", { count: "exact", head: true })
      .eq("category_id", categoryId);
    if (error)
      throw new Error(
        `[adminRead] slug routes ${categoryId}: ${error.message}`,
      );
    return count ?? 0;
  },

  async countSlugRoutesBySlug(slug: string) {
    const supabase = getLocalAdminSupabase();
    const { count, error } = await supabase
      .from("category_slug_routes")
      .select("slug", { count: "exact", head: true })
      .eq("slug", slug);
    if (error)
      throw new Error(`[adminRead] slug routes slug=${slug}: ${error.message}`);
    return count ?? 0;
  },

  async countTranslationsBySlug(slug: string) {
    const supabase = getLocalAdminSupabase();
    const { count, error } = await supabase
      .from("category_translations")
      .select("category_id", { count: "exact", head: true })
      .eq("slug", slug);
    if (error)
      throw new Error(
        `[adminRead] translations slug=${slug}: ${error.message}`,
      );
    return count ?? 0;
  },

  async getProductBySku(sku: string) {
    const supabase = getLocalAdminSupabase();
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, category_id, brand, model, sku, price_minor, old_price_minor, is_published, archived_at, availability, translations:product_translations(*)",
      )
      .eq("sku", sku)
      .maybeSingle();
    if (error)
      throw new Error(`[adminRead] product sku ${sku}: ${error.message}`);
    return data;
  },

  async getProductById(productId: string) {
    const supabase = getLocalAdminSupabase();
    const { data, error } = await supabase
      .from("products")
      .select(
        "*, translations:product_translations(*), images:product_images(*)",
      )
      .eq("id", productId)
      .maybeSingle();
    if (error)
      throw new Error(`[adminRead] product ${productId}: ${error.message}`);
    return data;
  },

  async getSetting(key: string, locale: "ru" | "ro") {
    const supabase = getLocalAdminSupabase();
    const { data, error } = await supabase
      .from("site_settings")
      .select("key, locale, value")
      .eq("key", key)
      .eq("locale", locale)
      .maybeSingle();
    if (error)
      throw new Error(`[adminRead] setting ${key}/${locale}: ${error.message}`);
    return data;
  },

  async getLeadByComment(marker: string) {
    const supabase = getLocalAdminSupabase();
    const { data, error } = await supabase
      .from("leads")
      .select("*, deliveries:lead_telegram_deliveries(*)")
      .ilike("comment", `%${marker}%`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error)
      throw new Error(`[adminRead] lead comment ${marker}: ${error.message}`);
    return data;
  },

  async getLeadById(leadId: string) {
    const supabase = getLocalAdminSupabase();
    const { data, error } = await supabase
      .from("leads")
      .select(
        "*, deliveries:lead_telegram_deliveries(*), history:lead_status_history(*)",
      )
      .eq("id", leadId)
      .maybeSingle();
    if (error) throw new Error(`[adminRead] lead ${leadId}: ${error.message}`);
    return data;
  },

  async getKnowledgeByTitle(title: string) {
    const supabase = getLocalAdminSupabase();
    const { data, error } = await supabase
      .from("assistant_knowledge")
      .select("id, locale, title, content, is_active")
      .eq("title", title)
      .limit(5);
    if (error)
      throw new Error(`[adminRead] knowledge title ${title}: ${error.message}`);
    return data ?? [];
  },

  async countKnowledgeContaining(marker: string) {
    const supabase = getLocalAdminSupabase();
    const { count, error } = await supabase
      .from("assistant_knowledge")
      .select("id", { count: "exact", head: true })
      .ilike("content", `%${marker}%`);
    if (error)
      throw new Error(
        `[adminRead] knowledge count ${marker}: ${error.message}`,
      );
    return count ?? 0;
  },

  async getAttributeGroupByCode(code: string) {
    const supabase = getLocalAdminSupabase();
    const { data, error } = await supabase
      .from("attribute_groups")
      .select(
        "id, code, is_active, translations:attribute_group_translations(*)",
      )
      .eq("code", code)
      .maybeSingle();
    if (error)
      throw new Error(`[adminRead] group code ${code}: ${error.message}`);
    return data;
  },

  async getAttributeByCode(code: string) {
    const supabase = getLocalAdminSupabase();
    const { data, error } = await supabase
      .from("attributes")
      .select(
        "id, code, data_type, group_id, is_active, is_filterable, translations:attribute_translations(*), options:attribute_options(*)",
      )
      .eq("code", code)
      .maybeSingle();
    if (error)
      throw new Error(`[adminRead] attribute code ${code}: ${error.message}`);
    return data;
  },

  async getProductAttributeValues(productId: string) {
    const supabase = getLocalAdminSupabase();
    const { data, error } = await supabase
      .from("product_attribute_values")
      .select("attribute_id, text_value_key, number_value, boolean_value")
      .eq("product_id", productId);
    if (error)
      throw new Error(
        `[adminRead] product attribute values ${productId}: ${error.message}`,
      );
    return data ?? [];
  },

  async getProductImagePaths(productId: string) {
    const supabase = getLocalAdminSupabase();
    const { data, error } = await supabase
      .from("product_images")
      .select("id, storage_path, is_primary, deletion_pending_at")
      .eq("product_id", productId);
    if (error)
      throw new Error(
        `[adminRead] product images ${productId}: ${error.message}`,
      );
    return data ?? [];
  },

  async listStorageObjects(bucket: string, pathPrefix?: string) {
    const supabase = getLocalAdminSupabase();
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(pathPrefix ?? "", { limit: 1000 });
    if (error)
      throw new Error(
        `[adminRead] storage list ${bucket}/${pathPrefix}: ${error.message}`,
      );
    return data ?? [];
  },

  async downloadStorageObject(bucket: string, path: string) {
    const supabase = getLocalAdminSupabase();
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error)
      throw new Error(
        `[adminRead] storage download ${bucket}/${path}: ${error.message}`,
      );
    return data; // Blob of the stored bytes (read-only)
  },
};
