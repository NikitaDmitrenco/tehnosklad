import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import "@/app/globals.css";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { AssistantLauncher } from "@/components/public/assistant-launcher";
import type { AssistantPageContext } from "@/components/public/assistant-widget";
import {
  getCategoryBySlug,
  getProductBySlug,
  getPublicSiteSettings,
} from "@/features/catalog/data";
import { getDictionary } from "@/i18n/get-dictionary";
import { isLocale } from "@/i18n/config";
import { getSiteUrl } from "@/lib/env/public";

// The public shell is request-rendered; catalog queries have locale-aware
// five-minute data-cache entries below the UI boundary.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const description =
    locale === "ru"
      ? "Магазин бытовой техники Tehnosklad в Комрате."
      : "Magazinul de electrocasnice Tehnosklad din Comrat.";
  return {
    metadataBase: new URL(getSiteUrl()),
    applicationName: "Tehnosklad",
    title: {
      default:
        locale === "ru"
          ? "Tehnosklad — бытовая техника в Комрате"
          : "Tehnosklad — electrocasnice în Comrat",
      template: "%s | Tehnosklad",
    },
    description,
    icons: {
      icon: [
        { url: "/icon.svg", type: "image/svg+xml" },
        { url: "/favicon.ico", sizes: "any" },
        { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      ],
      apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    },
  };
}

type CurrentPage = {
  alternateHref?: string;
  assistantContext?: AssistantPageContext;
};

// Resolves the localized twin of the current page and, for product and
// category pages, the entity the assistant should treat as page context.
async function currentPageFor(
  locale: "ru" | "ro",
  pathname: string,
): Promise<CurrentPage> {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length !== 3 || segments[0] !== locale) return {};
  const targetLocale = locale === "ru" ? "ro" : "ru";
  let slug: string;
  try {
    slug = decodeURIComponent(segments[2]!);
  } catch {
    return {};
  }
  if (segments[1] === "category") {
    const category = await getCategoryBySlug(locale, slug);
    return category
      ? {
          alternateHref: `/${targetLocale}/category/${category.alternateSlug}`,
          assistantContext: { type: "category", id: category.id },
        }
      : {};
  }
  if (segments[1] === "product") {
    const product = await getProductBySlug(locale, slug);
    return product
      ? {
          alternateHref: `/${targetLocale}/product/${product.alternateSlug}`,
          assistantContext: { type: "product", id: product.id },
        }
      : {};
  }
  return {};
}

export default async function PublicLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const dictionary = getDictionary(locale);
  const pathname =
    (await headers()).get("x-tehnosklad-pathname") ?? `/${locale}`;
  const [settings, currentPage] = await Promise.all([
    getPublicSiteSettings(locale),
    currentPageFor(locale, pathname),
  ]);
  const alternateHref = currentPage.alternateHref;

  return (
    <html data-scroll-behavior="smooth" lang={locale}>
      <body className="flex min-h-dvh flex-col">
        <a className="skip-link" href="#main-content">
          {dictionary.skipToContent}
        </a>
        <SiteHeader
          locale={locale}
          dictionary={dictionary}
          settings={settings}
          alternateHref={alternateHref}
          alternateFor={pathname}
        />
        <main id="main-content" className="min-w-0 flex-1" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter
          locale={locale}
          dictionary={dictionary}
          settings={settings}
          alternateHref={alternateHref}
          alternateFor={pathname}
        />
        <AssistantLauncher
          locale={locale}
          dictionary={dictionary}
          settings={settings}
          page={currentPage.assistantContext}
        />
      </body>
    </html>
  );
}
