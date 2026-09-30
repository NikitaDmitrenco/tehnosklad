import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";
import path from "node:path";
import { cleanupRunArtifacts } from "./helpers/cleanup";
import { adminRead } from "./helpers/admin-read";
import { adminForm, expectErrorNotice, expectSaved } from "./helpers/admin-ui";
import {
  createProductViaUI,
  fillProductForm,
} from "./helpers/factories/product-ui";
import {
  bindAttributeToCategory,
  createAttributeViaUI,
} from "./helpers/factories/attribute-ui";
import { createCategoryViaUI } from "./helpers/factories/category";

const IMAGE_FIXTURE = path.resolve(
  process.cwd(),
  "e2e/fixtures/images/valid/product-photo-800x600.png",
);

const VALIDATION_ERROR = "Проверьте обязательные поля и формат значений.";
const RU_RO_REQUIRED_ERROR =
  "Для публикации товара нужны полные переводы RU и RO.";
const CATEGORY_NOT_PUBLISHED_ERROR = "Сначала опубликуйте выбранную категорию.";
const MISSING_ATTRIBUTE_ERROR = "Заполните все обязательные характеристики.";

const CHECKLIST_LABELS = [
  "Категория опубликована",
  "Переводы RU и RO заполнены",
  "Обязательные характеристики заполнены",
  "Alt-тексты изображений заполнены",
];

function statusBadge(page: Page, text: string) {
  return page
    .locator("#admin-main .status-badge")
    .filter({ hasText: new RegExp(`^${text}$`) })
    .first();
}

async function publishOwnProduct(page: Page, productId: string) {
  await page.goto(`/admin/products/${productId}`);
  await page.locator('input[name="is_published"]').check();
  await page.getByRole("button", { name: "Сохранить товар" }).click();
  await expectSaved(page);
}

async function uploadProductImage(page: Page, productId: string) {
  await page.goto(`/admin/products/${productId}`);
  const form = adminForm(page, "image-upload");
  await form.locator('input[name="image"]').setInputFiles(IMAGE_FIXTURE);
  await form.locator('input[name="alt_ru"]').fill("Тестовое изображение");
  await form.locator('input[name="alt_ro"]').fill("Imagine de test");
  await form.getByRole("button", { name: "Загрузить изображение" }).click();
  await expectSaved(page);
}

