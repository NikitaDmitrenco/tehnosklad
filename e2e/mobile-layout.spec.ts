import { expect, test } from "@playwright/test";

const widths = [320, 360, 375, 390, 412, 768, 1280];
const routes = [
  "/ru",
  "/ru/catalog",
  "/ru/search?q=Nord",
  "/ru/contacts",
  "/ru/privacy",
  "/ro/personal-data",
];

for (const width of widths) {
  test(`public routes have no horizontal page overflow at ${width}px`, async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "mobile-chromium",
      "The viewport matrix runs once; core scenarios also run in WebKit.",
    );
    await page.setViewportSize({ width, height: 800 });
    for (const route of routes) {
      await page.goto(route);
      const overflow = await page.evaluate(() => ({
        document:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        body: document.body.scrollWidth - document.body.clientWidth,
      }));
      expect(overflow.document, route).toBeLessThanOrEqual(1);
      expect(overflow.body, route).toBeLessThanOrEqual(1);
      const header = await page.getByTestId("site-header").boundingBox();
      const launcher = await page
        .getByRole("button", { name: /Помощник|Asistent/ })
        .boundingBox();
      expect(header).not.toBeNull();
      expect(launcher).not.toBeNull();
      expect(launcher!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
    }
  });
}
