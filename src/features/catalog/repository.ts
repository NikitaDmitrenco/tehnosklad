import type {
  CatalogCategory,
  CatalogFacets,
  CatalogProduct,
  CatalogSearchQuery,
  CatalogSearchResult,
  CatalogSitemapEntries,
  PublicSiteSettings,
} from "@/features/catalog/types";
import type { Locale } from "@/i18n/config";

export type ProductQuery = {
  categoryId?: string;
  limit?: number;
};

export interface CatalogRepository {
  getPublishedCategories(locale: Locale): Promise<CatalogCategory[]>;
  getPublishedProducts(
    locale: Locale,
    query?: ProductQuery,
  ): Promise<CatalogProduct[]>;
  getPopularProducts(locale: Locale, limit?: number): Promise<CatalogProduct[]>;
  recordProductView(productId: string): Promise<void>;
  cleanupOldProductViews(retentionDays?: number): Promise<number>;
  searchPublishedProducts(
    locale: Locale,
    categoryId: string | undefined,
    query: CatalogSearchQuery,
  ): Promise<CatalogSearchResult>;
  getCategoryBySlug(
    locale: Locale,
    slug: string,
  ): Promise<CatalogCategory | null>;
  getProductBySlug(
    locale: Locale,
    slug: string,
  ): Promise<CatalogProduct | null>;
  getCategoryByHistoricalSlug(
    locale: Locale,
    slug: string,
  ): Promise<CatalogCategory | null>;
  getProductByHistoricalSlug(
    locale: Locale,
    slug: string,
  ): Promise<CatalogProduct | null>;
  getSimilarProducts(
    locale: Locale,
    productId: string,
    categoryId: string,
    limit: number,
  ): Promise<CatalogProduct[]>;
  getAvailableFilters(
    locale: Locale,
    categoryId?: string,
  ): Promise<CatalogFacets>;
  getPublicSiteSettings(locale: Locale): Promise<PublicSiteSettings>;
  getSitemapEntries(): Promise<CatalogSitemapEntries>;
}

export class CatalogDataError extends Error {
  constructor(
    public readonly code:
      "configuration" | "query_failed" | "invalid_data" | "missing_translation",
    message: string,
  ) {
    super(message);
    this.name = "CatalogDataError";
  }
}
