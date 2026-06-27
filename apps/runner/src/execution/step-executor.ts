import { type WorkflowDefinition, type WorkflowInput } from "@agentport/core";
import { type Page } from "playwright";
import { resolveTarget, type ResolvedTarget } from "./target-resolver";

type WorkflowStep = WorkflowDefinition["steps"][number];

export type StepExecutionResult = {
  selector?: string;
  resolvedValue?: string;
  resolvedTier?: number;
};

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

async function resolve(page: Page, step: Extract<WorkflowStep, { target: unknown }>) {
  return resolveTarget(page, step.target);
}

async function waitForResolvedTarget(target: ResolvedTarget): Promise<void> {
  await target.locator.waitFor({ state: "visible" });
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
      const target = await resolve(page, params.step);
      await waitForResolvedTarget(target);
      await target.locator.click();
      return {
        selector: target.selector,
        resolvedTier: target.tier
      };
    }
    case "fill": {
      const target = await resolve(page, params.step);
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
      const target = await resolve(page, params.step);
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
      const target = await resolve(page, params.step);
      await waitForResolvedTarget(target);
      return {
        selector: target.selector,
        resolvedTier: target.tier
      };
    }
  }
}
