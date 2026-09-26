"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { locales, type Locale, pathForLocale } from "@/i18n/config";

const languageNames: Record<Locale, string> = {
  ru: "RU",
  ro: "RO",
};

const languageFullNames: Record<Locale, string> = {
  ru: "Русский",
  ro: "Română",
};

export type LanguageSwitcherProps = {
  currentLocale: Locale;
  label: string;
  /** Localized twin of the current page, when its slug differs per locale. */
  alternateHref?: string;
  /** Pathname `alternateHref` was resolved for; guards against stale layouts. */
  alternateFor?: string;
};

function decodePath(pathname: string): string {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

function samePathname(left: string, right: string): boolean {
  return decodePath(left) === decodePath(right);
}

// The layout resolves `alternateHref` from the request pathname, but it is a
// shared segment that a client-side navigation may keep mounted. Trusting it
// only while it still describes the page being viewed keeps the switcher from
// sending visitors to whichever product or category they opened earlier.
function LanguageSwitcherLinks({
  currentLocale,
  label,
  alternateHref,
  alternateFor,
  search,
}: LanguageSwitcherProps & { search: string }) {
  const pathname = usePathname();
  const alternateApplies = Boolean(
    alternateHref && alternateFor && samePathname(alternateFor, pathname),
  );

  return (
    <nav aria-label={label}>
      <ul className="flex h-9 w-fit items-center rounded-[100vmax] border border-stone-300 bg-white p-0.5 shadow-sm">
        {locales.map((locale) => {
          const isCurrent = locale === currentLocale;
          const target =
            !isCurrent && alternateApplies
              ? alternateHref!
              : pathForLocale(pathname, locale);

          return (
            <li key={locale}>
              <Link
                aria-current={isCurrent ? "page" : undefined}
                aria-label={`${label}: ${languageFullNames[locale]}`}
                className={`relative flex size-8 items-center justify-center rounded-[100vmax] border text-xs font-black transition-colors focus-visible:z-10 ${
                  isCurrent
                    ? "border-stone-950 bg-stone-950 text-white shadow-sm"
                    : "border-transparent bg-white text-stone-950"
                }`}
                href={`${target}${search}`}
                hrefLang={locale}
                lang={locale}
                scroll={false}
              >
                {languageNames[locale]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function LanguageSwitcher(props: LanguageSwitcherProps) {
  const searchParams = useSearchParams();

  return (
    <LanguageSwitcherLinks
      {...props}
      search={searchParams.size ? `?${searchParams.toString()}` : ""}
    />
  );
}

// Rendered while `useSearchParams` suspends. It keeps the visitor on the page
// they are reading; only the query string is missing for that instant.
export function LanguageSwitcherPending(props: LanguageSwitcherProps) {
  return <LanguageSwitcherLinks {...props} search="" />;
}
