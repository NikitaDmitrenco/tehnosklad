import "server-only";

import type {
  LeadDeliveryOutcome,
  LeadForTelegram,
} from "@/features/leads/types";
import type { TelegramEnvironment } from "@/lib/env/server";
import { getSiteUrl } from "@/lib/env/public";

export type TelegramSendResult = {
  outcome: LeadDeliveryOutcome;
  errorCode: string | null;
  providerHttpStatus: number | null;
  providerErrorCode: number | null;
  providerMessageId: string | null;
  retryAfterSeconds: number | null;
};

export function escapeTelegramHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function price(lead: LeadForTelegram): string {
  if (lead.productPriceMinor === null || !lead.productCurrency) return "—";
  return `${new Intl.NumberFormat("ru-RU").format(lead.productPriceMinor / 100)} ${lead.productCurrency}`;
}

const sourceLabels: Record<LeadForTelegram["source"], string> = {
  home_contact: "Главная — контакты",
  contacts_page: "Страница контактов",
  home_product_card: "Карточка товара на главной",
  catalog_product_card: "Карточка товара в каталоге",
  category_product_card: "Карточка товара в категории",
  product_page: "Страница товара",
  similar_product_card: "Похожий товар",
  assistant: "Помощник по каталогу",
};

export function formatLeadTelegramMessage(lead: LeadForTelegram): string {
  const productUrl = lead.productPath
    ? new URL(lead.productPath, getSiteUrl()).toString()
    : null;
  const lines = [
    "<b>Новая заявка с сайта Tehnosklad</b>",
    "",
    `Дата: ${escapeTelegramHtml(
      new Intl.DateTimeFormat("ru-RU", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Chisinau",
      }).format(new Date(lead.createdAt)),
    )}`,
    `Имя: ${escapeTelegramHtml(lead.name)}`,
    `Телефон: ${escapeTelegramHtml(lead.phone)}`,
    `Telegram: ${escapeTelegramHtml(lead.telegramUsername ?? "—")}`,
    `Комментарий: ${escapeTelegramHtml((lead.comment ?? "—").slice(0, 1600))}`,
    `Товар: ${escapeTelegramHtml(lead.productName ?? "—")}`,
    `Цена: ${escapeTelegramHtml(price(lead))}`,
    productUrl
      ? `Ссылка: <a href="${escapeTelegramHtml(productUrl)}">открыть товар</a>`
      : "Ссылка: —",
    `Язык сайта: ${lead.locale === "ru" ? "Русский" : "Română"}`,
    `Источник: ${escapeTelegramHtml(sourceLabels[lead.source])}`,
    `Заявка: <code>${escapeTelegramHtml(lead.id)}</code>`,
  ];
  return lines.join("\n").slice(0, 4090);
}

type TelegramResponse = {
  ok?: unknown;
  error_code?: unknown;
  result?: { message_id?: unknown };
  parameters?: { retry_after?: unknown };
};

function failure(
  outcome: LeadDeliveryOutcome,
  errorCode: string,
  status: number | null = null,
  providerErrorCode: number | null = null,
  retryAfterSeconds: number | null = null,
): TelegramSendResult {
  return {
    outcome,
    errorCode,
    providerHttpStatus: status,
    providerErrorCode,
    providerMessageId: null,
    retryAfterSeconds,
  };
}

export async function sendLeadToTelegram(
  environment: TelegramEnvironment | null,
  message: string,
  fetcher: typeof fetch = fetch,
): Promise<TelegramSendResult> {
  if (!environment) {
    return failure("permanent_failure", "telegram_config_missing");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_500);
  try {
    const response = await fetcher(
      `https://api.telegram.org/bot${environment.botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: environment.chatId,
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
        signal: controller.signal,
      },
    );
    let payload: TelegramResponse;
    try {
      payload = (await response.json()) as TelegramResponse;
    } catch {
      return failure(
        "uncertain_failure",
        "telegram_invalid_response",
        response.status,
      );
    }
    const providerCode = Number.isInteger(payload.error_code)
      ? Number(payload.error_code)
      : null;
    if (response.status === 429 || providerCode === 429) {
      const rawRetry = Number(payload.parameters?.retry_after);
      const retryAfter = Number.isFinite(rawRetry)
        ? Math.min(Math.max(Math.round(rawRetry), 1), 3600)
        : 60;
      return failure(
        "retryable_failure",
        "telegram_rate_limited",
        response.status,
        providerCode,
        retryAfter,
      );
    }
    if (response.status >= 500) {
      return failure(
        "uncertain_failure",
        "telegram_server_uncertain",
        response.status,
        providerCode,
      );
    }
    if (!response.ok || payload.ok !== true) {
      return failure(
        "permanent_failure",
        "telegram_rejected",
        response.status,
        providerCode,
      );
    }
    const messageId = payload.result?.message_id;
    if (typeof messageId !== "number" && typeof messageId !== "string") {
      return failure(
        "uncertain_failure",
        "telegram_missing_message_id",
        response.status,
      );
    }
    return {
      outcome: "succeeded",
      errorCode: null,
      providerHttpStatus: response.status,
      providerErrorCode: null,
      providerMessageId: String(messageId),
      retryAfterSeconds: null,
    };
  } catch {
    return failure("uncertain_failure", "telegram_network_uncertain");
  } finally {
    clearTimeout(timeout);
  }
}
