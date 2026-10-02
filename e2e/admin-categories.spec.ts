import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";
import path from "node:path";
import { cleanupRunArtifacts } from "./helpers/cleanup";
import { adminRead } from "./helpers/admin-read";
import {
  expectErrorNotice,
  expectHtml5Blocked,
  expectSaved,
} from "./helpers/admin-ui";
import { formatRunSlug } from "./fixtures/run-id";

const VALID_IMAGE = path.resolve(
  process.cwd(),
  "e2e/fixtures/images/valid/category-cover-1600x900.jpg",
);
const INVALID_IMAGE = path.resolve(
  process.cwd(),
  "e2e/fixtures/images/invalid/text-renamed-to.png",
);
const OVERSIZE_IMAGE = path.resolve(
  process.cwd(),
  "e2e/fixtures/images/invalid/oversize-png-5mib-plus-1.png",
);

const SEED_CATEGORY_ID = "10000000-0000-4000-8000-000000000001";

const GENERIC_ERROR =
  "Операция не выполнена. Проверьте данные и повторите попытку.";
const DUPLICATE_ERROR = "Такой slug, код или SKU уже используется.";
const CATEGORY_IN_USE_ERROR =
  "Категория используется товарами или подкатегориями.";

interface CategoryFormValues {
  nameRu: string;
  slugRu: string;
  shortRu: string;
  nameRo: string;
  slugRo: string;
  shortRo: string;
}

/** Fill the whole category-save form (RU+RO required) and submit. */
async function fillAndSubmitCategoryForm(
  page: Page,
  values: CategoryFormValues,
): Promise<void> {
  await page.goto("/admin/categories/new");
  await page.locator('input[name="ru_name"]').fill(values.nameRu);
  await page.locator('input[name="ru_slug"]').fill(values.slugRu);
  await page
    .locator('textarea[name="ru_short_description"]')
    .fill(values.shortRu);
  await page
    .locator('textarea[name="ru_description"]')
    .fill("Полное описание теста категории.");
  await page.locator('input[name="ro_name"]').fill(values.nameRo);
  await page.locator('input[name="ro_slug"]').fill(values.slugRo);
  await page
    .locator('textarea[name="ro_short_description"]')
    .fill(values.shortRo);
  await page
    .locator('textarea[name="ro_description"]')
    .fill("Descriere completa categorie test.");
  await page.getByRole("button", { name: "Сохранить категорию" }).click();
}

function formValues(
  runId: string,
  over: Partial<CategoryFormValues> & Pick<CategoryFormValues, "slugRu">,
): CategoryFormValues {
  const suffix = runId.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    nameRu: `Тест ${suffix}`,
    shortRu: `Краткое описание ${suffix}`,
    nameRo: `Test ${suffix}`,
    slugRo: `${over.slugRu}-ro`,
    shortRo: `Descriere ${suffix}`,
    ...over, // supplies slugRu (required by the Pick) and any overrides
  };
}

