import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";
import { adminRead } from "./helpers/admin-read";
import { adminForm, expectErrorNotice, expectSaved } from "./helpers/admin-ui";

const VALIDATION_ERROR = "Проверьте обязательные поля и формат значений.";

async function saveSetting(
  page: Page,
  key: string,
  ru: string,
  ro: string,
): Promise<void> {
  await page.goto("/admin/settings"); // fresh URL → ?saved=1 is observable
  const form = adminForm(page, `setting-${key}`);
  await form.locator('textarea[name="ru"]').fill(ru);
  await form.locator('textarea[name="ro"]').fill(ro);
  await form.getByRole("button", { name: "Сохранить настройку" }).click();
  await expectSaved(page);
}

async function readPair(key: string): Promise<{ ru: string; ro: string }> {
  const [ru, ro] = [
    await adminRead.getSetting(key, "ru"),
    await adminRead.getSetting(key, "ro"),
  ];
  if (!ru || !ro) {
    throw new Error(`[settings] seed pair for ${key} is missing`);
  }
  return { ru: ru.value, ro: ro.value };
}

test.describe("ADM-SET: public settings", () => {
  // site_settings rows are shared global state: save/restore cycles must
  // not interleave under --repeat-each, so the block runs sequentially.
  test.describe.configure({ mode: "serial" });

  test("ADM-SET-01: Save address pair", async ({ page, runId }) => {
    const original = await readPair("address");
    const value = `E2E адрес ${runId}`;
    try {
      await saveSetting(page, "address", value, `E2E adresa ${runId}`);

      expect((await adminRead.getSetting("address", "ru"))?.value).toBe(value);

      // Storefront effect: address is rendered on the public contacts page.
      const response = await page.request.get("/ru/contacts");
      expect(response.status()).toBe(200);
      expect(await response.text()).toContain(value);
    } finally {
      await saveSetting(page, "address", original.ru, original.ro);
    }
  });

  test("ADM-SET-02: Empty value rejected", async ({ page }) => {
    const original = await readPair("address");
    await page.goto("/admin/settings");
    const form = adminForm(page, "setting-address");
    // Whitespace passes HTML5 `required` but is trimmed server-side.
    await form.locator('textarea[name="ru"]').fill("   ");
    await form.locator('textarea[name="ro"]').fill("   ");
    await form.getByRole("button", { name: "Сохранить настройку" }).click();

    await expectErrorNotice(page, "validation", VALIDATION_ERROR);
    // Data did not change.
    expect((await adminRead.getSetting("address", "ru"))?.value).toBe(
      original.ru,
    );
    expect((await adminRead.getSetting("address", "ro"))?.value).toBe(
      original.ro,
    );
  });

  test("ADM-SET-03: Phone display/href save → public tel link", async ({
    page,
    runId,
  }) => {
    const original = await readPair("phone_display");
    const originalHref = await readPair("phone_href");
    const suffix = runId.split("-").pop() ?? "0000";
    const display = `+3736000${suffix.slice(0, 4)}`;
    try {
      await saveSetting(page, "phone_display", display, display);
      await saveSetting(page, "phone_href", display, display);

      const response = await page.request.get("/ru");
      expect(response.status()).toBe(200);
      expect(await response.text()).toContain(display);
    } finally {
      await saveSetting(page, "phone_display", original.ru, original.ro);
      await saveSetting(page, "phone_href", originalHref.ru, originalHref.ro);
    }
  });
});
