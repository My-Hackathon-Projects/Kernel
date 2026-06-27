import { apiError, resumeRequestSchema } from "@agentport/core";
import { type FastifyInstance } from "fastify";
import {
  createWorkflowResumer,
  type ResumeWorkflow
} from "../execution/workflow-executor";
import { sendExecutionResult } from "./route-helpers";

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

    return sendExecutionResult(
      reply,
      {
        errorCode: "resume_failed",
        message: "Workflow resume failed",
        logContext: {
          runId: parsed.data.runId,
          approvalId: parsed.data.approvalId
        }
      },
      () => resumeWorkflow(parsed.data)
    );
  });
}
