// Single source of truth for limits shared by the admin UI, server-side
// validation, error texts and tests. Nothing else may hardcode these numbers.
//
// Text limits mirror the CHECK constraints in
// supabase/migrations/20260805111516_initial_schema.sql (categories,
// products, attributes, settings) and
// 20260806053422_stage_6_7_completion_security.sql (assistant knowledge).
// Image limits sit strictly below the storage bucket configuration in the
// same migrations (5 MiB / four MIME types).
// tests/limits-consistency.test.ts parses those files and fails when this
// module drifts from the database.

export const categoryLimits = {
  name: 160,
  slug: 180,
  shortDescription: 280,
  description: 5000,
} as const;

export const productLimits = {
  name: 240,
  slug: 220,
  shortDescription: 500,
  description: 10_000,
  brand: 120,
  model: 160,
  sku: 80,
} as const;

// Search engines cut snippets around 70/160 characters; the hard limits are
// the DB CHECKs (seo_title <= 180, seo_description <= 320).
export const seoLimits = {
  title: { recommended: 70, max: 180 },
  description: { recommended: 160, max: 320 },
} as const;

export const categoryTranslationLimits = {
  name: categoryLimits.name,
  slug: categoryLimits.slug,
  shortDescription: categoryLimits.shortDescription,
  description: categoryLimits.description,
  seoTitle: seoLimits.title.max,
  seoDescription: seoLimits.description.max,
} as const;

export const productTranslationLimits = {
  name: productLimits.name,
  slug: productLimits.slug,
  shortDescription: productLimits.shortDescription,
  description: productLimits.description,
  seoTitle: seoLimits.title.max,
  seoDescription: seoLimits.description.max,
} as const;

// Codes are pattern-constrained in the DB (regex) but length-checked only
// by the server; 80 is the shared server-side ceiling.
export const codeLimit = 80;

export const attributeLimits = {
  code: codeLimit,
  unitCode: 80,
  name: 160,
  helpText: 500,
  unitLabel: 40,
  optionCode: 80,
  optionLabel: 160,
  textValue: 500,
} as const;

export const attributeGroupLimits = {
  code: codeLimit,
  name: 160,
} as const;

export const altTextLimit = 240;

export const assistantKnowledgeLimits = {
  title: 160,
  content: 5000,
} as const;

export const siteSettingValueLimit = 1000;

export const presentationKeyLimit = 20;

// "4,2 МБ" / "640 КБ" — one formatter for the client-side check, the server
// error texts and the tests, so the user always sees the same wording.
export function formatMegabytes(bytes: number): string {
  const megabytes = bytes / (1024 * 1024);
  if (megabytes < 1) return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
  // One decimal is kept even for "4,0" so a file that barely exceeds the
  // limit never renders identical to the limit itself.
  return `${megabytes.toFixed(1).replace(".", ",")} МБ`;
}

const imageMimeTypes: readonly string[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];
const imageExtensions: readonly string[] = ["jpg", "png", "webp", "avif"];

export const imageLimits = {
  // 4 MiB: deliberately below the Vercel request-body cap (4.5 MB, see
  // docs/diagnostics/report-2026-10-01.md §5) so the in-app check always
  // runs before the platform rejects the request, and below the storage
  // bucket limit (5 MiB).
  maxBytes: 4 * 1024 * 1024,
  maxLabel: "4 МБ",
  allowedLabel: "JPG, PNG, WebP или AVIF",
  mimeTypes: imageMimeTypes,
  extensions: imageExtensions,
} as const;

// Shown next to every upload field before the user picks a file.
export const imageUploadHint = `JPG, PNG, WebP или AVIF, до ${imageLimits.maxLabel}`;
export const imageShrinkTip =
  "Фото слишком большое? Уменьшите его в галерее («Изменить размер») или сохраните как JPG.";

// Vercel request-body cap: 4.5 MB (decimal),
// https://vercel.com/docs/functions/limitations §Request body size,
// page last_updated 2026-08-24, checked 2026-10-01. Requests above it never
// reach application code — src/proxy.ts answers them with a friendly page.
export const requestBodyMaxBytes = 4_500_000;