test.describe("ADM-PROD: products", () => {
  test.afterEach(async ({ runId }) => {
    await cleanupRunArtifacts(runId);
  });

  test("ADM-PROD-01: List seed products", async ({ page }) => {
    await page.goto("/admin/products");
    const card = page
      .locator("a.admin-list-card")
      .filter({ hasText: "RB34T602FSA" });
    await expect(card).toBeVisible();
    await expect(card).toContainText("MDL");
  });

  test("ADM-PROD-02: Search by SKU", async ({ page, runId, factories }) => {
    const category = factories.buildCategoryData(runId);
    const categoryId = await createCategoryViaUI(page, category);
    const product = factories.buildProductData(runId, categoryId);
    await createProductViaUI(page, product);

    await page.goto("/admin/products");
    await page.getByLabel("Поиск").fill(product.sku);
    await page.getByRole("button", { name: "Применить" }).click();
    await expect(page).toHaveURL(/q=/);

    const card = page
      .locator("a.admin-list-card")
      .filter({ hasText: product.sku });
    await expect(card).toHaveCount(1);
    await expect(card).toContainText(product.sku);
  });

  test("ADM-PROD-03: Publication filter published/draft/archived", async ({
    page,
    runId,
    factories,
  }) => {
    const category = factories.buildCategoryData(runId);
    const categoryId = await createCategoryViaUI(page, category);
    const product = factories.buildProductData(runId, categoryId);
    await createProductViaUI(page, product);

    await page.goto("/admin/products");
    await page.locator('select[name="publication"]').selectOption("draft");
    await page.getByRole("button", { name: "Применить" }).click();
    await expect(page).toHaveURL(/publication=draft/);
    const draftCard = page
      .locator("a.admin-list-card")
      .filter({ hasText: product.sku });
    await expect(draftCard).toHaveCount(1);
    await expect(draftCard).toContainText("Черновик");

    await page.locator('select[name="publication"]').selectOption("published");
    await page.getByRole("button", { name: "Применить" }).click();
    await expect(page).toHaveURL(/publication=published/);
    await expect(
      page.locator("a.admin-list-card").filter({ hasText: product.sku }),
    ).toHaveCount(0);
  });

  test("ADM-PROD-04: Empty search empty state", async ({ page, runId }) => {
    await page.goto("/admin/products");
    await page.getByLabel("Поиск").fill(`nonexistent-${runId}`);
    await page.getByRole("button", { name: "Применить" }).click();
    await expect(
      page.getByRole("heading", { name: "Ничего не найдено" }),
    ).toBeVisible();
    await expect(page.getByText("Измените параметры поиска.")).toBeVisible();
  });

  test("ADM-PROD-05: Create draft product", async ({
    page,
    runId,
    factories,
  }) => {
    const category = factories.buildCategoryData(runId);
    const categoryId = await createCategoryViaUI(page, category);
    const product = factories.buildProductData(runId, categoryId);
    const productId = await createProductViaUI(page, product);

    await expectSaved(page);
    await expect(statusBadge(page, "Черновик")).toBeVisible();

    const dbRow = await adminRead.getProductBySku(product.sku);
    expect(dbRow?.id).toBe(productId);
    expect(dbRow?.is_published).toBe(false);
    expect(dbRow?.archived_at).toBeNull();
  });

  test("ADM-PROD-06: Publish draft with complete data", async ({
    page,
    runId,
    factories,
  }) => {
    const category = factories.buildCategoryData(runId, {
      isPublished: true,
    });
    const categoryId = await createCategoryViaUI(page, category);
    const product = factories.buildProductData(runId, categoryId);
    const productId = await createProductViaUI(page, product);

    await publishOwnProduct(page, productId);
    await expect(statusBadge(page, "Опубликован")).toBeVisible();
    await expect(page.getByRole("link", { name: "Витрина RU" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Витрина RO" })).toBeVisible();

    const dbRow = await adminRead.getProductBySku(product.sku);
    expect(dbRow?.is_published).toBe(true);
  });

  test("ADM-PROD-07: old_price <= price rejected", async ({
    page,
    runId,
    factories,
  }) => {
    const category = factories.buildCategoryData(runId, {
      isPublished: true,
    });
    const categoryId = await createCategoryViaUI(page, category);
    const product = factories.buildProductData(runId, categoryId, {
      price: "100.00",
      oldPrice: "50.00",
    });

    await fillProductForm(page, product);
    await page.getByRole("button", { name: "Сохранить товар" }).click();

    await expectErrorNotice(page, "validation", VALIDATION_ERROR);
    expect(await adminRead.getProductBySku(product.sku)).toBeNull();
  });

  test("ADM-PROD-08: Publish without RO rejected", async ({
    page,
    runId,
    factories,
  }) => {
    const category = factories.buildCategoryData(runId, {
      isPublished: true,
    });
    const categoryId = await createCategoryViaUI(page, category);
    const product = factories.buildProductData(runId, categoryId);

    await fillProductForm(page, product, { skipRo: true, publish: true });
    // HTML5 required on RO fields mirrors the UI rule (report DOC-02); strip
    // it to exercise the SERVER-side publish check with RO truly missing.
    await page.evaluate(() => {
      document
        .querySelectorAll<HTMLInputElement>(
          'input[name^="ro_"], textarea[name^="ro_"]',
        )
        .forEach((el) => {
          el.required = false;
        });
    });
    await page.getByRole("button", { name: "Сохранить товар" }).click();

    await expectErrorNotice(
      page,
      "Published product requires ru and ro",
      RU_RO_REQUIRED_ERROR,
    );
    expect(await adminRead.getProductBySku(product.sku)).toBeNull();
  });

  test("ADM-PROD-09: Publish under draft category rejected", async ({
    page,
    runId,
    factories,
  }) => {
    // Draft parent category (default factory state: isPublished false).
    const category = factories.buildCategoryData(runId);
    const categoryId = await createCategoryViaUI(page, category);
    const product = factories.buildProductData(runId, categoryId);

    await fillProductForm(page, product, { publish: true });
    await page.getByRole("button", { name: "Сохранить товар" }).click();

    await expectErrorNotice(
      page,
      "Published product requires a published category",
      CATEGORY_NOT_PUBLISHED_ERROR,
    );
    expect(await adminRead.getProductBySku(product.sku)).toBeNull();
  });

  test("ADM-PROD-10: Invalid price format rejected", async ({
    page,
    runId,
    factories,
  }) => {
    const category = factories.buildCategoryData(runId, {
      isPublished: true,
    });
    const categoryId = await createCategoryViaUI(page, category);
    // Leading zero survives the MoneyInput digit filter but violates the
    // server money regex `^(0|[1-9]\d{0,12})(\.\d{1,2})?$`.
    const product = factories.buildProductData(runId, categoryId, {
      price: "007",
      oldPrice: "",
    });

    await fillProductForm(page, product);
    await page.getByRole("button", { name: "Сохранить товар" }).click();

    await expectErrorNotice(page, "validation", VALIDATION_ERROR);
    expect(await adminRead.getProductBySku(product.sku)).toBeNull();
  });

  test("ADM-PROD-11: Checklist + publish + storefront links", async ({
    page,
    runId,
    factories,
  }) => {
    const category = factories.buildCategoryData(runId, {
      isPublished: true,
    });
    const categoryId = await createCategoryViaUI(page, category);
    const product = factories.buildProductData(runId, categoryId);
    const productId = await createProductViaUI(page, product);
    await publishOwnProduct(page, productId);

    for (const label of CHECKLIST_LABELS) {
      await expect(
        page.locator("#admin-main li").filter({ hasText: label }),
      ).toContainText("✓");
    }

    const showcase = page.getByRole("link", { name: "Витрина RU" });
    await expect(showcase).toBeVisible();
    await expect(showcase).toHaveAttribute(
      "href",
      `/ru/product/${product.slugRu}`,
    );

    const response = await page.request.get(`/ru/product/${product.slugRu}`);
    expect(response.status()).toBe(200);
  });

  test("ADM-PROD-12: Archive product hides storefront", async ({
    page,
    runId,
    factories,
  }) => {
    const category = factories.buildCategoryData(runId, {
      isPublished: true,
    });
    const categoryId = await createCategoryViaUI(page, category);
    const product = factories.buildProductData(runId, categoryId, {
      isPublished: true,
    });
    const productId = await createProductViaUI(page, product);

    // Visible while published.
    const before = await page.request.get(`/ru/product/${product.slugRu}`);
    expect(before.status()).toBe(200);

    await page.goto(`/admin/products/${productId}`);
    let dialogMessage: string | undefined;
    page.once("dialog", (dialog) => {
      dialogMessage = dialog.message();
      void dialog.accept();
    });
    await adminForm(page, "archive-product")
      .getByRole("button", { name: "Архивировать" })
      .click();
    await expectSaved(page);
    expect(dialogMessage).toBe("Архивировать товар?");
    await expect(statusBadge(page, "Архив")).toBeVisible();

    const after = await page.request.get(`/ru/product/${product.slugRu}`);
    expect(after.status()).toBe(404);
  });

  test("ADM-PROD-13: Upload image with alts (happy path)", async ({
    page,
    runId,
    factories,
  }) => {
    const category = factories.buildCategoryData(runId);
    const categoryId = await createCategoryViaUI(page, category);
    const product = factories.buildProductData(runId, categoryId);
    const productId = await createProductViaUI(page, product);

    await uploadProductImage(page, productId);

    await expect(adminForm(page, "image-upload")).toBeVisible();
    await expect(page.getByText("Главное").first()).toBeVisible();
    expect((await adminRead.getProductImagePaths(productId)).length).toBe(1);
    const storageObjects = await adminRead.listStorageObjects(
      "product-images",
      productId,
    );
    expect(storageObjects.length).toBeGreaterThan(0);
  });

  test("ADM-PROD-14: Delete image confirm", async ({
    page,
    runId,
    factories,
  }) => {
    const category = factories.buildCategoryData(runId);
    const categoryId = await createCategoryViaUI(page, category);
    const product = factories.buildProductData(runId, categoryId);
    const productId = await createProductViaUI(page, product);
    await uploadProductImage(page, productId);
    expect((await adminRead.getProductImagePaths(productId)).length).toBe(1);

    await page.goto(`/admin/products/${productId}`);
    let dialogMessage: string | undefined;
    page.once("dialog", (dialog) => {
      dialogMessage = dialog.message();
      void dialog.accept();
    });
    await page.getByRole("button", { name: "Удалить изображение" }).click();
    await expect(
      page.getByRole("button", { name: "Удалить изображение" }),
    ).toHaveCount(0);
    expect(dialogMessage).toBe("Удалить изображение из каталога и Storage?");

    // Fully removed: no metadata row and no storage object left.
    expect((await adminRead.getProductImagePaths(productId)).length).toBe(0);
    const storageObjects = await adminRead.listStorageObjects(
      "product-images",
      productId,
    );
    expect(storageObjects.length).toBe(0);
  });

  test("ADM-PROD-15: Preview RU for draft", async ({
    page,
    runId,
    factories,
  }) => {
    const category = factories.buildCategoryData(runId);
    const categoryId = await createCategoryViaUI(page, category);
    const product = factories.buildProductData(runId, categoryId);
    const productId = await createProductViaUI(page, product);

    await page.goto(`/admin/products/${productId}`);
    await page.getByRole("link", { name: "Preview RU" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/admin/products/${productId}/preview/ru$`),
    );
    await expect(page.getByText("Защищённый preview RU").first()).toBeVisible();
    await expect(
      page.getByRole("link", { name: "← К редактору" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: product.nameRu }),
    ).toBeVisible();
  });

  test("ADM-PROD-16: Required attribute missing publish blocked", async ({
    page,
    runId,
    factories,
  }) => {
    const category = factories.buildCategoryData(runId, {
      isPublished: true,
    });
    const categoryId = await createCategoryViaUI(page, category);
    const attrData = factories.buildAttributeData(runId, "number");
    const attributeId = await createAttributeViaUI(page, attrData);
    await bindAttributeToCategory(page, attributeId, categoryId);
    await page.goto(`/admin/attributes/${attributeId}`);
    const form = page
      .locator("form")
      .filter({ has: page.locator('input[name="is_required"]') });
    await form.locator('input[name="is_required"]').check();
    await form.getByRole("button", { name: "Сохранить привязку" }).click();
    await expectSaved(page);

    const product = factories.buildProductData(runId, categoryId);
    const productId = await createProductViaUI(page, product);
    await page.goto(`/admin/products/${productId}`);
    await page.locator('input[name="is_published"]').check();
    await page.getByRole("button", { name: "Сохранить товар" }).click();

    await expectErrorNotice(
      page,
      "missing a required attribute",
      MISSING_ATTRIBUTE_ERROR,
    );
    const dbRow = await adminRead.getProductBySku(product.sku);
    expect(dbRow?.is_published).toBe(false);
  });

  test("ADM-PROD-17: Product attributes save", async ({
    page,
    runId,
    factories,
  }) => {
    const category = factories.buildCategoryData(runId, {
      isPublished: true,
    });
    const categoryId = await createCategoryViaUI(page, category);
    const attrData = factories.buildAttributeData(runId, "number");
    const attributeId = await createAttributeViaUI(page, attrData);
    await bindAttributeToCategory(page, attributeId, categoryId);

    const product = factories.buildProductData(runId, categoryId);
    const productId = await createProductViaUI(page, product);

    await page.goto(`/admin/products/${productId}`);
    await page.locator(`input[name="attribute_${attributeId}"]`).fill("7.5");
    await page
      .getByRole("button", { name: "Сохранить характеристики" })
      .click();
    await expectSaved(page);

    // Persisted after a fresh load and present in the DB.
    await page.goto(`/admin/products/${productId}`);
    await expect(
      page.locator(`input[name="attribute_${attributeId}"]`),
    ).toHaveValue("7.5");
    const values = await adminRead.getProductAttributeValues(productId);
    expect(values.length).toBe(1);
    expect(Number(values[0].number_value)).toBeCloseTo(7.5, 4);
  });

  test("ADM-PROD-18: Invalid locale preview shows not-found", async ({
    page,
  }) => {
    await page.goto(
      "/admin/products/00000000-0000-4000-8000-000000000099/preview/xx",
    );
    await expect(
      page.getByRole("heading", { name: "Запись не найдена" }),
    ).toBeVisible();
  });
});
