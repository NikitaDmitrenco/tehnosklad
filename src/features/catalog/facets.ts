import type {
  CatalogAttributeFilter,
  CatalogFacets,
  CatalogProduct,
  StockStatus,
} from "@/features/catalog/types";

export function buildCatalogFacets(products: CatalogProduct[]): CatalogFacets {
  const brands = [...new Set(products.map((product) => product.brand))].sort();
  const availability = [
    ...new Set(products.map((product) => product.stockStatus)),
  ].sort() as StockStatus[];
  const prices = products.map((product) => product.priceMinor);
  const attributes = new Map<string, CatalogAttributeFilter>();

  for (const product of products) {
    for (const specification of product.specifications) {
      if (!specification.isFilterable) continue;
      const current = attributes.get(specification.code) ?? {
        code: specification.code,
        label: specification.label,
        dataType: specification.dataType,
        options: [],
      };
      if (
        !current.options.some(
          (option) => option.value === specification.filterValue,
        )
      ) {
        current.options.push({
          value: specification.filterValue,
          label: specification.displayValue,
        });
      }
      attributes.set(specification.code, current);
    }
  }

  return {
    brands,
    availability,
    minPriceMinor: prices.length ? Math.min(...prices) : null,
    maxPriceMinor: prices.length ? Math.max(...prices) : null,
    attributes: [...attributes.values()].map((attribute) => ({
      ...attribute,
      options: attribute.options.toSorted((a, b) =>
        a.label.localeCompare(b.label),
      ),
    })),
  };
}
