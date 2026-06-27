import { type Locator, type Page } from "playwright";
import { type WorkflowDefinition } from "@agentport/core";

type SemanticTarget = Extract<
  WorkflowDefinition["steps"][number],
  { target: unknown }
>["target"];

type AriaRole = Parameters<Page["getByRole"]>[0];

export type ResolvedTarget = {
  locator: Locator;
  selector: string;
  tier: 1 | 2;
};

async function waitForSingleVisible(locator: Locator): Promise<boolean> {
  try {
    await locator.first().waitFor({ state: "visible", timeout: 5_000 });
  } catch {
    return false;
  }

  return (await locator.count()) === 1;
}

async function resolveCachedSelector(
  page: Page,
  target: SemanticTarget
): Promise<ResolvedTarget | null> {
  if (!target.cachedSelector) {
    return null;
  }

  const locator = page.locator(target.cachedSelector);
  if (!(await waitForSingleVisible(locator))) {
    return null;
  }

  return {
    locator,
    selector: target.cachedSelector,
    tier: 1
  };
}

async function resolveByRole(
  page: Page,
  target: SemanticTarget
): Promise<ResolvedTarget> {
  for (const name of target.nameHints) {
    const locator = page.getByRole(target.role as AriaRole, { name });
    if (await waitForSingleVisible(locator)) {
      return {
        locator,
        selector: `role=${target.role}[name="${name}"]`,
        tier: 2
      };
    }
  }

  throw new Error(
    `Could not resolve target "${target.intent}" with role "${target.role}" and hints: ${target.nameHints.join(", ")}`
  );
}

export async function resolveTarget(
  page: Page,
  target: SemanticTarget
): Promise<ResolvedTarget> {
  return (await resolveCachedSelector(page, target)) ?? resolveByRole(page, target);
}
