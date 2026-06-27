import { defineConfig } from "@playwright/test";
import path from "node:path";

const dashboardUrl = "http://localhost:3000";
const runnerUrl = "http://127.0.0.1:4000";
const mockPortalUrl = "http://localhost:3001";
const e2eEnv = {
  ARTIFACT_ROOT: path.join(process.cwd(), ".tmp", "artifacts"),
  DASHBOARD_BASE_URL: dashboardUrl,
  DATABASE_URL: "file:../.tmp/agentport-e2e.sqlite",
  MOCK_PORTAL_BASE_URL: mockPortalUrl,
  MOCK_PORTAL_PORT: "3001",
  RUNNER_BASE_URL: runnerUrl,
  RUNNER_HOST: "127.0.0.1",
  RUNNER_PORT: "4000"
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: dashboardUrl,
    trace: "on-first-retry"
  },
  webServer: [
    {
      command: "pnpm --filter @agentport/mock-portal dev",
      env: e2eEnv,
      url: mockPortalUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe"
    },
    {
      command: "pnpm --filter @agentport/runner dev",
      env: e2eEnv,
      url: `${runnerUrl}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe"
    },
    {
      command: "pnpm --filter @agentport/dashboard dev",
      env: e2eEnv,
      url: dashboardUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe"
    }
  ]
});
