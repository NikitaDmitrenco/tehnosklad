import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { CatalogDataError } from "@/features/catalog/repository";
import type { CatalogSearchQuery } from "@/features/catalog/types";
import type { Locale } from "@/i18n/config";
import type {
  DbCatalogFacetsRow,
  DbCategoryRow,
  DbCategorySlugRow,
  DbCatalogSearchRow,
  DbProductRow,
  DbProductSlugRow,
  DbSiteSettingRow,
  DbSpecificationRow,
} from "@/features/catalog/supabase/rows";

export type TransportProductQuery = {
  categoryId?: string;
  excludeId?: string;
  limit?: number;
  ids?: string[];
};

export interface CatalogTransport {
  listCategories(): Promise<DbCategoryRow[]>;
  findCategoryBySlug(
    locale: Locale,
    slug: string,
  ): Promise<DbCategoryRow | null>;
  findCategoryByHistoricalSlug(
    locale: Locale,
    slug: string,
  ): Promise<DbCategoryRow | null>;
  listProducts(query?: TransportProductQuery): Promise<DbProductRow[]>;
  getPopularProductIds(limit?: number): Promise<string[]>;
  recordProductView(productId: string): Promise<void>;
  cleanupOldProductViews(retentionDays?: number): Promise<number>;
  findProductBySlug(locale: Locale, slug: string): Promise<DbProductRow | null>;
  findProductByHistoricalSlug(
    locale: Locale,
    slug: string,
  ): Promise<DbProductRow | null>;
  searchProductIds(
    locale: Locale,
    categoryId: string | undefined,
    query: CatalogSearchQuery,
  ): Promise<{ ids: string[]; total: number }>;
  listSpecifications(productIds: string[]): Promise<DbSpecificationRow[]>;
  getFacets(locale: Locale, categoryId?: string): Promise<DbCatalogFacetsRow>;
  listCategorySlugs(): Promise<DbCategorySlugRow[]>;
  listProductSlugs(): Promise<DbProductSlugRow[]>;
  listSiteSettings(locale: Locale): Promise<DbSiteSettingRow[]>;
}

const categorySelect =
  "id,presentation_key,sort_order,image_storage_path,category_translations(locale,name,slug,short_description,description,seo_title,seo_description)";
const productSelect =
  "id,brand,model,sku,price_minor,old_price_minor,currency,availability,is_new,sort_order,product_translations(locale,name,slug,short_description,description,seo_title,seo_description),categories!inner(id,presentation_key,sort_order,image_storage_path,category_translations(locale,name,slug,short_description,description,seo_title,seo_description)),product_images(id,storage_path,sort_order,is_primary,product_image_translations(locale,alt_text))";
const categorySlugSelect = "id,category_translations(locale,slug)";
const productSlugSelect = "id,product_translations(locale,slug)";
const specificationSelect =
  "id,product_id,ordinal,text_value_key,number_value,boolean_value,color_value,product_attribute_value_translations(locale,text_value),products!inner(category_id),attributes!inner(code,data_type,is_filterable,sort_order,category_attributes(category_id,is_filterable,sort_order),attribute_translations(locale,name,unit_label),attribute_groups(code,sort_order,attribute_group_translations(locale,name))),attribute_options(code,attribute_option_translations(locale,label))";

// PostgREST puts an `in` filter in the query string, so every id travels in the
// URL and costs ~39 bytes. The facet queries pass the whole catalog, which is
// how the catalog page died once the shop grew: the URL outgrew what the proxy
// in front of PostgREST accepts and the request was rejected before Postgres
// ever saw it. Ids are sent in batches that keep a request near 4 KB, well
// under the 8 KB such a proxy typically allows.
const ID_BATCH_SIZE = 100;

// A response is capped at `db.max_rows` (1000 on Supabase) and the cap is
// reported only through the Content-Range header, so an unbounded select
// silently returns a prefix of the rows. Unbounded reads page through the
// range instead and use the exact count to know when they are done.
const ROW_PAGE_SIZE = 1000;

