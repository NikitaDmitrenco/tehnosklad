import { test, expect } from "./fixtures";

test.describe("ADM-LOGS: assistant logs", () => {
  test("ADM-LOGS-01: Period switch 7/30/90", async ({ page }) => {
    await page.goto("/admin/assistant-logs");
    await expect(
      page.getByRole("heading", { level: 1, name: "Статистика помощника" }),
    ).toBeVisible();

    await page.getByRole("link", { name: "30 дней" }).click();
    await expect(page).toHaveURL(/\/admin\/assistant-logs\?days=30$/);
    await expect(page.getByRole("link", { name: "30 дней" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    // Report renders either statistics or the documented empty state.
    const hasStats = await page.getByText("Всего запросов").count();
    const hasEmpty = await page.getByText("Запросов нет").count();
    expect(hasStats + hasEmpty).toBeGreaterThan(0);
  });

  test("ADM-LOGS-02: Invalid days falls back to default", async ({ page }) => {
    await page.goto("/admin/assistant-logs?days=999");
    // days=999 is not a supported period — default 7 becomes active.
    await expect(page.getByRole("link", { name: "7 дней" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(
      page.getByRole("heading", { level: 1, name: "Статистика помощника" }),
    ).toBeVisible();
  });

  // Depends on empty telemetry: valid right after `npm run db:reset:local`
  // (no assistant traffic in the admin suite itself).
  test("ADM-LOGS-03: Empty period empty state", async ({ page }) => {
    await page.goto("/admin/assistant-logs");
    await expect(
      page.getByRole("heading", { name: "Запросов нет" }),
    ).toBeVisible();
  });
});
