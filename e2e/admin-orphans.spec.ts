import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getLocalAdminSupabase } from "./helpers/env";
import { adminRead } from "./helpers/admin-read";
import { expectSaved } from "./helpers/admin-ui";
import { createProductViaUI } from "./helpers/factories/product-ui";

const IMAGE_FIXTURE = path.resolve(
  process.cwd(),
  "e2e/fixtures/images/valid/product-photo-800x600.png",
);

const CONFIRM_ORPHAN_OBJECT = "Удалить orphan-файл из Storage?";
const CONFIRM_MISSING_OBJECT = "Удалить сломанную metadata-запись?";
const CONFIRM_PENDING = "Сверить объект и завершить либо отменить удаление?";

/** Upload a storage object without any product_images metadata row. */
async function uploadOrphanObject(): Promise<string> {
  const supabase = getLocalAdminSupabase();
  // Real orphans live under product folders: the scanner only descends into
  // UUID root folders (repository.ts) and reconcileImageEntryAction accepts
  // only `{uuid}/{uuid}.{ext}` paths — mirror that layout.
  const key = `${randomUUID()}/${randomUUID()}.png`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(key, fs.readFileSync(IMAGE_FIXTURE), { contentType: "image/png" });
  if (error) throw new Error(`[uploadOrphanObject] ${error.message}`);
  return key;
}

async function removeStorageObject(key: string): Promise<void> {
  const supabase = getLocalAdminSupabase();
  await supabase.storage.from("product-images").remove([key]);
}

/** Insert a product_images row whose storage object does NOT exist. */
async function insertMetadataRow(
  productId: string,
  options?: { pending?: boolean },
): Promise<string> {
  const supabase = getLocalAdminSupabase();
  const storagePath = `${productId}/${randomUUID()}.png`;
  const { error } = await supabase.from("product_images").insert({
    product_id: productId,
    storage_path: storagePath,
    sort_order: 0,
    is_primary: false,
    ...(options?.pending
      ? { deletion_pending_at: new Date().toISOString() }
      : {}),
  });
  if (error) throw new Error(`[insertMetadataRow] ${error.message}`);
  return storagePath;
}

function orphanCard(page: Page, pathText: string) {
  return page.locator("section.admin-card").filter({ hasText: pathText });
}

async function cleanEntry(
  page: Page,
  card: ReturnType<typeof orphanCard>,
  buttonName: string,
): Promise<string | undefined> {
  let dialogMessage: string | undefined;
  page.once("dialog", (dialog) => {
    dialogMessage = dialog.message();
    void dialog.accept();
  });
  await card.getByRole("button", { name: buttonName }).click();
  await expectSaved(page);
  return dialogMessage;
}

test.describe("ADM-ORPH: media orphans", () => {
  // Storage/metadata state is shared with other workers' image tests:
  // run this block sequentially so scans see a consistent world.
  test.describe.configure({ mode: "serial" });

  test("ADM-ORPH-01: Empty orphans state", async ({ page }) => {
    await page.goto("/admin/media/orphans");
    await expect(page.getByText("Orphan-файлов нет")).toBeVisible();
    await expect(
      page.getByText("Storage и metadata согласованы."),
    ).toBeVisible();
  });

  test("ADM-ORPH-02: Clean orphan object", async ({ page }) => {
    const key = await uploadOrphanObject();
    try {
      await page.goto("/admin/media/orphans");
      const card = orphanCard(page, key);
      await expect(card).toBeVisible();
      await expect(card).toContainText("Файл без metadata");

      const message = await cleanEntry(page, card, "Очистить");
      expect(message).toBe(CONFIRM_ORPHAN_OBJECT);

      // Outcome: card gone and the object actually removed from storage.
      await expect(orphanCard(page, key)).toHaveCount(0);
      const supabase = getLocalAdminSupabase();
      const { data } = await supabase.storage
        .from("product-images")
        .list(path.dirname(key), { search: path.basename(key) });
      expect((data ?? []).length).toBe(0);
    } finally {
      await removeStorageObject(key);
    }
  });

  test("ADM-ORPH-03: Clean missing metadata", async ({
    page,
    runId,
    factories,
  }) => {
    const category = factories.buildCategoryData(runId);
    const categoryId = await factories.createCategoryViaUI(page, category);
    const product = factories.buildProductData(runId, categoryId);
    const productId = await createProductViaUI(page, product);
    const storagePath = await insertMetadataRow(productId);

    await page.goto("/admin/media/orphans");
    const card = orphanCard(page, storagePath);
    await expect(card).toBeVisible();
    await expect(card).toContainText("Metadata без файла");

    const message = await cleanEntry(page, card, "Очистить");
    expect(message).toBe(CONFIRM_MISSING_OBJECT);

    await expect(orphanCard(page, storagePath)).toHaveCount(0);
    expect((await adminRead.getProductImagePaths(productId)).length).toBe(0);
  });

  test("ADM-ORPH-04: pending_metadata restore path", async ({
    page,
    runId,
    factories,
  }) => {
    const category = factories.buildCategoryData(runId);
    const categoryId = await factories.createCategoryViaUI(page, category);
    const product = factories.buildProductData(runId, categoryId);
    const productId = await createProductViaUI(page, product);
    const storagePath = await insertMetadataRow(productId, { pending: true });

    await page.goto("/admin/media/orphans");
    const card = orphanCard(page, storagePath);
    await expect(card).toBeVisible();
    await expect(card).toContainText("Незавершённое удаление");

    const message = await cleanEntry(page, card, "Восстановить / завершить");
    expect(message).toBe(CONFIRM_PENDING);

    // Resolved: no pending entry remains for this path.
    await expect(orphanCard(page, storagePath)).toHaveCount(0);
    const rows = await adminRead.getProductImagePaths(productId);
    const still = rows.filter(
      (row: { storage_path: string; deletion_pending_at: string | null }) =>
        row.storage_path === storagePath && row.deletion_pending_at,
    );
    expect(still.length).toBe(0);
  });
});
