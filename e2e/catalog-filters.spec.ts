import { expect, test } from "@playwright/test";

test("catalog price filters keep digits only", async ({ page }) => {
  await page.goto("/ru/catalog");
  const filters = page.locator("aside");
  const priceFrom = filters.getByRole("textbox", { name: "От", exact: true });
  const priceTo = filters.getByRole("textbox", { name: "До", exact: true });

  await priceFrom.fill("12a-3.4");
  await priceTo.fill("9 876+");

  await expect(priceFrom).toHaveValue("1234");
  await expect(priceTo).toHaveValue("9876");
  await expect(priceFrom).toHaveAttribute("inputmode", "numeric");
  await expect(priceTo).toHaveAttribute("pattern", "[0-9]*");
});
