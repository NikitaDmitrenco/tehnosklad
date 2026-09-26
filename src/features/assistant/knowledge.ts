import "server-only";

import { demoAssistantKnowledge } from "@/features/assistant/demo-knowledge";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasSupabaseServiceRoleEnvironment } from "@/lib/env/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service";

const MAX_KNOWLEDGE_RESULTS = 4;
const MAX_KNOWLEDGE_CONTENT = 1_600;
/*
 * One weak body match is noise, not relevance: "в наличии" shares a stem with
 * "наличными", which used to answer a question about fridges with the payment
 * article. A title match (6) or two body matches (2 + 2) clear the bar.
 */
const MIN_KNOWLEDGE_SCORE = 4;

export type AssistantKnowledgeItem = {
  id: string;
  title: string;
  content: string;
  source: "database" | "privacy" | "personal_data";
};

const stopWords = new Set([
  "как",
  "какой",
  "какая",
  "какие",
  "что",
  "это",
  "есть",
  "для",
  "или",
  "где",
  "мне",
  "можно",
  "магазин",
  "магазина",
  "магазине",
  "магазином",
  "care",
  "cum",
  "este",
  "sunt",
  "pentru",
  "unde",
  "pot",
  "sau",
  "magazin",
  "magazinul",
  "magazinului",
]);

function normalize(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().replaceAll("ё", "е");
}

function tokens(value: string) {
  return (
    normalize(value)
      .match(/[\p{L}\p{N}-]{2,}/gu)
      ?.filter((token) => !stopWords.has(token)) ?? []
  );
}

function tokenMatches(query: string, candidate: string) {
  if (query === candidate) return true;
  if (query.length < 4 || candidate.length < 4) return false;
  if (query.startsWith(candidate) || candidate.startsWith(query)) return true;
  let commonPrefix = 0;
  const maximum = Math.min(query.length, candidate.length);
  while (
    commonPrefix < maximum &&
    query[commonPrefix] === candidate[commonPrefix]
  )
    commonPrefix += 1;
  return commonPrefix >= 5;
}

export function rankAssistantKnowledge(
  items: AssistantKnowledgeItem[],
  question: string,
  limit = MAX_KNOWLEDGE_RESULTS,
) {
  const query = normalize(question);
  const queryTokens = [...new Set(tokens(query))];
  if (!queryTokens.length) return [];

  return items
    .map((item) => {
      const title = normalize(item.title);
      const content = normalize(item.content);
      const titleTokens = tokens(title);
      const contentTokens = tokens(content);
      let score = query.length >= 4 && title.includes(query) ? 20 : 0;
      for (const queryToken of queryTokens) {
        if (
          titleTokens.some((candidate) => tokenMatches(queryToken, candidate))
        )
          score += 6;
        if (
          contentTokens.some((candidate) => tokenMatches(queryToken, candidate))
        )
          score += 2;
      }
      return { item, score };
    })
    .filter(({ score }) => score >= MIN_KNOWLEDGE_SCORE)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ item }) => ({
      ...item,
      content: item.content.slice(0, MAX_KNOWLEDGE_CONTENT),
    }));
}

function isPrivacyQuestion(locale: Locale, question: string) {
  const value = normalize(question);
  return locale === "ru"
    ? /(?:персональн\w*\s+данн|обработк\w*\s+данн|конфиденц\w*|согласи\w*|хран\w*\s+данн|удал\w*\s+данн|прав\w*\s+(?:клиент|субъект)|idno|оператор\w*\s+данн)/u.test(
        value,
      )
    : /(?:date\w*\s+(?:personal|caracter)|prelucr\w*\s+dat|confiden\w*|consimț\w*|consimt\w*|păstr\w*\s+dat|pastr\w*\s+dat|șterg\w*\s+dat|sterg\w*\s+dat|drept\w*\s+persoan|idno|operator\w*\s+dat)/u.test(
        value,
      );
}

function builtInLegalKnowledge(
  locale: Locale,
  question: string,
): AssistantKnowledgeItem[] {
  if (!isPrivacyQuestion(locale, question)) return [];
  const dictionary = getDictionary(locale);
  const documents = [
    {
      source: "privacy" as const,
      intro: dictionary.legal.privacyIntro,
      sections: dictionary.legal.privacySections,
    },
    {
      source: "personal_data" as const,
      intro: dictionary.legal.personalIntro,
      sections: dictionary.legal.personalSections,
    },
  ];
  return documents.flatMap((document) => [
    {
      id: `built-in-${document.source}-intro`,
      title:
        document.source === "privacy"
          ? dictionary.footer.privacy
          : dictionary.footer.personalData,
      content: document.intro,
      source: document.source,
    },
    ...document.sections.map((section, index) => ({
      id: `built-in-${document.source}-${index}`,
      title: section.title,
      content: [...section.paragraphs, ...(section.items ?? [])].join(" "),
      source: document.source,
    })),
  ]);
}

function demoKnowledge(locale: Locale): AssistantKnowledgeItem[] {
  return demoAssistantKnowledge.map((article) => ({
    id: article.id,
    title: article.title[locale],
    content: article.content[locale],
    source: "database" as const,
  }));
}

async function databaseKnowledge(
  locale: Locale,
): Promise<AssistantKnowledgeItem[]> {
  // Demo and local setups have no service-role client but still need articles.
  if (!hasSupabaseServiceRoleEnvironment()) return demoKnowledge(locale);
  try {
    const { data, error } = await createServiceRoleSupabaseClient()
      .from("assistant_knowledge")
      .select("id,title,content")
      .eq("locale", locale)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: String(row.id),
      title: String(row.title),
      content: String(row.content),
      source: "database" as const,
    }));
  } catch {
    console.error("Assistant knowledge query failed", {
      code: "assistant_knowledge_unavailable",
    });
    return [];
  }
}

export async function searchAssistantKnowledge(
  locale: Locale,
  question: string,
) {
  const items = [
    ...(await databaseKnowledge(locale)),
    ...builtInLegalKnowledge(locale, question),
  ];
  return rankAssistantKnowledge(items, question);
}
