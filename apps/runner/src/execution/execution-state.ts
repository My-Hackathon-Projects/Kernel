import {
  type ParsedExecuteRequest,
  type RunnerExecuteResult,
  type WorkflowDefinition
} from "@agentport/core";
import { type BrowserContext, type Page } from "playwright";
import { type RunnerExecutionConfig } from "../config";

export type WorkflowStep = WorkflowDefinition["steps"][number];
export type WriteClickStep = Extract<WorkflowStep, { action: "click" }>;

export type ExecutionState = {
  runId: string;
  workflowId: string;
  request: ParsedExecuteRequest;
  config: RunnerExecutionConfig;
  context: BrowserContext;
  page: Page;
  steps: RunnerExecuteResult["steps"];
  artifacts: RunnerExecuteResult["artifacts"];
};

export function nowMs(): number {
  return performance.now();
}

export function isWriteClickStep(step: WorkflowStep): step is WriteClickStep {
  return step.action === "click" && step.risk === "write";
}

export async function closeContext(context: BrowserContext): Promise<void> {
  await context.close().catch(() => undefined);
}
