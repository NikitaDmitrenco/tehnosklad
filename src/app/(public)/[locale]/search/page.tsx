import { permanentRedirect } from "next/navigation";
import { isLocale, localizedPath } from "@/i18n/config";
import {
  catalogQueryHref,
  parseCatalogSearchParams,
  type RawCatalogSearchParams,
} from "@/features/catalog/query";
export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<RawCatalogSearchParams>;
}) {
  const { locale } = await params;
  const targetLocale = isLocale(locale) ? locale : "ru";
  permanentRedirect(
    catalogQueryHref(
      localizedPath(targetLocale, "catalog"),
      parseCatalogSearchParams(await searchParams),
    ),
  );
}
