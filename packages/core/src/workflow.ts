import { z, type ZodError } from "zod";

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
};

type ApiErrorDetail = { path: string; message: string };

const nonEmptyString = z.string().trim().min(1);
const relativePathString = nonEmptyString
  .startsWith("/")
  .refine((value) => !value.startsWith("//"), {
    message: "Path must be relative to the target host"
  })
  .refine((value) => !/^[a-z][a-z0-9+.-]*:\/\//i.test(value), {
    message: "Path must not include a URL scheme"
  });

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

function validationError(details: ApiErrorDetail[]): ApiErrorBody {
  return {
    error: {
      code: "validation_failed",
      message: "Request validation failed",
      details
    }
  };
}

export function formatZodError(error: ZodError): ApiErrorBody {
  return validationError(
    error.issues.map((issue) => ({
      path: issue.path.join(".") || "(root)",
      message: issue.message
    }))
  );
}

export function parseWorkflowInput(
  workflow: WorkflowDefinition,
  input: Record<string, unknown>
): { success: true; data: WorkflowInput } | { success: false; error: ApiErrorBody } {
  const details: ApiErrorDetail[] = [];
  const normalizedInput: Record<string, string> = {};

  for (const [name, definition] of Object.entries(workflow.inputs)) {
    const value = input[name];

    if (value === undefined) {
      if (definition.required) {
        details.push({
          path: name,
          message: "Required"
        });
      }
      continue;
    }

    if (typeof value !== "string") {
      details.push({
        path: name,
        message: "Expected string"
      });
      continue;
    }

    const trimmedValue = value.trim();

    if (trimmedValue.length === 0) {
      details.push({
        path: name,
        message: "Required"
      });
      continue;
    }

    if (definition.type === "enum" && !definition.values.includes(trimmedValue)) {
      details.push({
        path: name,
        message: `Expected one of: ${definition.values.join(", ")}`
      });
      continue;
    }

    normalizedInput[name] = trimmedValue;
  }

  for (const key of Object.keys(input)) {
    if (!Object.hasOwn(workflow.inputs, key)) {
      details.push({
        path: key,
        message: "Unrecognized input"
      });
    }
  }

  if (details.length > 0) {
    return { success: false, error: validationError(details) };
  }

  return { success: true, data: Object.freeze(normalizedInput) };
}

export function parseExecuteRequest(
  payload: unknown
):
  | { success: true; data: ParsedExecuteRequest }
  | { success: false; error: ApiErrorBody } {
  const parsed = executeRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: formatZodError(parsed.error) };
  }

  const input = parseWorkflowInput(parsed.data.workflow, parsed.data.input);
  if (!input.success) {
    return { success: false, error: input.error };
  }

  return {
    success: true,
    data: {
      ...parsed.data,
      input: input.data
    }
  };
}

export function createVendorWorkflowFixture(): WorkflowDefinition {
  return {
    name: "create_vendor",
    version: 1,
    target: "mock-procurement",
    startUrl: "/vendors/new",
    inputs: {
      company_name: { type: "string", required: true },
      country: { type: "string", required: true },
      tax_id: { type: "string", required: true },
      risk_level: {
        type: "enum",
        values: ["low", "medium", "high"],
        required: true
      }
    },
    steps: [
      {
        id: "s1",
        action: "click",
        target: {
          role: "button",
          intent: "open_create_form",
          nameHints: ["Create Vendor"]
        }
      },
      {
        id: "s2",
        action: "fill",
        field: "company_name",
        target: {
          role: "textbox",
          intent: "field.company_name",
          nameHints: ["Company name"]
        }
      },
      {
        id: "s3",
        action: "fill",
        field: "tax_id",
        target: {
          role: "textbox",
          intent: "field.tax_id",
          nameHints: ["Tax ID"]
        }
      },
      {
        id: "s4",
        action: "select",
        field: "country",
        target: {
          role: "combobox",
          intent: "field.country",
          nameHints: ["Country"]
        }
      },
      {
        id: "s5",
        action: "click",
        risk: "write",
        target: {
          role: "button",
          intent: "submit_vendor",
          nameHints: ["Submit", "Send for Approval"]
        }
      }
    ],
    validation: {
      type: "record_exists_api",
      endpoint: "/api/vendors",
      queryField: "company_name",
      expect: { status: "Pending Approval" }
    }
  };
}
