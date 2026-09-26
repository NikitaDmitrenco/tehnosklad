"use client";
import { useRef, useState } from "react";
import { ContactDialog } from "@/components/public/contact-dialog";
import type { PublicSiteSettings } from "@/features/catalog/types";
import type { LeadSource } from "@/features/leads/types";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
export function ContactButton({
  dictionary,
  locale,
  label,
  source,
  product,
  settings,
}: {
  dictionary: Dictionary;
  locale: Locale;
  label: string;
  source: LeadSource;
  product?: { id: string; name: string };
  settings: PublicSiteSettings;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  function close() {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }
  return (
    <>
      <button
        ref={triggerRef}
        className="button-primary"
        type="button"
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
      {open ? (
        <ContactDialog
          dictionary={dictionary}
          locale={locale}
          source={source}
          product={product}
          settings={settings}
          onClose={close}
        />
      ) : null}
    </>
  );
}
