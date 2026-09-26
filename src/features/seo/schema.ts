import type {
  CatalogProduct,
  PublicSiteSettings,
} from "@/features/catalog/types";
import type { Locale } from "@/i18n/config";
import { getSiteUrl } from "@/lib/env/public";

function absolute(path: string): string {
  return new URL(path, getSiteUrl()).toString();
}

function breadcrumbs(items: Array<{ name: string; path: string }>) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absolute(item.path),
    })),
  };
}

export function buildHomeSchema(locale: Locale, settings: PublicSiteSettings) {
  const origin = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Store",
        "@id": `${origin}/#store`,
        name: "Tehnosklad",
        legalName: "Техносклад",
        url: absolute(`/${locale}`),
        telephone: settings.phoneDisplay,
        address: {
          "@type": "PostalAddress",
          streetAddress: settings.address,
          addressLocality: "Comrat",
          addressCountry: "MD",
        },
        openingHours: "Tu-Su 08:00-16:00",
        areaServed: { "@type": "City", name: "Comrat" },
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name: "Tehnosklad",
        url: origin,
        inLanguage: ["ru", "ro"],
        publisher: { "@id": `${origin}/#store` },
      },
    ],
  };
}

export function buildCollectionSchema({
  locale,
  title,
  description,
  path,
  products,
  breadcrumbItems,
}: {
  locale: Locale;
  title: string;
  description: string;
  path: string;
  products: CatalogProduct[];
  breadcrumbItems: Array<{ name: string; path: string }>;
}) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: title,
        description,
        url: absolute(path),
        inLanguage: locale,
        mainEntity: {
          "@type": "ItemList",
          itemListElement: products.map((product, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: product.name,
            url: absolute(`/${locale}/product/${product.slug}`),
          })),
        },
      },
      breadcrumbs(breadcrumbItems),
    ],
  };
}

function validImage(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol)
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

export function buildProductSchema({
  locale,
  product,
  path,
  breadcrumbItems,
}: {
  locale: Locale;
  product: CatalogProduct;
  path: string;
  breadcrumbItems: Array<{ name: string; path: string }>;
}) {
  const image = validImage(product.images[0]?.url);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        name: product.name,
        description: product.description,
        ...(image ? { image: [image] } : {}),
        sku: product.sku,
        model: product.model,
        brand: { "@type": "Brand", name: product.brand },
        category: product.category.name,
        url: absolute(path),
        inLanguage: locale,
        offers: {
          "@type": "Offer",
          price: (product.priceMinor / 100).toFixed(2),
          priceCurrency: product.currency,
          url: absolute(path),
          availability: `https://schema.org/${
            product.stockStatus === "in_stock"
              ? "InStock"
              : product.stockStatus === "on_order"
                ? "BackOrder"
                : "OutOfStock"
          }`,
          seller: { "@id": `${getSiteUrl()}/#store` },
        },
      },
      breadcrumbs(breadcrumbItems),
    ],
  };
}
