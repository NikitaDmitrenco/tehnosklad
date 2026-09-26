export const locales = ["ru", "ro"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ru";

export function isLocale(value: string): value is Locale {
  return locales.some((locale) => locale === value);
}

export function localizedPath(locale: Locale, path = ""): string {
  const normalizedPath = path === "/" ? "" : path.replace(/^\//, "");
  return `/${locale}${normalizedPath ? `/${normalizedPath}` : ""}`;
}

// Rewrites the locale segment of an already localized pathname, so the
// language switcher can stay on the page the visitor is reading.
export function pathForLocale(pathname: string, locale: Locale): string {
  const segments = pathname.split("/");

  if (segments.length > 1 && segments[1] && isLocale(segments[1])) {
    segments[1] = locale;
    return segments.join("/") || `/${locale}`;
  }

  return `/${locale}`;
}
