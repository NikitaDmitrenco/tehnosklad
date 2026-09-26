import type { Page } from "@playwright/test";
import { formatRunSlug } from "../../fixtures/run-id";

export interface CategoryPayload {
  nameRu: string;
  nameRo: string;
  slugRu: string;
  slugRo: string;
  presentationKey: "fridge" | "stove" | "vacuum" | "generic";
  sortOrder: number;
  isPublished?: boolean;
}

export function buildCategoryData(
  runId: string,
  overrides?: Partial<CategoryPayload>,
): CategoryPayload {
  return {
    nameRu: `Тест Категория ${runId}`,
    nameRo: `Test Categorie ${runId}`,
    slugRu: formatRunSlug("cat", runId, "ru"),
    slugRo: formatRunSlug("cat", runId, "ro"),
    presentationKey: "generic",
    sortOrder: 50,
    isPublished: false,
    ...overrides,
  };
}

export async function createCategoryViaUI(
  page: Page,
  data: CategoryPayload,
): Promise<string> {
  await page.goto("/admin/categories/new");
  await page.waitForLoadState("domcontentloaded");

  // Select presentation key and order
  await page
    .locator('select[name="presentation_key"]')
    .selectOption(data.presentationKey);
  await page.locator('input[name="sort_order"]').fill(String(data.sortOrder));

  if (data.isPublished) {
    const pubCheckbox = page.locator('input[name="is_published"]');
    if (!(await pubCheckbox.isChecked())) {
      await pubCheckbox.check();
    }
  }

  // RU fields
  await page.locator('input[name="ru_name"]').fill(data.nameRu);
  await page.locator('input[name="ru_slug"]').fill(data.slugRu);
  await page
    .locator('textarea[name="ru_short_description"]')
    .fill(`Краткое описание ${data.nameRu}`);
  await page
    .locator('textarea[name="ru_description"]')
    .fill(`Полное описание категории ${data.nameRu}`);

  // RO fields
  await page.locator('input[name="ro_name"]').fill(data.nameRo);
  await page.locator('input[name="ro_slug"]').fill(data.slugRo);
  await page
    .locator('textarea[name="ro_short_description"]')
    .fill(`Descriere scurta ${data.nameRo}`);
  await page
    .locator('textarea[name="ro_description"]')
    .fill(`Descriere completa categorie ${data.nameRo}`);

  // Submit form
  await page.locator('button:has-text("Сохранить категорию")').click();

  // Wait for redirect to /admin/categories/[id]?saved=1
  await page.waitForURL(/\/admin\/categories\/[0-9a-f-]+\?saved=1/);

  const url = page.url();
  const match = url.match(/\/admin\/categories\/([0-9a-f-]+)/);
  if (!match)
    throw new Error(
      `[createCategoryViaUI] Could not extract category ID from URL: ${url}`,
    );
  return match[1];
}
