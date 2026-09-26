import type { Locale } from "@/i18n/config";

export type LocalizedText = Record<Locale, string>;
export type StockStatus = "in_stock" | "out_of_stock" | "on_order";
export type PresentationKey = "fridge" | "stove" | "vacuum" | "generic";
export type ImageTone = "yellow" | "blue" | "mint" | "coral";
export type AttributeDataType =
  "text" | "number" | "boolean" | "single_select" | "multi_select" | "color";

export type CatalogCategory = {
  id: string;
  slug: string;
  alternateSlug: string;
  presentationKey: PresentationKey;
  name: string;
  shortDescription: string;
  description: string;
  seoTitle: string | null;
  seoDescription: string | null;
  imageUrl?: string | null;
};

export type ProductImage = {
  id: string;
  url: string;
  storagePath: string;
  alt: string;
  isPrimary: boolean;
};

export type ProductSpecification = {
  code: string;
  groupCode: string | null;
  groupName: string | null;
  label: string;
  displayValue: string;
  filterValue: string;
  dataType: AttributeDataType;
  isFilterable: boolean;
  sortOrder: number;
};

export type CatalogProduct = {
  id: string;
  slug: string;
  alternateSlug: string;
  category: CatalogCategory;
  brand: string;
  model: string;
  sku: string;
  name: string;
  shortDescription: string;
  description: string;
  seoTitle: string | null;
  seoDescription: string | null;
  priceMinor: number;
  oldPriceMinor: number | null;
  currency: "MDL";
  stockStatus: StockStatus;
  isNew: boolean;
  specifications: ProductSpecification[];
  images: ProductImage[];
  imageTone: ImageTone;
};

export type CatalogFilterOption = { value: string; label: string };
export type CatalogAttributeFilter = {
  code: string;
  label: string;
  dataType: AttributeDataType;
  options: CatalogFilterOption[];
};
export type CatalogFacets = {
  brands: string[];
  availability: StockStatus[];
  minPriceMinor: number | null;
  maxPriceMinor: number | null;
  attributes: CatalogAttributeFilter[];
};

// The sitemap needs an id and both slugs and nothing else, so it reads this
// instead of whole products: a full catalog load for a list of URLs outgrew
// the data cache and was re-read from the database on every crawl.
export type CatalogSitemapEntry = {
  id: string;
  slugs: Record<Locale, string>;
};
export type CatalogSitemapEntries = {
  categories: CatalogSitemapEntry[];
  products: CatalogSitemapEntry[];
};

export type PublicSiteSettings = {
  phoneDisplay: string;
  phoneHref: string;
  address: string;
  openDays: string;
  openTime: string;
  closedDay: string;
  contactText: string;
};

export type CatalogFilters = {
  query: string;
  categoryId: string;
  brand: string;
  availability: "all" | StockStatus;
  minPrice: string;
  maxPrice: string;
  attributes: Record<string, string>;
  sort: "popular" | "new" | "price_asc" | "price_desc" | "name";
};

export type CatalogSort = CatalogFilters["sort"];

export type CatalogSearchQuery = {
  query: string;
  brand: string | null;
  availability: StockStatus | null;
  minPriceMinor: number | null;
  maxPriceMinor: number | null;
  attributes: Readonly<Record<string, string>>;
  sort: CatalogSort;
  page: number;
  pageSize: number;
};

export type CatalogSearchResult = {
  products: CatalogProduct[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

// Raw localized fixtures are kept separate from production DTOs.
export type DemoCategory = {
  id: string;
  slug: string;
  icon: PresentationKey;
  name: LocalizedText;
  description: LocalizedText;
  imageUrl?: string;
};
export type DemoProductSpecification = {
  label: LocalizedText;
  value: LocalizedText;
};
export type DemoProduct = {
  id: string;
  slug: string;
  categoryId: string;
  brand: string;
  model: string;
  sku: string;
  name: LocalizedText;
  shortDescription: LocalizedText;
  description: LocalizedText;
  priceMinor: number;
  oldPriceMinor?: number;
  stockStatus: StockStatus;
  isNew: boolean;
  specifications: DemoProductSpecification[];
  imageTone: ImageTone;
};
