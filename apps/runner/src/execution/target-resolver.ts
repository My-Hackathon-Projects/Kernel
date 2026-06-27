import {
  type ResolverTier,
  type SelectorPatchProposal,
  type WorkflowDefinition
} from "@agentport/core";
import { type Locator, type Page } from "playwright";
import {
  collectElementCandidates,
  quoteRoleSelectorName,
  type ElementCandidate
} from "./dom-candidates";
import {
  createAnthropicSelectorResolver,
  type LlmSelectorResolver
} from "./llm-selector-resolver";

type SemanticTarget = Extract<
  WorkflowDefinition["steps"][number],
  { target: unknown }
>["target"];

type AriaRole = Parameters<Page["getByRole"]>[0];

export type ResolvedTarget = {
  locator: Locator;
  selector: string;
  tier: ResolverTier;
  confidence: number;
  patch: SelectorPatchProposal | null;
};

export type TargetResolverOptions = {
  llmResolver?: LlmSelectorResolver;
  collectCandidates?: (page: Page) => Promise<ElementCandidate[]>;
};

const MIN_CACHE_CONFIDENCE = 0.8;
const MIN_LLM_CONFIDENCE = 0.6;

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
  if (!target.cachedSelector || (target.cacheConfidence ?? 0) < MIN_CACHE_CONFIDENCE) {
    return null;
  }

  const locator = page.locator(target.cachedSelector);
  if (!(await waitForSingleVisible(locator))) {
    return null;
  }

  return {
    locator,
    selector: target.cachedSelector,
    tier: 1,
    confidence: target.cacheConfidence ?? 1,
    patch: null
  };
}

function buildPatch(
  target: SemanticTarget,
  newSelector: string,
  tier: Exclude<ResolverTier, 1>,
  confidence: number
): SelectorPatchProposal | null {
  if (target.cachedSelector === newSelector) {
    return null;
  }

  if (!target.cachedSelector && tier === 2) {
    return null;
  }

  return {
    oldSelector: target.cachedSelector ?? null,
    newSelector,
    tier,
    confidence
  };
}

async function resolveByRole(
  page: Page,
  target: SemanticTarget
): Promise<ResolvedTarget | null> {
  for (const name of target.nameHints) {
    const locator = page.getByRole(target.role as AriaRole, { name, exact: false });
    if (await waitForSingleVisible(locator)) {
      const selector = `role=${target.role}[name="${quoteRoleSelectorName(name)}"]`;

      return {
        locator,
        selector,
        tier: 2,
        confidence: 0.95,
        patch: buildPatch(target, selector, 2, 0.95)
      };
    }
  }

  return null;
}

async function resolveByLlm(
  page: Page,
  target: SemanticTarget,
  options: Required<Pick<TargetResolverOptions, "collectCandidates" | "llmResolver">>
): Promise<ResolvedTarget> {
  const candidates = await options.collectCandidates(page);
  const resolution = await options.llmResolver({ target, candidates });
  const candidate = candidates.find(
    (item) => item.selector === resolution.selector && item.role === target.role
  );

  if (!candidate) {
    throw new Error(
      `LLM selector for "${target.intent}" did not match an existing ${target.role} candidate`
    );
  }

  if (resolution.confidence < MIN_LLM_CONFIDENCE) {
    throw new Error(
      `LLM selector for "${target.intent}" was below confidence threshold`
    );
  }

  const locator = page.locator(candidate.selector);
  if (!(await waitForSingleVisible(locator))) {
    throw new Error(`LLM selector for "${target.intent}" did not resolve visibly`);
  }

  return {
    locator,
    selector: candidate.selector,
    tier: 3,
    confidence: resolution.confidence,
    patch: buildPatch(target, candidate.selector, 3, resolution.confidence)
  };
}

export async function resolveTarget(
  page: Page,
  target: SemanticTarget,
  options: TargetResolverOptions = {}
): Promise<ResolvedTarget> {
  const cachedTarget = await resolveCachedSelector(page, target);
  if (cachedTarget) {
    return cachedTarget;
  }

  const roleTarget = await resolveByRole(page, target);
  if (roleTarget) {
    return roleTarget;
  }

  return resolveByLlm(page, target, {
    collectCandidates: options.collectCandidates ?? collectElementCandidates,
    llmResolver: options.llmResolver ?? createAnthropicSelectorResolver()
  });
}
