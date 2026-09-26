import Link from "next/link";

import { localizedPath, type Locale } from "@/i18n/config";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumbs({
  locale,
  home,
  items,
}: {
  locale: Locale;
  home: string;
  items: Array<string | BreadcrumbItem>;
}) {
  const normalizedItems: BreadcrumbItem[] = items.map((item) =>
    typeof item === "string" ? { label: item } : item,
  );

  return (
    <nav aria-label={home}>
      <ol className="flex flex-wrap items-center gap-2 text-sm text-stone-600">
        <li>
          <Link
            className="font-medium hover:text-stone-900 hover:underline transition-colors"
            href={localizedPath(locale)}
          >
            {home}
          </Link>
        </li>
        {normalizedItems.map((item, index) => {
          const isLast = index === normalizedItems.length - 1;
          return (
            <li
              className="flex items-center gap-2"
              key={`${item.label}-${index}`}
            >
              <span className="select-none text-stone-400" aria-hidden="true">
                /
              </span>
              {item.href && !isLast ? (
                <Link
                  className="font-medium hover:text-stone-900 hover:underline transition-colors"
                  href={item.href}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={isLast ? "font-semibold text-stone-900" : ""}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
