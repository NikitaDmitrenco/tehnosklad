import { ProductCard } from "@/components/catalog/product-card";
import type {
  CatalogProduct,
  PublicSiteSettings,
} from "@/features/catalog/types";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
import type { LeadSource } from "@/features/leads/types";

export function ProductGrid({
  products,
  locale,
  dictionary,
  settings,
  leadSource,
  columns = 3,
}: {
  products: CatalogProduct[];
  locale: Locale;
  dictionary: Dictionary;
  settings: PublicSiteSettings;
  leadSource: LeadSource;
  columns?: 3 | 4;
}) {
  const gridClasses =
    columns === 4
      ? "grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      : "grid gap-4 sm:grid-cols-2 xl:grid-cols-3";

  return (
    <div className={gridClasses}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          locale={locale}
          dictionary={dictionary}
          settings={settings}
          leadSource={leadSource}
        />
      ))}
    </div>
  );
}
