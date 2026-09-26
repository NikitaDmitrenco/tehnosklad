import { test, expect } from "./fixtures";

test.describe("Admin Infrastructure Smoke Suite", () => {
  test("SMOKE-01: Authenticated session opens admin dashboard and renders metrics", async ({
    adminPage,
  }) => {
    // 1. Dashboard URL verification
    await expect(adminPage).toHaveURL(/\/admin/);

    // 2. Admin header verification
    const header = adminPage.getByRole("banner");
    await expect(header).toBeVisible();

    // 3. Navigation links verification
    const nav = adminPage.locator("nav");
    await expect(nav.getByRole("link", { name: "Товары" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Категории" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Заявки" })).toBeVisible();

    // 4. Metric cards verification
    const main = adminPage.locator("main");
    await expect(main.getByText("Всего товаров")).toBeVisible();
    await expect(main.getByRole("link", { name: /Категории/ })).toBeVisible();
  });

  test("SMOKE-02: Creates minimal test entity with RUN_ID, verifies in DB, and cleans up", async ({
    adminPage,
    runId,
    adminDb,
    factories,
  }) => {
    // 1. Generate category test payload with unique RUN_ID
    const categoryData = factories.buildCategoryData(runId, {
      nameRu: `Smoke Категория ${runId}`,
      nameRo: `Smoke Categorie ${runId}`,
      presentationKey: "generic",
      sortOrder: 99,
      isPublished: false,
    });

    // 2. Create category via real UI form
    const categoryId = await factories.createCategoryViaUI(
      adminPage,
      categoryData,
    );
    expect(categoryId).toBeTruthy();

    // 3. Verify category in UI
    await expect(adminPage.locator("text=Изменения сохранены")).toBeVisible();
    await expect(adminPage.locator('input[name="ru_name"]')).toHaveValue(
      categoryData.nameRu,
    );

    // 4. Verify category in local PostgreSQL database
    const dbRecord = await adminDb.verifyCategoryExists(categoryData.slugRu);
    expect(dbRecord).toBeTruthy();
    expect(dbRecord?.category_id).toBe(categoryId);
    expect(dbRecord?.name).toBe(categoryData.nameRu);
  });
});
