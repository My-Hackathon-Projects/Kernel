import { completeRunStep, getPrismaClient } from "@agentport/db";
import { type ExecutionState, type WorkflowStep } from "./execution-state";
import { recordStepScreenshot } from "./screenshot-recorder";
import { type StepExecutionResult } from "./step-executor";
import { emitTrace } from "./trace-recorder";

export async function completeExecutedStep(params: {
  state: ExecutionState;
  runStepId: string;
  step: WorkflowStep;
  stepResult: StepExecutionResult;
  durationMs: number;
}): Promise<void> {
  const artifact = await recordStepScreenshot(params.state, params.step.id);

  await completeRunStep(getPrismaClient(), {
    id: params.runStepId,
    durationMs: params.durationMs,
    screenshotId: artifact.id,
    ...(params.stepResult.selector !== undefined
      ? { selector: params.stepResult.selector }
      : {}),
    ...(params.stepResult.resolvedValue !== undefined
      ? { resolvedValue: params.stepResult.resolvedValue }
      : {}),
    ...(params.stepResult.resolvedTier !== undefined
      ? { resolvedTier: params.stepResult.resolvedTier }
      : {})
  });

  params.state.steps.push({
    stepId: params.step.id,
    action: params.step.action,
    status: "succeeded",
    selector: params.stepResult.selector ?? null,
    screenshotId: artifact.id,
    durationMs: params.durationMs
  });
  await emitTrace(params.state.runId, {
    type: "step_completed",
    stepId: params.step.id,
    durationMs: params.durationMs
  });
}
