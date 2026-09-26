import {
  CatalogDataError,
  type CatalogRepository,
  type ProductQuery,
} from "@/features/catalog/repository";
import type { CatalogSearchQuery } from "@/features/catalog/types";
import {
  mapCatalogFacetsRow,
  mapCategoryRow,
  mapProductRow,
  mapSitemapEntries,
  mapSiteSettings,
} from "@/features/catalog/supabase/mapper";
import type { CatalogTransport } from "@/features/catalog/supabase/transport";
import type { Locale } from "@/i18n/config";

export class SupabaseCatalogRepository implements CatalogRepository {
  constructor(private readonly transport: CatalogTransport) {}

  async getPublishedCategories(locale: Locale) {
    const rows = await this.transport.listCategories();
    return rows.map((row) => mapCategoryRow(row, locale));
  }

  async getPublishedProducts(locale: Locale, query: ProductQuery = {}) {
    const rows = await this.transport.listProducts(query);
    const specifications = await this.transport.listSpecifications(
      rows.map((row) => row.id),
    );
    return rows.map((row) => mapProductRow(row, specifications, locale));
  }

  async getPopularProducts(locale: Locale, limit = 7) {
    const ids = await this.transport.getPopularProductIds(limit);
    if (!ids.length) return [];
    const rows = await this.transport.listProducts({ ids });
    const specifications = await this.transport.listSpecifications(ids);
    const productsById = new Map(
      rows.map((row) => [row.id, mapProductRow(row, specifications, locale)]),
    );
    return ids
      .map((id) => productsById.get(id))
      .filter((p): p is import("@/features/catalog/types").CatalogProduct =>
        Boolean(p),
      );
  }

  async recordProductView(productId: string) {
    await this.transport.recordProductView(productId);
  }

  async cleanupOldProductViews(retentionDays = 31) {
    return this.transport.cleanupOldProductViews(retentionDays);
  }

  async searchPublishedProducts(
    locale: Locale,
    categoryId: string | undefined,
    query: CatalogSearchQuery,
  ) {
    const page = await this.transport.searchProductIds(
      locale,
      categoryId,
      query,
    );
    const rows = page.ids.length
      ? await this.transport.listProducts({ ids: page.ids })
      : [];
    const specifications = await this.transport.listSpecifications(page.ids);
    const productsById = new Map(
      rows.map((row) => [row.id, mapProductRow(row, specifications, locale)]),
    );
    const products = page.ids.map((id) => {
      const product = productsById.get(id);
      if (!product) {
        throw new CatalogDataError(
          "invalid_data",
          "Catalog search returned a missing product",
        );
      }
      return product;
    });
    return {
      products,
      total: page.total,
      page: query.page,
      pageSize: query.pageSize,
      pageCount: Math.ceil(page.total / query.pageSize),
    };
  }

  async getCategoryBySlug(locale: Locale, slug: string) {
    const row = await this.transport.findCategoryBySlug(locale, slug);
    return row ? mapCategoryRow(row, locale) : null;
  }

  async getProductBySlug(locale: Locale, slug: string) {
    const row = await this.transport.findProductBySlug(locale, slug);
    if (!row) return null;
    const specifications = await this.transport.listSpecifications([row.id]);
    return mapProductRow(row, specifications, locale);
  }

  async getCategoryByHistoricalSlug(locale: Locale, slug: string) {
    const row = await this.transport.findCategoryByHistoricalSlug(locale, slug);
    return row ? mapCategoryRow(row, locale) : null;
  }

  async getProductByHistoricalSlug(locale: Locale, slug: string) {
    const row = await this.transport.findProductByHistoricalSlug(locale, slug);
    if (!row) return null;
    const specifications = await this.transport.listSpecifications([row.id]);
    return mapProductRow(row, specifications, locale);
  }

  async getSimilarProducts(
    locale: Locale,
    productId: string,
    categoryId: string,
    limit: number,
  ) {
    const rows = await this.transport.listProducts({
      categoryId,
      excludeId: productId,
      limit,
    });
    const specifications = await this.transport.listSpecifications(
      rows.map((row) => row.id),
    );
    return rows.map((row) => mapProductRow(row, specifications, locale));
  }

  async getAvailableFilters(locale: Locale, categoryId?: string) {
    return mapCatalogFacetsRow(
      await this.transport.getFacets(locale, categoryId),
    );
  }

  async getPublicSiteSettings(locale: Locale) {
    return mapSiteSettings(await this.transport.listSiteSettings(locale));
  }

  async getSitemapEntries() {
    const [categories, products] = await Promise.all([
      this.transport.listCategorySlugs(),
      this.transport.listProductSlugs(),
    ]);
    return {
      categories: mapSitemapEntries(
        categories.map((row) => ({
          id: row.id,
          translations: row.category_translations,
        })),
      ),
      products: mapSitemapEntries(
        products.map((row) => ({
          id: row.id,
          translations: row.product_translations,
        })),
      ),
    };
  }
}
