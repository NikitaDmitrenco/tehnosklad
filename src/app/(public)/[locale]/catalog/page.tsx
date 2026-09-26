import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { CatalogClient } from "@/components/catalog/catalog-client";
import { Breadcrumbs } from "@/components/public/breadcrumbs";
import { PageContainer } from "@/components/layout/page-container";
import {
  getPublishedCategories,
  getCatalogFacets,
  getPublicSiteSettings,
  isDemoCatalog,
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
import { isLocale } from "@/i18n/config";
import { JsonLd } from "@/features/seo/json-ld";
import { buildLocalizedMetadata } from "@/features/seo/metadata";
import { buildCollectionSchema } from "@/features/seo/schema";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<RawCatalogSearchParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const state = parseCatalogSearchParams(await searchParams);
  const d = getDictionary(locale);
  const filtered = hasCatalogFilters(state);
  const currentPath =
    !filtered && state.page > 1
      ? `/${locale}/catalog?page=${state.page}`
      : `/${locale}/catalog`;
  const other = locale === "ru" ? "ro" : "ru";
  const alternatePath =
    !filtered && state.page > 1
      ? `/${other}/catalog?page=${state.page}`
      : `/${other}/catalog`;
  return buildLocalizedMetadata({
    locale,
    title: d.catalog.title,
    description: d.catalog.description,
    currentPath,
    alternatePath,
    index: !filtered,
  });
}
export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<RawCatalogSearchParams>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const raw = await searchParams;
  const state = parseCatalogSearchParams(raw);
  const actionPath = `/${locale}/catalog`;
  if (!isCanonicalCatalogSearchParams(raw, state)) {
    redirect(catalogQueryHref(actionPath, state));
  }
  const d = getDictionary(locale);
  const [categories, facets, result, settings] = await Promise.all([
    getPublishedCategories(locale),
    getCatalogFacets(locale),
    searchPublishedProducts(locale, undefined, toCatalogSearchQuery(state)),
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
        items={[d.catalog.title]}
      />
      <h1 className="mt-5 text-4xl font-bold">{d.catalog.title}</h1>
      <p className="mt-3 max-w-3xl text-stone-600">{d.catalog.description}</p>
      {isDemoCatalog() ? (
        <p className="mt-4 text-xs font-bold uppercase tracking-wide text-stone-500">
          {d.common.demoNotice}
        </p>
      ) : null}
      <div className="mt-8">
        <JsonLd
          value={buildCollectionSchema({
            locale,
            title: d.catalog.title,
            description: d.catalog.description,
            path: actionPath,
            products: result.products,
            breadcrumbItems: [
              { name: d.common.breadcrumbsHome, path: `/${locale}` },
              { name: d.catalog.title, path: actionPath },
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
          leadSource="catalog_product_card"
          showCategories
        />
      </div>
    </PageContainer>
  );
}
