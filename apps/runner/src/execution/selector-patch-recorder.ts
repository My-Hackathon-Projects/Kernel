import { type SelectorPatchProposal } from "@agentport/core";
import { createSelectorPatch, getPrismaClient } from "@agentport/db";
import { type ExecutionState } from "./execution-state";
import { emitTrace } from "./trace-recorder";

export async function recordSelectorPatch(params: {
  state: ExecutionState;
  stepId: string;
  patch: SelectorPatchProposal | null | undefined;
}): Promise<void> {
  if (!params.patch) {
    return;
  }

  const patch = await createSelectorPatch(getPrismaClient(), {
    workflowId: params.state.workflowId,
    runId: params.state.runId,
    stepId: params.stepId,
    patch: params.patch
  });

  await emitTrace(params.state.runId, {
    type: "selector_patch",
    patchId: patch.id,
    stepId: params.stepId,
    oldSelector: patch.oldSelector,
    newSelector: patch.newSelector,
    tier: patch.tier,
    confidence: patch.confidence
  });
}
