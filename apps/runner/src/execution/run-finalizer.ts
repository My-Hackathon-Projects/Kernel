import { type RunnerExecuteResult, type RunStatus } from "@agentport/core";
import { createValidation, getPrismaClient, markRunFinished } from "@agentport/db";
import { closeContext, type ExecutionState } from "./execution-state";
import { validateWorkflowResult } from "./result-validator";
import { buildRunnerResult } from "./run-result";
import { emitTrace } from "./trace-recorder";

export async function completeValidation(
  state: ExecutionState
): Promise<RunnerExecuteResult> {
  const prisma = getPrismaClient();
  const validation = await validateWorkflowResult({
    workflow: state.request.workflow,
    input: state.request.input,
    targetBaseUrl: state.config.mockPortalBaseUrl
  });
  const status: Extract<RunStatus, "succeeded" | "validation_failed"> =
    validation.passed ? "succeeded" : "validation_failed";

  await createValidation(prisma, {
    runId: state.runId,
    type: state.request.workflow.validation.type,
    result: validation
  });
  await emitTrace(state.runId, {
    type: "validation_result",
    passed: validation.passed,
    expected: validation.expected,
    actual: validation.actual,
    ...(validation.reason !== undefined ? { reason: validation.reason } : {})
  });
  await markRunFinished(prisma, {
    runId: state.runId,
    status,
    ...(validation.reason !== undefined ? { error: validation.reason } : {})
  });
  await emitTrace(state.runId, { type: "run_finished", status });
  await closeContext(state.context);

  return buildRunnerResult({
    runId: state.runId,
    status,
    steps: state.steps,
    artifacts: state.artifacts,
    approval: null,
    validation
  });
}

export async function failRun(params: {
  runId: string;
  context: ExecutionState["context"];
  error: unknown;
}): Promise<void> {
  const message =
    params.error instanceof Error ? params.error.message : "Workflow execution failed";

  await markRunFinished(getPrismaClient(), {
    runId: params.runId,
    status: "failed",
    error: message
  });
  await emitTrace(params.runId, { type: "error", reason: message });
  await emitTrace(params.runId, { type: "run_finished", status: "failed" });
  await closeContext(params.context);
}
