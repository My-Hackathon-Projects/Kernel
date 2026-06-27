import { z } from "zod";
import { nonEmptyString } from "./primitives";

export const runStatusSchema = z.enum([
  "pending",
  "running",
  "awaiting_approval",
  "succeeded",
  "validation_failed",
  "rejected",
  "failed"
]);
export const validationResultSchema = z.object({
  passed: z.boolean(),
  expected: z.record(nonEmptyString, z.unknown()),
  actual: z.record(nonEmptyString, z.unknown()).nullable(),
  reason: z.string().optional()
});

export const toolInvokeResultSchema = z.object({
  run_id: nonEmptyString,
  status: runStatusSchema,
  validation: validationResultSchema.nullable(),
  approval: z
    .object({
      id: nonEmptyString,
      status: nonEmptyString
    })
    .nullable()
    .optional(),
  evidence_url: nonEmptyString
});

export const runnerStepResultSchema = z.object({
  stepId: nonEmptyString,
  action: nonEmptyString,
  status: runStatusSchema,
  selector: z.string().nullable(),
  screenshotId: z.string().nullable(),
  durationMs: z.number().int().nonnegative()
});

export const runnerExecuteResultSchema = z.object({
  runId: nonEmptyString,
  status: runStatusSchema,
  steps: z.array(runnerStepResultSchema),
  artifacts: z.array(
    z.object({
      id: nonEmptyString,
      stepId: nonEmptyString,
      kind: z.literal("screenshot"),
      uri: nonEmptyString
    })
  ),
  approval: z
    .object({
      id: nonEmptyString,
      status: nonEmptyString
    })
    .nullable(),
  validation: validationResultSchema.nullable(),
  evidenceUrl: nonEmptyString
});

export type RunStatus = z.infer<typeof runStatusSchema>;
export type ValidationResult = z.infer<typeof validationResultSchema>;
export type ToolInvokeResult = z.infer<typeof toolInvokeResultSchema>;
export type RunnerStepResult = z.infer<typeof runnerStepResultSchema>;
export type RunnerExecuteResult = z.infer<typeof runnerExecuteResultSchema>;
