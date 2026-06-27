import { type WorkflowDefinition, type WorkflowInput } from "@agentport/core";
import { type Page } from "playwright";
import { resolveTarget, type ResolvedTarget } from "./target-resolver";

type WorkflowStep = WorkflowDefinition["steps"][number];
type TargetStep = Extract<WorkflowStep, { target: unknown }>;
type FieldStep = Extract<WorkflowStep, { field: string }>;

export type StepExecutionResult = {
  selector?: string;
  resolvedValue?: string;
  resolvedTier?: ResolvedTarget["tier"];
};

export type ResolvedStepTarget = ResolvedTarget;

function buildStepUrl(baseUrl: string, path: string): string {
  return new URL(path, `${baseUrl}/`).toString();
}

function getStepInput(input: WorkflowInput, field: string): string {
  const value = input[field];
  if (value === undefined) {
    throw new Error(`Input "${field}" was not provided`);
  }

  return value;
}

export async function resolveWorkflowStepTarget(
  page: Page,
  step: TargetStep
): Promise<ResolvedStepTarget> {
  return resolveTarget(page, step.target);
}

export async function waitForResolvedTarget(target: ResolvedTarget): Promise<void> {
  await target.locator.waitFor({ state: "visible" });
}

export function readStepInput(input: WorkflowInput, step: FieldStep): string {
  return getStepInput(input, step.field);
}

export async function executeWorkflowStep(
  page: Page,
  params: {
    step: WorkflowStep;
    input: WorkflowInput;
    targetBaseUrl: string;
  }
): Promise<StepExecutionResult> {
  switch (params.step.action) {
    case "goto": {
      await page.goto(buildStepUrl(params.targetBaseUrl, params.step.url), {
        waitUntil: "domcontentloaded"
      });
      return {};
    }
    case "click": {
      const target = await resolveWorkflowStepTarget(page, params.step);
      await waitForResolvedTarget(target);
      await target.locator.click();
      return {
        selector: target.selector,
        resolvedTier: target.tier
      };
    }
    case "fill": {
      const target = await resolveWorkflowStepTarget(page, params.step);
      const value = getStepInput(params.input, params.step.field);
      await waitForResolvedTarget(target);
      await target.locator.fill(value);
      return {
        selector: target.selector,
        resolvedValue: value,
        resolvedTier: target.tier
      };
    }
    case "select": {
      const target = await resolveWorkflowStepTarget(page, params.step);
      const value = getStepInput(params.input, params.step.field);
      await waitForResolvedTarget(target);
      await target.locator.selectOption(value);
      return {
        selector: target.selector,
        resolvedValue: value,
        resolvedTier: target.tier
      };
    }
    case "waitFor": {
      const target = await resolveWorkflowStepTarget(page, params.step);
      await waitForResolvedTarget(target);
      return {
        selector: target.selector,
        resolvedTier: target.tier
      };
    }
  }
}
