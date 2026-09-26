import { expect, test, type Page } from "@playwright/test";

const LOCALE_COOKIE = "ts_locale";

function switcherLink(page: Page, locale: "ru" | "ro") {
  return page.locator(`header a[hreflang="${locale}"]`).first();
}

async function savedLocale(page: Page) {
  const cookies = await page.context().cookies();
  return cookies.find((cookie) => cookie.name === LOCALE_COOKIE)?.value;
}

test.describe("locale switching", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test("a saved preference never overrides the locale in the URL", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([
      { name: LOCALE_COOKIE, value: "ru", url: baseURL! },
    ]);

    const response = await page.goto("/ro/catalog");

    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/\/ro\/catalog$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "ro");
    // Reading the page is what records the preference.
    expect(await savedLocale(page)).toBe("ro");
  });

  test("the preference is recorded without client JavaScript", async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    try {
      await page.goto("/ro/contacts");
      expect(await savedLocale(page)).toBe("ro");

      await page.goto(baseURL!);
      await expect(page).toHaveURL(/\/ro$/);
    } finally {
      await context.close();
    }
  });

  test("the entry route falls back to the browser languages", async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ locale: "ro-MD" });
    const page = await context.newPage();
    try {
      await page.goto(baseURL!);
      await expect(page).toHaveURL(/\/ro$/);
    } finally {
      await context.close();
    }
  });

  test("switching on the home page stays on the home page", async ({
    page,
  }) => {
    await page.goto("/ru");
    await switcherLink(page, "ro").click();

    await expect(page).toHaveURL(/\/ro$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "ro");
  });

  test("switching after browsing a product still stays on the home page", async ({
    page,
  }) => {
    await page.goto("/ru");
    await page.locator('a[href^="/ru/product/"]').first().click();
    await expect(page).toHaveURL(/\/ru\/product\//);
    await page.locator('header a[href="/ru"]').first().click();
    await expect(page).toHaveURL(/\/ru$/);

    await switcherLink(page, "ro").click();

    await expect(page).toHaveURL(/\/ro$/);
  });

  test("switching on a product page keeps the product", async ({ page }) => {
    await page.goto("/ru");
    await page.locator('a[href^="/ru/product/"]').first().click();
    await expect(page).toHaveURL(/\/ru\/product\//);
    const slug = new URL(page.url()).pathname.split("/").pop();

    await switcherLink(page, "ro").click();

    await expect(page).toHaveURL(/\/ro\/product\//);
    expect(new URL(page.url()).pathname.split("/").pop()).toBe(slug);
  });

  test("going back undoes the switch instead of skipping a page", async ({
    page,
  }) => {
    await page.goto("/ru");
    await page.locator('a[href^="/ru/product/"]').first().click();
    await expect(page).toHaveURL(/\/ru\/product\//);
    await page.locator('header a[href="/ru"]').first().click();
    await expect(page).toHaveURL(/\/ru$/);

    await switcherLink(page, "ro").click();
    await expect(page).toHaveURL(/\/ro$/);

    await page.goBack();

    await expect(page).toHaveURL(/\/ru$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
    await page.reload();
    await expect(page).toHaveURL(/\/ru$/);
  });

  // The switcher must not ask the router to scroll to the top. How much of the
  // exact offset survives still depends on the document briefly shrinking while
  // the other locale streams in, so this asserts the reset, not the offset.
  test("switching does not throw the reader back to the top", async ({
    page,
  }) => {
    await page.goto("/ru");
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo(0, 800);
    });
    await expect
      .poll(() => page.evaluate(() => Math.round(window.scrollY)))
      .toBeGreaterThan(0);

    await switcherLink(page, "ro").click();
    await expect(page).toHaveURL(/\/ro$/);

    await page.waitForTimeout(1000);
    expect(
      await page.evaluate(() => Math.round(window.scrollY)),
    ).toBeGreaterThan(0);
  });

  test("switching keeps the catalog query string", async ({ page }) => {
    await page.goto("/ru/catalog?page=1&q=bosch");
    await expect(page).toHaveURL(/\/ru\/catalog\?q=bosch$/);

    await switcherLink(page, "ro").click();

    await expect(page).toHaveURL(/\/ro\/catalog\?q=bosch$/);
  });
});
