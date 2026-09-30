import { test, expect } from "./fixtures";
import { cleanupRunArtifacts } from "./helpers/cleanup";
import { adminRead } from "./helpers/admin-read";
import { expectHtml5Blocked, expectSaved } from "./helpers/admin-ui";

test.describe("ADM-KB: assistant knowledge", () => {
  test.afterEach(async ({ runId }) => {
    await cleanupRunArtifacts(runId);
  });

  async function createArticle(
    page: import("@playwright/test").Page,
    locale: "ru" | "ro",
    title: string,
    content: string,
  ) {
    await page.goto("/admin/assistant-knowledge/new");
    await page.locator('select[name="locale"]').selectOption(locale);
    await page.locator('input[name="title"]').fill(title);
    await page.locator('textarea[name="content"]').fill(content);
    await page.getByRole("button", { name: "Сохранить статью" }).click();
    await expectSaved(page);
  }

  test("ADM-KB-01: Create RU article", async ({ page, runId }) => {
    const title = `Доставка ${runId}`;
    await createArticle(page, "ru", title, `Условия доставки для ${runId}.`);

    const rows = await adminRead.getKnowledgeByTitle(title);
    expect(rows.length).toBe(1);
    expect(rows[0].locale).toBe("ru");
    expect(rows[0].is_active).toBe(true);

    await page.goto("/admin/assistant-knowledge");
    const card = page.locator("a.admin-list-card").filter({ hasText: title });
    await expect(card).toBeVisible();
    await expect(card).toContainText("Русский");
    await expect(card).toContainText("Активна");
  });

  test("ADM-KB-02: Create RO article", async ({ page, runId }) => {
    const title = `Livrare ${runId}`;
    await createArticle(page, "ro", title, `Conditii livrare pentru ${runId}.`);

    const rows = await adminRead.getKnowledgeByTitle(title);
    expect(rows.length).toBe(1);
    expect(rows[0].locale).toBe("ro");

    await page.goto("/admin/assistant-knowledge");
    const card = page.locator("a.admin-list-card").filter({ hasText: title });
    await expect(card).toBeVisible();
    await expect(card).toContainText("Română");
  });

  test("ADM-KB-03: Deactivate + delete", async ({ page, runId }) => {
    const title = `Возврат ${runId}`;
    await createArticle(page, "ru", title, `Правила возврата для ${runId}.`);
    const [article] = await adminRead.getKnowledgeByTitle(title);

    await page.goto(`/admin/assistant-knowledge/${article.id}`);
    await page.locator('input[name="is_active"]').uncheck();
    await page.getByRole("button", { name: "Сохранить статью" }).click();
    await expectSaved(page);

    let dialogMessage: string | undefined;
    page.once("dialog", (dialog) => {
      dialogMessage = dialog.message();
      void dialog.accept();
    });
    await page.getByRole("button", { name: "Удалить статью" }).click();
    // Delete success redirects to the list.
    await expect(page).toHaveURL(/\/admin\/assistant-knowledge\?saved=1/, {
      timeout: 20_000,
    });
    expect(dialogMessage).toBe(
      "Удалить статью без возможности восстановления?",
    );
    await expect(
      page.locator("a.admin-list-card").filter({ hasText: title }),
    ).toHaveCount(0);
    expect(await adminRead.getKnowledgeByTitle(title)).toHaveLength(0);
  });

  test("ADM-KB-04: Empty title blocked by HTML5", async ({ page, runId }) => {
    await page.goto("/admin/assistant-knowledge/new");
    await page
      .locator('textarea[name="content"]')
      .fill(`Содержимое без заголовка ${runId}.`);
    await page.getByRole("button", { name: "Сохранить статью" }).click();

    await expectHtml5Blocked(
      page,
      'input[name="title"]',
      "/admin/assistant-knowledge/new",
    );
    expect(await adminRead.countKnowledgeContaining(runId)).toBe(0);
  });
});
