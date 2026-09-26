import { Suspense } from "react";

import {
  LanguageSwitcher,
  LanguageSwitcherPending,
} from "@/components/i18n/language-switcher";
import { Logo } from "@/components/layout/logo";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { PageContainer } from "@/components/layout/page-container";
import { PrimaryNav } from "@/components/layout/primary-nav";
import type { PublicSiteSettings } from "@/features/catalog/types";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

export function SiteHeader({
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
    <header className="site-header" data-testid="site-header">
      <PageContainer className="flex min-h-20 items-center gap-5 py-3">
        <Logo locale={locale} />
        <PrimaryNav locale={locale} dictionary={dictionary} />
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden lg:block">
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
          <a
            className="hidden min-h-9 items-center gap-1.5 rounded-[100vmax] bg-[var(--brand)] px-4 font-bold text-black hover:bg-[var(--brand-strong)] lg:inline-flex"
            href={settings.phoneHref}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            {dictionary.actions.call}
            <span className="text-black">{settings.phoneDisplay}</span>
          </a>
          <MobileMenu
            locale={locale}
            dictionary={dictionary}
            settings={settings}
            alternateHref={alternateHref}
            alternateFor={alternateFor}
          />
        </div>
      </PageContainer>
    </header>
  );
}
