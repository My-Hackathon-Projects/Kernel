import Fastify from "fastify";
import { closeRunnerBrowser } from "./execution/browser-manager";
import {
  type ExecuteWorkflow,
  type ResumeWorkflow
} from "./execution/workflow-executor";
import { executeRoutes } from "./routes/execute";
import { healthRoutes } from "./routes/health";
import { resumeRoutes } from "./routes/resume";

type RunnerOptions = {
  executeWorkflow?: ExecuteWorkflow;
  resumeWorkflow?: ResumeWorkflow;
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
  const resumeRouteOptions = options.resumeWorkflow
    ? { resumeWorkflow: options.resumeWorkflow }
    : {};

  app.register(healthRoutes);
  app.register(executeRoutes, executeRouteOptions);
  app.register(resumeRoutes, resumeRouteOptions);
  app.addHook("onClose", async () => {
    await closeRunnerBrowser();
  });

  return app;
}
