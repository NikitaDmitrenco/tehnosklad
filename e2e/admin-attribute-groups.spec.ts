import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";
import { cleanupRunArtifacts } from "./helpers/cleanup";
import { adminRead } from "./helpers/admin-read";
import {
  expectErrorNotice,
  expectHtml5Blocked,
  expectSaved,
} from "./helpers/admin-ui";
import {
  createAttributeGroupViaUI,
  createAttributeViaUI,
} from "./helpers/factories/attribute-ui";

const GROUP_IN_USE_ERROR = "Группа содержит характеристики.";

async function fillGroupForm(
  page: Page,
  code: string,
  nameRu: string,
  nameRo: string,
) {
  await page.goto("/admin/attribute-groups/new");
  await page.locator('input[name="code"]').fill(code);
  await page.locator('input[name="sort_order"]').fill("10");
  await page.locator('input[name="name_ru"]').fill(nameRu);
  await page.locator('input[name="name_ro"]').fill(nameRo);
}

test.describe("ADM-AG: attribute groups", () => {
  test.afterEach(async ({ runId }) => {
    await cleanupRunArtifacts(runId);
  });

  test("ADM-AG-01: Create group RU/RO", async ({ page, runId, factories }) => {
    const data = factories.buildAttributeGroupData(runId);
    const groupId = await createAttributeGroupViaUI(page, data);

    await expectSaved(page);
    const dbRow = await adminRead.getAttributeGroupByCode(data.code);
    expect(dbRow?.id).toBe(groupId);
    expect(
      dbRow?.translations.find((t: { locale: string }) => t.locale === "ru")
        ?.name,
    ).toBe(data.nameRu);

    await page.goto("/admin/attribute-groups");
    await expect(
      page.locator("a.admin-list-card").filter({ hasText: data.nameRu }),
    ).toBeVisible();
  });

  test("ADM-AG-02: Delete empty group", async ({ page, runId, factories }) => {
    const data = factories.buildAttributeGroupData(runId);
    const groupId = await createAttributeGroupViaUI(page, data);

    await page.goto(`/admin/attribute-groups/${groupId}`);
    let dialogMessage: string | undefined;
    page.once("dialog", (dialog) => {
      dialogMessage = dialog.message();
      void dialog.accept();
    });
    await page.getByRole("button", { name: "Удалить группу" }).click();
    // Delete success redirects to the list.
    await expect(page).toHaveURL(/\/admin\/attribute-groups\?saved=1/, {
      timeout: 20_000,
    });
    expect(dialogMessage).toBe(
      "Удалить пустую группу без возможности восстановления?",
    );
    await expect(
      page.locator("a.admin-list-card").filter({ hasText: data.nameRu }),
    ).toHaveCount(0);
    expect(await adminRead.getAttributeGroupByCode(data.code)).toBeNull();
  });

  test("ADM-AG-03: Delete non-empty group blocked", async ({
    page,
    runId,
    factories,
  }) => {
    const groupData = factories.buildAttributeGroupData(runId);
    const groupId = await createAttributeGroupViaUI(page, groupData);
    const attrData = factories.buildAttributeData(runId, "number", {
      groupId,
    });
    await createAttributeViaUI(page, attrData);

    await page.goto(`/admin/attribute-groups/${groupId}`);
    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("button", { name: "Удалить группу" }).click();
    await expectErrorNotice(page, "attribute_group_in_use", GROUP_IN_USE_ERROR);
    // Outcome: group still exists with its attribute.
    expect(
      await adminRead.getAttributeGroupByCode(groupData.code),
    ).toBeTruthy();
    expect(await adminRead.getAttributeByCode(attrData.code)).toBeTruthy();
  });

  test("ADM-AG-04: Invalid code blocked by HTML5", async ({ page, runId }) => {
    const code = `grp_${runId.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
    // Pattern is [a-z][a-z0-9_]* — "AG123" starts with an uppercase letter.
    await fillGroupForm(page, "AG123", `Группа ${runId}`, `Grup ${runId}`);

    await page.getByRole("button", { name: "Сохранить группу" }).click();
    await expectHtml5Blocked(
      page,
      'input[name="code"]',
      "/admin/attribute-groups/new",
    );
    expect(await adminRead.getAttributeGroupByCode(code)).toBeNull();
    expect(await adminRead.getAttributeGroupByCode("AG123")).toBeNull();
  });
});
