import { defaultLocale, isLocale, type Locale } from "@/i18n/config";

export const LOCALE_COOKIE = "ts_locale";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function localeCookieOptions() {
  return {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

// Parses an Accept-Language header into the locales this site serves, ordered
// by the quality value the browser sent. Unknown tags and malformed entries are
// skipped rather than rejecting the whole header.
function acceptedLocales(header: string): Locale[] {
  return header
    .split(",")
    .map((entry) => {
      const [tag, ...parameters] = entry.trim().split(";");
      const quality = parameters
        .map((parameter) => parameter.trim())
        .find((parameter) => parameter.startsWith("q="))
        ?.slice(2);
      const weight = quality === undefined ? 1 : Number.parseFloat(quality);
      return {
        language: tag?.trim().toLowerCase().split("-")[0] ?? "",
        weight: Number.isFinite(weight) ? weight : 0,
      };
    })
    .filter((entry) => entry.weight > 0 && isLocale(entry.language))
    .sort((left, right) => right.weight - left.weight)
    .map((entry) => entry.language as Locale);
}

// Locale for the locale-less entry route only. A saved preference wins, then
// the browser's languages, then the default. Locale-prefixed URLs never consult
// this — their own prefix decides.
export function resolveEntryLocale(
  savedLocale: string | undefined,
  acceptLanguage: string | null | undefined,
): Locale {
  if (savedLocale && isLocale(savedLocale)) return savedLocale;
  if (acceptLanguage) {
    const [preferred] = acceptedLocales(acceptLanguage);
    if (preferred) return preferred;
  }
  return defaultLocale;
}
