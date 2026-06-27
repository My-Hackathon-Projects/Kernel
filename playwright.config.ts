import { defineConfig } from "@playwright/test";

const mockPortalUrl = "http://localhost:3001";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: mockPortalUrl,
    trace: "on-first-retry"
  },
  webServer: {
    command: "pnpm --filter @agentport/mock-portal dev",
    url: mockPortalUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe"
  }
});
