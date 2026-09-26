import { expect, test } from "@playwright/test";

test("contacts exposes a lazy accessible map, marker and fallback link", async ({
  page,
}) => {
  await page.goto("/ru/contacts");
  const map = page.getByTestId("store-map");
  await expect(map).toBeVisible();
  await expect(map).toContainText("Техносклад — ул. Победы, 97, Комрат");
  const frame = page.getByTestId("store-map-frame");
  await expect(frame).toHaveAttribute("loading", "lazy");
  await expect(frame).toHaveAttribute("title", /Карта расположения магазина/);
  await expect(frame).toHaveAttribute(
    "src",
    /marker=46\.3008465%2C28\.6588914/,
  );
  const fallback = page.getByRole("link", {
    name: /Открыть расположение магазина Техносклад/,
  });
  await expect(fallback).toHaveAttribute(
    "href",
    /openstreetmap\.org.*mlat=46\.3008465/,
  );
  await expect(fallback).toHaveAttribute("target", "_blank");
});

test("legal documents are available in Russian and Romanian", async ({
  page,
}) => {
  await page.goto("/ru/privacy");
  await expect(
    page.getByRole("heading", { name: "Политика конфиденциальности" }),
  ).toBeVisible();
  await expect(
    page
      .getByText("Закон Республики Молдова №133/2011", { exact: false })
      .first(),
  ).toBeVisible();
  await page.goto("/ro/personal-data");
  await expect(
    page.getByRole("heading", {
      name: "Prelucrarea datelor cu caracter personal",
    }),
  ).toBeVisible();
  await expect(
    page
      .getByText("Legea Republicii Moldova nr. 133/2011", { exact: false })
      .first(),
  ).toBeVisible();
});

test("request form cannot submit before privacy acknowledgement", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/leads", async (route) => {
    requests += 1;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: '{"ok":true}',
    });
  });
  await page.goto("/ru/contacts");
  await page.getByRole("button", { name: "Связаться" }).click();
  const dialog = page.getByRole("dialog", { name: "Связаться" });
  await dialog.getByRole("tab", { name: "Оставить заявку" }).click();
  await dialog.getByLabel("Ваше имя").fill("Анна");
  await dialog.getByLabel("Телефон").fill("+37369123456");
  await dialog.getByRole("button", { name: "Отправить заявку" }).click();
  await expect(dialog.getByText(/Подтвердите, что ознакомились/)).toBeVisible();
  expect(requests).toBe(0);
  await expect(dialog.getByRole("checkbox")).not.toBeChecked();
});
