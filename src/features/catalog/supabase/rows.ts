import type {
  AttributeDataType,
  PresentationKey,
  StockStatus,
} from "@/features/catalog/types";
import type { Locale } from "@/i18n/config";

export type DbCategoryTranslation = {
  locale: Locale;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  seo_title: string | null;
  seo_description: string | null;
};

export type DbCategoryRow = {
  id: string;
  presentation_key: PresentationKey;
  sort_order: number;
  image_storage_path?: string | null;
  image_public_url?: string | null;
  category_translations: DbCategoryTranslation[];
};

export type DbProductImageRow = {
  id: string;
  storage_path: string;
  public_url: string;
  sort_order: number;
  is_primary: boolean;
  product_image_translations: Array<{
    locale: Locale;
    alt_text: string;
  }>;
};

export type DbProductRow = {
  id: string;
  brand: string;
  model: string;
  sku: string;
  price_minor: number | string;
  old_price_minor: number | string | null;
  currency: string;
  availability: StockStatus;
  is_new: boolean;
  sort_order: number;
  categories: DbCategoryRow;
  product_translations: Array<{
    locale: Locale;
    name: string;
    slug: string;
    short_description: string;
    description: string;
    seo_title: string | null;
    seo_description: string | null;
  }>;
  product_images: DbProductImageRow[];
};

export type DbSpecificationRow = {
  id: string;
  product_id: string;
  ordinal: number;
  text_value_key: string | null;
  number_value: number | string | null;
  boolean_value: boolean | null;
  color_value: string | null;
  product_attribute_value_translations: Array<{
    locale: Locale;
    text_value: string;
  }>;
  products: { category_id: string };
  attributes: {
    code: string;
    data_type: AttributeDataType;
    is_filterable: boolean;
    sort_order: number;
    category_attributes: Array<{
      category_id: string;
      is_filterable: boolean | null;
      sort_order: number;
    }>;
    attribute_translations: Array<{
      locale: Locale;
      name: string;
      unit_label: string | null;
    }>;
    attribute_groups: {
      code: string;
      sort_order: number;
      attribute_group_translations: Array<{
        locale: Locale;
        name: string;
      }>;
    } | null;
  };
  attribute_options: {
    code: string;
    attribute_option_translations: Array<{
      locale: Locale;
      label: string;
    }>;
  } | null;
};

export type DbSiteSettingRow = { key: string; value: string };

export type DbCatalogSearchRow = {
  product_id: string | null;
  total_count: number | string;
};

// The document `public.get_public_catalog_facets` returns. Ordering of brands
// and of each attribute's options is left to the mapper, which sorts them the
// way the application always has, independent of database collation.
export type DbCatalogFacetsRow = {
  brands: string[];
  availability: StockStatus[];
  min_price_minor: number | null;
  max_price_minor: number | null;
  attributes: Array<{
    code: string;
    label: string;
    data_type: AttributeDataType;
    options: Array<{ value: string; label: string }>;
  }>;
};

// Sitemap reads: an id and the localized slugs, nothing else.
export type DbCategorySlugRow = {
  id: string;
  category_translations: Array<{ locale: Locale; slug: string }>;
};
export type DbProductSlugRow = {
  id: string;
  product_translations: Array<{ locale: Locale; slug: string }>;
};
