import { parseExecuteRequest } from "@agentport/core";
import { type FastifyInstance } from "fastify";

/**
 * Accepts a runner execute request and validates it against the shared workflow
 * contract. M1 stops at validation and returns 202; deterministic Playwright
 * execution lands in M2.
 */
export async function executeRoutes(app: FastifyInstance): Promise<void> {
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
}
