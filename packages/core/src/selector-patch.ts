import { z } from "zod";
import { nonEmptyString } from "./primitives";
import { workflowDefinitionSchema, type WorkflowDefinition } from "./workflow/schema";

export const resolverTierSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const selectorPatchTierSchema = z.union([z.literal(2), z.literal(3)]);

export const selectorPatchProposalSchema = z.object({
  oldSelector: z.string().nullable(),
  newSelector: nonEmptyString,
  tier: selectorPatchTierSchema,
  confidence: z.number().min(0).max(1)
});

export const llmSelectorResolutionSchema = z.object({
  selector: nonEmptyString,
  confidence: z.number().min(0).max(1),
  rationale: z.string().max(500).optional()
});

export type ResolverTier = z.infer<typeof resolverTierSchema>;
export type SelectorPatchTier = z.infer<typeof selectorPatchTierSchema>;
export type SelectorPatchProposal = z.infer<typeof selectorPatchProposalSchema>;
export type LlmSelectorResolution = z.infer<typeof llmSelectorResolutionSchema>;

export function applySelectorPatchToWorkflow(
  workflow: WorkflowDefinition,
  params: {
    stepId: string;
    selector: string;
    confidence: number;
  }
): WorkflowDefinition {
  const nextWorkflow = structuredClone(workflow) as WorkflowDefinition;
  const step = nextWorkflow.steps.find((candidate) => candidate.id === params.stepId);

  if (!step || !("target" in step)) {
    throw new Error(`Workflow step "${params.stepId}" does not have a target`);
  }

  step.target.cachedSelector = params.selector;
  step.target.cacheConfidence = params.confidence;

  return workflowDefinitionSchema.parse(nextWorkflow);
}
