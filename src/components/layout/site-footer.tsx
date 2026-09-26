import Link from "next/link";
import { Suspense } from "react";

import {
  LanguageSwitcher,
  LanguageSwitcherPending,
} from "@/components/i18n/language-switcher";
import { Logo } from "@/components/layout/logo";
import { PageContainer } from "@/components/layout/page-container";
import { siteConfig } from "@/config/site";
import type { PublicSiteSettings } from "@/features/catalog/types";
import type { Locale } from "@/i18n/config";
import { localizedPath } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

export function SiteFooter({
  locale,
  dictionary,
  settings,
  alternateHref,
  alternateFor,
}: {
  locale: Locale;
  dictionary: Dictionary;
  settings: PublicSiteSettings;
  alternateHref?: string;
  alternateFor?: string;
}) {
  return (
    <footer className="mt-auto border-t border-stone-200 bg-stone-950 text-white">
      <PageContainer className="grid gap-8 py-10 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo locale={locale} variant="dark" />
          <p className="text-sm text-stone-300">
            {dictionary.footer.description}
          </p>
          <p className="text-sm text-stone-300">{settings.address}</p>
          <a
            className="inline-flex min-h-[1.875rem] items-center font-bold"
            href={settings.phoneHref}
          >
            {settings.phoneDisplay}
          </a>
        </div>
        <div>
          <h2 className="mb-3 font-bold">{dictionary.footer.schedule}</h2>
          <p className="text-sm text-stone-300">
            {settings.openDays}: {settings.openTime}
          </p>
          <p className="text-sm text-stone-300">{settings.closedDay}</p>
        </div>
        <div>
          <h2 className="mb-3 font-bold">{dictionary.footer.catalog}</h2>
          <Link
            className="text-sm text-stone-300 hover:text-white"
            href={localizedPath(locale, "catalog")}
          >
            {dictionary.navigation.catalog}
          </Link>
        </div>
        <div>
          <h2 className="mb-3 font-bold">{dictionary.footer.legal}</h2>
          <ul className="space-y-2 text-sm text-stone-300">
            <li>
              <Link href={localizedPath(locale, "privacy")}>
                {dictionary.footer.privacy}
              </Link>
            </li>
            <li>
              <Link href={localizedPath(locale, "personal-data")}>
                {dictionary.footer.personalData}
              </Link>
            </li>
          </ul>
          <div className="mt-5 text-black">
            <Suspense
              fallback={
                <LanguageSwitcherPending
                  currentLocale={locale}
                  label={dictionary.languageSwitcherLabel}
                  alternateHref={alternateHref}
                  alternateFor={alternateFor}
                />
              }
            >
              <LanguageSwitcher
                currentLocale={locale}
                label={dictionary.languageSwitcherLabel}
                alternateHref={alternateHref}
                alternateFor={alternateFor}
              />
            </Suspense>
          </div>
        </div>
      </PageContainer>
      <div className="border-t border-stone-800">
        <PageContainer className="grid gap-2 py-4 text-center text-sm text-stone-400 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:text-left">
          <span className="sm:justify-self-start">
            © {new Date().getFullYear()} {siteConfig.name}.{" "}
            {dictionary.footer.rights}
          </span>
          <span
            className="justify-self-center text-center sm:col-start-2"
            data-testid="osmi-signature"
          >
            {dictionary.footer.developedBy}{" "}
            <a
              aria-label={dictionary.footer.osmiLinkLabel}
              className="inline-flex min-h-[1.875rem] items-center font-bold text-stone-200 underline decoration-stone-500 underline-offset-4 hover:text-white"
              href="https://osmi-topaz.vercel.app"
              rel="noopener noreferrer"
              target="_blank"
            >
              OSMI
            </a>
          </span>
        </PageContainer>
      </div>
    </footer>
  );
}
