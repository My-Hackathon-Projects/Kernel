import {
  applySelectorPatchToWorkflow,
  createVendorWorkflowFixture,
  llmSelectorResolutionSchema,
  selectorPatchProposalSchema
} from "@agentport/core";
import { describe, expect, it } from "vitest";

describe("selector patch contracts", () => {
  it("accepts strict LLM selector output", () => {
    expect(
      llmSelectorResolutionSchema.parse({
        selector: 'role=button[name="Send for Approval"]',
        confidence: 0.82,
        rationale: "Matches the submit intent"
      })
    ).toEqual({
      selector: 'role=button[name="Send for Approval"]',
      confidence: 0.82,
      rationale: "Matches the submit intent"
    });
  });

  it("rejects selector patches for tier 1 cache hits", () => {
    expect(() =>
      selectorPatchProposalSchema.parse({
        oldSelector: 'role=button[name="Submit"]',
        newSelector: 'role=button[name="Submit"]',
        tier: 1,
        confidence: 1
      })
    ).toThrow();
  });

  it("applies accepted selector patches to workflow cache", () => {
    const workflow = createVendorWorkflowFixture();
    const patched = applySelectorPatchToWorkflow(workflow, {
      stepId: "s7",
      selector: 'role=button[name="Send for Approval"]',
      confidence: 0.95
    });
    const submitStep = patched.steps.find((step) => step.id === "s7");

    expect(
      submitStep && "target" in submitStep ? submitStep.target : null
    ).toMatchObject({
      cachedSelector: 'role=button[name="Send for Approval"]',
      cacheConfidence: 0.95
    });
  });
});
