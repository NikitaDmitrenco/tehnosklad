import type { Page } from "@playwright/test";
import type { AttributeGroupPayload, AttributePayload } from "./attribute";
import { expectSaved } from "../admin-ui";

/** Create an attribute group via the real admin form; returns its id. */
export async function createAttributeGroupViaUI(
  page: Page,
  data: AttributeGroupPayload,
): Promise<string> {
  await page.goto("/admin/attribute-groups/new");
  await page.waitForLoadState("domcontentloaded");
  await page.locator('input[name="code"]').fill(data.code);
  await page.locator('input[name="sort_order"]').fill(String(data.sortOrder));
  await page.locator('input[name="name_ru"]').fill(data.nameRu);
  await page.locator('input[name="name_ro"]').fill(data.nameRo);
  if (!data.isActive) {
    await page.locator('input[name="is_active"]').uncheck();
  }
  await page.getByRole("button", { name: "Сохранить группу" }).click();
  await page.waitForURL(/\/admin\/attribute-groups\/[0-9a-f-]+\?saved=1/);

  const match = page.url().match(/\/admin\/attribute-groups\/([0-9a-f-]+)/);
  if (!match)
    throw new Error(
      `[createAttributeGroupViaUI] Could not extract group id: ${page.url()}`,
    );
  return match[1];
}

/** Create an attribute via the real admin form; returns its id. */
export async function createAttributeViaUI(
  page: Page,
  data: AttributePayload,
): Promise<string> {
  await page.goto("/admin/attributes/new");
  await page.waitForLoadState("domcontentloaded");
  await page.locator('input[name="code"]').fill(data.code);
  await page.locator('select[name="data_type"]').selectOption(data.dataType);
  if (data.groupId) {
    await page.locator('select[name="group_id"]').selectOption(data.groupId);
  }
  if (data.unitCode) {
    await page.locator('input[name="unit_code"]').fill(data.unitCode);
  }
  await page.locator('input[name="sort_order"]').fill(String(data.sortOrder));
  if (data.isFilterable) {
    await page.locator('input[name="is_filterable"]').check();
  }
  await page.locator('input[name="ru_name"]').fill(data.nameRu);
  await page.locator('input[name="ro_name"]').fill(data.nameRo);
  await page.getByRole("button", { name: "Сохранить характеристику" }).click();
  await page.waitForURL(/\/admin\/attributes\/[0-9a-f-]+\?saved=1/);

  const match = page.url().match(/\/admin\/attributes\/([0-9a-f-]+)/);
  if (!match)
    throw new Error(
      `[createAttributeViaUI] Could not extract attribute id: ${page.url()}`,
    );
  return match[1];
}

/**
 * Bind an attribute to a category on the attribute detail page.
 * Arrives on a fresh URL so the subsequent `?saved=1` redirect is observable.
 */
export async function bindAttributeToCategory(
  page: Page,
  attributeId: string,
  categoryId: string,
): Promise<void> {
  await page.goto(`/admin/attributes/${attributeId}`);
  await page.locator('select[name="category_id"]').selectOption(categoryId);
  await page.getByRole("button", { name: "Привязать" }).click();
  await expectSaved(page);
}
