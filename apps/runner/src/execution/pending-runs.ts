import {
  type ParsedExecuteRequest,
  type RunnerExecuteResult,
  type WorkflowDefinition
} from "@agentport/core";
import { type BrowserContext, type Page } from "playwright";
import { type RunnerExecutionConfig } from "../config";
import { type ResolvedStepTarget } from "./step-executor";

type WorkflowStep = WorkflowDefinition["steps"][number];

export type PendingApprovalRun = {
  approvalId: string;
  runId: string;
  workflowId: string;
  request: ParsedExecuteRequest;
  config: RunnerExecutionConfig;
  context: BrowserContext;
  page: Page;
  pausedStep: Extract<WorkflowStep, { action: "click" }>;
  pausedStepIndex: number;
  runStepId: string;
  stepStartedAt: number;
  resolvedTarget: ResolvedStepTarget;
  steps: RunnerExecuteResult["steps"];
  artifacts: RunnerExecuteResult["artifacts"];
};

const pendingByApprovalId = new Map<string, PendingApprovalRun>();

export function storePendingApprovalRun(run: PendingApprovalRun): void {
  pendingByApprovalId.set(run.approvalId, run);
}

export function takePendingApprovalRun(approvalId: string): PendingApprovalRun | null {
  const run = pendingByApprovalId.get(approvalId) ?? null;
  if (run) {
    pendingByApprovalId.delete(approvalId);
  }

  return run;
}
