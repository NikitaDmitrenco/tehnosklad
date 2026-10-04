import { getLocalAdminSupabase } from "./env";
import { adminDb } from "./admin-db";

/**
 * Full per-run artifact cleanup: knowledge articles, storage objects and all
 * runId-tagged rows. Storage objects must go before rows (orphaned files),
 * rows go through adminDb.cleanUpByRunId which now deletes slug routes
 * before categories/products (FK RESTRICT).
 * Local-only: refuses to run unless Supabase URL is localhost/127.0.0.1.
 */
export async function cleanupRunArtifacts(runId: string): Promise<void> {
  if (!runId || runId.length < 5) return;
  const supabase = getLocalAdminSupabase();
  const pattern = `%${runId}%`;

  try {
    // Collect ids first — needed for storage cleanup after rows are gone.
    const { data: catTranslations } = await supabase
      .from("category_translations")
      .select("category_id")
      .ilike("slug", pattern);
    const categoryIds = [
      ...new Set((catTranslations ?? []).map((r) => r.category_id)),
    ];
    // Category image keys are `categories/{random}.ext` (NOT keyed by the
    // category id), so the exact object paths must be read before deletion.
    const categoryObjectPaths: string[] = [];
    if (categoryIds.length > 0) {
      const { data: catRows } = await supabase
        .from("categories")
        .select("id, image_storage_path")
        .in("id", categoryIds);
      for (const row of catRows ?? []) {
        if (row.image_storage_path) {
          categoryObjectPaths.push(row.image_storage_path as string);
        }
      }
    }

    const { data: prodTranslations } = await supabase
      .from("product_translations")
      .select("product_id")
      .ilike("slug", pattern);
    const { data: productsBySku } = await supabase
      .from("products")
      .select("id")
      .ilike("sku", `%${runId}%`);
    const productIds = [
      ...new Set([
        ...(prodTranslations ?? []).map((r) => r.product_id),
        ...(productsBySku ?? []).map((r) => r.id),
      ]),
    ];

    // Knowledge articles titled with the run id.
    await supabase.from("assistant_knowledge").delete().ilike("title", pattern);

    // Leads: adminDb targets contact_value/note columns that do not exist on
    // `leads` (silent no-op); the run id actually lives in `comment`.
    await supabase.from("leads").delete().ilike("comment", pattern);

    // Rows (categories, products, attributes, groups + slug routes).
    await adminDb.cleanUpByRunId(runId);

    // Storage objects keyed by deleted uuids.
    if (categoryObjectPaths.length > 0) {
      await supabase.storage
        .from("category-images")
        .remove(categoryObjectPaths);
    }

    const productBucket = supabase.storage.from("product-images");
    for (const productId of productIds) {
      const { data: files } = await productBucket.list(productId);
      if (files && files.length > 0) {
        await productBucket.remove(files.map((f) => `${productId}/${f.name}`));
      }
    }
  } catch (cleanupErr) {
    console.warn(
      `[cleanupRunArtifacts] Warning during cleanup of ${runId}:`,
      cleanupErr,
    );
  }
}
