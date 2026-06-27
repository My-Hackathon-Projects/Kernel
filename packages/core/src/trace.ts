import { z } from "zod";
import { nonEmptyString } from "./primitives";
import { approvalDecisionSchema } from "./approval";
import { runStatusSchema } from "./run";
import { resolverTierSchema } from "./selector-patch";

const traceBaseSchema = z.object({
  runId: nonEmptyString
});

export const traceEventSchema = z.discriminatedUnion("type", [
  traceBaseSchema.extend({
    type: z.literal("run_started")
  }),
  traceBaseSchema.extend({
    type: z.literal("step_started"),
    stepId: nonEmptyString,
    action: nonEmptyString
  }),
  traceBaseSchema.extend({
    type: z.literal("step_resolved"),
    stepId: nonEmptyString,
    tier: resolverTierSchema,
    selector: nonEmptyString,
    confidence: z.number().min(0).max(1)
  }),
  traceBaseSchema.extend({
    type: z.literal("screenshot"),
    stepId: nonEmptyString,
    artifactId: nonEmptyString
  }),
  traceBaseSchema.extend({
    type: z.literal("approval_requested"),
    approvalId: nonEmptyString,
    stepId: nonEmptyString,
    prompt: nonEmptyString,
    payload: z.record(z.string(), z.unknown()),
    resolvedElement: nonEmptyString
  }),
  traceBaseSchema.extend({
    type: z.literal("approval_decided"),
    approvalId: nonEmptyString,
    decision: approvalDecisionSchema
  }),
  traceBaseSchema.extend({
    type: z.literal("step_completed"),
    stepId: nonEmptyString,
    durationMs: z.number().int().nonnegative()
  }),
  traceBaseSchema.extend({
    type: z.literal("validation_result"),
    passed: z.boolean(),
    expected: z.record(z.string(), z.unknown()),
    actual: z.record(z.string(), z.unknown()).nullable(),
    reason: z.string().optional()
  }),
  traceBaseSchema.extend({
    type: z.literal("selector_patch"),
    patchId: nonEmptyString,
    stepId: nonEmptyString,
    oldSelector: z.string().nullable(),
    newSelector: nonEmptyString,
    tier: resolverTierSchema,
    confidence: z.number().min(0).max(1)
  }),
  traceBaseSchema.extend({
    type: z.literal("run_finished"),
    status: runStatusSchema
  }),
  traceBaseSchema.extend({
    type: z.literal("error"),
    stepId: nonEmptyString.optional(),
    reason: nonEmptyString
  })
]);

export type TraceEvent = z.infer<typeof traceEventSchema>;