type PostgrestFailure = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

// The thrown error carries no database detail: it reaches a client component
// through the error boundary. The cause is written to the server log instead,
// which is the only place a failing catalog query can be diagnosed from.
function queryFailure(resource: string, cause?: unknown): CatalogDataError {
  if (cause) {
    const failure = cause as PostgrestFailure;
    console.error("Supabase catalog query error", {
      resource,
      code: failure.code ?? null,
      message: failure.message ?? null,
      details: failure.details ?? null,
      hint: failure.hint ?? null,
    });
  }
  return new CatalogDataError(
    "query_failed",
    `Supabase query failed for ${resource}`,
  );
}

function idBatches(ids: string[]): string[][] {
  const batches: string[][] = [];
  for (let index = 0; index < ids.length; index += ID_BATCH_SIZE) {
    batches.push(ids.slice(index, index + ID_BATCH_SIZE));
  }
  return batches;
}

// PostgREST infers a row shape from the select string that never quite matches
// the hand-written Db*Row types, so a page is read loosely and cast once here,
// the same way each query in this file already casts its result.
type RowPage = {
  data: unknown;
  error: unknown;
  count?: number | null;
};

async function collectPages<Row>(
  resource: string,
  requestPage: (from: number, to: number) => PromiseLike<RowPage>,
): Promise<Row[]> {
  const rows: Row[] = [];
  let total = Number.POSITIVE_INFINITY;
  while (rows.length < total) {
    const { data, error, count } = await requestPage(
      rows.length,
      rows.length + ROW_PAGE_SIZE - 1,
    );
    if (error) throw queryFailure(resource, error);
    const page = (data ?? []) as Row[];
    rows.push(...page);
    // Without an exact count a short page cannot be told apart from the end of
    // the table, so a response that omits one is treated as the only page
    // rather than paged forever.
    if (typeof count !== "number") break;
    total = count;
    if (page.length === 0) break;
  }
  return rows;
}

export class SupabaseCatalogTransport implements CatalogTransport {
  constructor(private readonly client: SupabaseClient) {}

  private hydrateCategory(row: DbCategoryRow): DbCategoryRow {
    let imagePublicUrl: string | null = null;
    if (row.image_storage_path) {
      if (
        row.image_storage_path.startsWith("/") ||
        row.image_storage_path.startsWith("http")
      ) {
        imagePublicUrl = row.image_storage_path;
      } else {
        imagePublicUrl = this.client.storage
          .from("category-images")
          .getPublicUrl(row.image_storage_path).data.publicUrl;
      }
    }
    return {
      ...row,
      image_public_url: imagePublicUrl,
    };
  }

  async listCategories(): Promise<DbCategoryRow[]> {
    const { data, error } = await this.client
      .from("categories")
      .select(categorySelect)
      .eq("is_published", true)
      .is("archived_at", null)
      .order("sort_order");
    if (error) throw queryFailure("categories", error);
    return (data as unknown as DbCategoryRow[]).map((cat) =>
      this.hydrateCategory(cat),
    );
  }

  async findCategoryBySlug(
    locale: Locale,
    slug: string,
  ): Promise<DbCategoryRow | null> {
    const lookup = await this.client
      .from("category_translations")
      .select("category_id")
      .eq("locale", locale)
      .eq("slug", slug)
      .maybeSingle();
    if (lookup.error) throw queryFailure("category slug", lookup.error);
    if (!lookup.data) return null;
    return this.findCategoryById(lookup.data.category_id);
  }

  async findCategoryByHistoricalSlug(locale: Locale, slug: string) {
    const lookup = await this.client
      .from("category_slug_routes")
      .select("category_id")
      .eq("locale", locale)
      .eq("slug", slug)
      .eq("is_current", false)
      .maybeSingle();
    if (lookup.error)
      throw queryFailure("category historical slug", lookup.error);
    return lookup.data ? this.findCategoryById(lookup.data.category_id) : null;
  }

