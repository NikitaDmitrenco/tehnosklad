import { test as setup, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import { ensureTestAdminUser } from "./helpers/admin-auth";

const authFile = path.resolve(process.cwd(), "playwright/.auth/admin.json");

setup("authenticate test administrator via UI", async ({ page }) => {
  // 1. Prepare/ensure test administrator in local database
  const credentials = await ensureTestAdminUser();

  // 2. Perform authentic UI login flow
  await page.goto("/admin/login");
  await page.waitForLoadState("domcontentloaded");

  // Fill credentials in UI
  await page.locator('input[type="email"]').fill(credentials.email);
  await page.locator('input[type="password"]').fill(credentials.password);

  // Submit form
  await page.locator('button:has-text("Войти")').click();

  // Wait for redirect to admin dashboard
  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 15_000 });
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(
    page.getByRole("banner").getByText(credentials.email),
  ).toBeVisible();

  // 3. Ensure auth directory exists and save storage state
  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  await page.context().storageState({ path: authFile });
});
