import { test, expect } from "./fixtures";
import { cleanupRunArtifacts } from "./helpers/cleanup";
import { adminRead } from "./helpers/admin-read";
import { expectSaved } from "./helpers/admin-ui";
import {
  createLeadDirect,
  createLeadViaApi,
  setLeadDeliveryState,
} from "./helpers/leads";

test.describe("ADM-LEAD: leads list, detail and Telegram outbox", () => {
  test.afterEach(async ({ runId }) => {
    await cleanupRunArtifacts(runId);
  });

  test("ADM-LEAD-01: API create lead appears in admin", async ({
    page,
    runId,
  }) => {
    const response = await createLeadViaApi(page, runId);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true });

    await page.goto("/admin/leads");
    await page.getByLabel("Поиск").fill(runId);
    await page.getByRole("button", { name: "Применить" }).click();

    const card = page.locator("a.admin-list-card").filter({ hasText: runId });
    await expect(card).toHaveCount(1);
    await expect(card).toContainText("+37369123456");

    // Outcome also confirmed in the DB.
    const lead = await adminRead.getLeadByComment(runId);
    expect(lead).toBeTruthy();
    expect(lead?.name).toContain(runId);
  });

  test("ADM-LEAD-02: Status filter shows only matching status", async ({
    page,
    runId,
  }) => {
    const newLead = await createLeadDirect(runId);
    const closedLead = await createLeadDirect(runId, { status: "closed" });

    await page.goto("/admin/leads");
    await page.locator('select[name="status"]').selectOption("new");
    await page.getByRole("button", { name: "Применить" }).click();
    await expect(page).toHaveURL(/status=new/);

    await expect(
      page.locator(`a[href="/admin/leads/${newLead.id}"]`),
    ).toHaveCount(1);
    await expect(
      page.locator(`a[href="/admin/leads/${closedLead.id}"]`),
    ).toHaveCount(0);
  });

  test("ADM-LEAD-03: CSV export", async ({ page }) => {
    const response = await page.request.get("/admin/leads/export");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/csv");
    expect(response.headers()["content-disposition"]).toContain(
      'attachment; filename="tehnosklad-leads-',
    );
    const body = await response.text();
    // Byte order mark precedes the quoted header row.
    expect(body.charCodeAt(0)).toBe(0xfeff);
    expect(body.slice(1).startsWith('"id","created_at"')).toBe(true);
  });

  test("ADM-LEAD-04: API validation errors", async ({ page, runId }) => {
    const noConsent = await createLeadViaApi(page, runId, {
      omitConsent: true,
    });
    expect(noConsent.status).toBe(422);
    const consentBody = (await noConsent.json()) as {
      ok: boolean;
      code: string;
      fieldErrors?: Record<string, string>;
    };
    expect(consentBody.ok).toBe(false);
    expect(consentBody.code).toBe("validation_error");
    expect(consentBody.fieldErrors?.consent).toBe("consent_required");

    const foreign = await createLeadViaApi(page, runId, {
      origin: "https://evil.example.com",
    });
    expect(foreign.status).toBe(403);
    expect(await foreign.json()).toEqual({ ok: false, code: "forbidden" });
  });

  test("ADM-LEAD-06: Detail shows contact + history", async ({
    page,
    runId,
  }) => {
    const lead = await createLeadDirect(runId);
    await page.goto(`/admin/leads/${lead.id}`);

    await expect(
      page.getByRole("heading", { level: 1, name: lead.name }),
    ).toBeVisible();
    await expect(page.getByText(`Заявка ${lead.id}`)).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Контакт" }),
    ).toBeVisible();
    await expect(page.getByText("+37369123456")).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Статус" }),
    ).toBeVisible();
    // Insert trigger records the initial history row with no actor.
    await expect(page.getByText("Изменил: система")).toBeVisible();
    await expect(page.getByText("создана").first()).toBeVisible();
  });

  test("ADM-LEAD-07: Change status new→in_progress", async ({
    page,
    runId,
  }) => {
    const lead = await createLeadDirect(runId);
    await page.goto(`/admin/leads/${lead.id}`);
    await page.locator('select[name="status"]').selectOption("in_progress");
    await page.getByRole("button", { name: "Изменить статус" }).click();
    await expectSaved(page);

    // UI: re-rendered select shows the new status.
    await expect(page.locator('select[name="status"]')).toHaveValue(
      "in_progress",
    );

    // DB: status changed and audit history written.
    const data = await adminRead.getLeadById(lead.id);
    expect(data?.status).toBe("in_progress");
    expect((data?.history ?? []).length).toBeGreaterThanOrEqual(2);
  });

  // known bug BUG-05: mapLead hides delivery embed (repository.ts:517)
  test("ADM-LEAD-08: Outbox visible with retry UI (BUG-05)", async ({
    page,
    runId,
  }) => {
    test.fail(
      true,
      "BUG-05: UI shows «Delivery отсутствует.» although the outbox row exists; retry button absent",
    );
    // Insert trigger creates the Telegram outbox row.
    const lead = await createLeadDirect(runId);
    await page.goto(`/admin/leads/${lead.id}`);
    // Single intended assertion last.
    await expect(
      page.getByRole("button", { name: "Повторно отправить в Telegram" }),
    ).toBeVisible();
  });

  // known bug BUG-05: delivery section (incl. confirm checkbox) is hidden
  // for every state — the report only annotated LEAD-08/10, but LEAD-09
  // cannot pass until BUG-05 is fixed either (report discrepancy noted).
  test("ADM-LEAD-09: manual_review requires confirm_uncertain (BUG-05)", async ({
    page,
    runId,
  }) => {
    test.fail(
      true,
      "BUG-05: retry form with confirm_uncertain is not rendered",
    );
    const lead = await createLeadDirect(runId);
    await setLeadDeliveryState(lead.id, "manual_review");
    await page.goto(`/admin/leads/${lead.id}`);
    const checkbox = page.locator('input[name="confirm_uncertain"]');
    await expect(checkbox).toBeVisible();
    await expect(checkbox).toHaveJSProperty("required", true);
    // Submit without checking must be blocked by HTML5.
    await page
      .getByRole("button", { name: "Повторно отправить в Telegram" })
      .click();
    await expect(
      page.locator('input[name="confirm_uncertain"]:invalid'),
    ).toHaveCount(1);
    expect(page.url()).not.toContain("saved=1");
  });

  // known bug BUG-05: retry UI unreachable when delivery embed hidden
  test("ADM-LEAD-10: Requeue after permanent_failure (BUG-05)", async ({
    page,
    runId,
  }) => {
    test.fail(
      true,
      "BUG-05: retry button hidden for a permanent_failure delivery",
    );
    const lead = await createLeadDirect(runId);
    await setLeadDeliveryState(lead.id, "permanent_failure", {
      attemptCount: 1,
      lastErrorCode: "telegram_config_missing",
    });
    await page.goto(`/admin/leads/${lead.id}`);
    // Single intended assertion last.
    await expect(
      page.getByRole("button", { name: "Повторно отправить в Telegram" }),
    ).toBeVisible();
  });

  test("ADM-LEAD-11: Double status submit yields one history row", async ({
    page,
    runId,
  }) => {
    const lead = await createLeadDirect(runId);
    await page.goto(`/admin/leads/${lead.id}`);
    await page.locator('select[name="status"]').selectOption("contacted");
    const button = page.getByRole("button", { name: "Изменить статус" });
    // Best-effort double submit: both clicks race the pending state.
    await Promise.all([
      button.click({ force: true }),
      button.click({ force: true }),
    ]);

    await expect(page.locator('select[name="status"]')).toHaveValue(
      "contacted",
    );
    const data = await adminRead.getLeadById(lead.id);
    expect(data?.status).toBe("contacted");
    const contactedRows = (data?.history ?? []).filter(
      (row: { status: string }) => row.status === "contacted",
    );
    expect(contactedRows.length).toBe(1);
  });
});

test.describe("ADM-LEAD-05: anonymous CSV export", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("ADM-LEAD-05: Anonymous CSV blocked", async ({ page }) => {
    const response = await page.request.get("/admin/leads/export");
    // Guard redirects to login; the final response is HTML, not CSV.
    expect(response.url()).toContain("/admin/login");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/html");
    expect(response.headers()["content-disposition"]).toBeUndefined();
  });
});
