import { expect, test } from "@playwright/test";

test("active admin navigation text remains readable on hover", async ({
  page,
}) => {
  await page.goto("/admin/login");
  await page.evaluate(() => {
    const link = document.createElement("a");
    link.className = "admin-nav-link admin-nav-link--active";
    link.href = "#";
    link.textContent = "Выбранный раздел";
    link.dataset.testid = "active-admin-link";
    document.body.append(link);
  });
  const link = page.getByTestId("active-admin-link");

  await link.hover();

  const colors = await link.evaluate((element) => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, text: style.color };
  });
  expect(colors.background).toBe("rgb(41, 37, 36)");
  expect(colors.text).toBe("rgb(231, 229, 228)");
});
