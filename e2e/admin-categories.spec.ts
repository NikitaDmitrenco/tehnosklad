import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";
import { statSync } from "node:fs";
import path from "node:path";
import { cleanupRunArtifacts } from "./helpers/cleanup";
import { adminRead } from "./helpers/admin-read";
import {
  expectErrorNotice,
  expectHtml5Blocked,
  expectSaved,
} from "./helpers/admin-ui";
import { formatRunSlug } from "./fixtures/run-id";
import {
  categoryLimits,
  imageLimits,
  IMAGE_TARGET_BYTES,
} from "../src/lib/limits";
import {
  gateClientChunks,
  injectGeneratedImage,
  oversizedAnimatedGif,
  waitForImageFormReady,
  waitForImageProcessed,
} from "./helpers/image-gen";

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
const TRUNCATED_PNG = path.resolve(
  process.cwd(),
  "e2e/fixtures/images/invalid/corrupt-truncated-png-valid-header.png",
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
    await waitForImageFormReady(page, 'input[name="image"]');
    await page.locator('input[name="image"]').setInputFiles(VALID_IMAGE);
    // CONTRACT ADDITION (image auto-compress): the selection is processed
    // asynchronously (decode → maybe resize); wait for the busy marker to
    // clear before submitting instead of racing the handler.
    await waitForImageProcessed(page, 'input[name="image"]');
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

  // CONTRACT CHANGE (image auto-compress): the form now DECODES the file on
  // selection (createImageBitmap). Bytes that are not an image fail the
  // decode, so the browser blocks the upload before submit — the server's
  // upload_extension_mismatch redirect (the old BUG-06 flow) is unreachable
  // for this fixture. The visible text is the compression module's decode
  // reason; the file still never leaves the browser.
  test("ADM-CAT-21: Invalid image content → blocked in browser, no submit", async ({
    page,
    runId,
    factories,
  }) => {
    const data = factories.buildCategoryData(runId);
    const categoryId = await factories.createCategoryViaUI(page, data);

    await page.goto(`/admin/categories/${categoryId}`);
    await waitForImageFormReady(page, 'input[name="image"]');
    await page.locator('input[name="image"]').setInputFiles(INVALID_IMAGE);
    await waitForImageProcessed(page, 'input[name="image"]');

    const error = page.getByRole("alert");
    await expect(error).toContainText("Браузер не может открыть это фото");
    await expect(error).toContainText("сохраните изображение заново");

    // The form never submitted: no navigation flags, button locked, page alive.
    const button = page.getByRole("button", { name: "Загрузить изображение" });
    await expect(button).toBeDisabled();
    expect(page.url()).not.toContain("saved=1");
    expect(page.url()).not.toContain("error=");
    await expect(
      page.getByRole("heading", { name: "Изображение категории" }),
    ).toBeVisible();
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

    await waitForImageFormReady(page, 'input[name="image"]');
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

  // CONTRACT CHANGE (image auto-compress): a truncated PNG no longer reaches
  // the server — the browser decode fails on selection and the form blocks
  // the submit with the decode reason. The old server-side upload_corrupted
  // redirect (full structure check: chunks, CRC, IEND) stays as the last
  // line of defence but is unreachable for this fixture.
  test("ADM-CAT-25: Truncated PNG → blocked in browser, no submit", async ({
    page,
    runId,
    factories,
  }) => {
    const data = factories.buildCategoryData(runId);
    const categoryId = await factories.createCategoryViaUI(page, data);
    await page.goto(`/admin/categories/${categoryId}`);
    await waitForImageFormReady(page, 'input[name="image"]');
    await page.locator('input[name="image"]').setInputFiles(TRUNCATED_PNG);
    await waitForImageProcessed(page, 'input[name="image"]');

    const error = page.getByRole("alert");
    await expect(error).toContainText("Браузер не может открыть это фото");

    const button = page.getByRole("button", { name: "Загрузить изображение" });
    await expect(button).toBeDisabled();
    expect(page.url()).not.toContain("saved=1");
    expect(page.url()).not.toContain("error=");
  });

  // --- Image auto-compress: the browser shrinks heavy photos on selection ---

  test("ADM-CAT-26: JPEG 4000×3000 >4 МБ compressed, notice shown, saved within limit", async ({
    page,
    runId,
    factories,
  }) => {
    const data = factories.buildCategoryData(runId);
    const categoryId = await factories.createCategoryViaUI(page, data);
    await page.goto(`/admin/categories/${categoryId}`);

    const original = await injectGeneratedImage(page, 'input[name="image"]', {
      kind: "noiseJpeg",
      name: "big-noise.jpg",
      width: 4000,
      height: 3000,
      quality: 0.95,
    });
    expect(original.size).toBeGreaterThan(imageLimits.maxBytes);
    await waitForImageProcessed(page, 'input[name="image"]');

    await expect(
      page.getByText(/Фото уменьшено: [\d.,]+ МБ → [\d.,]+ МБ \(2000×1500\)/),
    ).toBeVisible();

    const chosen = await page.locator('input[name="image"]').evaluate((el) => {
      const file = (el as HTMLInputElement).files?.[0];
      return file
        ? { size: file.size, type: file.type, name: file.name }
        : null;
    });
    expect(chosen?.type).toBe("image/jpeg");
    expect(chosen?.name).toBe("big-noise.jpg");
    expect(chosen!.size).toBeGreaterThan(1024);
    expect(chosen!.size).toBeLessThanOrEqual(IMAGE_TARGET_BYTES);

    await page.getByRole("button", { name: "Загрузить изображение" }).click();
    await expectSaved(page);

    const dbRow = await adminRead.getCategoryById(categoryId);
    const storagePath = dbRow?.image_storage_path as string;
    expect(storagePath.startsWith("categories/")).toBe(true);
    const fileName = storagePath.slice("categories/".length);
    const objects = await adminRead.listStorageObjects(
      "category-images",
      "categories",
    );
    const stored = objects.find((object) => object.name === fileName);
    expect(stored).toBeTruthy();
    const storedSize = Number(stored?.metadata?.size ?? 0);
    expect(storedSize).toBeGreaterThan(1024);
    expect(storedSize).toBeLessThanOrEqual(imageLimits.maxBytes);
  });

  test("ADM-CAT-27: File within limits uploads as-is, no compression message", async ({
    page,
    runId,
    factories,
  }) => {
    const data = factories.buildCategoryData(runId);
    const categoryId = await factories.createCategoryViaUI(page, data);
    await page.goto(`/admin/categories/${categoryId}`);

    const fixtureBytes = statSync(VALID_IMAGE).size;
    await waitForImageFormReady(page, 'input[name="image"]');
    await page.locator('input[name="image"]').setInputFiles(VALID_IMAGE);
    await waitForImageProcessed(page, 'input[name="image"]');

    await expect(page.getByText("Фото уменьшено")).toHaveCount(0);
    await expect(page.getByText("Уменьшаю фото…")).toHaveCount(0);
    const chosen = await page.locator('input[name="image"]').evaluate((el) => {
      const file = (el as HTMLInputElement).files?.[0];
      return file ? { size: file.size, name: file.name } : null;
    });
    expect(chosen).toEqual({
      size: fixtureBytes,
      name: "category-cover-1600x900.jpg",
    });

    await page.getByRole("button", { name: "Загрузить изображение" }).click();
    await expectSaved(page);
    await expect(
      page.locator('img[src*="category-images"]').first(),
    ).toBeVisible();
  });

  test("ADM-CAT-28: PNG with transparency stays PNG, alpha preserved", async ({
    page,
    runId,
    factories,
  }) => {
    const data = factories.buildCategoryData(runId);
    const categoryId = await factories.createCategoryViaUI(page, data);
    await page.goto(`/admin/categories/${categoryId}`);

    const original = await injectGeneratedImage(page, 'input[name="image"]', {
      kind: "alphaPng",
      name: "alpha-shape.png",
      width: 3000,
      height: 2000,
    });
    await waitForImageProcessed(page, 'input[name="image"]');

    await expect(
      page.getByText(
        /Фото уменьшено: [\d.,]+ [КМ]Б → [\d.,]+ [КМ]Б \(2000×1333\)/,
      ),
    ).toBeVisible();
    const chosen = await page.locator('input[name="image"]').evaluate((el) => {
      const file = (el as HTMLInputElement).files?.[0];
      return file
        ? { size: file.size, type: file.type, name: file.name }
        : null;
    });
    expect(chosen?.type).toBe("image/png");
    expect(chosen?.name).toBe("alpha-shape.png");
    expect(chosen!.size).toBeLessThanOrEqual(IMAGE_TARGET_BYTES);

    await page.getByRole("button", { name: "Загрузить изображение" }).click();
    await expectSaved(page);

    const dbRow = await adminRead.getCategoryById(categoryId);
    const storagePath = dbRow?.image_storage_path as string;
    const blob = await adminRead.downloadStorageObject(
      "category-images",
      storagePath,
    );
    const bytes = Buffer.from(await blob.arrayBuffer());
    expect(bytes.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    // Decode the STORED file and sample both halves: left stays transparent,
    // right stays opaque — the alpha channel survived resize + re-encode.
    const sample = await page.evaluate(async (base64) => {
      const raw = atob(base64);
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
      const bitmap = await createImageBitmap(
        new Blob([bytes], { type: "image/png" }),
      );
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("no 2d context");
      context.drawImage(bitmap, 0, 0);
      const mid = Math.floor(canvas.height / 2);
      const left = context.getImageData(10, mid, 1, 1).data;
      const right = context.getImageData(canvas.width - 10, mid, 1, 1).data;
      return {
        width: bitmap.width,
        height: bitmap.height,
        leftAlpha: left[3],
        rightAlpha: right[3],
      };
    }, bytes.toString("base64"));
    expect(sample.width).toBe(2000);
    expect(sample.height).toBe(1333);
    expect(sample.leftAlpha).toBe(0);
    expect(sample.rightAlpha).toBe(255);
    expect(chosen!.size).toBeLessThan(original.size);
  });

  test("ADM-CAT-29: Huge resolution at small size shrinks to IMAGE_MAX_SIDE", async ({
    page,
    runId,
    factories,
  }) => {
    const data = factories.buildCategoryData(runId);
    const categoryId = await factories.createCategoryViaUI(page, data);
    await page.goto(`/admin/categories/${categoryId}`);

    const original = await injectGeneratedImage(page, 'input[name="image"]', {
      kind: "gradientPng",
      name: "wide.png",
      width: 6000,
      height: 4500,
    });
    await waitForImageProcessed(page, 'input[name="image"]');

    await expect(
      page.getByText(
        /Фото уменьшено: [\d.,]+ [КМ]Б → [\d.,]+ [КМ]Б \(2000×1500\)/,
      ),
    ).toBeVisible();
    const chosen = await page.locator('input[name="image"]').evaluate((el) => {
      const file = (el as HTMLInputElement).files?.[0];
      return file ? { size: file.size, name: file.name } : null;
    });
    expect(chosen!.size).toBeLessThan(original.size);
    // Rule 7: opaque output is JPEG, so the extension follows the new type.
    expect(chosen?.name).toBe("wide.jpg");
    await expect(
      page.getByRole("button", { name: "Загрузить изображение" }),
    ).toBeEnabled();
  });

  test("ADM-CAT-30: Non-image file → clear error, form not submitted, input kept", async ({
    page,
    runId,
    factories,
  }) => {
    const data = factories.buildCategoryData(runId);
    const categoryId = await factories.createCategoryViaUI(page, data);
    await page.goto(`/admin/categories/${categoryId}`);

    // Typed data elsewhere on the page must survive the failed selection.
    await page.locator('input[name="ru_name"]').fill("Ценность до ошибки");

    await waitForImageFormReady(page, 'input[name="image"]');
    await page.locator('input[name="image"]').setInputFiles({
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Это не изображение, а обычный текстовый файл."),
    });
    await waitForImageProcessed(page, 'input[name="image"]');

    const error = page.getByRole("alert");
    await expect(error).toContainText("Недопустимый формат файла: TXT");
    await expect(error).toContainText("Разрешены JPG, PNG, WebP или AVIF");

    const button = page.getByRole("button", { name: "Загрузить изображение" });
    await expect(button).toBeDisabled();
    expect(page.url()).not.toContain("saved=1");
    expect(page.url()).not.toContain("error=");
    await expect(
      page.getByRole("heading", { name: "Изображение категории" }),
    ).toBeVisible();
    await expect(page.locator('input[name="ru_name"]')).toHaveValue(
      "Ценность до ошибки",
    );
  });

  test("ADM-CAT-31: Animated GIF above the limit → clear size error, no submit", async ({
    page,
    runId,
    factories,
  }) => {
    const data = factories.buildCategoryData(runId);
    const categoryId = await factories.createCategoryViaUI(page, data);
    await page.goto(`/admin/categories/${categoryId}`);

    const gif = oversizedAnimatedGif(Math.round(4.5 * 1024 * 1024));
    await waitForImageFormReady(page, 'input[name="image"]');
    await page.locator('input[name="image"]').setInputFiles({
      name: "anim.gif",
      mimeType: "image/gif",
      buffer: gif,
    });
    await waitForImageProcessed(page, 'input[name="image"]');

    // Pre-existing size error (size check runs first) states size, limit, fix.
    const error = page.getByRole("alert");
    await expect(error).toContainText("Файл 4,5 МБ");
    await expect(error).toContainText("максимум 4 МБ");
    await expect(error).toContainText("Уменьшите фото или сохраните как JPG");

    const button = page.getByRole("button", { name: "Загрузить изображение" });
    await expect(button).toBeDisabled();
    expect(page.url()).not.toContain("saved=1");
    expect(page.url()).not.toContain("error=");
  });

  test("ADM-CAT-32: EXIF orientation 6 respected — output is portrait 1333×2000", async ({
    page,
    runId,
    factories,
  }) => {
    const data = factories.buildCategoryData(runId);
    const categoryId = await factories.createCategoryViaUI(page, data);
    await page.goto(`/admin/categories/${categoryId}`);

    // Stored 3000×2000 landscape with orientation=6 (rotate 90° CW): the
    // browser must decode it as 2000×3000 portrait and resize along that.
    await injectGeneratedImage(page, 'input[name="image"]', {
      kind: "exifJpeg",
      name: "rotated.jpg",
      width: 3000,
      height: 2000,
      quality: 0.8,
      orientation: 6,
    });
    await waitForImageProcessed(page, 'input[name="image"]');

    await expect(
      page.getByText(
        /Фото уменьшено: [\d.,]+ [КМ]Б → [\d.,]+ [КМ]Б \(1333×2000\)/,
      ),
    ).toBeVisible();

    await page.getByRole("button", { name: "Загрузить изображение" }).click();
    await expectSaved(page);

    const dbRow = await adminRead.getCategoryById(categoryId);
    const storagePath = dbRow?.image_storage_path as string;
    const blob = await adminRead.downloadStorageObject(
      "category-images",
      storagePath,
    );
    const bytes = Buffer.from(await blob.arrayBuffer());
    // Parse the SOF0 frame header: coded dimensions of the stored JPEG.
    let offset = 2;
    let dims: { width: number; height: number } | null = null;
    while (offset + 4 <= bytes.length) {
      expect(bytes[offset]).toBe(0xff);
      const marker = bytes[offset + 1];
      if (marker === 0xc0 || marker === 0xc2) {
        dims = {
          height: bytes.readUInt16BE(offset + 5),
          width: bytes.readUInt16BE(offset + 7),
        };
        break;
      }
      offset += 2 + bytes.readUInt16BE(offset + 2);
    }
    expect(dims).toEqual({ width: 1333, height: 2000 });
  });

  test("ADM-CAT-33: File selected before hydration is processed after mount", async ({
    page,
    runId,
    factories,
  }) => {
    const data = factories.buildCategoryData(runId);
    const categoryId = await factories.createCategoryViaUI(page, data);

    const release = await gateClientChunks(page);
    try {
      // SSR HTML only — client scripts are held back (CSS is exempt so the
      // parser may finish), the component is not mounted, no onChange exists.
      await page.goto(`/admin/categories/${categoryId}`, {
        waitUntil: "commit",
      });
      await page
        .getByRole("heading", { name: "Изображение категории" })
        .waitFor({ state: "visible" });
      // The form must be fully parsed but NOT hydrated yet — otherwise the
      // test would exercise nothing.
      const input = page.locator('input[name="image"]');
      await expect(input).toHaveCount(1);
      await expect(input).not.toHaveAttribute("data-ready", "1");

      // Dispatch the change with NO readiness wait: React's listener does not
      // exist yet, so the event is lost for onChange; the mount effect must
      // pick the same file up instead.
      await injectGeneratedImage(
        page,
        'input[name="image"]',
        {
          kind: "gradientPng",
          name: "early.png",
          width: 3000,
          height: 2000,
        },
        { waitForReady: false },
      );
      // Still pre-hydration: the marker proves neither onChange nor mount ran.
      await expect(input).not.toHaveAttribute("data-ready", "1");
      await expect(input).not.toHaveAttribute("data-compressing", "1");
    } finally {
      await release();
    }

    // Hydration mounts the component → data-ready → self-heal processes the
    // pre-hydration file with the same messages a normal pick would show.
    await waitForImageFormReady(page, 'input[name="image"]');
    await waitForImageProcessed(page, 'input[name="image"]');
    await expect(
      page.getByText(
        /Фото уменьшено: [\d.,]+ [КМ]Б → [\d.,]+ [КМ]Б \(2000×1333\)/,
      ),
    ).toBeVisible();
    const chosen = await page.locator('input[name="image"]').evaluate((el) => {
      const file = (el as HTMLInputElement).files?.[0];
      return file ? { name: file.name, type: file.type } : null;
    });
    expect(chosen).toEqual({ name: "early.jpg", type: "image/jpeg" });
  });

  test("ADM-CAT-34: Submit before hydration with a heavy file → clear server size error", async ({
    page,
    runId,
    factories,
  }) => {
    const data = factories.buildCategoryData(runId);
    const categoryId = await factories.createCategoryViaUI(page, data);

    const release = await gateClientChunks(page);
    try {
      await page.goto(`/admin/categories/${categoryId}`, {
        waitUntil: "commit",
      });
      await page
        .getByRole("heading", { name: "Изображение категории" })
        .waitFor({ state: "visible" });
      // Must be genuinely pre-hydration: no data-ready marker yet.
      await expect(page.locator('input[name="image"]')).not.toHaveAttribute(
        "data-ready",
        "1",
      );
      // 4.2 MiB: over the 4 MiB app limit, under the 4.5 MB body cap, so the
      // request reaches the server action. The bytes never matter — the size
      // check runs first — which is why a padded buffer suffices here.
      const heavy = oversizedAnimatedGif(Math.round(4.2 * 1024 * 1024));
      await page.locator('input[name="image"]').setInputFiles({
        name: "heavy.jpg",
        mimeType: "image/jpeg",
        buffer: heavy,
      });
      // Pre-hydration only React's inline PE script (inside the SSR HTML)
      // can see this submit; it queues the FormData for the React runtime.
      await page.getByRole("button", { name: "Загрузить изображение" }).click();
    } finally {
      await release();
    }
    // React boots, replays the queued FormData with the ORIGINAL heavy file:
    // the server validator answers with the pre-existing size error text.
    await expectErrorNotice(
      page,
      "upload_too_large",
      "Файл 4,2 МБ, максимум 4 МБ. Уменьшите фото или сохраните как JPG.",
    );
  });
});
