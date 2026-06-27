import {
  type ParsedExecuteRequest,
  type ResumeRequest,
  type RunnerExecuteResult
} from "@agentport/core";
import {
  createRunStep,
  ensureRunForExecution,
  failRunStep,
  getPrismaClient,
  markRunStarted
} from "@agentport/db";
import { resolveRunnerExecutionConfig, type RunnerExecutionConfig } from "../config";
import {
  approvePendingRunStep,
  pauseForApproval,
  rejectPendingRun
} from "./approval-gate";
import { createRunPage } from "./browser-manager";
import { isWriteClickStep, nowMs, type ExecutionState } from "./execution-state";
import { takePendingApprovalRun, type PendingApprovalRun } from "./pending-runs";
import { completeValidation, failRun } from "./run-finalizer";
import { completeExecutedStep } from "./step-recorder";
import { executeWorkflowStep } from "./step-executor";
import { emitStepResolved, emitTrace } from "./trace-recorder";

export type ExecuteWorkflow = (
  request: ParsedExecuteRequest
) => Promise<RunnerExecuteResult>;

export type ResumeWorkflow = (request: ResumeRequest) => Promise<RunnerExecuteResult>;

async function executeStepsUntilPause(
  state: ExecutionState,
  startIndex: number
): Promise<RunnerExecuteResult> {
  const prisma = getPrismaClient();

  for (
    let index = startIndex;
    index < state.request.workflow.steps.length;
    index += 1
  ) {
    const step = state.request.workflow.steps[index];
    if (!step) {
      break;
    }

    const startedAt = nowMs();
    const runStep = await createRunStep(prisma, {
      runId: state.runId,
      stepId: step.id,
      action: step.action
    });

    await emitTrace(state.runId, {
      type: "step_started",
      stepId: step.id,
      action: step.action
    });

    try {
      if (isWriteClickStep(step)) {
        return pauseForApproval({
          state,
          step,
          stepIndex: index,
          runStepId: runStep.id,
          startedAt
        });
      }

      const stepResult = await executeWorkflowStep(state.page, {
        step,
        input: state.request.input,
        targetBaseUrl: state.config.mockPortalBaseUrl
      });
      if (stepResult.selector && stepResult.resolvedTier) {
        await emitStepResolved({
          runId: state.runId,
          stepId: step.id,
          tier: stepResult.resolvedTier,
          selector: stepResult.selector
        });
      }

      await completeExecutedStep({
        state,
        runStepId: runStep.id,
        step,
        stepResult,
        durationMs: Math.round(nowMs() - startedAt)
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Workflow step failed";
      await failRunStep(prisma, {
        id: runStep.id,
        durationMs: Math.round(nowMs() - startedAt)
      });
      await emitTrace(state.runId, { type: "error", stepId: step.id, reason });
      throw error;
    }
  }

  return completeValidation(state);
}

export function createWorkflowExecutor(
  config: RunnerExecutionConfig = resolveRunnerExecutionConfig()
): ExecuteWorkflow {
  return async function executeWorkflow(request) {
    const prisma = getPrismaClient();
    const run = await ensureRunForExecution(prisma, {
      runId: request.runId,
      workflow: request.workflow,
      input: request.input,
      targetBaseUrl: config.mockPortalBaseUrl
    });

    await markRunStarted(prisma, run.id);
    await emitTrace(run.id, { type: "run_started" });

    const { context, page } = await createRunPage();
    const state: ExecutionState = {
      runId: run.id,
      request,
      config,
      context,
      page,
      steps: [],
      artifacts: []
    };

    try {
      return await executeStepsUntilPause(state, 0);
    } catch (error) {
      await failRun({ runId: run.id, context, error });
      throw error;
    }
  };
}

async function approvePendingRun(
  pending: PendingApprovalRun,
  decision: ResumeRequest["decision"]
): Promise<RunnerExecuteResult> {
  try {
    await approvePendingRunStep(pending, decision);
    return await executeStepsUntilPause(pending, pending.pausedStepIndex + 1);
  } catch (error) {
    await failRun({ runId: pending.runId, context: pending.context, error });
    throw error;
  }
}

export function createWorkflowResumer(): ResumeWorkflow {
  return async function resumeWorkflow(request) {
    const pending = takePendingApprovalRun(request.approvalId);
    if (!pending || pending.runId !== request.runId) {
      throw new Error("No pending in-memory execution found for approval");
    }

    return request.decision === "approve"
      ? approvePendingRun(pending, request.decision)
      : rejectPendingRun(pending, request.decision);
  };
}
