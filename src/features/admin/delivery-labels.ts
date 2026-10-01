// Human labels for Telegram delivery states, outcomes and error codes.
// The admin UI must never render raw enum values or raw errorCode strings
// (BUG-05): operators need a sentence that says what happened and what to do.

export const deliveryStateLabels: Record<string, string> = {
  queued: "В очереди",
  processing: "Отправляется",
  retry_wait: "Ожидает повторной отправки",
  succeeded: "Доставлено",
  permanent_failure: "Не доставлено",
  manual_review: "Требует ручной проверки",
};

export function deliveryStateLabel(state: string): string {
  return deliveryStateLabels[state] ?? "Неизвестное состояние";
}

export const deliveryOutcomeLabels: Record<string, string> = {
  succeeded: "успех",
  retryable_failure: "временная ошибка, будет повтор",
  permanent_failure: "постоянная ошибка",
  uncertain_failure: "результат неизвестен",
};

export function deliveryOutcomeLabel(outcome: string | null): string {
  if (!outcome) return "в обработке";
  return deliveryOutcomeLabels[outcome] ?? "результат не распознан";
}

export const deliveryErrorTexts: Record<string, string> = {
  telegram_config_missing:
    "Не доставлено в Telegram: неверная настройка бота. Проверьте токен и chat id в настройках.",
  telegram_rejected:
    "Telegram отклонил сообщение — обычно неверный chat id или бот не добавлен в чат.",
  telegram_rate_limited:
    "Telegram ограничил частоту сообщений — отправка отложена и повторится автоматически.",
  telegram_server_uncertain:
    "Сбой на стороне Telegram — результат неизвестен, доставка может повториться.",
  telegram_network_uncertain:
    "Сетевая ошибка при отправке — результат неизвестен, доставка может повториться.",
  telegram_invalid_response:
    "Telegram вернул неожиданный ответ — результат неизвестен.",
  telegram_missing_message_id:
    "Telegram подтвердил отправку без номера сообщения — результат неопределён.",
  stale_processing_lease:
    "Попытка зависла в обработке и была освобождена автоматически.",
  lead_not_found: "Заявка не найдена при отправке — вероятно, удалена.",
};

const unknownDeliveryError =
  "Причина не распознана — техническая ошибка доставки. Обратитесь в поддержку с номером заявки.";

export function deliveryErrorText(code: string | null): string | null {
  if (!code) return null;
  return deliveryErrorTexts[code] ?? unknownDeliveryError;
}
