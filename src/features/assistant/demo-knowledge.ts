import type { Locale } from "@/i18n/config";

/*
 * Demo fixtures for the assistant knowledge base, mirroring the rows inserted
 * by `supabase/seed.sql`. They are used only when no service-role client is
 * configured — that is, in demo and local setups, never in production, where
 * the operator maintains the real articles through /admin/assistant-knowledge.
 */
export type DemoKnowledgeArticle = {
  id: string;
  title: Record<Locale, string>;
  content: Record<Locale, string>;
};

export const demoAssistantKnowledge: DemoKnowledgeArticle[] = [
  {
    id: "30000000-0000-4000-8000-000000000001",
    title: {
      ru: "Доставка",
      ro: "Livrare",
    },
    content: {
      ru: "Доставка по Комрату выполняется в день заказа или на следующий рабочий день. По югу Молдовы срок доставки обычно составляет один-два рабочих дня. Точную стоимость и дату доставки менеджер подтверждает по телефону после оформления заявки.",
      ro: "Livrarea în Comrat se face în ziua comenzii sau în următoarea zi lucrătoare. În sudul Moldovei termenul este de obicei una-două zile lucrătoare. Costul exact și data livrării sunt confirmate de manager la telefon după înregistrarea cererii.",
    },
  },
  {
    id: "30000000-0000-4000-8000-000000000002",
    title: {
      ru: "Оплата",
      ro: "Modalități de plată",
    },
    content: {
      ru: "Оплатить покупку можно наличными при получении или банковской картой в магазине. Для юридических лиц доступна оплата по счёту. Чек и гарантийный талон выдаются вместе с товаром.",
      ro: "Achitarea se face în numerar la primire sau cu cardul bancar în magazin. Pentru persoane juridice este disponibilă plata prin factură. Bonul și certificatul de garanție se eliberează împreună cu produsul.",
    },
  },
  {
    id: "30000000-0000-4000-8000-000000000003",
    title: {
      ru: "Гарантия",
      ro: "Garanție",
    },
    content: {
      ru: "На всю технику действует официальная гарантия производителя. Срок гарантии указан в гарантийном талоне и зависит от модели. Для обращения по гарантии сохраните чек и гарантийный талон.",
      ro: "Toate electrocasnicele au garanție oficială de la producător. Termenul de garanție este indicat în certificatul de garanție și depinde de model. Pentru o solicitare de garanție păstrați bonul și certificatul.",
    },
  },
  {
    id: "30000000-0000-4000-8000-000000000004",
    title: {
      ru: "Возврат и обмен",
      ro: "Retur și schimb",
    },
    content: {
      ru: "Товар надлежащего качества можно вернуть или обменять в течение 14 дней с момента покупки, если сохранены товарный вид, упаковка, чек и полная комплектация. Технику с выявленным дефектом магазин принимает на проверку и заменяет или ремонтирует по гарантии.",
      ro: "Un produs de calitate corespunzătoare poate fi returnat sau schimbat în 14 zile de la cumpărare, dacă se păstrează aspectul comercial, ambalajul, bonul și setul complet. Produsele cu defect sunt preluate pentru verificare și înlocuite sau reparate în garanție.",
    },
  },
  {
    id: "30000000-0000-4000-8000-000000000005",
    title: {
      ru: "Самовывоз из магазина",
      ro: "Ridicare din magazin",
    },
    content: {
      ru: "Заказ можно забрать самостоятельно в магазине в рабочие часы. Перед поездкой оставьте заявку или позвоните: менеджер проверит наличие конкретной модели и отложит её.",
      ro: "Comanda poate fi ridicată personal din magazin în orele de program. Înainte de deplasare lăsați o cerere sau sunați: managerul verifică disponibilitatea modelului și îl rezervă.",
    },
  },
  {
    id: "30000000-0000-4000-8000-000000000006",
    title: {
      ru: "Подключение и установка",
      ro: "Conectare și instalare",
    },
    content: {
      ru: "Установку и подключение крупной техники выполняют мастера магазина. Условия и стоимость услуги зависят от типа техники и обсуждаются с менеджером при оформлении заказа.",
      ro: "Instalarea și conectarea electrocasnicelor mari sunt efectuate de specialiștii magazinului. Condițiile și costul serviciului depind de tipul tehnicii și se discută cu managerul la plasarea comenzii.",
    },
  },
];
