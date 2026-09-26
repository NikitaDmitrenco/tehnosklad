import { notFound, permanentRedirect, redirect } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";
import { CatalogClient } from "@/components/catalog/catalog-client";
import { Breadcrumbs } from "@/components/public/breadcrumbs";
import { PageContainer } from "@/components/layout/page-container";
import {
  getCatalogFacets,
  getCategoryRouteBySlug,
  getPublishedCategories,
  getPublicSiteSettings,
  searchPublishedProducts,
} from "@/features/catalog/data";
import {
  catalogQueryHref,
  isCanonicalCatalogSearchParams,
  parseCatalogSearchParams,
  toCatalogSearchQuery,
  hasCatalogFilters,
  type RawCatalogSearchParams,
} from "@/features/catalog/query";
import { getDictionary } from "@/i18n/get-dictionary";
import { isLocale, localizedPath } from "@/i18n/config";
import { JsonLd } from "@/features/seo/json-ld";
import { buildLocalizedMetadata } from "@/features/seo/metadata";
import { buildCollectionSchema } from "@/features/seo/schema";

const loadCategoryRoute = cache(getCategoryRouteBySlug);

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<RawCatalogSearchParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const route = await loadCategoryRoute(locale, slug);
  if (!route) notFound();
  const category = route.entity;
  const state = parseCatalogSearchParams(await searchParams);
  const filtered = hasCatalogFilters(state);
  const base = `/${locale}/category/${category.slug}`;
  const alternateBase = `/${locale === "ru" ? "ro" : "ru"}/category/${category.alternateSlug}`;
  return buildLocalizedMetadata({
    locale,
    title: category.seoTitle ?? category.name,
    description: category.seoDescription ?? category.shortDescription,
    currentPath:
      !filtered && state.page > 1 ? `${base}?page=${state.page}` : base,
    alternatePath:
      !filtered && state.page > 1
        ? `${alternateBase}?page=${state.page}`
        : alternateBase,
    index: !filtered,
  });
}
export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<RawCatalogSearchParams>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const route = await loadCategoryRoute(locale, slug);
  if (!route) notFound();
  const category = route.entity;
  const raw = await searchParams;
  const state = parseCatalogSearchParams(raw);
  const actionPath = `/${locale}/category/${category.slug}`;
  if (route.redirected) permanentRedirect(catalogQueryHref(actionPath, state));
  if (!isCanonicalCatalogSearchParams(raw, state)) {
    redirect(catalogQueryHref(actionPath, state));
  }
  const d = getDictionary(locale);
  const [categories, facets, result, settings] = await Promise.all([
    getPublishedCategories(locale),
    getCatalogFacets(locale, category.id),
    searchPublishedProducts(locale, category.id, toCatalogSearchQuery(state)),
    getPublicSiteSettings(locale),
  ]);
  if (
    state.page > 1 &&
    (result.pageCount === 0 || state.page > result.pageCount)
  )
    notFound();
  return (
    <PageContainer className="py-8 sm:py-12">
      <Breadcrumbs
        locale={locale}
        home={d.common.breadcrumbsHome}
        items={[
          { label: d.catalog.title, href: localizedPath(locale, "catalog") },
          { label: category.name },
        ]}
      />
      <h1 className="mt-5 text-4xl font-bold">{category.name}</h1>
      <p className="mt-3 text-stone-600">{category.description}</p>
      <div className="mt-8">
        <JsonLd
          value={buildCollectionSchema({
            locale,
            title: category.name,
            description: category.description,
            path: actionPath,
            products: result.products,
            breadcrumbItems: [
              { name: d.common.breadcrumbsHome, path: `/${locale}` },
              { name: d.catalog.title, path: `/${locale}/catalog` },
              { name: category.name, path: actionPath },
            ],
          })}
        />
        <CatalogClient
          locale={locale}
          dictionary={d}
          categories={categories}
          facets={facets}
          settings={settings}
          state={state}
          result={result}
          actionPath={actionPath}
          leadSource="category_product_card"
        />
      </div>
    </PageContainer>
  );
}
