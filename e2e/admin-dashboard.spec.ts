import { test, expect } from "./fixtures";
import { getE2EConfig } from "./helpers/env";
import { cleanupRunArtifacts } from "./helpers/cleanup";
import { createLeadDirect } from "./helpers/leads";

const { adminEmail } = getE2EConfig();

const NAV_LINKS = [
  "Обзор",
  "Категории",
  "Группы характеристик",
  "Характеристики",
  "Товары",
  "Заявки",
  "База знаний помощника",
  "Статистика помощника",
  "Публичные настройки",
  "Проверка файлов",
];

const METRIC_LABELS = [
  "Всего товаров",
  "Опубликовано",
  "Нет в наличии",
  "Категории",
  "Новые заявки",
  "Ошибки Telegram",
  "Статьи базы знаний",
];

test.describe("ADM-DASH: dashboard", () => {
  test.afterEach(async ({ runId }) => {
    await cleanupRunArtifacts(runId);
  });

  // Structure only: metric values drift as other tests mutate data.
  test("ADM-DASH-01: Dashboard renders metrics + nav", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin$/);

    await expect(
      page.getByRole("heading", { level: 1, name: "Панель управления" }),
    ).toBeVisible();

    const stats = page.getByRole("region", { name: "Статистика" });
    await expect(stats).toBeVisible();
    for (const label of METRIC_LABELS) {
      await expect(stats.getByText(label)).toBeVisible();
    }
    await expect(stats.getByRole("link")).toHaveCount(METRIC_LABELS.length);

    const nav = page.getByRole("navigation", {
      name: "Административная навигация",
    });
    for (const label of NAV_LINKS) {
      await expect(
        nav.getByRole("link", { name: label, exact: true }),
      ).toBeVisible();
    }
    await expect(nav.getByRole("link")).toHaveCount(NAV_LINKS.length);

    const banner = page.getByRole("banner");
    await expect(banner.getByText(adminEmail)).toBeVisible();
    await expect(banner.getByRole("button", { name: "Выйти" })).toBeVisible();

    await expect(page.locator("#admin-main")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Последние заявки" }),
    ).toBeVisible();
  });

  test("ADM-DASH-02: Published card filters products", async ({ page }) => {
    await page.goto("/admin");
    await page
      .getByRole("region", { name: "Статистика" })
      .getByRole("link", { name: /Опубликовано/ })
      .click();
    await expect(page).toHaveURL(/\/admin\/products\?publication=published$/);
  });

  test("ADM-DASH-03: New leads card filters leads", async ({ page, runId }) => {
    const lead = await createLeadDirect(runId);
    await page.goto("/admin");
    await page
      .getByRole("region", { name: "Статистика" })
      .getByRole("link", { name: /Новые заявки/ })
      .click();
    await expect(page).toHaveURL(/\/admin\/leads\?status=new$/);
    await expect(page.locator(`a[href="/admin/leads/${lead.id}"]`)).toHaveCount(
      1,
    );
  });

  // Read-only and tolerant: recent leads may be empty or listed depending on
  // what other tests created — both states are valid for the dashboard.
  test("ADM-DASH-04: Recent leads empty or list", async ({ page }) => {
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Последние заявки" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Все заявки" })).toBeVisible();

    const emptyText = page.getByText("Заявок пока нет.");
    const leadLinks = page.locator('a[href^="/admin/leads/"]');
    const isEmpty = (await emptyText.count()) > 0;
    const leadCount = await leadLinks.count();
    expect(isEmpty || leadCount > 0).toBe(true);
  });
});
