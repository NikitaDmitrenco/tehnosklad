import "server-only";

import type { Metadata } from "next";

import type { Locale } from "@/i18n/config";

const ogLocales: Record<Locale, string> = { ru: "ru_MD", ro: "ro_MD" };

export function buildLocalizedMetadata({
  locale,
  title,
  description,
  currentPath,
  alternatePath,
  imagePath = `/${locale}/opengraph-image`,
  index = true,
  absoluteTitle = false,
}: {
  locale: Locale;
  title: string;
  description: string;
  currentPath: string;
  alternatePath: string;
  imagePath?: string;
  index?: boolean;
  absoluteTitle?: boolean;
}): Metadata {
  const alternateLocale: Locale = locale === "ru" ? "ro" : "ru";
  const ruPath = locale === "ru" ? currentPath : alternatePath;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: {
      canonical: currentPath,
      languages: {
        ru: ruPath,
        ro: locale === "ro" ? currentPath : alternatePath,
        "x-default": ruPath,
      },
    },
    robots: { index, follow: true },
    openGraph: {
      type: "website",
      title,
      description,
      url: currentPath,
      siteName: "Tehnosklad",
      locale: ogLocales[locale],
      alternateLocale: [ogLocales[alternateLocale]],
      images: [{ url: imagePath, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imagePath],
    },
  };
}
