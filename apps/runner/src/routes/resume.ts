import { apiError, resumeRequestSchema } from "@agentport/core";
import { type FastifyInstance } from "fastify";
import {
  createWorkflowResumer,
  type ResumeWorkflow
} from "../execution/workflow-executor";

type ResumeRouteOptions = {
  resumeWorkflow?: ResumeWorkflow;
};

export async function resumeRoutes(
  app: FastifyInstance,
  options: ResumeRouteOptions = {}
): Promise<void> {
  const resumeWorkflow = options.resumeWorkflow ?? createWorkflowResumer();

  app.post("/resume", async (request, reply) => {
    const parsed = resumeRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply
        .status(400)
        .send(apiError("validation_failed", "Request validation failed"));
    }

    try {
      return reply.status(200).send(await resumeWorkflow(parsed.data));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Workflow resume failed";
      request.log.error(
        { err: error, runId: parsed.data.runId, approvalId: parsed.data.approvalId },
        "Workflow resume failed"
      );
      return reply.status(500).send(apiError("resume_failed", message));
    }
  });
}
