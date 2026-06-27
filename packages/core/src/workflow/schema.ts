import { z } from "zod";
import { nonEmptyString, relativePathString } from "../primitives";

const stringInputSchema = z.object({
  type: z.literal("string"),
  required: z.boolean().optional()
});

const enumInputSchema = z.object({
  type: z.literal("enum"),
  values: z.array(nonEmptyString).min(1),
  required: z.boolean().optional()
});

const workflowInputsSchema = z.record(
  nonEmptyString,
  z.discriminatedUnion("type", [stringInputSchema, enumInputSchema])
);

const semanticTargetSchema = z.object({
  role: nonEmptyString,
  intent: nonEmptyString,
  nameHints: z.array(nonEmptyString).min(1),
  nearText: nonEmptyString.optional(),
  cachedSelector: nonEmptyString.optional(),
  cacheConfidence: z.number().min(0).max(1).optional()
});

const stepBaseSchema = z.object({
  id: nonEmptyString
});

const gotoStepSchema = stepBaseSchema.extend({
  action: z.literal("goto"),
  url: nonEmptyString
});

const clickStepSchema = stepBaseSchema.extend({
  action: z.literal("click"),
  target: semanticTargetSchema,
  risk: z.literal("write").optional()
});

const fillStepSchema = stepBaseSchema.extend({
  action: z.literal("fill"),
  target: semanticTargetSchema,
  field: nonEmptyString
});

const selectStepSchema = stepBaseSchema.extend({
  action: z.literal("select"),
  target: semanticTargetSchema,
  field: nonEmptyString
});

const waitForStepSchema = stepBaseSchema.extend({
  action: z.literal("waitFor"),
  target: semanticTargetSchema
});

const workflowStepSchema = z.discriminatedUnion("action", [
  gotoStepSchema,
  clickStepSchema,
  fillStepSchema,
  selectStepSchema,
  waitForStepSchema
]);

const recordExistsValidationSchema = z.object({
  type: z.literal("record_exists_api"),
  endpoint: relativePathString,
  queryField: nonEmptyString,
  expect: z.record(nonEmptyString, z.unknown())
});

const elementVisibleValidationSchema = z.object({
  type: z.literal("element_visible"),
  selector: nonEmptyString,
  expects: nonEmptyString.optional()
});

export const workflowDefinitionSchema = z
  .object({
    name: nonEmptyString,
    version: z.number().int().positive(),
    target: nonEmptyString,
    startUrl: relativePathString,
    inputs: workflowInputsSchema,
    steps: z.array(workflowStepSchema).min(1),
    validation: z.discriminatedUnion("type", [
      recordExistsValidationSchema,
      elementVisibleValidationSchema
    ])
  })
  .superRefine((workflow, context) => {
    const seenStepIds = new Set<string>();

    workflow.steps.forEach((step, index) => {
      if (seenStepIds.has(step.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate workflow step id "${step.id}"`,
          path: ["steps", index, "id"]
        });
      }

      seenStepIds.add(step.id);

      if ("field" in step && !Object.hasOwn(workflow.inputs, step.field)) {
        context.addIssue({
          code: "custom",
          message: `Step field "${step.field}" is not defined in workflow inputs`,
          path: ["steps", index, "field"]
        });
      }
    });

    if (
      workflow.validation.type === "record_exists_api" &&
      !Object.hasOwn(workflow.inputs, workflow.validation.queryField)
    ) {
      context.addIssue({
        code: "custom",
        message: `Validation queryField "${workflow.validation.queryField}" is not defined in workflow inputs`,
        path: ["validation", "queryField"]
      });
    }
  });

export const executeRequestSchema = z.object({
  runId: nonEmptyString,
  workflow: workflowDefinitionSchema,
  input: z.record(nonEmptyString, z.unknown())
});

export type WorkflowDefinition = z.infer<typeof workflowDefinitionSchema>;
export type ExecuteRequest = z.infer<typeof executeRequestSchema>;
export type WorkflowInput = Readonly<Record<string, string>>;
export type ParsedExecuteRequest = ExecuteRequest & { input: WorkflowInput };
