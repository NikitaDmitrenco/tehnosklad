import type { Page } from "@playwright/test";
import type { ProductPayload } from "./product";

/**
 * Fill the admin product form (product-save) without submitting.
 * `overrides` lets failure-path tests omit or alter fields (e.g. publish
 * without RO translations).
 */
export async function fillProductForm(
  page: Page,
  data: ProductPayload,
  overrides?: {
    skipRo?: boolean;
    skipRu?: boolean;
    publish?: boolean;
  },
): Promise<void> {
  await page.goto("/admin/products/new");
  await page.waitForLoadState("domcontentloaded");

  await page
    .locator('select[name="category_id"]')
    .selectOption(data.categoryId);
  await page.locator('input[name="brand"]').fill(data.brand);
  await page.locator('input[name="model"]').fill(data.model);
  await page.locator('input[name="sku"]').fill(data.sku);
  await page.locator('input[name="price"]').fill(data.price);
  if (data.oldPrice) {
    await page.locator('input[name="old_price"]').fill(data.oldPrice);
  }
  await page
    .locator('select[name="availability"]')
    .selectOption(data.availability);
  await page.locator('input[name="sort_order"]').fill(String(data.sortOrder));
  if (overrides?.publish ?? data.isPublished) {
    await page.locator('input[name="is_published"]').check();
  }

  if (!overrides?.skipRu) {
    await page.locator('input[name="ru_name"]').fill(data.nameRu);
    await page.locator('input[name="ru_slug"]').fill(data.slugRu);
    await page
      .locator('textarea[name="ru_short_description"]')
      .fill(`Краткое описание ${data.nameRu}`);
    await page
      .locator('textarea[name="ru_description"]')
      .fill(`Полное описание ${data.nameRu}`);
  }

  if (!overrides?.skipRo) {
    await page.locator('input[name="ro_name"]').fill(data.nameRo);
    await page.locator('input[name="ro_slug"]').fill(data.slugRo);
    await page
      .locator('textarea[name="ro_short_description"]')
      .fill(`Descriere scurta ${data.nameRo}`);
    await page
      .locator('textarea[name="ro_description"]')
      .fill(`Descriere completa ${data.nameRo}`);
  }
}

/**
 * Create a product draft (optionally published) through the real admin form
 * and return the new product id. Waits for the `?saved=1` redirect.
 */
export async function createProductViaUI(
  page: Page,
  data: ProductPayload,
): Promise<string> {
  await fillProductForm(page, data);
  await page.getByRole("button", { name: "Сохранить товар" }).click();
  await page.waitForURL(/\/admin\/products\/[0-9a-f-]+\?saved=1/);

  const match = page.url().match(/\/admin\/products\/([0-9a-f-]+)/);
  if (!match)
    throw new Error(
      `[createProductViaUI] Could not extract product id from URL: ${page.url()}`,
    );
  return match[1];
}
