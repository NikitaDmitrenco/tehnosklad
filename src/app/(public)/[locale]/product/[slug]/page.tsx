import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";
import { ProductGallery } from "@/components/catalog/product-gallery";
import { ProductGrid } from "@/components/catalog/product-grid";
import { ContactButton } from "@/components/public/contact-button";
import { Breadcrumbs } from "@/components/public/breadcrumbs";
import { PageContainer } from "@/components/layout/page-container";
import {
  getProductRouteBySlug,
  getPublicSiteSettings,
  getSimilarProducts,
} from "@/features/catalog/data";
import { formatPrice, getDiscountPercent } from "@/features/catalog/logic";
import { getDictionary } from "@/i18n/get-dictionary";
import { isLocale } from "@/i18n/config";
import { localizedPath } from "@/i18n/config";
import { ProductViewTracker } from "@/components/catalog/product-view-tracker";
import { JsonLd } from "@/features/seo/json-ld";
import { buildLocalizedMetadata } from "@/features/seo/metadata";
import { buildProductSchema } from "@/features/seo/schema";

const loadProductRoute = cache(getProductRouteBySlug);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const route = await loadProductRoute(locale, slug);
  if (!route) notFound();
  const product = route.entity;
  const currentPath = localizedPath(locale, `product/${product.slug}`);
  const alternateLocale = locale === "ru" ? "ro" : "ru";
  return buildLocalizedMetadata({
    locale,
    title: product.seoTitle ?? product.name,
    description: product.seoDescription ?? product.shortDescription,
    currentPath,
    alternatePath: localizedPath(
      alternateLocale,
      `product/${product.alternateSlug}`,
    ),
    imagePath: product.images[0]?.url,
  });
}
export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const route = await loadProductRoute(locale, slug);
  if (!route) notFound();
  const product = route.entity;
  if (route.redirected) {
    permanentRedirect(localizedPath(locale, `product/${product.slug}`));
  }
  const d = getDictionary(locale);
  const [similar, settings] = await Promise.all([
    getSimilarProducts(locale, product.id, product.category.id, 4),
    getPublicSiteSettings(locale),
  ]);
  const discount = getDiscountPercent(
    product.priceMinor,
    product.oldPriceMinor,
  );
  return (
    <PageContainer className="py-8 sm:py-12">
      <ProductViewTracker productId={product.id} />
      <JsonLd
        value={buildProductSchema({
          locale,
          product,
          path: localizedPath(locale, `product/${product.slug}`),
          breadcrumbItems: [
            { name: d.common.breadcrumbsHome, path: `/${locale}` },
            { name: d.catalog.title, path: `/${locale}/catalog` },
            {
              name: product.category.name,
              path: `/${locale}/category/${product.category.slug}`,
            },
            {
              name: product.name,
              path: localizedPath(locale, `product/${product.slug}`),
            },
          ],
        })}
      />
      <Breadcrumbs
        locale={locale}
        home={d.common.breadcrumbsHome}
        items={[
          { label: d.catalog.title, href: localizedPath(locale, "catalog") },
          {
            label: product.category.name,
            href: localizedPath(locale, `category/${product.category.slug}`),
          },
          { label: product.name },
        ]}
      />
      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <ProductGallery
          product={product}
          label={d.product.galleryLabel}
          previous={d.product.previousImage}
          next={d.product.nextImage}
        />
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-stone-500">
            {product.category.name} · {product.brand}
          </p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            {product.name}
          </h1>
          <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 text-sm">
            <div>
              <dt className="text-stone-500">{d.product.brand}</dt>
              <dd className="font-bold">{product.brand}</dd>
            </div>
            <div>
              <dt className="text-stone-500">{d.product.model}</dt>
              <dd className="font-bold">{product.model}</dd>
            </div>
            <div>
              <dt className="text-stone-500">{d.product.sku}</dt>
              <dd className="font-bold">{product.sku}</dd>
            </div>
          </dl>
          <div className="mt-6 rounded-2xl bg-stone-50 p-5">
            <div className="flex flex-wrap items-end gap-3">
              <strong className="text-3xl font-bold">
                {formatPrice(product.priceMinor, locale)}
              </strong>
              {product.oldPriceMinor && discount ? (
                <s className="text-stone-500">
                  {formatPrice(product.oldPriceMinor, locale)}
                </s>
              ) : null}
              {discount ? (
                <span className="rounded-full bg-red-600 px-2 py-1 text-sm font-bold text-white">
                  −{discount}%
                </span>
              ) : null}
            </div>
            <p
              className={`mt-3 font-bold ${product.stockStatus === "in_stock" ? "text-emerald-700" : "text-stone-500"}`}
            >
              {product.stockStatus === "in_stock"
                ? d.common.inStock
                : product.stockStatus === "on_order"
                  ? d.common.onOrder
                  : d.common.outOfStock}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <ContactButton
                dictionary={d}
                locale={locale}
                label={d.actions.contact}
                source="product_page"
                product={{ id: product.id, name: product.name }}
                settings={settings}
              />
              <a className="button-secondary" href={settings.phoneHref}>
                {d.actions.call}
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_.8fr]">
        <section>
          <h2 className="text-2xl font-bold">{d.product.description}</h2>
          <p className="mt-3 max-w-3xl text-stone-700">{product.description}</p>
        </section>
        <section>
          <h2 className="text-2xl font-bold">{d.product.characteristics}</h2>
          <dl className="mt-3 divide-y divide-stone-200 rounded-xl border border-stone-200 px-4">
            {product.specifications.map((spec) => (
              <div
                className="flex justify-between gap-4 py-3 text-sm"
                key={`${spec.code}-${spec.displayValue}`}
              >
                <dt className="text-stone-600">{spec.label}</dt>
                <dd className="font-bold text-right">{spec.displayValue}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
      <section className="mt-12">
        <h2 className="text-2xl font-bold">{d.product.similar}</h2>
        <div className="mt-5">
          <ProductGrid
            columns={4}
            products={similar}
            locale={locale}
            dictionary={d}
            settings={settings}
            leadSource="similar_product_card"
          />
        </div>
      </section>
    </PageContainer>
  );
}
