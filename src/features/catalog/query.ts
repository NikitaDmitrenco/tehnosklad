import type {
  CatalogSearchQuery,
  CatalogSort,
  StockStatus,
} from "@/features/catalog/types";

export const CATALOG_PAGE_SIZE = 9;

export type RawCatalogSearchParams = Record<
  string,
  string | string[] | undefined
>;

export type CatalogUrlState = {
  query: string;
  brand: string;
  availability: "" | StockStatus;
  minPrice: string;
  maxPrice: string;
  attributes: Record<string, string>;
  sort: CatalogSort;
  page: number;
};

const sorts = new Set<CatalogSort>([
  "popular",
  "new",
  "price_asc",
  "price_desc",
  "name",
]);
const availabilityValues = new Set<StockStatus>([
  "in_stock",
  "on_order",
  "out_of_stock",
]);
const attributePattern = /^attr_([a-z][a-z0-9_]*)$/;

function single(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function normalizedText(value: string, maxLength: number): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function normalizedPrice(value: string): string {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(normalized)) return "";
  const [wholeRaw, fractionRaw = ""] = normalized.split(".");
  const whole = wholeRaw!.replace(/^0+(?=\d)/, "");
  const fraction = fractionRaw.replace(/0+$/, "");
  const minor = Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
  if (!Number.isSafeInteger(minor)) return "";
  return fraction ? `${whole}.${fraction}` : whole;
}

function priceMinor(value: string): number | null {
  if (!value) return null;
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
}

export function parseCatalogSearchParams(
  raw: RawCatalogSearchParams,
): CatalogUrlState {
  const attributes: Record<string, string> = {};
  for (const [key, rawValue] of Object.entries(raw)) {
    const code = key.match(attributePattern)?.[1];
    const value = normalizedText(single(rawValue), 160);
    if (code && value && Object.keys(attributes).length < 20) {
      attributes[code] = value;
    }
  }
  let minPrice = normalizedPrice(single(raw.price_min));
  let maxPrice = normalizedPrice(single(raw.price_max));
  if (
    minPrice &&
    maxPrice &&
    (priceMinor(minPrice) ?? 0) > (priceMinor(maxPrice) ?? 0)
  ) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }
  const availability = single(raw.availability) as StockStatus;
  const sort = single(raw.sort) as CatalogSort;
  const pageValue = single(raw.page);
  const parsedPage = /^\d{1,5}$/.test(pageValue) ? Number(pageValue) : 1;
  return {
    query: normalizedText(single(raw.q), 100),
    brand: normalizedText(single(raw.brand), 120),
    availability: availabilityValues.has(availability) ? availability : "",
    minPrice,
    maxPrice,
    attributes: Object.fromEntries(
      Object.entries(attributes).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
    sort: sorts.has(sort) ? sort : "popular",
    page: parsedPage >= 1 && parsedPage <= 10_000 ? parsedPage : 1,
  };
}

export function serializeCatalogSearchParams(
  state: CatalogUrlState,
): URLSearchParams {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  if (state.brand) params.set("brand", state.brand);
  if (state.availability) params.set("availability", state.availability);
  if (state.minPrice) params.set("price_min", state.minPrice);
  if (state.maxPrice) params.set("price_max", state.maxPrice);
  for (const [code, value] of Object.entries(state.attributes).sort()) {
    if (value) params.set(`attr_${code}`, value);
  }
  if (state.sort !== "popular") params.set("sort", state.sort);
  if (state.page > 1) params.set("page", String(state.page));
  return params;
}

export function isCanonicalCatalogSearchParams(
  raw: RawCatalogSearchParams,
  state: CatalogUrlState,
): boolean {
  const actual = new URLSearchParams();
  for (const [key, value] of Object.entries(raw).sort()) {
    if (typeof value === "string") actual.append(key, value);
    else if (value) value.forEach((item) => actual.append(key, item));
  }
  actual.sort();
  const canonical = serializeCatalogSearchParams(state);
  canonical.sort();
  return actual.toString() === canonical.toString();
}

export function toCatalogSearchQuery(
  state: CatalogUrlState,
): CatalogSearchQuery {
  return {
    query: state.query,
    brand: state.brand || null,
    availability: state.availability || null,
    minPriceMinor: priceMinor(state.minPrice),
    maxPriceMinor: priceMinor(state.maxPrice),
    attributes: state.attributes,
    sort: state.sort,
    page: state.page,
    pageSize: CATALOG_PAGE_SIZE,
  };
}

export function catalogQueryHref(
  path: string,
  state: CatalogUrlState,
  page = state.page,
): string {
  const params = serializeCatalogSearchParams({ ...state, page });
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function hasCatalogFilters(state: CatalogUrlState): boolean {
  return Boolean(
    state.query ||
    state.brand ||
    state.availability ||
    state.minPrice ||
    state.maxPrice ||
    Object.keys(state.attributes).length ||
    state.sort !== "popular",
  );
}
