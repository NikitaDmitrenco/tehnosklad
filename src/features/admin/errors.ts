// Admin errors reach the page as `?error=<serialized>` on the redirect URL.
// Serialization keeps codes short and carries safe display parameters
// (limit, actual, field label, allowed list) so messages can state a concrete
// cause without ever forwarding raw database text to the browser.

export type AdminErrorParams = Partial<{
  limit: string;
  actual: string;
  field: string;
  allowed: string;
  ref: string;
}>;

export class AdminDataError extends Error {
  constructor(
    public readonly code: string,
    message = "Admin operation failed",
    public readonly params: AdminErrorParams = {},
  ) {
    super(message);
    this.name = "AdminDataError";
  }
}

const knownMessages: Array<[string, string]> = [
  ["admin_required", "Требуется активная роль администратора."],
  ["category_in_use", "Категория используется товарами или подкатегориями."],
  ["category_parent_cycle", "Категория не может быть собственным потомком."],
  ["attribute_group_in_use", "Группа содержит характеристики."],
  ["attribute_in_use", "Характеристика уже используется."],
  ["attribute_option_in_use", "Вариант уже используется в товарах."],
  [
    "category_attribute_in_use",
    "Характеристика заполнена у товаров этой категории.",
  ],
  [
    "product_category_attributes_incompatible",
    "Сначала очистите несовместимые характеристики товара.",
  ],
  [
    "Published category requires",
    "Для публикации категории нужны полные переводы RU и RO.",
  ],
  [
    "Published product requires ru and ro",
    "Для публикации товара нужны полные переводы RU и RO.",
  ],
  [
    "Published product requires a published category",
    "Сначала опубликуйте выбранную категорию.",
  ],
  [
    "missing a required attribute",
    "Заполните все обязательные характеристики.",
  ],
  [
    "images require ru and ro alt",
    "У каждого изображения должны быть alt-тексты RU и RO.",
  ],
  [
    "incomplete attribute metadata",
    "Проверьте переводы и активность характеристик и вариантов.",
  ],
  ["Cannot change the type", "Тип используемой характеристики менять нельзя."],
  [
    "canonical filters",
    "Текстовая характеристика не может быть каноническим фильтром.",
  ],
  ["duplicate key", "Такой slug, код или SKU уже используется."],
  // A slug stays reserved after a rename so old links keep redirecting, so a
  // free-looking address can still belong to something else.
  [
    "slug is reserved by another category",
    "Этот адрес (slug) уже занят другой категорией, в том числе переименованной или архивной. Выберите другой.",
  ],
  [
    "slug is reserved by another product",
    "Этот адрес (slug) уже занят другим товаром, в том числе переименованным или архивным. Выберите другой.",
  ],
  ["site_setting_not_allowed", "Эту настройку редактировать нельзя."],
  [
    "assistant_knowledge_incomplete",
    "Заполните заголовок и текст статьи базы знаний.",
  ],
  ["assistant_knowledge_not_found", "Статья базы знаний не найдена."],
];

// Codes this module invents when no message matched. They travel to the page
// through the redirect query, so the sanitizer and the UI read them from here
// instead of each keeping its own copy -- a code missing from this map used to
// reach the reader as a bare "Операция не выполнена.".
// `{...}` placeholders are filled from AdminErrorParams on display.
const codeMessages: Record<string, string> = {
  duplicate: "Такое значение уже используется.",
  in_use: "Сущность используется и не может быть удалена.",
  validation: "Проверьте обязательные поля и формат значений.",
  upload_invalid: "Файл не принят: допустимы JPG, PNG, WebP или AVIF до 4 МБ.",
  upload_too_large:
    "Файл {actual}, максимум {limit}. Уменьшите фото или сохраните как JPG.",
  upload_type_not_allowed:
    "Недопустимый формат файла: {actual}. Разрешены {allowed}. Подсказка: на iPhone фото часто сохраняются в HEIC — конвертируйте их в JPG.",
  upload_corrupted:
    "Файл повреждён или обрезан и не открывается как изображение. Сохраните изображение заново и повторите загрузку.",
  upload_extension_mismatch:
    "Содержимое файла не соответствует его расширению. Сохраните изображение заново в том же формате и повторите загрузку.",
  operation_failed:
    "Операция не выполнена. Проверьте данные и повторите попытку.",
};

export function sanitizeAdminError(error: unknown): AdminDataError {
  if (error instanceof AdminDataError) return error;
  const raw =
    typeof error === "object" && error !== null && "message" in error
      ? String(error.message)
      : "";
  for (const [needle, message] of knownMessages) {
    if (raw.includes(needle)) return new AdminDataError(needle, message);
  }
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "unexpected";
  if (code === "23505")
    return new AdminDataError("duplicate", codeMessages.duplicate!);
  if (code === "23503")
    return new AdminDataError("in_use", codeMessages.in_use!);
  // Unexpected failure: the raw message stays in the server log, tied to a
  // short reference the operator can quote from the UI.
  const ref = Math.random().toString(36).slice(2, 8).toUpperCase();
  console.error("Admin operation failed", {
    ref,
    pgCode: code,
    message: raw.slice(0, 500),
  });
  return new AdminDataError(
    "operation_failed",
    codeMessages.operation_failed!,
    {
      ref,
    },
  );
}

// "code" or "code~key=urlencodedValue~key=urlencodedValue". Codes never
// contain "~" (they are map keys); values are encoded so any text is safe
// inside the query string.
export function serializeAdminError(error: AdminDataError): string {
  const pairs = Object.entries(error.params).filter(
    (entry): entry is [string, string] =>
      typeof entry[1] === "string" && entry[1] !== "",
  );
  if (!pairs.length) return error.code;
  return [
    error.code,
    ...pairs.map(([key, value]) => `${key}=${encodeURIComponent(value)}`),
  ].join("~");
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function adminErrorMessage(raw: string | undefined): string | null {
  if (!raw) return null;
  const [code = "", ...pairParts] = safeDecode(raw).split("~");
  const params: Record<string, string> = {};
  for (const pair of pairParts) {
    const separator = pair.indexOf("=");
    if (separator <= 0) continue;
    params[pair.slice(0, separator)] = safeDecode(pair.slice(separator + 1));
  }
  const template =
    knownMessages.find(([needle]) => code === needle)?.[1] ??
    codeMessages[code] ??
    codeMessages.operation_failed!;
  let message = template;
  for (const [key, value] of Object.entries(params))
    message = message.split(`{${key}}`).join(value);
  if (params.ref && code === "operation_failed")
    message += ` Код обращения: ${params.ref}.`;
  return message;
}
