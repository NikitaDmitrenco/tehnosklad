import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  timeout: 60_000,
  workers: process.env.CI ? 2 : 3,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: `${baseURL}/ru`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    // 1. Global Auth Setup project: authenticates test admin via UI and stores session
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    // 2. Admin E2E project: runs all admin specs using authenticated storageState
    {
      name: "admin",
      testMatch: /admin-.*\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/admin.json",
      },
    },
    // 3. Public Storefront projects: ignore admin specs and setup
    {
      name: "chromium",
      testIgnore: [/admin-.*\.spec\.ts/, /.*\.setup\.ts/],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      testIgnore: [/admin-.*\.spec\.ts/, /.*\.setup\.ts/],
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "mobile-webkit",
      testIgnore: [/admin-.*\.spec\.ts/, /.*\.setup\.ts/],
      use: { ...devices["iPhone 13"] },
    },
  ],
});
