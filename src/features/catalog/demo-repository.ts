import { siteConfig } from "@/config/site";
import { demoCategories, demoProducts } from "@/features/catalog/demo-data";
import { buildCatalogFacets } from "@/features/catalog/facets";
import { filterProducts } from "@/features/catalog/logic";
import {
  CatalogDataError,
  type CatalogRepository,
  type ProductQuery,
} from "@/features/catalog/repository";
import type {
  CatalogCategory,
  CatalogProduct,
  CatalogSearchQuery,
  PublicSiteSettings,
} from "@/features/catalog/types";
import type { Locale } from "@/i18n/config";

function localizeCategory(
  category: (typeof demoCategories)[number],
  locale: Locale,
): CatalogCategory {
  return {
    id: category.id,
    slug: category.slug,
    alternateSlug: category.slug,
    presentationKey: category.icon,
    name: category.name[locale],
    shortDescription: category.description[locale],
    description: category.description[locale],
    seoTitle: null,
    seoDescription: null,
    imageUrl: category.imageUrl ?? null,
  };
}

function localizeProduct(
  product: (typeof demoProducts)[number],
  locale: Locale,
): CatalogProduct {
  const rawCategory = demoCategories.find(
    (category) => category.id === product.categoryId,
  );
  if (!rawCategory) {
    throw new CatalogDataError(
      "invalid_data",
      `Demo product ${product.id} has no category`,
    );
  }

  return {
    id: product.id,
    slug: product.slug,
    alternateSlug: product.slug,
    category: localizeCategory(rawCategory, locale),
    brand: product.brand,
    model: product.model,
    sku: product.sku,
    name: product.name[locale],
    shortDescription: product.shortDescription[locale],
    description: product.description[locale],
    seoTitle: null,
    seoDescription: null,
    priceMinor: product.priceMinor,
    oldPriceMinor: product.oldPriceMinor ?? null,
    currency: "MDL",
    stockStatus: product.stockStatus,
    isNew: product.isNew,
    specifications: product.specifications.map((specification, index) => ({
      code: `demo_${index + 1}`,
      groupCode: "general",
      groupName:
        locale === "ru"
          ? "Основные характеристики"
          : "Caracteristici principale",
      label: specification.label[locale],
      displayValue: specification.value[locale],
      filterValue: specification.value[locale],
      dataType: "text",
      isFilterable: false,
      sortOrder: index,
    })),
    images: [],
    imageTone: product.imageTone,
  };
}

function demoSettings(locale: Locale): PublicSiteSettings {
  return {
    phoneDisplay: siteConfig.phoneDisplay,
    phoneHref: siteConfig.phoneHref,
    address:
      locale === "ru" ? "ул. Победы, 97, Комрат" : "str. Victoriei, 97, Comrat",
    openDays: locale === "ru" ? siteConfig.hours.openDays : "Marți–duminică",
    openTime: siteConfig.hours.openTime,
    closedDay:
      locale === "ru" ? siteConfig.hours.closedDay : "Luni — zi liberă",
    contactText:
      locale === "ru"
        ? "Позвоните нам в часы работы магазина."
        : "Sunați-ne în programul magazinului.",
  };
}

export class DemoCatalogRepository implements CatalogRepository {
  private viewsMap = new Map<string, Date[]>();

  constructor() {
    // Seed initial product views for demo mode (8 products with views in last 30 days)
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const initialSeed = [
      {
        id: "20000000-0000-4000-8000-000000000001",
        views: [now - 1 * day, now - 2 * day, now - 3 * day],
      },
      {
        id: "20000000-0000-4000-8000-000000000002",
        views: [now - 1 * day, now - 2 * day],
      },
      { id: "20000000-0000-4000-8000-000000000003", views: [now - 1 * day] },
      { id: "20000000-0000-4000-8000-000000000004", views: [now - 1 * day] },
      { id: "20000000-0000-4000-8000-000000000005", views: [now - 1 * day] },
      { id: "20000000-0000-4000-8000-000000000006", views: [now - 1 * day] },
      { id: "20000000-0000-4000-8000-000000000007", views: [now - 1 * day] },
      { id: "20000000-0000-4000-8000-000000000008", views: [now - 1 * day] },
    ];
    for (const item of initialSeed) {
      this.viewsMap.set(
        item.id,
        item.views.map((ts) => new Date(ts)),
      );
    }
  }

