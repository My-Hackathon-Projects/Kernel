import { apiError, parseExecuteRequest } from "@agentport/core";
import { type FastifyInstance } from "fastify";
import {
  createWorkflowExecutor,
  type ExecuteWorkflow
} from "../execution/workflow-executor";

type ExecuteRouteOptions = {
  executeWorkflow?: ExecuteWorkflow;
};

export async function executeRoutes(
  app: FastifyInstance,
  options: ExecuteRouteOptions = {}
): Promise<void> {
  const executeWorkflow = options.executeWorkflow ?? createWorkflowExecutor();

  app.post("/execute", async (request, reply) => {
    const parsed = parseExecuteRequest(request.body);

    if (!parsed.success) {
      return reply.status(400).send(parsed.error);
    }

    try {
      return reply.status(200).send(await executeWorkflow(parsed.data));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Workflow execution failed";
      request.log.error(
        { err: error, runId: parsed.data.runId },
        "Workflow execution failed"
      );
      return reply.status(500).send(apiError("execution_failed", message));
    }
  });
}
