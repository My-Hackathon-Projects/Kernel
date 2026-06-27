import {
  runnerExecuteResultSchema,
  type ParsedExecuteRequest,
  type RunnerExecuteResult
} from "@agentport/core";
import {
  completeRunStep,
  createAuditEvent,
  createRunStep,
  createScreenshotArtifact,
  ensureRunForExecution,
  failRunStep,
  getPrismaClient,
  markRunFinished,
  markRunStarted
} from "@agentport/db";
import { captureStepScreenshot } from "./artifact-writer";
import { createRunPage } from "./browser-manager";
import { resolveRunnerExecutionConfig, type RunnerExecutionConfig } from "../config";
import { executeWorkflowStep } from "./step-executor";

export type ExecuteWorkflow = (
  request: ParsedExecuteRequest
) => Promise<RunnerExecuteResult>;

function nowMs(): number {
  return performance.now();
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
    await createAuditEvent(prisma, {
      runId: run.id,
      type: "run_started",
      data: { workflow: request.workflow.name, version: request.workflow.version }
    });

    const { context, page } = await createRunPage();
    const steps: RunnerExecuteResult["steps"] = [];
    const artifacts: RunnerExecuteResult["artifacts"] = [];

    try {
      for (const step of request.workflow.steps) {
        const startedAt = nowMs();
        const runStep = await createRunStep(prisma, {
          runId: run.id,
          stepId: step.id,
          action: step.action
        });

        try {
          const stepResult = await executeWorkflowStep(page, {
            step,
            input: request.input,
            targetBaseUrl: config.mockPortalBaseUrl
          });
          const screenshot = await captureStepScreenshot(page, {
            artifactRoot: config.artifactRoot,
            runId: run.id,
            stepId: step.id
          });
          const artifact = await createScreenshotArtifact(prisma, {
            runId: run.id,
            stepId: step.id,
            uri: screenshot.uri
          });
          const durationMs = Math.round(nowMs() - startedAt);

          const completedStep = {
            id: runStep.id,
            durationMs,
            screenshotId: artifact.id
          };

          await completeRunStep(prisma, {
            ...completedStep,
            ...(stepResult.selector !== undefined
              ? { selector: stepResult.selector }
              : {}),
            ...(stepResult.resolvedValue !== undefined
              ? { resolvedValue: stepResult.resolvedValue }
              : {}),
            ...(stepResult.resolvedTier !== undefined
              ? { resolvedTier: stepResult.resolvedTier }
              : {})
          });

          steps.push({
            stepId: step.id,
            action: step.action,
            status: "succeeded",
            selector: stepResult.selector ?? null,
            screenshotId: artifact.id,
            durationMs
          });
          artifacts.push({
            id: artifact.id,
            stepId: step.id,
            kind: "screenshot",
            uri: artifact.uri
          });
        } catch (error) {
          await failRunStep(prisma, {
            id: runStep.id,
            durationMs: Math.round(nowMs() - startedAt)
          });
          throw error;
        }
      }

      await markRunFinished(prisma, { runId: run.id, status: "succeeded" });
      await createAuditEvent(prisma, {
        runId: run.id,
        type: "run_finished",
        data: { status: "succeeded" }
      });

      return runnerExecuteResultSchema.parse({
        runId: run.id,
        status: "succeeded",
        steps,
        artifacts,
        evidenceUrl: `/runs/${run.id}`
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Workflow execution failed";
      await markRunFinished(prisma, {
        runId: run.id,
        status: "failed",
        error: message
      });
      await createAuditEvent(prisma, {
        runId: run.id,
        type: "run_failed",
        data: { reason: message }
      });
      throw error;
    } finally {
      await context.close();
    }
  };
}
