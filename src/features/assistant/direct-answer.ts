import type { PublicSiteSettings } from "@/features/catalog/types";
import type { Locale } from "@/i18n/config";
import type { LegalOperatorConfig } from "@/lib/env/legal";

export type DirectAssistantAnswer = {
  answer: string;
  intent: "store_info" | "legal_info";
};

function normalized(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().replaceAll("ё", "е");
}

function russianStoreAnswer(
  question: string,
  settings: PublicSiteSettings,
): DirectAssistantAnswer | null {
  const address =
    /(?:адрес\w*|местополож\w*|где\s+(?:вы|магазин|находит|располож)|как\s+(?:до\s+вас|добрат))/u.test(
      question,
    );
  const phone =
    /(?:номер\w*.*(?:позвон|звон|телефон|магазин)|(?:какой|на\s+какой)\s+номер|^(?:а\s+)?номер(?:\s+телефона)?[?.!]*$|телефон\w*.*(?:магазин|ваш|связ)|(?:как|куда|вам)\s+(?:можно\s+)?(?:позвон|звон|связат)|контактн\w*\s+(?:номер|телефон))/u.test(
      question,
    );
  const hours =
    /(?:график\w*|режим\w*\s+работ|часы\s+работ|когда\s+.*работ|до\s+скольк|во\s+сколько\s+.*откры|сегодня\s+.*работ|выходн\w*)/u.test(
      question,
    );
  const genericContact =
    /(?:контакт(?:ы|ами)?\s+(?:магазин|ваш)|как\s+(?:с\s+вами|с\s+магазином)\s+связат)/u.test(
      question,
    );

  if (!address && !phone && !hours && !genericContact) return null;

  const parts: string[] = [];
  if (address || genericContact)
    parts.push(`Магазин находится по адресу: ${settings.address}.`);
  if (phone || genericContact)
    parts.push(`Позвонить в магазин можно по номеру ${settings.phoneDisplay}.`);
  if (hours || genericContact)
    parts.push(
      `График работы: ${settings.openDays}, ${settings.openTime}. ${settings.closedDay}.`,
    );
  return { answer: parts.join(" "), intent: "store_info" };
}

function romanianStoreAnswer(
  question: string,
  settings: PublicSiteSettings,
): DirectAssistantAnswer | null {
  const address =
    /(?:\badres\w*|\bloca(?:ție|tia|tiei|ția)\w*|\bunde\s+(?:sunteți|sunteti|este\s+magazinul)|\bcum\s+ajung)/u.test(
      question,
    );
  const phone =
    /(?:\bnum(?:ă|a)r\w*.*(?:telefon|sun|magazin)|^(?:și\s+|si\s+)?num(?:ă|a)r(?:ul)?[?.!]*$|\btelefon\w*.*(?:magazin|contact)|\bcum\s+(?:pot\s+)?(?:să\s+)?(?:sun|contact)|\bcontact\w*\s+telefon)/u.test(
      question,
    );
  const hours =
    /(?:\bprogram\w*|\borar\w*|\bc(?:â|a)nd\s+.*(?:deschis|lucra|funcțion|function)|\bp(?:â|a)n(?:ă|a)\s+la\s+ce\s+or|\bzi\w*\s+liber)/u.test(
      question,
    );
  const genericContact =
    /(?:\bcontact(?:ele|e)?\s+magazin|\bcum\s+(?:vă|va)\s+contact)/u.test(
      question,
    );

  if (!address && !phone && !hours && !genericContact) return null;

  const parts: string[] = [];
  if (address || genericContact)
    parts.push(`Magazinul se află la adresa: ${settings.address}.`);
  if (phone || genericContact)
    parts.push(`Puteți suna magazinul la numărul ${settings.phoneDisplay}.`);
  if (hours || genericContact)
    parts.push(
      `Program: ${settings.openDays}, ${settings.openTime}. ${settings.closedDay}.`,
    );
  return { answer: parts.join(" "), intent: "store_info" };
}

function legalAnswer(
  locale: Locale,
  question: string,
  operator: LegalOperatorConfig,
  storePhone: string,
): DirectAssistantAnswer | null {
  const isRussian = locale === "ru";
  const fields = isRussian
    ? [
        {
          matches: /(?:\bidno\b|\bидно\b|идентификационн\w*\s+номер)/u,
          label: "IDNO",
          value: operator.idno,
        },
        {
          matches:
            /(?:юридическ\w*\s+(?:назван|наименован)|оператор\w*\s+данн|кто\s+(?:владелец|оператор))/u,
          label: "Юридическое наименование оператора",
          value: operator.name,
        },
        {
          matches: /(?:юридическ\w*\s+адрес)/u,
          label: "Юридический адрес",
          value: operator.legalAddress,
        },
        {
          matches:
            /(?:email|e-mail|электронн\w*\s+почт\w*).*(?:данн|конфиденц|оператор)|(?:данн|конфиденц|оператор).*(?:email|e-mail|почт)/u,
          label: "Email по вопросам персональных данных",
          value: operator.privacyEmail,
        },
        {
          matches: /(?:ответственн\w*\s+(?:лиц|человек)|responsible\s+person)/u,
          label: "Ответственное лицо",
          value: operator.responsiblePerson,
        },
      ]
    : [
        {
          matches: /\bidno\b/u,
          label: "IDNO",
          value: operator.idno,
        },
        {
          matches:
            /(?:denumir\w*\s+juridic|operator\w*\s+dat|cine\s+este\s+operator)/u,
          label: "Denumirea juridică a operatorului",
          value: operator.name,
        },
        {
          matches: /(?:adres\w*\s+juridic)/u,
          label: "Adresa juridică",
          value: operator.legalAddress,
        },
        {
          matches:
            /(?:email|e-mail).*(?:date|confiden|operator)|(?:date|confiden|operator).*(?:email|e-mail)/u,
          label: "Email pentru datele cu caracter personal",
          value: operator.privacyEmail,
        },
        {
          matches: /(?:persoan\w*\s+responsabil)/u,
          label: "Persoana responsabilă",
          value: operator.responsiblePerson,
        },
      ];
  const requested = fields.filter((field) => field.matches.test(question));
  if (!requested.length) return null;

  const answer = requested
    .map((field) =>
      field.value
        ? `${field.label}: ${field.value}.`
        : isRussian
          ? `${field.label} пока не опубликовано. Уточните информацию по номеру ${storePhone}.`
          : `${field.label} nu este publicată momentan. Confirmați informația la numărul ${storePhone}.`,
    )
    .join(" ");
  return { answer, intent: "legal_info" };
}

export function answerDirectQuestion(
  locale: Locale,
  question: string,
  settings: PublicSiteSettings,
  operator: LegalOperatorConfig,
): DirectAssistantAnswer | null {
  const cleanQuestion = normalized(question);
  return (
    legalAnswer(locale, cleanQuestion, operator, settings.phoneDisplay) ??
    (locale === "ru"
      ? russianStoreAnswer(cleanQuestion, settings)
      : romanianStoreAnswer(cleanQuestion, settings))
  );
}
