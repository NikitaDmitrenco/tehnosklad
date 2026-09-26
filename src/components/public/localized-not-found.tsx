"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getDictionary } from "@/i18n/get-dictionary";
import { isLocale, localizedPath, type Locale } from "@/i18n/config";
export function LocalizedNotFound() {
  const pathname = usePathname();
  const candidate = pathname.split("/")[1] ?? "";
  const locale: Locale = isLocale(candidate) ? candidate : "ru";
  const d = getDictionary(locale);
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <p className="text-sm font-bold text-stone-500">404</p>
      <h1 className="mt-3 text-4xl font-bold">{d.notFound.title}</h1>
      <p className="mt-3 text-stone-600">{d.notFound.text}</p>
      <Link className="button-primary mt-8" href={localizedPath(locale)}>
        {d.notFound.back}
      </Link>
    </div>
  );
}
