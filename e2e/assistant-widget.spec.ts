import { expect, test, type Page } from "@playwright/test";

const answer = {
  ok: true,
  answer: "Вот подходящий холодильник.",
  references: [
    {
      id: "10000000-0000-4000-8000-000000000001",
      name: "Nord Cool 300",
      category: "Холодильники",
      priceMinor: 1299000,
      currency: "MDL",
      stockStatus: "in_stock",
      url: "/ru/product/nord-cool-300",
    },
  ],
  fallbackUsed: false,
  requestId: "00000000-0000-4000-8000-000000000000",
};

type MockedResponse = { status?: number; body: object };

// Keeps the shared per-process assistant rate limit free for the specs that
// deliberately hit the real endpoint. The last entry answers every extra call.
async function mockAssistant(page: Page, responses: MockedResponse[]) {
  let call = 0;
  await page.route("**/api/assistant", async (route) => {
    const response = responses[Math.min(call, responses.length - 1)]!;
    call += 1;
    await route.fulfill({
      status: response.status ?? 200,
      contentType: "application/json",
      body: JSON.stringify(response.body),
    });
  });
  return () => call;
}

test.describe("catalog assistant widget", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ru");
    await page.getByRole("button", { name: "Помощник по каталогу" }).click();
  });

  test("cancel closes the assistant", async ({ page }) => {
    const dialog = page.getByRole("dialog", { name: "Помощник Техносклада" });

    await dialog.getByRole("button", { name: "Отменить" }).click();

    await expect(dialog).toBeHidden();
  });

  test("clear removes the conversation and entered question", async ({
    page,
  }) => {
    const dialog = page.getByRole("dialog", { name: "Помощник Техносклада" });
    const question = dialog.getByRole("textbox", {
      name: "Например: нужен холодильник",
    });
    await mockAssistant(page, [{ body: answer }]);
    await question.fill("Нужна стиральная машина");
    await question.press("Enter");
    await expect(dialog.getByText(answer.answer)).toBeVisible();

    await dialog.getByRole("button", { name: "Очистить" }).click();

    await expect(question).toHaveValue("");
    await expect(dialog.getByText(answer.answer)).toBeHidden();
    await expect(
      dialog.getByText(
        "Здравствуйте! Помогу найти технику по актуальному каталогу.",
      ),
    ).toBeVisible();
  });

  test("catalog link navigates and closes the assistant", async ({ page }) => {
    const dialog = page.getByRole("dialog", { name: "Помощник Техносклада" });

    await dialog.getByRole("link", { name: "Открыть каталог" }).click();

    await expect(page).toHaveURL(/\/ru\/catalog$/);
    await expect(dialog).toBeHidden();
  });

  test("question field stays between 40 and 287 pixels", async ({ page }) => {
    const question = page.getByRole("textbox", {
      name: "Например: нужен холодильник",
    });
    const limits = await question.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        minHeight: Number.parseFloat(style.minHeight),
        maxHeight: Number.parseFloat(style.maxHeight),
      };
    });

    expect(limits.minHeight).toBe(40);
    expect(limits.maxHeight).toBe(287);
  });

  test("enter sends the question and shift+enter adds a line break", async ({
    page,
  }) => {
    const calls = await mockAssistant(page, [{ body: answer }]);
    const dialog = page.getByRole("dialog", { name: "Помощник Техносклада" });
    const question = dialog.getByRole("textbox", {
      name: "Например: нужен холодильник",
    });

    await question.fill("Нужен холодильник");
    await question.press("Shift+Enter");

    await expect(question).toHaveValue("Нужен холодильник\n");
    expect(calls()).toBe(0);

    await question.press("Enter");

    await expect(dialog.getByText(answer.answer)).toBeVisible();
    await expect(question).toHaveValue("");
    expect(calls()).toBe(1);
    const reference = dialog.getByRole("link", {
      name: "Открыть товар: Nord Cool 300",
    });
    await expect(reference).toBeVisible();
    await expect(reference).toContainText("В наличии");
    await expect(reference).toContainText("MDL");
  });

  test("quick question is sent without extra confirmation", async ({
    page,
  }) => {
    const calls = await mockAssistant(page, [{ body: answer }]);
    const dialog = page.getByRole("dialog", { name: "Помощник Техносклада" });

    await dialog.getByRole("button", { name: "Подберите пылесос" }).click();

    await expect(
      dialog.getByText("Подберите пылесос", { exact: true }),
    ).toBeVisible();
    await expect(dialog.getByText(answer.answer)).toBeVisible();
    expect(calls()).toBe(1);
  });

  test("conversation survives closing and reopening the assistant", async ({
    page,
  }) => {
    await mockAssistant(page, [{ body: answer }]);
    const dialog = page.getByRole("dialog", { name: "Помощник Техносклада" });
    const question = dialog.getByRole("textbox", {
      name: "Например: нужен холодильник",
    });
    await question.fill("Нужен холодильник");
    await question.press("Enter");
    await expect(dialog.getByText(answer.answer)).toBeVisible();

    await dialog.getByRole("button", { name: "Закрыть помощника" }).click();
    await expect(dialog).toBeHidden();
    await page.getByRole("button", { name: "Помощник по каталогу" }).click();

    await expect(dialog.getByText(answer.answer)).toBeVisible();
    await expect(
      dialog.getByText("Нужен холодильник", { exact: true }),
    ).toBeVisible();
  });

  test("answers a catalog question with grounded product cards", async ({
    page,
  }) => {
    const dialog = page.getByRole("dialog", { name: "Помощник Техносклада" });

    await dialog
      .getByRole("textbox", { name: "Например: нужен холодильник" })
      .fill("Какие холодильники есть в наличии?");
    await dialog.getByRole("button", { name: "Спросить" }).click();

    await expect(
      dialog.getByText("Я нашёл подходящие товары в каталоге", {
        exact: false,
      }),
    ).toBeVisible();
    // Cards are assembled server-side from catalog DTOs, never from model text.
    await expect(
      dialog.locator('a[href^="/ru/product/"]').first(),
    ).toBeVisible();
    await expect(
      dialog.getByText("Помощник сейчас недоступен", { exact: false }),
    ).toBeHidden();
  });

  test("answers a store question from published settings", async ({ page }) => {
    const dialog = page.getByRole("dialog", { name: "Помощник Техносклада" });

    await dialog
      .getByRole("textbox", { name: "Например: нужен холодильник" })
      .fill("Где находится магазин?");
    await dialog.getByRole("button", { name: "Спросить" }).click();

    await expect(
      dialog.getByText("Магазин находится по адресу", { exact: false }),
    ).toBeVisible();
  });

  test("request from the assistant carries its own source and product", async ({
    page,
  }) => {
    await mockAssistant(page, [{ body: answer }]);
    const leads: Array<{ source?: string; productId?: string | null }> = [];
    await page.route("**/api/leads", async (route) => {
      leads.push(route.request().postDataJSON());
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });
    const dialog = page.getByRole("dialog", { name: "Помощник Техносклада" });
    const question = dialog.getByRole("textbox", {
      name: "Например: нужен холодильник",
    });
    await question.fill("Нужен холодильник");
    await question.press("Enter");
    await expect(dialog.getByText(answer.answer)).toBeVisible();

    await dialog.getByRole("button", { name: "Оставить заявку" }).click();
    const contact = page.getByRole("dialog", { name: "Связаться" });
    await contact.getByRole("tab", { name: "Оставить заявку" }).click();
    await contact.getByLabel("Ваше имя").fill("Иван");
    await contact.getByLabel("Телефон").fill("+37360000000");
    await contact.getByRole("checkbox").check();
    await contact.getByRole("button", { name: "Отправить заявку" }).click();

    await expect(contact.getByText("Заявка успешно отправлена")).toBeVisible();
    expect(leads).toHaveLength(1);
    expect(leads[0]?.source).toBe("assistant");
    expect(leads[0]?.productId).toBe(answer.references[0]!.id);
  });

  test("rate limited answer shows the wait message and retry button", async ({
    page,
  }) => {
    await mockAssistant(page, [
      {
        status: 429,
        body: { ok: false, code: "rate_limited", retryAfterSeconds: 30 },
      },
      { body: answer },
    ]);
    const dialog = page.getByRole("dialog", { name: "Помощник Техносклада" });
    const question = dialog.getByRole("textbox", {
      name: "Например: нужен холодильник",
    });

    await question.fill("Нужен холодильник");
    await question.press("Enter");

    await expect(
      dialog.getByText("Слишком много вопросов подряд. Повторите через 30 с."),
    ).toBeVisible();

    await dialog.getByRole("button", { name: "Повторить" }).click();

    await expect(dialog.getByText(answer.answer)).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Повторить" }),
    ).toBeHidden();
    await expect(
      dialog.getByText("Нужен холодильник", { exact: true }),
    ).toHaveCount(1);
  });
});

test.describe("assistant page context", () => {
  test("sends the open category and retries once without it", async ({
    page,
  }) => {
    const bodies: Array<{ page?: unknown }> = [];
    let call = 0;
    await page.route("**/api/assistant", async (route) => {
      bodies.push(route.request().postDataJSON());
      call += 1;
      if (call === 1) {
        // Mirrors the endpoint before the `page` field is accepted.
        await route.fulfill({
          status: 422,
          contentType: "application/json",
          body: JSON.stringify({ ok: false, code: "validation_error" }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(answer),
      });
    });
    await page.goto("/ru/category/refrigerators");
    await page.getByRole("button", { name: "Помощник по каталогу" }).click();
    const dialog = page.getByRole("dialog", { name: "Помощник Техносклада" });
    const question = dialog.getByRole("textbox", {
      name: "Например: нужен холодильник",
    });

    await question.fill("Что есть в наличии?");
    await question.press("Enter");

    await expect(dialog.getByText(answer.answer)).toBeVisible();
    expect(bodies).toHaveLength(2);
    expect(bodies[0]?.page).toEqual({
      type: "category",
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
    });
    expect(bodies[1]?.page).toBeUndefined();
  });
});
