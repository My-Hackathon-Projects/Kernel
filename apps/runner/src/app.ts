import Fastify from "fastify";
import { closeRunnerBrowser } from "./execution/browser-manager";
import { type ExecuteWorkflow } from "./execution/workflow-executor";
import { executeRoutes } from "./routes/execute";
import { healthRoutes } from "./routes/health";

type RunnerOptions = {
  executeWorkflow?: ExecuteWorkflow;
  logger?: boolean;
};

/**
 * Composition root for the runner service. Route handlers live in `./routes` so
 * the M2 execution surface can grow without turning this file into a catch-all.
 */
export function buildRunner(options: RunnerOptions = {}) {
  const app = Fastify({ logger: options.logger ?? true });
  const executeRouteOptions = options.executeWorkflow
    ? { executeWorkflow: options.executeWorkflow }
    : {};

  app.register(healthRoutes);
  app.register(executeRoutes, executeRouteOptions);
  app.addHook("onClose", async () => {
    await closeRunnerBrowser();
  });

  return app;
}
