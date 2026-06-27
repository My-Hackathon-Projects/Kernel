import {
  runnerExecuteResultSchema,
  type RunnerExecuteResult,
  type RunStatus,
  type ValidationResult
} from "@agentport/core";

export function buildRunnerResult(params: {
  runId: string;
  status: RunStatus;
  steps: RunnerExecuteResult["steps"];
  artifacts: RunnerExecuteResult["artifacts"];
  approval: RunnerExecuteResult["approval"];
  validation: ValidationResult | null;
}): RunnerExecuteResult {
  return runnerExecuteResultSchema.parse({
    runId: params.runId,
    status: params.status,
    steps: params.steps,
    artifacts: params.artifacts,
    approval: params.approval,
    validation: params.validation,
    evidenceUrl: `/runs/${params.runId}`
  });
}
