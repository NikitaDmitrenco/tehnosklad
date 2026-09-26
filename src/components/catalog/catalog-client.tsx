import Link from "next/link";

import { CategoryPillsCarousel } from "@/components/catalog/category-pills-carousel";
import { ProductGrid } from "@/components/catalog/product-grid";
import { PriceFilterInput } from "@/components/catalog/price-filter-input";
import {
  catalogQueryHref,
  type CatalogUrlState,
} from "@/features/catalog/query";
import type {
  CatalogCategory,
  CatalogFacets,
  CatalogSearchResult,
  PublicSiteSettings,
} from "@/features/catalog/types";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
import type { LeadSource } from "@/features/leads/types";

function FilterFields({
  dictionary,
  facets,
  state,
}: {
  dictionary: Dictionary;
  facets: CatalogFacets;
  state: CatalogUrlState;
}) {
  return (
    <>
      <label className="field-label">
        {dictionary.catalog.searchLabel}
        <input
          className="field"
          defaultValue={state.query}
          maxLength={100}
          name="q"
          placeholder={dictionary.catalog.searchPlaceholder}
        />
      </label>
      <label className="field-label">
        {dictionary.catalog.brand}
        <select className="field" defaultValue={state.brand} name="brand">
          <option value="">{dictionary.catalog.allBrands}</option>
          {facets.brands.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>
      </label>
      <label className="field-label">
        {dictionary.catalog.availability}
        <select
          className="field"
          defaultValue={state.availability}
          name="availability"
        >
          <option value="">{dictionary.catalog.allAvailability}</option>
          <option value="in_stock">{dictionary.common.inStock}</option>
          <option value="on_order">{dictionary.common.onOrder}</option>
          <option value="out_of_stock">{dictionary.common.outOfStock}</option>
        </select>
      </label>
      <div>
        <span className="field-label">{dictionary.catalog.price}</span>
        <div className="grid grid-cols-2 gap-2">
          <PriceFilterInput
            ariaLabel={dictionary.catalog.priceFrom}
            defaultValue={state.minPrice}
            name="price_min"
            placeholder={dictionary.catalog.priceFrom}
          />
          <PriceFilterInput
            ariaLabel={dictionary.catalog.priceTo}
            defaultValue={state.maxPrice}
            name="price_max"
            placeholder={dictionary.catalog.priceTo}
          />
        </div>
      </div>
      {facets.attributes.map((attribute) => (
        <label className="field-label" key={attribute.code}>
          {attribute.label}
          <select
            className="field"
            defaultValue={state.attributes[attribute.code] ?? ""}
            name={`attr_${attribute.code}`}
          >
            <option value="">—</option>
            {attribute.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      <label className="field-label">
        {dictionary.catalog.sort}
        <select className="field" defaultValue={state.sort} name="sort">
          <option value="popular">{dictionary.catalog.sortPopular}</option>
          <option value="new">{dictionary.catalog.sortNew}</option>
          <option value="price_asc">{dictionary.catalog.sortPriceAsc}</option>
          <option value="price_desc">{dictionary.catalog.sortPriceDesc}</option>
          <option value="name">{dictionary.catalog.sortName}</option>
        </select>
      </label>
      <button className="button-primary w-full" type="submit">
        {dictionary.actions.apply}
      </button>
    </>
  );
}

export function CatalogClient({
  locale,
  dictionary,
  categories,
  facets,
  settings,
  state,
  result,
  actionPath,
  leadSource,
  showCategories = false,
}: {
  locale: Locale;
  dictionary: Dictionary;
  categories: CatalogCategory[];
  facets: CatalogFacets;
  settings: PublicSiteSettings;
  state: CatalogUrlState;
  result: CatalogSearchResult;
  actionPath: string;
  leadSource: LeadSource;
  showCategories?: boolean;
}) {
  const fields = (
    <FilterFields dictionary={dictionary} facets={facets} state={state} />
  );
  return (
    <>
      {showCategories ? (
        <CategoryPillsCarousel
          ariaLabel={dictionary.catalog.category}
          categories={categories}
          locale={locale}
        />
      ) : null}
      <details className="mb-5 rounded-2xl border border-stone-200 p-4 lg:hidden">
        <summary className="cursor-pointer font-bold">
          {dictionary.actions.filters}
        </summary>
        <form action={actionPath} className="mt-5 space-y-4" method="get">
          {fields}
          <Link className="button-secondary w-full" href={actionPath}>
            {dictionary.actions.reset}
          </Link>
        </form>
      </details>
      <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
        <aside className="hidden self-start rounded-2xl border border-stone-200 bg-stone-50 p-4 lg:block">
          <form action={actionPath} className="space-y-4" method="get">
            {fields}
            <Link className="button-secondary w-full" href={actionPath}>
              {dictionary.actions.reset}
            </Link>
          </form>
        </aside>
        <div>
          <p className="mb-5 font-bold">
            {result.total} {dictionary.common.results}
          </p>
          {result.products.length ? (
            <ProductGrid
              products={result.products}
              locale={locale}
              dictionary={dictionary}
              settings={settings}
              leadSource={leadSource}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center">
              <h2 className="text-xl font-bold">
                {dictionary.catalog.emptyTitle}
              </h2>
              <p className="mt-2 text-stone-600">
                {dictionary.catalog.emptyText}
              </p>
              <Link className="button-secondary mt-5" href={actionPath}>
                {dictionary.actions.reset}
              </Link>
            </div>
          )}
          {result.pageCount > 1 ? (
            <nav
              aria-label={dictionary.catalog.pagination}
              className="mt-8 flex flex-wrap items-center justify-center gap-2"
            >
              {result.page > 1 ? (
                <Link
                  className="button-secondary"
                  href={catalogQueryHref(actionPath, state, result.page - 1)}
                >
                  {dictionary.actions.previous}
                </Link>
              ) : null}
              <span className="px-3 text-sm font-bold">
                {dictionary.catalog.page} {result.page} / {result.pageCount}
              </span>
              {result.page < result.pageCount ? (
                <Link
                  className="button-secondary"
                  href={catalogQueryHref(actionPath, state, result.page + 1)}
                >
                  {dictionary.actions.next}
                </Link>
              ) : null}
            </nav>
          ) : null}
        </div>
      </div>
    </>
  );
}
