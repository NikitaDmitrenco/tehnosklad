import type { Locale } from "@/i18n/config";
import type { AssistantReference } from "@/features/assistant/types";
import type { PublicSiteSettings } from "@/features/catalog/types";
import type { AssistantKnowledgeItem } from "@/features/assistant/knowledge";
import { sanitizeAnswer } from "@/features/assistant/provider";

export function fallbackAnswer(
  locale: Locale,
  references: AssistantReference[],
  knowledge: AssistantKnowledgeItem[],
  settings: PublicSiteSettings,
): string {
  // Sanitizing can empty a knowledge entry that consisted of a price sentence.
  const topKnowledge = knowledge.length
    ? sanitizeAnswer(knowledge[0]!.content)
    : "";
  if (topKnowledge) return topKnowledge;
  if (references.length)
    return locale === "ro"
      ? "Am găsit produse relevante în catalog. Verificați cardurile de mai jos pentru preț și disponibilitate actuală."
      : "Я нашёл подходящие товары в каталоге. Актуальные цену и наличие смотрите в карточках ниже.";
  return locale === "ro"
    ? `Nu am găsit informații confirmate pentru acest răspuns. Reformulați întrebarea sau sunați magazinul la ${settings.phoneDisplay}.`
    : `Я не нашёл подтверждённой информации для точного ответа. Переформулируйте вопрос или позвоните в магазин по номеру ${settings.phoneDisplay}.`;
}
