export interface LeadPayload {
  name: string;
  phone: string;
  source: "product_modal" | "quick_order" | "consultation" | "assistant";
  locale: "ru" | "ro";
  productId?: string;
  note?: string;
}

export function buildLeadData(
  runId: string,
  overrides?: Partial<LeadPayload>,
): LeadPayload {
  return {
    name: `Клиент ${runId}`,
    phone: "+37369123456",
    source: "quick_order",
    locale: "ru",
    note: `Тестовая заявка для прогона ${runId}`,
    ...overrides,
  };
}
