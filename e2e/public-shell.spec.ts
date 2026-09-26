import { expect, test } from "@playwright/test";

function relativeLuminance([red, green, blue]: number[]) {
  const [r, g, b] = [red, green, blue].map((channel) => {
    const value = channel / 255;
    return value <= 0.04045
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

test.describe("public shell", () => {
  test("sticky header remains visible and does not cover the initial heading", async ({
    page,
  }) => {
    await page.goto("/ru");
    const header = page.getByTestId("site-header");
    const heading = page.getByRole("heading", { level: 1 });
    const initialHeader = await header.boundingBox();
    const initialHeading = await heading.boundingBox();
    expect(initialHeader).not.toBeNull();
    expect(initialHeading).not.toBeNull();
    expect(initialHeading!.y).toBeGreaterThanOrEqual(
      initialHeader!.y + initialHeader!.height,
    );

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(header).toBeVisible();
    const scrolledHeader = await header.boundingBox();
    expect(scrolledHeader).not.toBeNull();
    expect(scrolledHeader!.y).toBeGreaterThanOrEqual(0);
    expect(scrolledHeader!.y).toBeLessThan(2);
  });

  test("language controls are readable, stable and persist through reload", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/ru/contacts");
    const switcher = page
      .getByRole("navigation", { name: "Выбор языка" })
      .first();
    const ru = switcher.getByRole("link", { name: /Русский/ });
    const ro = switcher.getByRole("link", { name: /Română/ });
    await expect(ru).toBeVisible();
    await expect(ro).toBeVisible();
    await expect(ru).toHaveAttribute("aria-current", "page");
    const [ruBox, roBox] = await Promise.all([
      ru.boundingBox(),
      ro.boundingBox(),
    ]);
    expect(ruBox?.width).toBeGreaterThanOrEqual(24);
    expect(ruBox?.height).toBeGreaterThanOrEqual(24);
    expect(roBox?.width).toBe(ruBox?.width);
    expect(roBox?.height).toBe(ruBox?.height);
    const colors = await ru.evaluate((element) => {
      const style = getComputedStyle(element);
      return { color: style.color, background: style.backgroundColor };
    });
    expect(colors.color).toBe("rgb(255, 255, 255)");
    expect(colors.background).not.toBe("rgba(0, 0, 0, 0)");
    await ro.hover();
    const hoverColors = await ro.evaluate((element) => {
      const style = getComputedStyle(element);
      const toRgb = (color: string) => {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const context = canvas.getContext("2d")!;
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        return Array.from(context.getImageData(0, 0, 1, 1).data);
      };
      return {
        color: toRgb(style.color),
        background: toRgb(style.backgroundColor),
      };
    });
    expect(hoverColors.background[3]).toBe(255);
    const foregroundLuminance = relativeLuminance(hoverColors.color);
    const backgroundLuminance = relativeLuminance(hoverColors.background);
    expect(
      (backgroundLuminance + 0.05) / (foregroundLuminance + 0.05),
    ).toBeGreaterThanOrEqual(4.5);
    await ro.focus();
    await expect(ro).toBeFocused();
    await ro.click();
    await expect(page).toHaveURL(/\/ro\/contacts$/);
    await page.reload();
    await expect(page).toHaveURL(/\/ro\/contacts$/);
    await expect(
      page
        .getByRole("navigation", { name: "Selectarea limbii" })
        .first()
        .getByRole("link", { name: /Română/ }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("mobile header exposes both accessible language options", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto("/ru");
    const switcher = page
      .getByRole("navigation", { name: "Выбор языка" })
      .first();
    const ru = switcher.getByRole("link", { name: /Русский/ });
    const ro = switcher.getByRole("link", { name: /Română/ });
    await expect(ru).toBeVisible();
    await expect(ro).toBeVisible();
    await expect(ru).toHaveAttribute("aria-current", "page");
    expect(
      await ru.evaluate((element) => getComputedStyle(element).color),
    ).toBe("rgb(255, 255, 255)");
    const roBox = await ro.boundingBox();
    expect(roBox?.width).toBeGreaterThanOrEqual(24);
    expect(roBox?.height).toBeGreaterThanOrEqual(24);
  });

  test("the mobile navigation drawer closes with Escape", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto("/ru");
    const trigger = page.getByRole("button", { name: "Меню" });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Основная навигация" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("footer contains the localized safe OSMI link", async ({ page }) => {
    await page.goto("/ru");
    const link = page.getByRole("link", { name: /Сайт компании OSMI/ });
    const footer = page.getByRole("contentinfo");
    const signature = page.getByTestId("osmi-signature");
    await expect(
      page.getByText("Разработано компанией", { exact: false }),
    ).toBeVisible();
    await expect(link).toHaveAttribute("href", "https://osmi-topaz.vercel.app");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    const [footerBox, signatureBox] = await Promise.all([
      footer.boundingBox(),
      signature.boundingBox(),
    ]);
    expect(footerBox).not.toBeNull();
    expect(signatureBox).not.toBeNull();
    expect(
      Math.abs(
        signatureBox!.x +
          signatureBox!.width / 2 -
          (footerBox!.x + footerBox!.width / 2),
      ),
    ).toBeLessThanOrEqual(1);

    await page.goto("/ro");
    await expect(
      page.getByText("Dezvoltat de compania", { exact: false }),
    ).toBeVisible();
  });
});
