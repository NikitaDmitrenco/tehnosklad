"use client";

import { useRef, useState, type ComponentType } from "react";

import type {
  AssistantPageContext,
  AssistantWidgetProps,
} from "@/components/public/assistant-widget";
import type { PublicSiteSettings } from "@/features/catalog/types";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

export function AssistantLauncher({
  locale,
  dictionary,
  settings,
  page,
}: {
  locale: Locale;
  dictionary: Dictionary;
  settings: PublicSiteSettings;
  page?: AssistantPageContext | null;
}) {
  const launcher = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [Dialog, setDialog] =
    useState<ComponentType<AssistantWidgetProps> | null>(null);

  function openAssistant() {
    setOpen(true);
    void import("@/components/public/assistant-widget").then(
      ({ AssistantWidget }) => setDialog(() => AssistantWidget),
    );
  }

  return (
    <>
      <button
        ref={launcher}
        type="button"
        className="fixed bottom-[max(5rem,calc(env(safe-area-inset-bottom)+1rem))] right-3 z-30 min-h-[1.875rem] max-w-[calc(100vw-1.5rem)] rounded-full bg-yellow-400 px-4 py-3 text-sm font-bold text-stone-950 shadow-lg focus:outline-none focus:ring-2 focus:ring-stone-950 sm:bottom-[max(1.25rem,env(safe-area-inset-bottom))] sm:right-5"
        aria-expanded={open}
        onClick={openAssistant}
      >
        {dictionary.assistant.open}
      </button>
      {open && Dialog ? (
        <Dialog
          locale={locale}
          dictionary={dictionary}
          settings={settings}
          page={page}
          onClose={() => {
            setOpen(false);
            requestAnimationFrame(() => launcher.current?.focus());
          }}
        />
      ) : null}
    </>
  );
}
