import { defineConfig } from "@playwright/test";
import path from "node:path";

const dashboardUrl = "http://localhost:3100";
const runnerUrl = "http://127.0.0.1:4100";
const mockPortalUrl = "http://localhost:3101";
const e2eEnv = {
  ARTIFACT_ROOT: path.join(process.cwd(), ".tmp", "artifacts"),
  DASHBOARD_BASE_URL: dashboardUrl,
  DASHBOARD_PORT: "3100",
  DATABASE_URL: "file:../.tmp/agentport-e2e.sqlite",
  MOCK_PORTAL_BASE_URL: mockPortalUrl,
  MOCK_PORTAL_PORT: "3101",
  NEXT_DIST_DIR: ".next-e2e",
  PLAYWRIGHT_BROWSERS_PATH: path.join(process.cwd(), ".cache", "ms-playwright"),
  RUNNER_BASE_URL: runnerUrl,
  RUNNER_HOST: "127.0.0.1",
  RUNNER_PORT: "4100"
};

Object.assign(process.env, e2eEnv);

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