  private async findCategoryById(id: string) {
    const { data, error } = await this.client
      .from("categories")
      .select(categorySelect)
      .eq("id", id)
      .eq("is_published", true)
      .is("archived_at", null)
      .maybeSingle();
    if (error) throw queryFailure("category", error);
    return data ? this.hydrateCategory(data as unknown as DbCategoryRow) : null;
  }

  private productQuery(
    queryOptions: TransportProductQuery,
    ids: string[] | null,
  ) {
    let query = this.client
      .from("products")
      .select(productSelect, { count: "exact" })
      .eq("is_published", true)
      .is("archived_at", null)
      // sort_order repeats across products, so paging needs a stable tiebreak.
      .order("sort_order")
      .order("id");
    if (queryOptions.categoryId) {
      query = query.eq("category_id", queryOptions.categoryId);
    }
    if (queryOptions.excludeId) {
      query = query.neq("id", queryOptions.excludeId);
    }
    if (ids) query = query.in("id", ids);
    return query;
  }

  async listProducts(
    queryOptions: TransportProductQuery = {},
  ): Promise<DbProductRow[]> {
    const batches = queryOptions.ids ? idBatches(queryOptions.ids) : [null];
    const rows: DbProductRow[] = [];
    for (const batch of batches) {
      if (queryOptions.limit) {
        const { data, error } = await this.productQuery(
          queryOptions,
          batch,
        ).limit(queryOptions.limit);
        if (error) throw queryFailure("products", error);
        rows.push(...((data ?? []) as unknown as DbProductRow[]));
        continue;
      }
      rows.push(
        ...(await collectPages<DbProductRow>("products", (from, to) =>
          this.productQuery(queryOptions, batch).range(from, to),
        )),
      );
    }

    return rows.map((product) => ({
      ...product,
      product_images: product.product_images.map((image) => ({
        ...image,
        public_url: this.client.storage
          .from("product-images")
          .getPublicUrl(image.storage_path).data.publicUrl,
      })),
    }));
  }

  async getPopularProductIds(limit = 7): Promise<string[]> {
    const { data, error } = await this.client.rpc("get_popular_products_30d", {
      p_limit: Math.min(limit, 7),
    });
    if (error) throw queryFailure("popular product ids", error);
    return (data as string[]) ?? [];
  }

  async recordProductView(productId: string): Promise<void> {
    const { error } = await this.client.rpc("record_product_view", {
      p_product_id: productId,
    });
    if (error) throw queryFailure("record product view", error);
  }

  async cleanupOldProductViews(retentionDays = 31): Promise<number> {
    const { data, error } = await this.client.rpc("cleanup_old_product_views", {
      p_retention_days: retentionDays,
    });
    if (error) throw queryFailure("cleanup old product views", error);
    return Number(data ?? 0);
  }

  async findProductBySlug(
    locale: Locale,
    slug: string,
  ): Promise<DbProductRow | null> {
    const lookup = await this.client
      .from("product_translations")
      .select("product_id")
      .eq("locale", locale)
      .eq("slug", slug)
      .maybeSingle();
    if (lookup.error) throw queryFailure("product slug", lookup.error);
    if (!lookup.data) return null;
    return this.findProductById(lookup.data.product_id);
  }

  async findProductByHistoricalSlug(locale: Locale, slug: string) {
    const lookup = await this.client
      .from("product_slug_routes")
      .select("product_id")
      .eq("locale", locale)
      .eq("slug", slug)
      .eq("is_current", false)
      .maybeSingle();
    if (lookup.error)
      throw queryFailure("product historical slug", lookup.error);
    return lookup.data ? this.findProductById(lookup.data.product_id) : null;
  }

