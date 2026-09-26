/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, expect, type Page } from "@playwright/test";

import { generateRunId } from "./run-id";
import { adminDb } from "../helpers/admin-db";
import * as factories from "../helpers/factories";

export interface AdminTestFixtures {
  runId: string;
  adminDb: typeof adminDb;
  factories: typeof factories;
  adminPage: Page;
}

export const test = base.extend<AdminTestFixtures>({
  runId: async ({}, use) => {
    const id = generateRunId();
    await use(id);
  },

  adminDb: async ({}, use) => {
    await use(adminDb);
  },

  factories: async ({}, use) => {
    await use(factories);
  },

  adminPage: async ({ page, runId }, use) => {
    // Navigate to admin root
    await page.goto("/admin");
    await page.waitForLoadState("domcontentloaded");

    // Provide authenticated page to the test
    await use(page);

    // Automatic teardown after test execution
    await adminDb.cleanUpByRunId(runId);
  },
});

export { expect };
