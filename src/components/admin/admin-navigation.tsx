"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const items = [
  ["/admin", "Обзор", "⌂"],
  ["/admin/categories", "Категории", "▦"],
  ["/admin/attribute-groups", "Группы характеристик", "▤"],
  ["/admin/attributes", "Характеристики", "⚙"],
  ["/admin/products", "Товары", "□"],
  ["/admin/leads", "Заявки", "✉"],
  ["/admin/assistant-knowledge", "База знаний помощника", "✦"],
  ["/admin/assistant-logs", "Статистика помощника", "◔"],
  ["/admin/settings", "Публичные настройки", "☷"],
  ["/admin/media/orphans", "Проверка файлов", "⌕"],
] as const;

export function AdminNavigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);
  return (
    <>
      <button
        aria-expanded={open}
        aria-label="Открыть навигацию"
        className="icon-button lg:!hidden"
        onClick={() => setOpen(true)}
        type="button"
      >
        ☰
      </button>
      {open ? (
        <button
          aria-label="Закрыть навигацию"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
          type="button"
        />
      ) : null}
      <aside className={`admin-sidebar ${open ? "admin-sidebar--open" : ""}`}>
        <div className="flex items-center justify-between gap-3 px-3 pb-4 lg:hidden">
          <Link
            aria-label="Техносклад Админ"
            href="/admin"
            onClick={() => setOpen(false)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Техносклад"
              className="h-7 w-auto"
              src="/tehnosklad-logo-white.svg"
            />
          </Link>
          <button
            aria-label="Закрыть навигацию"
            className="icon-button"
            onClick={() => setOpen(false)}
            ref={closeButtonRef}
            type="button"
          >
            ×
          </button>
        </div>
        <nav aria-label="Административная навигация" className="space-y-1">
          {items.map(([href, label, icon]) => {
            const active =
              href === "/admin" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`admin-nav-link ${active ? "admin-nav-link--active" : ""}`}
                href={href}
                key={href}
                onClick={() => setOpen(false)}
              >
                <span aria-hidden="true">{icon}</span>
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
