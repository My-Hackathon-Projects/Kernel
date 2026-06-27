export type RunnerExecutionConfig = {
  mockPortalBaseUrl: string;
  artifactRoot: string;
};

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function resolveRunnerExecutionConfig(
  env: NodeJS.ProcessEnv = process.env
): RunnerExecutionConfig {
  return {
    mockPortalBaseUrl: trimTrailingSlash(
      env.MOCK_PORTAL_BASE_URL ?? "http://localhost:3001"
    ),
    artifactRoot: env.ARTIFACT_ROOT ?? ".tmp/artifacts"
  };
}
