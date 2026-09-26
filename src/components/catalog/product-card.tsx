import Link from "next/link";

import { ProductIllustration } from "@/components/catalog/product-illustration";
import { ContactButton } from "@/components/public/contact-button";
import { formatPrice, getDiscountPercent } from "@/features/catalog/logic";
import type {
  CatalogProduct,
  PublicSiteSettings,
} from "@/features/catalog/types";
import { localizedPath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
import type { LeadSource } from "@/features/leads/types";

export function ProductCard({
  product,
  locale,
  dictionary,
  settings,
  leadSource,
}: {
  product: CatalogProduct;
  locale: Locale;
  dictionary: Dictionary;
  settings: PublicSiteSettings;
  leadSource: LeadSource;
}) {
  const discount = getDiscountPercent(
    product.priceMinor,
    product.oldPriceMinor,
  );
  const primaryImage = product.images[0];
  const availability =
    product.stockStatus === "in_stock"
      ? dictionary.common.inStock
      : product.stockStatus === "on_order"
        ? dictionary.common.onOrder
        : dictionary.common.outOfStock;
  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-stone-400 hover:shadow-md">
      <Link
        className="flex flex-1 flex-col focus-visible:rounded-xl"
        href={localizedPath(locale, `product/${product.slug}`)}
      >
        <div className="relative">
          <ProductIllustration
            category={product.category.presentationKey}
            tone={product.imageTone}
            label={primaryImage?.alt ?? product.name}
            imageUrl={primaryImage?.url}
            className="h-66 w-full rounded-xl overflow-hidden"
          />
          {discount ? (
            <span className="absolute left-0 top-0 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white shadow-xs">
              −{discount}%
            </span>
          ) : null}
        </div>
        <div className="mt-4 flex flex-1 flex-col">
          <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
            {product.category.name} · {product.brand}
          </p>
          <h3 className="mt-1 line-clamp-2 min-h-12 text-base font-bold leading-6 text-stone-900 group-hover:text-black">
            {product.name}
          </h3>
          <ul className="mt-2 min-h-10 space-y-0.5 text-xs text-stone-600">
            {product.specifications.slice(0, 2).map((specification) => (
              <li key={specification.code} className="line-clamp-1">
                {specification.label}:{" "}
                <span className="font-semibold text-stone-800">
                  {specification.displayValue}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-4">
            <div className="flex items-baseline gap-2">
              <strong className="text-xl font-black tracking-tight text-stone-950">
                {formatPrice(product.priceMinor, locale)}
              </strong>
              {product.oldPriceMinor && discount ? (
                <s className="text-sm font-semibold text-stone-400">
                  {formatPrice(product.oldPriceMinor, locale)}
                </s>
              ) : null}
            </div>
            <p
              className={`mt-1 text-xs font-bold ${
                product.stockStatus === "in_stock"
                  ? "text-emerald-700"
                  : "text-stone-500"
              }`}
            >
              {availability}
            </p>
          </div>
        </div>
      </Link>
      <div className="mt-4 flex shrink-0 items-center justify-end gap-2">
        <Link
          className="button-secondary text-sm"
          href={localizedPath(locale, `product/${product.slug}`)}
        >
          {dictionary.actions.view}
        </Link>
        <ContactButton
          dictionary={dictionary}
          locale={locale}
          label={dictionary.actions.contact}
          source={leadSource}
          product={{ id: product.id, name: product.name }}
          settings={settings}
        />
      </div>
    </article>
  );
}