  async recordProductView(productId: string): Promise<void> {
    const views = this.viewsMap.get(productId) ?? [];
    views.push(new Date());
    this.viewsMap.set(productId, views);
  }

  async getPopularProducts(
    locale: Locale,
    limit = 7,
  ): Promise<CatalogProduct[]> {
    const cappedLimit = Math.min(limit, 7);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const productViewCounts = demoProducts
      .map((product) => {
        const timestamps = this.viewsMap.get(product.id) ?? [];
        const count30d = timestamps.filter((t) => t >= thirtyDaysAgo).length;
        return { product, count30d };
      })
      .filter((item) => item.count30d > 0)
      .sort((a, b) => {
        if (b.count30d !== a.count30d) return b.count30d - a.count30d;
        return a.product.id.localeCompare(b.product.id);
      })
      .slice(0, cappedLimit);

    return productViewCounts.map((item) =>
      localizeProduct(item.product, locale),
    );
  }

  async cleanupOldProductViews(retentionDays = 31): Promise<number> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    let deleted = 0;
    for (const [id, timestamps] of this.viewsMap.entries()) {
      const kept = timestamps.filter((t) => t >= cutoff);
      deleted += timestamps.length - kept.length;
      this.viewsMap.set(id, kept);
    }
    return deleted;
  }

  async getPublishedCategories(locale: Locale) {
    return demoCategories.map((category) => localizeCategory(category, locale));
  }

  async getPublishedProducts(locale: Locale, query: ProductQuery = {}) {
    return demoProducts
      .filter(
        (product) =>
          !query.categoryId || product.categoryId === query.categoryId,
      )
      .slice(0, query.limit)
      .map((product) => localizeProduct(product, locale));
  }

  async searchPublishedProducts(
    locale: Locale,
    categoryId: string | undefined,
    query: CatalogSearchQuery,
  ) {
    const source = await this.getPublishedProducts(locale, { categoryId });
    const filtered = filterProducts(
      source,
      {
        query: query.query,
        categoryId: "all",
        brand: query.brand ?? "all",
        availability: query.availability ?? "all",
        minPrice:
          query.minPriceMinor === null ? "" : String(query.minPriceMinor / 100),
        maxPrice:
          query.maxPriceMinor === null ? "" : String(query.maxPriceMinor / 100),
        attributes: { ...query.attributes },
        sort: query.sort,
      },
      locale,
    );
    const offset = (query.page - 1) * query.pageSize;
    return {
      products: filtered.slice(offset, offset + query.pageSize),
      total: filtered.length,
      page: query.page,
      pageSize: query.pageSize,
      pageCount: Math.ceil(filtered.length / query.pageSize),
    };
  }

  async getCategoryBySlug(locale: Locale, slug: string) {
    const category = demoCategories.find((item) => item.slug === slug);
    return category ? localizeCategory(category, locale) : null;
  }

  async getProductBySlug(locale: Locale, slug: string) {
    const product = demoProducts.find((item) => item.slug === slug);
    return product ? localizeProduct(product, locale) : null;
  }

  async getCategoryByHistoricalSlug() {
    return null;
  }

  async getProductByHistoricalSlug() {
    return null;
  }

  async getSimilarProducts(
    locale: Locale,
    productId: string,
    categoryId: string,
    limit: number,
  ) {
    return demoProducts
      .filter(
        (product) =>
          product.categoryId === categoryId && product.id !== productId,
      )
      .slice(0, limit)
      .map((product) => localizeProduct(product, locale));
  }

  async getAvailableFilters(locale: Locale, categoryId?: string) {
    return buildCatalogFacets(
      await this.getPublishedProducts(locale, { categoryId }),
    );
  }

  async getPublicSiteSettings(locale: Locale) {
    return demoSettings(locale);
  }

  async getSitemapEntries() {
    // Demo fixtures carry one slug per entity, so both locales share it.
    return {
      categories: demoCategories.map((category) => ({
        id: category.id,
        slugs: { ru: category.slug, ro: category.slug },
      })),
      products: demoProducts.map((product) => ({
        id: product.id,
        slugs: { ru: product.slug, ro: product.slug },
      })),
    };
  }
}
