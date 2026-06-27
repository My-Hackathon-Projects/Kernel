import { parseExecuteRequest } from "@agentport/core";
import Fastify from "fastify";

type RunnerOptions = {
  logger?: boolean;
};

export function buildRunner(options: RunnerOptions = {}) {
  const app = Fastify({ logger: options.logger ?? true });

  app.get("/health", async () => ({
    status: "ok",
    service: "agentport-runner"
  }));

  app.post("/execute", async (request, reply) => {
    const parsed = parseExecuteRequest(request.body);

    if (!parsed.success) {
      return reply.status(400).send(parsed.error);
    }

    return reply.status(202).send({
      runId: parsed.data.runId,
      status: "accepted",
      message:
        "Runner scaffold validated the request. Playwright execution lands in M2."
    });
  });

  return app;
}
