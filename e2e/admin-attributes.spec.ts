import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";
import { cleanupRunArtifacts } from "./helpers/cleanup";
import { adminRead } from "./helpers/admin-read";
import { expectErrorNotice, expectSaved } from "./helpers/admin-ui";
import {
  bindAttributeToCategory,
  createAttributeViaUI,
} from "./helpers/factories/attribute-ui";
import { createProductViaUI } from "./helpers/factories/product-ui";

const TYPE_IMMUTABLE_ERROR = "Тип используемой характеристики менять нельзя.";
const ATTRIBUTE_IN_USE_ERROR = "Характеристика уже используется.";
const OPTION_CONFIRM = "Удалить неиспользуемый вариант?";
const ATTRIBUTE_CONFIRM = "Удалить неиспользуемую характеристику?";

/** Scope the option form: it is the only form containing label_ru. */
function optionForm(page: Page) {
  return page
    .locator("form")
    .filter({ has: page.locator('input[name="label_ru"]') });
}

/** Scope the bound-category form: it is the only form with is_required. */
function boundForm(page: Page) {
  return page
    .locator("form")
    .filter({ has: page.locator('input[name="is_required"]') });
}

async function addOptionViaForm(
  page: Page,
  optionCode: string,
  labelRu: string,
  labelRo: string,
): Promise<void> {
  const form = optionForm(page);
  await form.locator('input[name="code"]').fill(optionCode);
  await form.locator('input[name="sort_order"]').fill("10");
  await form.locator('input[name="label_ru"]').fill(labelRu);
  await form.locator('input[name="label_ro"]').fill(labelRo);
  await form.getByRole("button", { name: "Добавить вариант" }).click();
}

