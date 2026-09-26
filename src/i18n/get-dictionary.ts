import { ro } from "@/i18n/dictionaries/ro";
import { ru } from "@/i18n/dictionaries/ru";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

const dictionaries: Record<Locale, Dictionary> = { ru, ro };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
