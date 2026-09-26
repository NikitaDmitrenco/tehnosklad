"use client";

import {
  Suspense,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import {
  LanguageSwitcher,
  LanguageSwitcherPending,
} from "@/components/i18n/language-switcher";
import { PrimaryNav } from "@/components/layout/primary-nav";
import type { PublicSiteSettings } from "@/features/catalog/types";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

const emptySubscribe = () => () => {};

export function MobileMenu({
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
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(false);
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLElement>(null);

  const openMenu = () => {
    setOpen(true);
    // Short timeout to guarantee CSS transition plays smoothly without frame drops
    setTimeout(() => {
      setActive(true);
    }, 20);
  };

  const close = () => {
    setActive(false);
    setTimeout(() => {
      setOpen(false);
      trigger.current?.focus({ preventScroll: true });
    }, 300);
  };

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus close button smoothly without auto-scroll jumps
    const focusTimer = setTimeout(() => {
      dialog.current
        ?.querySelector<HTMLElement>("button")
        ?.focus({ preventScroll: true });
    }, 320);

    const esc = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "Tab" && dialog.current) {
        const nodes = Array.from(
          dialog.current.querySelectorAll<HTMLElement>(
            "button:not([disabled]), a[href], input:not([disabled])",
          ),
        );
        const first = nodes[0];
        const last = nodes.at(-1);
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", esc);

    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  // Touch swipe handling to close on swipe left or right
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - touchStartX.current;
    const deltaY = endY - touchStartY.current;

    // Detect horizontal swipe (left or right)
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      close();
    }
  };

  const drawerModal =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[100] flex justify-end lg:hidden overflow-hidden">
            {/* Backdrop */}
            <div
              className={`fixed inset-0 bg-black/40 transition-opacity duration-300 ${
                active ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
              aria-hidden="true"
            />
            <aside
              ref={dialog}
              role="dialog"
              aria-modal="true"
              aria-label={dictionary.navigationLabel}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              style={{
                transform: active
                  ? "translate3d(0, 0, 0)"
                  : "translate3d(100%, 0, 0)",
                transition: "transform 0.3s cubic-bezier(0.2, 0.9, 0.3, 1)",
              }}
              className="safe-bottom relative z-10 flex h-dvh w-[min(22rem,92vw)] flex-col overflow-y-auto bg-white p-5 pt-[max(1.25rem,env(safe-area-inset-top))] shadow-2xl will-change-transform"
            >
              <div className="flex items-center justify-between">
                <strong>{dictionary.navigationLabel}</strong>
                <button
                  aria-label={dictionary.actions.close}
                  className="icon-button"
                  type="button"
                  onClick={close}
                >
                  ×
                </button>
              </div>
              <div onClick={close}>
                <PrimaryNav locale={locale} dictionary={dictionary} mobile />
              </div>
              <a
                className="button-primary mt-5 gap-1.5"
                href={settings.phoneHref}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                {dictionary.actions.call}: {settings.phoneDisplay}
              </a>
            </aside>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="flex items-center gap-1.5 lg:hidden">
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
        <a
          aria-label={dictionary.actions.call}
          className="icon-button h-9 w-9 min-h-9"
          href={settings.phoneHref}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </a>
        <button
          ref={trigger}
          aria-expanded={open}
          aria-label={dictionary.actions.menu}
          className="icon-button h-9 w-9 min-h-9"
          type="button"
          onClick={openMenu}
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
            aria-hidden="true"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>
      {drawerModal}
    </>
  );
}
