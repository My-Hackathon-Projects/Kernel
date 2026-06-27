import Fastify from "fastify";
import { executeRoutes } from "./routes/execute";
import { healthRoutes } from "./routes/health";

type RunnerOptions = {
  logger?: boolean;
};

/**
 * Composition root for the runner service. Route handlers live in `./routes` so
 * the M2 execution surface can grow without turning this file into a catch-all.
 */
export function buildRunner(options: RunnerOptions = {}) {
  const app = Fastify({ logger: options.logger ?? true });

  app.register(healthRoutes);
  app.register(executeRoutes);

  return app;
}
