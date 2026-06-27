import { type FastifyInstance } from "fastify";

/** Liveness endpoint used by the dashboard and deployment health checks. */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => ({
    status: "ok",
    service: "agentport-runner"
  }));
}