  private async findProductById(id: string) {
    const { data, error } = await this.client
      .from("products")
      .select(productSelect)
      .eq("id", id)
      .eq("is_published", true)
      .is("archived_at", null)
      .maybeSingle();
    if (error) throw queryFailure("product", error);
    if (!data) return null;
    const product = data as unknown as DbProductRow;
    return {
      ...product,
      product_images: product.product_images.map((image) => ({
        ...image,
        public_url: this.client.storage
          .from("product-images")
          .getPublicUrl(image.storage_path).data.publicUrl,
      })),
    };
  }

  async searchProductIds(
    locale: Locale,
    categoryId: string | undefined,
    query: CatalogSearchQuery,
  ) {
    const { data, error } = await this.client.rpc(
      "search_public_catalog_product_ids",
      {
        p_locale: locale,
        p_category_id: categoryId ?? null,
        p_query: query.query || null,
        p_brand: query.brand,
        p_availability: query.availability,
        p_min_price_minor: query.minPriceMinor,
        p_max_price_minor: query.maxPriceMinor,
        p_attributes: query.attributes,
        p_sort: query.sort,
        p_limit: query.pageSize,
        p_offset: (query.page - 1) * query.pageSize,
      },
    );
    if (error) throw queryFailure("catalog search", error);
    const rows = (data ?? []) as DbCatalogSearchRow[];
    const total = rows.length ? Number(rows[0]!.total_count) : 0;
    if (!Number.isSafeInteger(total) || total < 0) {
      throw new CatalogDataError(
        "invalid_data",
        "Invalid catalog search count",
      );
    }
    return {
      ids: rows.flatMap((row) => (row.product_id ? [row.product_id] : [])),
      total,
    };
  }

  async listSpecifications(
    productIds: string[],
  ): Promise<DbSpecificationRow[]> {
    if (productIds.length === 0) return [];
    const rows: DbSpecificationRow[] = [];
    for (const batch of idBatches(productIds)) {
      rows.push(
        ...(await collectPages<DbSpecificationRow>(
          "product specifications",
          (from, to) =>
            this.client
              .from("product_attribute_values")
              .select(specificationSelect, { count: "exact" })
              .in("product_id", batch)
              .order("id")
              .range(from, to),
        )),
      );
    }
    return rows;
  }

  // The filters are folded in Postgres and come back as one small document,
  // so a page of nine products no longer has to read the whole catalog to know
  // what it may offer as a filter.
  async getFacets(
    locale: Locale,
    categoryId?: string,
  ): Promise<DbCatalogFacetsRow> {
    const { data, error } = await this.client.rpc("get_public_catalog_facets", {
      p_locale: locale,
      p_category_id: categoryId ?? null,
    });
    if (error) throw queryFailure("catalog facets", error);
    if (!data) {
      throw new CatalogDataError("invalid_data", "Empty catalog facets");
    }
    return data as unknown as DbCatalogFacetsRow;
  }

  // Deliberately narrow: the sitemap wants URLs, not products. Reading whole
  // products for it meant descriptions, images and attribute values travelled
  // for every entry, which is what pushed the cached result past the 2 MB the
  // data cache accepts and left the whole catalog re-read on every crawl.
  async listCategorySlugs(): Promise<DbCategorySlugRow[]> {
    return collectPages<DbCategorySlugRow>("category slugs", (from, to) =>
      this.client
        .from("categories")
        .select(categorySlugSelect, { count: "exact" })
        .eq("is_published", true)
        .is("archived_at", null)
        .order("id")
        .range(from, to),
    );
  }

  async listProductSlugs(): Promise<DbProductSlugRow[]> {
    return collectPages<DbProductSlugRow>("product slugs", (from, to) =>
      this.client
        .from("products")
        .select(productSlugSelect, { count: "exact" })
        .eq("is_published", true)
        .is("archived_at", null)
        .order("id")
        .range(from, to),
    );
  }

  async listSiteSettings(locale: Locale): Promise<DbSiteSettingRow[]> {
    const { data, error } = await this.client
      .from("site_settings")
      .select("key,value")
      .eq("locale", locale);
    if (error) throw queryFailure("site settings", error);
    return data as unknown as DbSiteSettingRow[];
  }
}