test.describe("ADM-ATTR: attributes", () => {
  test.afterEach(async ({ runId }) => {
    await cleanupRunArtifacts(runId);
  });

  test("ADM-ATTR-01: Create attribute RU/RO", async ({
    page,
    runId,
    factories,
  }) => {
    const data = factories.buildAttributeData(runId, "number");
    const attributeId = await createAttributeViaUI(page, data);

    await expectSaved(page);
    const dbRow = await adminRead.getAttributeByCode(data.code);
    expect(dbRow?.id).toBe(attributeId);
    expect(dbRow?.data_type).toBe("number");
    expect(
      dbRow?.translations.find((t: { locale: string }) => t.locale === "ru")
        ?.name,
    ).toBe(data.nameRu);

    await page.goto("/admin/attributes");
    await expect(
      page.locator("a.admin-list-card").filter({ hasText: data.nameRu }),
    ).toBeVisible();
  });

  test("ADM-ATTR-02: Options only on select types", async ({
    page,
    runId,
    factories,
  }) => {
    const data = factories.buildAttributeData(runId, "number");
    const attributeId = await createAttributeViaUI(page, data);

    await page.goto(`/admin/attributes/${attributeId}`);
    await expect(
      page.getByText("Для этого типа варианты не поддерживаются."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Добавить вариант" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Удалить вариант" }),
    ).toHaveCount(0);
  });

  test("ADM-ATTR-03: Add + delete option", async ({
    page,
    runId,
    factories,
  }) => {
    const suffix = runId.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const data = factories.buildAttributeData(runId, "single_select");
    const attributeId = await createAttributeViaUI(page, data);

    // Fresh URL so the add-option save redirect is observable.
    await page.goto(`/admin/attributes/${attributeId}`);
    const optionCode = `opt_${suffix.replace(/-/g, "_")}`;
    await addOptionViaForm(
      page,
      optionCode,
      `Вариант ${runId}`,
      `Varianta ${runId}`,
    );
    await expectSaved(page);
    await expect(
      page.getByRole("button", { name: "Удалить вариант" }),
    ).toBeVisible();
    expect(
      (await adminRead.getAttributeByCode(data.code))?.options.length,
    ).toBe(1);

    // Delete: URL already carries ?saved=1 — assert the option disappears.
    let dialogMessage: string | undefined;
    page.once("dialog", (dialog) => {
      dialogMessage = dialog.message();
      void dialog.accept();
    });
    await page.getByRole("button", { name: "Удалить вариант" }).click();
    await expect(
      page.getByRole("button", { name: "Удалить вариант" }),
    ).toHaveCount(0);
    expect(dialogMessage).toBe(OPTION_CONFIRM);
    expect(
      (await adminRead.getAttributeByCode(data.code))?.options.length,
    ).toBe(0);
  });

  test("ADM-ATTR-04: Bind category required/filter", async ({
    page,
    runId,
    factories,
  }) => {
    const category = factories.buildCategoryData(runId);
    const categoryId = await factories.createCategoryViaUI(page, category);
    const data = factories.buildAttributeData(runId, "number", {
      isFilterable: true,
    });
    const attributeId = await createAttributeViaUI(page, data);

    await bindAttributeToCategory(page, attributeId, categoryId);
    await expect(page.getByText("Привязана").first()).toBeVisible();

    // Fresh URL, then persist required + filterable flags.
    await page.goto(`/admin/attributes/${attributeId}`);
    const form = boundForm(page);
    await form.locator('input[name="is_required"]').check();
    await form.locator('input[name="is_filterable"]').check();
    await form.getByRole("button", { name: "Сохранить привязку" }).click();
    await expectSaved(page);

    // Persisted outcome after a fresh load.
    await page.goto(`/admin/attributes/${attributeId}`);
    await expect(
      boundForm(page).locator('input[name="is_required"]'),
    ).toBeChecked();
    await expect(page.getByText("Привязана").first()).toBeVisible();
  });

  test("ADM-ATTR-05: Type change after options blocked", async ({
    page,
    runId,
    factories,
  }) => {
    const suffix = runId.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const data = factories.buildAttributeData(runId, "single_select");
    const attributeId = await createAttributeViaUI(page, data);
    await page.goto(`/admin/attributes/${attributeId}`);
    await addOptionViaForm(
      page,
      `opt_${suffix.replace(/-/g, "_")}`,
      `Вариант ${runId}`,
      `Varianta ${runId}`,
    );
    await expectSaved(page);

    await page.goto(`/admin/attributes/${attributeId}`);
    await page.locator('select[name="data_type"]').selectOption("text");
    await page
      .getByRole("button", { name: "Сохранить характеристику" })
      .click();
    await expectErrorNotice(
      page,
      "Cannot change the type",
      TYPE_IMMUTABLE_ERROR,
    );

    // Outcome: type unchanged in DB.
    expect((await adminRead.getAttributeByCode(data.code))?.data_type).toBe(
      "single_select",
    );
  });

  test("ADM-ATTR-06: Delete free attribute", async ({
    page,
    runId,
    factories,
  }) => {
    const data = factories.buildAttributeData(runId, "boolean");
    const attributeId = await createAttributeViaUI(page, data);

    await page.goto(`/admin/attributes/${attributeId}`);
    let dialogMessage: string | undefined;
    page.once("dialog", (dialog) => {
      dialogMessage = dialog.message();
      void dialog.accept();
    });
    await page.getByRole("button", { name: "Удалить характеристику" }).click();
    // Delete success redirects to the list.
    await expect(page).toHaveURL(/\/admin\/attributes\?saved=1/, {
      timeout: 20_000,
    });
    expect(dialogMessage).toBe(ATTRIBUTE_CONFIRM);
    await expect(
      page.locator("a.admin-list-card").filter({ hasText: data.nameRu }),
    ).toHaveCount(0);
    expect(await adminRead.getAttributeByCode(data.code)).toBeNull();
  });

  test("ADM-ATTR-07: Delete used attribute blocked", async ({
    page,
    runId,
    factories,
  }) => {
    const category = factories.buildCategoryData(runId);
    const categoryId = await factories.createCategoryViaUI(page, category);
    const attrData = factories.buildAttributeData(runId, "number");
    const attributeId = await createAttributeViaUI(page, attrData);
    await bindAttributeToCategory(page, attributeId, categoryId);

    // A product with a stored value makes the attribute genuinely "used".
    const product = factories.buildProductData(runId, categoryId);
    const productId = await createProductViaUI(page, product);
    await page.goto(`/admin/products/${productId}`);
    await page.locator(`input[name="attribute_${attributeId}"]`).fill("5");
    await page
      .getByRole("button", { name: "Сохранить характеристики" })
      .click();
    await expectSaved(page);
    expect((await adminRead.getProductAttributeValues(productId)).length).toBe(
      1,
    );

    await page.goto(`/admin/attributes/${attributeId}`);
    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("button", { name: "Удалить характеристику" }).click();
    await expectErrorNotice(page, "attribute_in_use", ATTRIBUTE_IN_USE_ERROR);
    expect(await adminRead.getAttributeByCode(attrData.code)).toBeTruthy();
  });

  test("ADM-ATTR-08: Text type filter checkbox disabled on binding", async ({
    page,
    runId,
    factories,
  }) => {
    const category = factories.buildCategoryData(runId);
    const categoryId = await factories.createCategoryViaUI(page, category);
    const data = factories.buildAttributeData(runId, "text");
    const attributeId = await createAttributeViaUI(page, data);
    await bindAttributeToCategory(page, attributeId, categoryId);

    await page.goto(`/admin/attributes/${attributeId}`);
    const form = boundForm(page);
    await expect(form.locator('input[name="is_filterable"]')).toBeDisabled();
    await expect(form.locator('input[name="is_required"]')).toBeEnabled();
  });
});
