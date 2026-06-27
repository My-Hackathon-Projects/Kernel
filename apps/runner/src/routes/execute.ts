import { parseExecuteRequest } from "@agentport/core";
import { type FastifyInstance } from "fastify";
import {
  createWorkflowExecutor,
  type ExecuteWorkflow
} from "../execution/workflow-executor";
import { sendExecutionResult } from "./route-helpers";

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

    return sendExecutionResult(
      reply,
      {
        errorCode: "execution_failed",
        message: "Workflow execution failed",
        logContext: { runId: parsed.data.runId }
      },
      () => executeWorkflow(parsed.data)
    );
  });
}
