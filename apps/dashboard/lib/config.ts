export type DashboardConfig = {
  dashboardBaseUrl: string;
  runnerBaseUrl: string;
  mockPortalBaseUrl: string;
};

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function resolveDashboardConfig(
  env: NodeJS.ProcessEnv = process.env
): DashboardConfig {
  return {
    dashboardBaseUrl: trimTrailingSlash(
      env.DASHBOARD_BASE_URL ?? "http://localhost:3000"
    ),
    runnerBaseUrl: trimTrailingSlash(env.RUNNER_BASE_URL ?? "http://127.0.0.1:4000"),
    mockPortalBaseUrl: trimTrailingSlash(
      env.MOCK_PORTAL_BASE_URL ?? "http://localhost:3001"
    )
  };
}
