import type { Locale } from "@/i18n/config";

export const leadSources = [
  "home_contact",
  "contacts_page",
  "home_product_card",
  "catalog_product_card",
  "category_product_card",
  "product_page",
  "similar_product_card",
  "assistant",
] as const;

export type LeadSource = (typeof leadSources)[number];

export type LeadSubmission = {
  locale: Locale;
  source: LeadSource;
  sourcePath: string;
  name: string;
  phone: string;
  telegramUsername: string | null;
  comment: string | null;
  productId: string | null;
  privacyNoticeVersion: string;
};

export type LeadField =
  "name" | "phone" | "telegram" | "comment" | "consent" | "product";

export type LeadValidationCode =
  "required" | "invalid" | "too_long" | "consent_required";

export type LeadFieldErrors = Partial<Record<LeadField, LeadValidationCode>>;

export type LeadDeliveryOutcome =
  "succeeded" | "retryable_failure" | "permanent_failure" | "uncertain_failure";

export type LeadDeliveryClaim = {
  attemptId: string;
  deliveryId: string;
  leadId: string;
  attemptNumber: number;
  leaseToken: string;
};

export type LeadForTelegram = {
  id: string;
  createdAt: string;
  name: string;
  phone: string;
  telegramUsername: string | null;
  comment: string | null;
  locale: Locale;
  source: LeadSource;
  sourcePath: string;
  productName: string | null;
  productPriceMinor: number | null;
  productCurrency: "MDL" | null;
  productPath: string | null;
};
