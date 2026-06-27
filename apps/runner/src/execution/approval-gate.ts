import { type ApprovalDecision, type RunnerExecuteResult } from "@agentport/core";
import {
  completeRunStep,
  createApprovalRequest,
  decideApprovalRequest,
  getPrismaClient,
  markRunAwaitingApproval,
  markRunFinished,
  markRunStepAwaitingApproval,
  markRunStepRejected
} from "@agentport/db";
import {
  closeContext,
  nowMs,
  type ExecutionState,
  type WriteClickStep
} from "./execution-state";
import { storePendingApprovalRun, type PendingApprovalRun } from "./pending-runs";
import { buildRunnerResult } from "./run-result";
import { recordStepScreenshot } from "./screenshot-recorder";
import { resolveWorkflowStepTarget, waitForResolvedTarget } from "./step-executor";
import { emitStepResolved, emitTrace } from "./trace-recorder";

export async function pauseForApproval(params: {
  state: ExecutionState;
  step: WriteClickStep;
  stepIndex: number;
  runStepId: string;
  startedAt: number;
}): Promise<RunnerExecuteResult> {
  const prisma = getPrismaClient();
  const resolvedTarget = await resolveWorkflowStepTarget(
    params.state.page,
    params.step
  );
  await waitForResolvedTarget(resolvedTarget);
  await emitStepResolved({
    runId: params.state.runId,
    stepId: params.step.id,
    tier: resolvedTarget.tier,
    selector: resolvedTarget.selector
  });

  const artifact = await recordStepScreenshot(params.state, params.step.id);
  const prompt = `Approve ${params.state.request.workflow.name} step ${params.step.id}`;
  const payload = {
    input: { ...params.state.request.input },
    step: {
      id: params.step.id,
      action: params.step.action,
      risk: params.step.risk
    },
    resolvedElement: resolvedTarget.selector
  };
  const approval = await createApprovalRequest(prisma, {
    runId: params.state.runId,
    stepId: params.step.id,
    prompt,
    payload
  });
  const durationMs = Math.round(nowMs() - params.startedAt);

  await markRunStepAwaitingApproval(prisma, {
    id: params.runStepId,
    selector: resolvedTarget.selector,
    resolvedTier: resolvedTarget.tier,
    durationMs,
    screenshotId: artifact.id
  });
  await markRunAwaitingApproval(prisma, params.state.runId);
  await emitTrace(params.state.runId, {
    type: "approval_requested",
    approvalId: approval.id,
    stepId: params.step.id,
    prompt,
    payload,
    resolvedElement: resolvedTarget.selector
  });

  params.state.steps.push({
    stepId: params.step.id,
    action: params.step.action,
    status: "awaiting_approval",
    selector: resolvedTarget.selector,
    screenshotId: artifact.id,
    durationMs
  });
  storePendingApprovalRun({
    approvalId: approval.id,
    runId: params.state.runId,
    request: params.state.request,
    config: params.state.config,
    context: params.state.context,
    page: params.state.page,
    pausedStep: params.step,
    pausedStepIndex: params.stepIndex,
    runStepId: params.runStepId,
    stepStartedAt: params.startedAt,
    resolvedTarget,
    steps: params.state.steps,
    artifacts: params.state.artifacts
  });

  return buildRunnerResult({
    runId: params.state.runId,
    status: "awaiting_approval",
    steps: params.state.steps,
    artifacts: params.state.artifacts,
    approval: {
      id: approval.id,
      status: approval.status
    },
    validation: null
  });
}

async function recordApprovalDecision(
  pending: PendingApprovalRun,
  decision: ApprovalDecision
): Promise<void> {
  await decideApprovalRequest(getPrismaClient(), {
    approvalId: pending.approvalId,
    decision,
    decidedBy: "dashboard"
  });
  await emitTrace(pending.runId, {
    type: "approval_decided",
    approvalId: pending.approvalId,
    decision
  });
}

export async function rejectPendingRun(
  pending: PendingApprovalRun,
  decision: ApprovalDecision
): Promise<RunnerExecuteResult> {
  const prisma = getPrismaClient();
  await recordApprovalDecision(pending, decision);
  await markRunStepRejected(prisma, {
    id: pending.runStepId,
    durationMs: Math.round(nowMs() - pending.stepStartedAt)
  });
  await markRunFinished(prisma, {
    runId: pending.runId,
    status: "rejected",
    error: "Approval rejected"
  });
  await emitTrace(pending.runId, { type: "run_finished", status: "rejected" });
  await closeContext(pending.context);

  const steps = pending.steps.map((step) =>
    step.status === "awaiting_approval" && step.stepId === pending.pausedStep.id
      ? { ...step, status: "rejected" as const }
      : step
  );

  return buildRunnerResult({
    runId: pending.runId,
    status: "rejected",
    steps,
    artifacts: pending.artifacts,
    approval: {
      id: pending.approvalId,
      status: "rejected"
    },
    validation: null
  });
}

export async function approvePendingRunStep(
  pending: PendingApprovalRun,
  decision: ApprovalDecision
): Promise<void> {
  await recordApprovalDecision(pending, decision);
  await pending.resolvedTarget.locator.click();

  const durationMs = Math.round(nowMs() - pending.stepStartedAt);
  const artifact = await recordStepScreenshot(pending, pending.pausedStep.id);

  await completeRunStep(getPrismaClient(), {
    id: pending.runStepId,
    selector: pending.resolvedTarget.selector,
    resolvedTier: pending.resolvedTarget.tier,
    durationMs,
    screenshotId: artifact.id
  });
  pending.steps.splice(
    pending.steps.findIndex((step) => step.stepId === pending.pausedStep.id),
    1,
    {
      stepId: pending.pausedStep.id,
      action: pending.pausedStep.action,
      status: "succeeded",
      selector: pending.resolvedTarget.selector,
      screenshotId: artifact.id,
      durationMs
    }
  );
  await emitTrace(pending.runId, {
    type: "step_completed",
    stepId: pending.pausedStep.id,
    durationMs
  });
}
