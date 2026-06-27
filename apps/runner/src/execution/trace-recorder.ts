import { type TraceEvent } from "@agentport/core";
import { createTraceEvent, getPrismaClient } from "@agentport/db";

export async function emitTrace(
  runId: string,
  event: Record<string, unknown> & { type: TraceEvent["type"] }
): Promise<void> {
  await createTraceEvent(getPrismaClient(), { runId, ...event } as TraceEvent);
}

export async function emitStepResolved(params: {
  runId: string;
  stepId: string;
  tier: 1 | 2 | 3;
  selector: string;
}): Promise<void> {
  await emitTrace(params.runId, {
    type: "step_resolved",
    stepId: params.stepId,
    tier: params.tier,
    selector: params.selector,
    confidence: params.tier === 1 ? 1 : 0.95
  });
}
