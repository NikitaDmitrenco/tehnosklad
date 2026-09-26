import Link from "next/link";

import type { Locale } from "@/i18n/config";
import { localizedPath } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

type PrimaryNavProps = {
  locale: Locale;
  dictionary: Dictionary;
  mobile?: boolean;
};

export function PrimaryNav({
  locale,
  dictionary,
  mobile = false,
}: PrimaryNavProps) {
  const links = [
    { href: localizedPath(locale), label: dictionary.navigation.home },
    {
      href: localizedPath(locale, "catalog"),
      label: dictionary.navigation.catalogMenu,
    },
    {
      href: localizedPath(locale, "contacts"),
      label: dictionary.navigation.contacts,
    },
  ];

  return (
    <nav aria-label={dictionary.navigationLabel}>
      <ul
        className={
          mobile
            ? "flex flex-col gap-1 py-3"
            : "ml-4 mr-5 hidden items-center gap-5 lg:flex"
        }
      >
        {links.map((link) => (
          <li key={link.href}>
            <Link className="nav-link" href={link.href}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
