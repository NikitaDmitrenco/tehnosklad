"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CatalogCategory } from "@/features/catalog/types";
import { localizedPath, type Locale } from "@/i18n/config";

export function CategoryPillsCarousel({
  categories,
  locale,
  activeCategoryId,
  ariaLabel,
}: {
  categories: CatalogCategory[];
  locale: Locale;
  activeCategoryId?: string;
  ariaLabel?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [categories]);

  const scrollBy4 = (direction: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    const children = Array.from(el.children) as HTMLElement[];
    if (children.length === 0) return;

    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) return;

    const currentScroll = el.scrollLeft;

    if (direction === "right") {
      const firstVisibleIndex = children.findIndex(
        (child) => child.offsetLeft >= currentScroll - 8,
      );
      const baseIndex = firstVisibleIndex !== -1 ? firstVisibleIndex : 0;
      const targetIndex = baseIndex + 4;

      if (targetIndex >= children.length - 1) {
        el.scrollTo({ left: maxScroll, behavior: "smooth" });
      } else {
        const targetOffset = children[targetIndex].offsetLeft;
        el.scrollTo({
          left: Math.min(maxScroll, targetOffset),
          behavior: "smooth",
        });
      }
    } else {
      const firstVisibleIndex = children.findIndex(
        (child) => child.offsetLeft >= currentScroll - 8,
      );

      if (firstVisibleIndex <= 4 || firstVisibleIndex === -1) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        const targetIndex = Math.max(0, firstVisibleIndex - 4);
        if (targetIndex === 0) {
          el.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          const targetOffset = children[targetIndex].offsetLeft;
          el.scrollTo({
            left: Math.max(0, targetOffset),
            behavior: "smooth",
          });
        }
      }
    }
  };

  return (
    <nav aria-label={ariaLabel} className="mb-6 flex items-center gap-2">
      <button
        type="button"
        onClick={() => scrollBy4("left")}
        disabled={!canScrollLeft}
        aria-label="Назад"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-700 shadow-xs transition hover:bg-stone-100 hover:text-stone-950 disabled:pointer-events-none disabled:opacity-25 active:scale-95 cursor-pointer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          className="h-4 w-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 19.5 8.25 12l7.5-7.5"
          />
        </svg>
      </button>

      <div
        ref={scrollerRef}
        className="no-scrollbar relative flex flex-1 items-center gap-2 overflow-x-auto scroll-smooth py-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {categories.map((category) => {
          const isActive = category.id === activeCategoryId;
          return (
            <Link
              key={category.id}
              className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold transition shadow-2xs ${
                isActive
                  ? "border-stone-900 bg-stone-900 text-white hover:bg-stone-800"
                  : "border-stone-300 bg-white text-stone-800 hover:bg-stone-100 hover:border-stone-400"
              }`}
              href={localizedPath(locale, `category/${category.slug}`)}
            >
              {category.name}
            </Link>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => scrollBy4("right")}
        disabled={!canScrollRight}
        aria-label="Вперед"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-700 shadow-xs transition hover:bg-stone-100 hover:text-stone-950 disabled:pointer-events-none disabled:opacity-25 active:scale-95 cursor-pointer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          className="h-4 w-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m8.25 4.5 7.5 7.5-7.5 7.5"
          />
        </svg>
      </button>
    </nav>
  );
}
