import { test, expect } from "./fixtures";
import { getE2EConfig } from "./helpers/env";
import { createNonAdminUser, deleteNonAdminUser } from "./helpers/non-admin";
import { expectErrorNotice } from "./helpers/admin-ui";

const { adminEmail, adminPassword } = getE2EConfig();

const NEUTRAL_LOGIN_ERROR =
  "Вход не выполнен. Проверьте данные и наличие активной роли администратора.";

async function fillAndSubmitLogin(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Пароль").fill(password);
  await page.getByRole("button", { name: "Войти" }).click();
}

test.describe("ADM-AUTH: login and access control", () => {
  // Anonymous contexts for every test in this block.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("ADM-AUTH-01: Admin login succeeds", async ({ page }) => {
    await fillAndSubmitLogin(page, adminEmail, adminPassword);
    await expect(page).toHaveURL(/\/admin(?!\/login)/);
    const banner = page.getByRole("banner");
    await expect(banner).toBeVisible();
    await expect(banner.getByText(adminEmail)).toBeVisible();
  });

  test("ADM-AUTH-02: Anonymous /admin redirects to login with next", async ({
    page,
  }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin$/);
    await expect(
      page.getByRole("heading", { name: "Вход для администратора" }),
    ).toBeVisible();
    // No error paragraph on a clean redirect (route announcer aside).
    await expect(page.getByText("Вход не выполнен")).toHaveCount(0);
  });

  test("ADM-AUTH-03: Wrong password shows neutral credentials error", async ({
    page,
  }) => {
    await fillAndSubmitLogin(page, adminEmail, "definitely-wrong-pass-9x");
    await expectErrorNotice(page, "credentials", NEUTRAL_LOGIN_ERROR);
    await expect(
      page.getByRole("heading", { name: "Вход для администратора" }),
    ).toBeVisible();
  });

  test("ADM-AUTH-04: Non-admin gets the same neutral error", async ({
    page,
    runId,
  }) => {
    const nonAdmin = await createNonAdminUser(runId);
    try {
      await fillAndSubmitLogin(page, nonAdmin.email, nonAdmin.password);
      await expectErrorNotice(page, "credentials", NEUTRAL_LOGIN_ERROR);
      // Still on login: no dashboard access for a role-less user.
      await page.goto("/admin");
      await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin$/);
    } finally {
      await deleteNonAdminUser(nonAdmin.id);
    }
  });
  // Self-contained: logging out revokes the session server-side, so the test
  // must log in itself instead of revoking the shared storageState session
  // (that would break every later test loading playwright/.auth/admin.json).
  test("ADM-AUTH-05: Logout returns to login", async ({ page }) => {
    await fillAndSubmitLogin(page, adminEmail, adminPassword);
    await expect(page).toHaveURL(/\/admin(?!\/login)/);
    await page.getByRole("button", { name: "Выйти" }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(
      page.getByRole("heading", { name: "Вход для администратора" }),
    ).toBeVisible();
  });
});
