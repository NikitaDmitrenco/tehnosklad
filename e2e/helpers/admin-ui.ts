import { expect, type Locator, type Page } from "@playwright/test";

/** Scope a form by its stable data-admin-form attr (never bare `form`). */
export function adminForm(page: Page, name: string): Locator {
  return page.locator(`form[data-admin-form="${name}"]`);
}

/** Navigate to an admin route and wait for DOM (auth comes from storageState). */
export async function gotoAdmin(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState("domcontentloaded");
}

/** Success flash: [role=status] with the exact success text (admin-ui.tsx). */
export function successNotice(page: Page): Locator {
  return page.getByRole("status").filter({ hasText: "Изменения сохранены." });
}

/** Error flash: [role=alert] rendered from adminErrorMessage(code). */
export function errorNotice(page: Page, message?: string): Locator {
  const alert = page.getByRole("alert");
  return message === undefined ? alert : alert.filter({ hasText: message });
}

/** Wait for a successful mutation: `?saved=1` redirect + success flash. */
export async function expectSaved(page: Page): Promise<void> {
  await expect(page).toHaveURL(/[?&]saved=1/);
  await expect(successNotice(page)).toBeVisible();
}

/**
 * Wait for a failed mutation: `?error=<code>` redirect + visible error text.
 * `code` may be a fragment (e.g. "duplicate"); it is URL-encoded before
 * matching, so pass spaces as-is ("duplicate key").
 *
 * The message is matched with getByText rather than getByRole("alert") because
 * (a) the login page renders its error as a plain <p> with no ARIA role, and
 * (b) Next.js always injects an empty `role=alert` route announcer, so a bare
 * role lookup would match every page.
 */
export async function expectErrorNotice(
  page: Page,
  code: string,
  message?: string,
): Promise<void> {
  const encoded = encodeURIComponent(code).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
  await expect(page).toHaveURL(new RegExp(`[?&]error=${encoded}`));
  if (message !== undefined) {
    await expect(page.getByText(message, { exact: true })).toBeVisible();
  }
}

/**
 * Assert an HTML5 constraint blocked submission: page stayed on `path`
 * (no navigation) and the given field is :invalid.
 */
export function expectHtml5Blocked(
  page: Page,
  fieldSelector: string,
  currentPathFragment: string,
): void {
  expect(page.url()).toContain(currentPathFragment);
  expect(page.url()).not.toContain("saved=1");
  expect(page.url()).not.toContain("error=");
  expect(page.locator(`${fieldSelector}:invalid`)).toHaveCount(1);
}
