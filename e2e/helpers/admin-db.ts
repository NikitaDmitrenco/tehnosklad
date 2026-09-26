import { getLocalAdminSupabase } from "./env";

export const adminDb = {
  /**
   * Verifies if a category with the specified slug exists in the database.
   */
  async verifyCategoryExists(slug: string) {
    const supabase = getLocalAdminSupabase();
    const { data, error } = await supabase
      .from("category_translations")
      .select("category_id, name, slug, locale, category:categories(*)")
      .eq("slug", slug)
      .maybeSingle();

    if (error)
      throw new Error(
        `[adminDb] Error verifying category slug ${slug}: ${error.message}`,
      );
    return data;
  },

  /**
   * Verifies if a product with the specified SKU exists in the database.
   */
  async verifyProductExists(sku: string) {
    const supabase = getLocalAdminSupabase();
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, category_id, brand, model, sku, price_minor, old_price_minor, is_published, availability, translations:product_translations(*)",
      )
      .eq("sku", sku)
      .maybeSingle();

    if (error)
      throw new Error(
        `[adminDb] Error verifying product SKU ${sku}: ${error.message}`,
      );
    return data;
  },

  /**
   * Safely deletes all test entities associated with a specific RUN_ID.
   * Cascades down respecting foreign key constraints:
   * leads -> product_images -> product_attribute_values -> products ->
   * category_attributes -> attribute_options -> attributes -> attribute_groups -> categories.
   */
  async cleanUpByRunId(runId: string) {
    if (!runId || runId.length < 5) return;
    const supabase = getLocalAdminSupabase();
    const pattern = `%${runId.toLowerCase()}%`;
    const skuPattern = `%${runId}%`;

    try {
      // 1. Delete test leads matching runId
      await supabase.from("leads").delete().ilike("contact_value", pattern);
      await supabase.from("leads").delete().ilike("note", pattern);

      // 2. Find and delete test products matching runId in SKU or translation slug
      const { data: prodTranslations } = await supabase
        .from("product_translations")
        .select("product_id")
        .ilike("slug", pattern);

      const productIds = new Set<string>();
      prodTranslations?.forEach((t) => productIds.add(t.product_id));

      const { data: productsBySku } = await supabase
        .from("products")
        .select("id")
        .ilike("sku", skuPattern);
      productsBySku?.forEach((p) => productIds.add(p.id));

      if (productIds.size > 0) {
        const idList = Array.from(productIds);
        await supabase.from("product_images").delete().in("product_id", idList);
        await supabase
          .from("product_attribute_values")
          .delete()
          .in("product_id", idList);
        await supabase
          .from("product_translations")
          .delete()
          .in("product_id", idList);
        await supabase.from("products").delete().in("id", idList);
      }

      // 3. Find and delete test categories matching runId in translation slug
      const { data: catTranslations } = await supabase
        .from("category_translations")
        .select("category_id")
        .ilike("slug", pattern);

      if (catTranslations && catTranslations.length > 0) {
        const catIds = Array.from(
          new Set(catTranslations.map((c) => c.category_id)),
        );
        await supabase
          .from("category_attributes")
          .delete()
          .in("category_id", catIds);
        await supabase
          .from("category_translations")
          .delete()
          .in("category_id", catIds);
        await supabase.from("categories").delete().in("id", catIds);
      }

      // 4. Find and delete test attributes and groups matching runId
      const { data: attrs } = await supabase
        .from("attributes")
        .select("id")
        .ilike("code", pattern);

      if (attrs && attrs.length > 0) {
        const attrIds = attrs.map((a) => a.id);
        await supabase
          .from("attribute_options")
          .delete()
          .in("attribute_id", attrIds);
        await supabase.from("attributes").delete().in("id", attrIds);
      }

      const { data: groups } = await supabase
        .from("attribute_groups")
        .select("id")
        .ilike("code", pattern);

      if (groups && groups.length > 0) {
        const groupIds = groups.map((g) => g.id);
        await supabase.from("attribute_groups").delete().in("id", groupIds);
      }
    } catch (cleanupErr) {
      console.warn(
        `[adminDb.cleanUpByRunId] Warning during cleanup of ${runId}:`,
        cleanupErr,
      );
    }
  },
};
