import type { MetadataRoute } from "next";

import { getSitemapEntries } from "@/features/catalog/data";
import type { Locale } from "@/i18n/config";
import { getSiteUrl } from "@/lib/env/public";

export const dynamic = "force-dynamic";

const locales: Locale[] = ["ru", "ro"];

function localizedAlternates(paths: Record<Locale, string>, origin: string) {
  return {
    languages: {
      ru: new URL(paths.ru, origin).toString(),
      ro: new URL(paths.ro, origin).toString(),
      "x-default": new URL(paths.ru, origin).toString(),
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getSiteUrl();
  // Reads ids and slugs only: a URL list never needed descriptions, images or
  // attribute values, and loading them made this route re-read the whole
  // catalog on every crawl once the cached result outgrew 2 MB.
  const { categories, products } = await getSitemapEntries();

  const entries: MetadataRoute.Sitemap = [];
  for (const path of ["", "/catalog", "/contacts"]) {
    const paths = { ru: `/ru${path}`, ro: `/ro${path}` };
    for (const locale of locales) {
      entries.push({
        url: new URL(paths[locale], origin).toString(),
        changeFrequency: path === "" ? "weekly" : "daily",
        priority: path === "" ? 1 : path === "/catalog" ? 0.9 : 0.6,
        alternates: localizedAlternates(paths, origin),
      });
    }
  }

  for (const category of categories) {
    const paths = {
      ru: `/ru/category/${category.slugs.ru}`,
      ro: `/ro/category/${category.slugs.ro}`,
    };
    for (const locale of locales) {
      entries.push({
        url: new URL(paths[locale], origin).toString(),
        changeFrequency: "weekly",
        priority: 0.8,
        alternates: localizedAlternates(paths, origin),
      });
    }
  }

  for (const product of products) {
    const paths = {
      ru: `/ru/product/${product.slugs.ru}`,
      ro: `/ro/product/${product.slugs.ro}`,
    };
    for (const locale of locales) {
      entries.push({
        url: new URL(paths[locale], origin).toString(),
        changeFrequency: "weekly",
        priority: 0.7,
        alternates: localizedAlternates(paths, origin),
      });
    }
  }

  return entries;
}
