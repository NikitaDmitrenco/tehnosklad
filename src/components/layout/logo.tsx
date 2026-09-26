import Link from "next/link";

import type { Locale } from "@/i18n/config";
import { localizedPath } from "@/i18n/config";

export function Logo({
  locale,
  variant = "light",
}: {
  locale: Locale;
  variant?: "light" | "dark";
}) {
  const source =
    variant === "light" ? "/tehnosklad-logo.svg" : "/tehnosklad-logo-white.svg";

  return (
    <Link
      className="inline-flex min-h-11 shrink-0 items-center py-2"
      href={localizedPath(locale)}
      aria-label={locale === "ru" ? "Техносклад" : "Tehnosklad"}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt="Техносклад"
        className={variant === "light" ? "h-auto w-44" : "h-7 w-auto"}
        src={source}
      />
    </Link>
  );
}