test.describe("ADM-CAT: categories", () => {
  test.afterEach(async ({ runId }) => {
    await cleanupRunArtifacts(runId);
  });

  test("ADM-CAT-01: List shows seed published categories", async ({ page }) => {
    await page.goto("/admin/categories");
    const fridgeCard = page
      .locator("a.admin-list-card")
      .filter({ hasText: "Холодильники" });
    await expect(fridgeCard).toBeVisible();
    await expect(fridgeCard).toContainText("Опубликована");
    await expect(fridgeCard).toContainText("7 товаров");
    await expect(
      page.getByRole("link", { name: "Добавить категорию" }),
    ).toBeVisible();
  });

  test("ADM-CAT-10: creates draft category with full RU/RO (DB row)", async ({
    page,
    runId,
    factories,
  }) => {
    const data = factories.buildCategoryData(runId);
    const categoryId = await factories.createCategoryViaUI(page, data);

    await expectSaved(page);
    await expect(
      page.locator(
        'form[data-admin-form="category-save"] input[name="ru_name"]',
      ),
    ).toHaveValue(data.nameRu);

    const dbRow = await adminRead.getCategoryTranslation(data.slugRu);
    expect(dbRow).toBeTruthy();
    expect(dbRow?.category_id).toBe(categoryId);
    expect(dbRow?.name).toBe(data.nameRu);
    // Slug history is written on create.
    expect(await adminRead.countSlugRoutesBySlug(data.slugRu)).toBeGreaterThan(
      0,
    );
  });

  // DOC-03: UI/server limits (240/220/500) vs DB CHECK (160/180/280).
  // Values above the DB limit fail with generic operation_failed and leave no
  // partial rows. Asserted as observed — no test.fail() until the owner picks
  // the intended limit.
  test("ADM-CAT-10: text limits — 160/180/280 save, above fails atomically", async ({
    page,
    runId,
  }) => {
    test.setTimeout(180_000);
    const suffix = runId.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    // 1. At-limit values (DB CHECK boundaries) in one draft -> saved.
    const atLimitSlug = formatRunSlug("cat-limit", runId, "ru");
    await fillAndSubmitCategoryForm(page, {
      nameRu: "н".repeat(160),
      slugRu: atLimitSlug,
      shortRu: "к".repeat(280),
      nameRo: `RO ${suffix}`,
      slugRo: formatRunSlug("cat-limit", runId, "ro"),
      shortRo: "r".repeat(280),
    });
    await expectSaved(page);
    expect(await adminRead.getCategoryTranslation(atLimitSlug)).toBeTruthy();

    // 2. One field at a time just above the DB limit (and at the UI max):
    //    each must fail generically and leave zero rows.
    const overLimitCases: CategoryFormValues[] = [
      formValues(runId, {
        nameRu: "н".repeat(161),
        slugRu: `cat-n161-${suffix}`,
      }),
      formValues(runId, {
        slugRu: `cat-s181-${suffix}`.padEnd(181, "a").slice(0, 181),
      }),
      formValues(runId, {
        slugRu: `cat-sh281-${suffix}`,
        shortRu: "к".repeat(281),
      }),
      formValues(runId, {
        nameRu: "н".repeat(240),
        slugRu: `cat-n240-${suffix}`,
      }),
      formValues(runId, {
        slugRu: `cat-s220-${suffix}`.padEnd(220, "a").slice(0, 220),
      }),
      formValues(runId, {
        slugRu: `cat-sh500-${suffix}`,
        shortRu: "к".repeat(500),
      }),
    ];

    for (const values of overLimitCases) {
      await fillAndSubmitCategoryForm(page, values);
      await expectErrorNotice(page, "operation_failed", GENERIC_ERROR);
      expect(await adminRead.getCategoryTranslation(values.slugRu)).toBeNull();
      expect(await adminRead.countSlugRoutesBySlug(values.slugRu)).toBe(0);
    }
  });

  test("ADM-CAT-11: duplicate slug rejected", async ({
    page,
    runId,
    factories,
  }) => {
    const data = factories.buildCategoryData(runId);
    await factories.createCategoryViaUI(page, data);

    // Second attempt reuses both slugs with different names.
    await fillAndSubmitCategoryForm(page, {
      nameRu: `Дубль ${runId}`,
      slugRu: data.slugRu,
      shortRu: `Краткое описание дубля ${runId}`,
      nameRo: `Dublu ${runId}`,
      slugRo: data.slugRo,
      shortRo: `Descriere scurta dubla ${runId}`,
    });

    await expectErrorNotice(page, "duplicate key", DUPLICATE_ERROR);
    // Original still the only owner of each slug.
    expect(await adminRead.countTranslationsBySlug(data.slugRu)).toBe(1);
    expect(await adminRead.countTranslationsBySlug(data.slugRo)).toBe(1);
  });

  test("ADM-CAT-12: empty RO blocked by HTML5", async ({ page, runId }) => {
    const slug = formatRunSlug("cat-ro", runId, "ru");
    await page.goto("/admin/categories/new");
    await page.locator('input[name="ru_name"]').fill(`Без RO ${runId}`);
    await page.locator('input[name="ru_slug"]').fill(slug);
    await page
      .locator('textarea[name="ru_short_description"]')
      .fill(`Краткое описание ${runId}`);
    await page
      .locator('textarea[name="ru_description"]')
      .fill(`Полное описание ${runId}`);
    // RO name/slug/description intentionally left empty.

    await page.getByRole("button", { name: "Сохранить категорию" }).click();

    await expectHtml5Blocked(
      page,
      'input[name="ro_name"]',
      "/admin/categories/new",
    );
    expect(await adminRead.getCategoryTranslation(slug)).toBeNull();
    expect(await adminRead.countSlugRoutesBySlug(slug)).toBe(0);
  });

  test("ADM-CAT-17: edit name + slug persists and shows in list", async ({
    page,
    runId,
    factories,
  }) => {
    const data = factories.buildCategoryData(runId);
    const categoryId = await factories.createCategoryViaUI(page, data);

    // Fresh URL (no ?saved=1) so the save redirect visibly changes it.
    await page.goto(`/admin/categories/${categoryId}`);
    const newName = `Переименовано ${runId}`;
    const newSlug = formatRunSlug("cat2", runId, "ru");
    await page.locator('input[name="ru_name"]').fill(newName);
    await page.locator('input[name="ru_slug"]').fill(newSlug);
    await page.getByRole("button", { name: "Сохранить категорию" }).click();
    await expectSaved(page);

    // List card carries the new name.
    await page.goto("/admin/categories");
    const card = page.locator("a.admin-list-card").filter({ hasText: newName });
    await expect(card).toBeVisible();

    // DB: new slug owns the row; old slug no longer resolves.
    const row = await adminRead.getCategoryTranslation(newSlug);
    expect(row?.name).toBe(newName);
    expect(await adminRead.getCategoryTranslation(data.slugRu)).toBeNull();
  });

  test("ADM-CAT-18: archive empty draft + restore", async ({
    page,
    runId,
    factories,
  }) => {
    const data = factories.buildCategoryData(runId);
    const categoryId = await factories.createCategoryViaUI(page, data);

    // Fresh URL so the archive redirect visibly adds ?saved=1.
    await page.goto(`/admin/categories/${categoryId}`);
    let dialogMessage: string | undefined;
    page.once("dialog", (dialog) => {
      dialogMessage = dialog.message();
      void dialog.accept();
    });
    await page.getByRole("button", { name: "Архивировать" }).click();
    await expectSaved(page);
    expect(dialogMessage).toBe("Архивировать категорию?");
    // The confirm button swaps to the restore action only after the server
    // processed the archive — that is the trustworthy completion signal here
    // (restore later re-uses the same ?saved=1 URL).
    await expect(
      page.getByRole("button", { name: "Восстановить" }),
    ).toBeVisible();

    await page.goto("/admin/categories");
    await expect(
      page.locator("a.admin-list-card").filter({ hasText: data.nameRu }),
    ).toContainText("Архив");

    await page.goto(`/admin/categories/${categoryId}`);
    dialogMessage = undefined;
    page.once("dialog", (dialog) => {
      dialogMessage = dialog.message();
      void dialog.accept();
    });
    await page.getByRole("button", { name: "Восстановить" }).click();
    await expect(
      page.getByRole("button", { name: "Архивировать" }),
    ).toBeVisible();
    expect(dialogMessage).toBe("Восстановить категорию как черновик?");

    await page.goto("/admin/categories");
    await expect(
      page.locator("a.admin-list-card").filter({ hasText: data.nameRu }),
    ).toContainText("Черновик");
  });

  test("ADM-CAT-19: archive category in use is blocked", async ({ page }) => {
    await page.goto(`/admin/categories/${SEED_CATEGORY_ID}`);

    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("button", { name: "Архивировать" }).click();
    await expectErrorNotice(page, "category_in_use", CATEGORY_IN_USE_ERROR);

    // Outcome: seed category stays unarchived (read-only in effect).
    const seed = await adminRead.getCategoryById(SEED_CATEGORY_ID);
    expect(seed?.archived_at).toBeNull();
    expect(seed?.is_published).toBe(true);
  });

  test("ADM-CAT-02: Add link opens new form", async ({ page }) => {
    await page.goto("/admin/categories");
    await page.getByRole("link", { name: "Добавить категорию" }).click();
    await expect(page).toHaveURL(/\/admin\/categories\/new$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Новая категория" }),
    ).toBeVisible();
  });

  test("ADM-CAT-13: invalid slug pattern blocked by HTML5", async ({
    page,
    runId,
  }) => {
    const nameRu = `Плохой slug ${runId}`;
    await page.goto("/admin/categories/new");
    await page.locator('input[name="ru_name"]').fill(nameRu);
    await page.locator('input[name="ru_slug"]').fill("Bad Slug");
    await page
      .locator('textarea[name="ru_short_description"]')
      .fill(`Краткое описание ${runId}`);
    await page
      .locator('textarea[name="ru_description"]')
      .fill(`Полное описание ${runId}`);
    await page.locator('input[name="ro_name"]').fill(`Slug rau ${runId}`);
    await page.locator('input[name="ro_slug"]').fill("bad-slug-ro");
    await page
      .locator('textarea[name="ro_short_description"]')
      .fill(`Descriere ${runId}`);
    await page
      .locator('textarea[name="ro_description"]')
      .fill(`Descriere completa ${runId}`);

    await page.getByRole("button", { name: "Сохранить категорию" }).click();

    await expectHtml5Blocked(
      page,
      'input[name="ru_slug"]',
      "/admin/categories/new",
    );
    expect(await adminRead.countCategoriesByRunSlug(runId)).toBe(0);
  });

  test("ADM-CAT-14: publish with full RU/RO", async ({
    page,
    runId,
    factories,
  }) => {
    const data = factories.buildCategoryData(runId, { isPublished: true });
    const categoryId = await factories.createCategoryViaUI(page, data);
    await expectSaved(page);

    const dbRow = await adminRead.getCategoryById(categoryId);
    expect(dbRow?.is_published).toBe(true);

    await page.goto("/admin/categories");
    await expect(
      page.locator("a.admin-list-card").filter({ hasText: data.nameRu }),
    ).toContainText("Опубликована");
  });

  // Known behavior (BUG-04, no test.fail per report): unmapped DB message
  // "Published child category requires a published parent" surfaces as the
  // generic operation_failed error.
  test("ADM-CAT-15: child publish under draft parent rejected", async ({
    page,
    runId,
    factories,
  }) => {
    const parent = factories.buildCategoryData(runId, {
      nameRu: `Родитель ${runId}`,
      nameRo: `Parinte ${runId}`,
    });
    const parentId = await factories.createCategoryViaUI(page, parent);

    const child = formValues(runId, {
      nameRu: `Дитя ${runId}`,
      slugRu: formatRunSlug("cat-child", runId, "ru"),
      nameRo: `Copil ${runId}`,
      slugRo: formatRunSlug("cat-child", runId, "ro"),
    });
    await page.goto("/admin/categories/new");
    await page.locator('select[name="parent_id"]').selectOption(parentId);
    await page.locator('input[name="is_published"]').check();
    await page.locator('input[name="ru_name"]').fill(child.nameRu);
    await page.locator('input[name="ru_slug"]').fill(child.slugRu);
    await page
      .locator('textarea[name="ru_short_description"]')
      .fill(child.shortRu);
    await page
      .locator('textarea[name="ru_description"]')
      .fill("Полное описание дитяти.");
    await page.locator('input[name="ro_name"]').fill(child.nameRo);
    await page.locator('input[name="ro_slug"]').fill(child.slugRo);
    await page
      .locator('textarea[name="ro_short_description"]')
      .fill(child.shortRo);
    await page
      .locator('textarea[name="ro_description"]')
      .fill("Descriere completa copil.");
    await page.getByRole("button", { name: "Сохранить категорию" }).click();

    await expectErrorNotice(page, "operation_failed", GENERIC_ERROR);
    expect(await adminRead.getCategoryTranslation(child.slugRu)).toBeNull();
    expect(await adminRead.countSlugRoutesBySlug(child.slugRu)).toBe(0);
  });

  test("ADM-CAT-03: Archived badge appears after archive", async ({
    page,
    runId,
    factories,
  }) => {
    const data = factories.buildCategoryData(runId);
    await factories.createCategoryViaUI(page, data);

    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("button", { name: "Архивировать" }).click();
    // ?saved=1 is already in the URL from the create step, so the button
    // swap to «Восстановить» is the trustworthy completion signal.
    await expect(
      page.getByRole("button", { name: "Восстановить" }),
    ).toBeVisible();

    await page.goto("/admin/categories");
    await expect(
      page.locator("a.admin-list-card").filter({ hasText: data.nameRu }),
    ).toContainText("Архив");
  });

  // known bug BUG-01: UI SEO maxLength 70/160 vs doc/server max 180/320
  test("ADM-CAT-16: SEO fields accept documented max 180/320 (BUG-01)", async ({
    page,
  }) => {
    test.fail(
      true,
      "BUG-01: SEO inputs truncate to 70/160 via HTML maxLength (admin guide §7.2 allows 180/320)",
    );
    await page.goto("/admin/categories/new");
    await page.locator('input[name="ru_seo_title"]').fill("т".repeat(180));
    await page
      .locator('textarea[name="ru_seo_description"]')
      .fill("д".repeat(320));
    // Single intended assertion last: full documented length must survive.
    await expect(page.locator('input[name="ru_seo_title"]')).toHaveValue(
      "т".repeat(180),
    );
  });

  test("ADM-CAT-22: old public category URL redirects after slug change", async ({
    page,
    runId,
    factories,
  }) => {
    const data = factories.buildCategoryData(runId, { isPublished: true });
    const categoryId = await factories.createCategoryViaUI(page, data);

    await page.goto(`/admin/categories/${categoryId}`);
    const newSlug = formatRunSlug("cat3", runId, "ru");
    await page.locator('input[name="ru_slug"]').fill(newSlug);
    await page.getByRole("button", { name: "Сохранить категорию" }).click();
    await expectSaved(page);

    // Old public URL must permanently redirect to the current slug
    // (category_slug_routes, page.tsx:74 permanentRedirect -> HTTP 308).
    const resp = await page.request.get(`/ru/category/${data.slugRu}`, {
      maxRedirects: 0,
    });
    expect(resp.status()).toBe(308);
    expect(resp.headers()["location"] ?? "").toContain(newSlug);
  });

  test("ADM-CAT-20: Upload valid category image", async ({
    page,
    runId,
    factories,
  }) => {
    const data = factories.buildCategoryData(runId);
    const categoryId = await factories.createCategoryViaUI(page, data);

    await page.goto(`/admin/categories/${categoryId}`);
    await page.locator('input[name="image"]').setInputFiles(VALID_IMAGE);
    await page.getByRole("button", { name: "Загрузить изображение" }).click();
    await expectSaved(page);

    // Visible image served from the category-images bucket.
    await expect(
      page.locator('img[src*="category-images"]').first(),
    ).toBeVisible();
    const dbRow = await adminRead.getCategoryById(categoryId);
    expect(dbRow?.image_storage_path).toBeTruthy();

    // Object exists at the exact stored key (path is categories/{random}.ext).
    const storagePath = dbRow?.image_storage_path as string;
    expect(storagePath.startsWith("categories/")).toBe(true);
    const fileName = storagePath.slice("categories/".length);
    const objects = await adminRead.listStorageObjects(
      "category-images",
      "categories",
    );
    expect(objects.some((o: { name: string }) => o.name === fileName)).toBe(
      true,
    );
  });

  // fixed BUG-06: upload_* codes reach the UI with a concrete cause.
  test("ADM-CAT-21: Invalid image content → extension mismatch (BUG-06)", async ({
    page,
    runId,
    factories,
  }) => {
    const data = factories.buildCategoryData(runId);
    const categoryId = await factories.createCategoryViaUI(page, data);

    await page.goto(`/admin/categories/${categoryId}`);
    await page.locator('input[name="image"]').setInputFiles(INVALID_IMAGE);
    await page.getByRole("button", { name: "Загрузить изображение" }).click();
    // Single intended assertion last (errors.ts upload_extension_mismatch).
    await expectErrorNotice(
      page,
      "upload_extension_mismatch",
      "Содержимое файла не соответствует его расширению. Сохраните изображение заново в том же формате и повторите загрузку.",
    );
  });

  // BUG-06 client-side gate: the oversize file must never reach the server.
  test("ADM-CAT-23: Oversize image blocked in browser with size and limit", async ({
    page,
    runId,
    factories,
  }) => {
    const data = factories.buildCategoryData(runId);
    const categoryId = await factories.createCategoryViaUI(page, data);
    await page.goto(`/admin/categories/${categoryId}`);

    // The hint is visible before any error appears.
    await expect(
      page.getByText("до 4 МБ", { exact: false }).first(),
    ).toBeVisible();

    await page.locator('input[name="image"]').setInputFiles(OVERSIZE_IMAGE);
    // The error states the actual size, the limit and what to do.
    const error = page.getByRole("alert").filter({ hasText: "максимум 4 МБ" });
    await expect(error).toBeVisible();
    await expect(error).toContainText("Файл 5,0 МБ");
    await expect(error).toContainText("Уменьшите фото или сохраните как JPG");

    // Submit is blocked: no navigation, no saved/error flags, page alive.
    const button = page.getByRole("button", { name: "Загрузить изображение" });
    await expect(button).toBeDisabled();
    expect(page.url()).not.toContain("saved=1");
    expect(page.url()).not.toContain("error=");
    await expect(
      page.getByRole("heading", { name: "Изображение категории" }),
    ).toBeVisible();
  });
});
