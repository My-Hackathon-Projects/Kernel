import { pathToFileURL } from "node:url";
import { buildRunner } from "./app.js";
import { loadRunnerEnv } from "./env-loader.js";

export type RunnerConfig = {
  host: string;
  port: number;
};

export function resolveRunnerConfig(env: NodeJS.ProcessEnv): RunnerConfig {
  const rawPort = env.RUNNER_PORT ?? "4000";
  const port = Number.parseInt(rawPort, 10);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("RUNNER_PORT must be an integer from 1 to 65535");
  }

  return {
    host: env.RUNNER_HOST ?? "127.0.0.1",
    port
  };
}

export async function startRunner() {
  loadRunnerEnv();
  const app = buildRunner();
  const { host, port } = resolveRunnerConfig(process.env);

  try {
    const address = await app.listen({ port, host });
    app.log.info({ address }, "AgentPort runner listening");
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await startRunner();
}
