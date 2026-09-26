import { formatRunSku, formatRunSlug } from "../../fixtures/run-id";

export interface ProductPayload {
  categoryId: string;
  brand: string;
  model: string;
  sku: string;
  price: string;
  oldPrice?: string;
  currency: string;
  availability: "in_stock" | "out_of_stock" | "on_order";
  sortOrder: number;
  isPublished?: boolean;
  nameRu: string;
  nameRo: string;
  slugRu: string;
  slugRo: string;
}

export function buildProductData(
  runId: string,
  categoryId: string,
  overrides?: Partial<ProductPayload>,
): ProductPayload {
  return {
    categoryId,
    brand: "TestBrand",
    model: `Model-${runId}`,
    sku: formatRunSku(runId),
    price: "1299.00",
    oldPrice: "1499.00",
    currency: "MDL",
    availability: "in_stock",
    sortOrder: 10,
    isPublished: false,
    nameRu: `Тест Товар ${runId}`,
    nameRo: `Test Produs ${runId}`,
    slugRu: formatRunSlug("prod", runId, "ru"),
    slugRo: formatRunSlug("prod", runId, "ro"),
    ...overrides,
  };
}
