import "server-only";

import { revalidateTag } from "next/cache";

export const catalogCacheTags = {
  catalog: "catalog",
  categories: "categories",
  products: "products",
  settings: "site-settings",
} as const;

export type CatalogMutationScope =
  "category" | "product" | "attribute" | "settings";

const scopeTags: Record<CatalogMutationScope, string[]> = {
  category: [
    catalogCacheTags.catalog,
    catalogCacheTags.categories,
    catalogCacheTags.products,
  ],
  product: [catalogCacheTags.catalog, catalogCacheTags.products],
  attribute: [
    catalogCacheTags.catalog,
    catalogCacheTags.categories,
    catalogCacheTags.products,
  ],
  settings: [catalogCacheTags.settings],
};

export function revalidateCatalogAfterMutation(scope: CatalogMutationScope) {
  for (const tag of scopeTags[scope]) revalidateTag(tag, { expire: 0 });
}
