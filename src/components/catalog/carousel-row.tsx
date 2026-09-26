"use client";

import React, { useRef, useState, useEffect, type ReactNode } from "react";

export function CarouselSection({
  header,
  action,
  children,
  className = "",
}: {
  header: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(true);
  const isAdjustingRef = useRef(false);

  const checkScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const singleSetWidth = el.scrollWidth / 3;
    setHasOverflow(singleSetWidth > el.clientWidth + 4);
  };

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const singleSetWidth = el.scrollWidth / 3;
    if (
      singleSetWidth > 0 &&
      (el.scrollLeft < singleSetWidth / 2 || el.scrollLeft === 0)
    ) {
      el.scrollLeft = singleSetWidth;
    }

    checkScroll();

    const handleScroll = () => {
      if (isAdjustingRef.current) return;
      const W = el.scrollWidth / 3;
      if (W <= 0) return;

      if (el.scrollLeft >= 2 * W - 10) {
        isAdjustingRef.current = true;
        el.scrollLeft = el.scrollLeft - W;
        requestAnimationFrame(() => {
          isAdjustingRef.current = false;
        });
      } else if (el.scrollLeft <= W - 10) {
        isAdjustingRef.current = true;
        el.scrollLeft = el.scrollLeft + W;
        requestAnimationFrame(() => {
          isAdjustingRef.current = false;
        });
      }
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [children]);

  const scrollByCard = (direction: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    const firstChild = el.firstElementChild as HTMLElement | null;
    if (!firstChild) return;

    const cardWidth = firstChild.offsetWidth + 16;
    if (cardWidth <= 0) return;

    const currentIndex = Math.round(el.scrollLeft / cardWidth);
    const targetIndex =
      direction === "right" ? currentIndex + 1 : currentIndex - 1;
    const targetLeft = targetIndex * cardWidth;

    el.scrollTo({ left: targetLeft, behavior: "smooth" });
  };

  const childArray = React.Children.toArray(children);

  return (
    <div className={className}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>{header}</div>
        <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-4">
          {action}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => scrollByCard("left")}
              disabled={!hasOverflow}
              aria-label="Назад"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-700 shadow-sm transition hover:bg-stone-100 hover:text-stone-950 disabled:pointer-events-none disabled:opacity-30 active:scale-95 cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5 8.25 12l7.5-7.5"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => scrollByCard("right")}
              disabled={!hasOverflow}
              aria-label="Вперед"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-700 shadow-sm transition hover:bg-stone-100 hover:text-stone-950 disabled:pointer-events-none disabled:opacity-30 active:scale-95 cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m8.25 4.5 7.5 7.5-7.5 7.5"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="no-scrollbar mt-7 flex gap-4 overflow-x-auto pb-2 pt-1 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {[0, 1, 2].map((setIndex) =>
          childArray.map((child, i) => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child, {
                key: `set-${setIndex}-${child.key ?? i}`,
              });
            }
            return child;
          }),
        )}
      </div>
    </div>
  );
}

export const CarouselRow = CarouselSection;
