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
import { categoryLimits } from "../src/lib/limits";

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

  // DOC-03 fixed: UI, server and DB share limits.ts (160/180/280 for
  // categories). Over-limit input is clamped by the browser's maxLength to
  // exactly the limit, so the row saves at the boundary. The DB-side 23514
  // safety net ("Поле «X»: максимум N символов") is covered by
  // tests/admin-errors.test.ts. Lengths below come from src/lib/limits.ts.
  test("ADM-CAT-10: text limits — save at limits.ts boundary, above clamped", async ({
    page,
    runId,
  }) => {
    test.setTimeout(180_000);
    const suffix = runId.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    // 1. At-limit values (DB CHECK boundaries) in one draft -> saved.
    const atLimitSlug = formatRunSlug("cat-limit", runId, "ru");
    await fillAndSubmitCategoryForm(page, {
      nameRu: "н".repeat(categoryLimits.name),
      slugRu: atLimitSlug,
      shortRu: "к".repeat(categoryLimits.shortDescription),
      nameRo: `RO ${suffix}`,
      slugRo: formatRunSlug("cat-limit", runId, "ro"),
      shortRo: "r".repeat(categoryLimits.shortDescription),
    });
    await expectSaved(page);
    expect(await adminRead.getCategoryTranslation(atLimitSlug)).toBeTruthy();

    // 2. Name above the limit (limit+1 and the old UI cap 240): browser
    //    clamps to the limit, the row stores exactly the limit.
    for (const length of [categoryLimits.name + 1, 240]) {
      const slugRu = `cat-n${length}-${suffix}`;
      await fillAndSubmitCategoryForm(page, {
        ...formValues(runId, { nameRu: "н".repeat(length), slugRu }),
        slugRo: `cat-n${length}-ro-${suffix}`,
      });
      await expectSaved(page);
      const row = await adminRead.getCategoryTranslation(slugRu);
      expect(row?.name).toHaveLength(categoryLimits.name);
    }

    // 3. Short description above the limit (limit+1 and the old UI cap 500).
    for (const length of [categoryLimits.shortDescription + 1, 500]) {
      const slugRu = `cat-sh${length}-${suffix}`;
      await fillAndSubmitCategoryForm(page, {
        ...formValues(runId, { shortRu: "к".repeat(length), slugRu }),
        slugRo: `cat-sh${length}-ro-${suffix}`,
      });
      await expectSaved(page);
      const row = await adminRead.getCategoryTranslation(slugRu);
      expect(row?.short_description).toHaveLength(
        categoryLimits.shortDescription,
      );
    }

    // 4. Slug above the limit (limit+1 and the old UI cap 220): clamped to
    //    the limit. The RO slug must stay distinct after the same clamping,
    //    otherwise RU and RO collapse to one string (uniqueness is per
    //    locale, so both rows would legally exist and break the lookup).
    for (const length of [categoryLimits.slug + 1, 220]) {
      const fullSlug = `cat-s${length}-${suffix}`.padEnd(length, "a");
      const storedSlug = fullSlug.slice(0, categoryLimits.slug);
      await fillAndSubmitCategoryForm(page, {
        ...formValues(runId, { slugRu: fullSlug }),
        slugRo: `cat-s${length}-ro-${suffix}`,
      });
      await expectSaved(page);
      const row = await adminRead.getCategoryTranslation(storedSlug);
      expect(row?.slug).toHaveLength(categoryLimits.slug);
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

    // BUG-04 fixed: the trigger message reaches the UI verbatim.
    await expectErrorNotice(
      page,
      "Published child category requires a published parent",
      "Нельзя опубликовать подкатегорию, пока родительская категория не опубликована. Сначала опубликуйте родительскую.",
    );
    expect(await adminRead.getCategoryTranslation(child.slugRu)).toBeNull();
    expect(await adminRead.countSlugRoutesBySlug(child.slugRu)).toBe(0);
  });

  // BUG-04 reverse direction: a parent cannot be unpublished (or archived)
  // while published children exist.
  test("ADM-CAT-24: unpublishing parent with published child rejected", async ({
    page,
    runId,
    factories,
  }) => {
    const parent = factories.buildCategoryData(runId, {
      nameRu: `Родитель-24 ${runId}`,
      nameRo: `Parinte-24 ${runId}`,
      isPublished: true,
    });
    const parentId = await factories.createCategoryViaUI(page, parent);

    // Published child under the published parent.
    await page.goto("/admin/categories/new");
    await page.locator('select[name="parent_id"]').selectOption(parentId);
    await page.locator('input[name="is_published"]').check();
    await page.locator('input[name="ru_name"]').fill(`Дитя-24 ${runId}`);
    await page
      .locator('input[name="ru_slug"]')
      .fill(formatRunSlug("cat-child24", runId, "ru"));
    await page
      .locator('textarea[name="ru_short_description"]')
      .fill(`Краткое ${runId}`);
    await page
      .locator('textarea[name="ru_description"]')
      .fill("Полное описание дитяти-24.");
    await page.locator('input[name="ro_name"]').fill(`Copil-24 ${runId}`);
    await page
      .locator('input[name="ro_slug"]')
      .fill(formatRunSlug("cat-child24", runId, "ro"));
    await page
      .locator('textarea[name="ro_short_description"]')
      .fill(`Scurt ${runId}`);
    await page
      .locator('textarea[name="ro_description"]')
      .fill("Descriere completa copil-24.");
    await page.getByRole("button", { name: "Сохранить категорию" }).click();
    await expectSaved(page);

    // Unpublish the parent — must be rejected with the concrete reason.
    await page.goto(`/admin/categories/${parentId}`);
    await page.locator('input[name="is_published"]').uncheck();
    await page.getByRole("button", { name: "Сохранить категорию" }).click();
    await expectErrorNotice(
      page,
      "Published child categories require an active parent",
      "Нельзя снять категорию с публикации или архивировать её, пока есть опубликованные подкатегории. Сначала снимите с публикации подкатегории.",
    );
    // The parent stays published in the database.
    const parentRow = await adminRead.getCategoryById(parentId);
    expect(parentRow?.is_published).toBe(true);
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

  // fixed BUG-01: hard limit from limits.ts (180/320) + soft threshold
  // (70/160) with an explanatory warning above it.
  test("ADM-CAT-16: SEO fields accept 180/320 and warn past 70/160 (BUG-01)", async ({
    page,
  }) => {
    await page.goto("/admin/categories/new");
    const title = page.locator('input[name="ru_seo_title"]');
    const description = page.locator('textarea[name="ru_seo_description"]');
    const titleWarning = page.getByText(
      "Поисковики могут обрезать, рекомендуется до 70 символов.",
    );
    const descriptionWarning = page.getByText(
      "Поисковики могут обрезать, рекомендуется до 160 символов.",
    );

    // Up to the recommended length: no warning.
    await title.fill("т".repeat(70));
    await expect(titleWarning).toHaveCount(0);

    // Above the recommended length: warning appears.
    await title.fill("т".repeat(71));
    await expect(titleWarning).toBeVisible();

    // Hard limit: the full documented length survives (was truncated at 70).
    await title.fill("т".repeat(180));
    await expect(title).toHaveValue("т".repeat(180));

    // Same thresholds for the description field (160 / 320).
    await description.fill("д".repeat(160));
    await expect(descriptionWarning).toHaveCount(0);
    await description.fill("д".repeat(161));
    await expect(descriptionWarning).toBeVisible();
    await description.fill("д".repeat(320));
    await expect(description).toHaveValue("д".repeat(320));
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
