import {
  formatZodError,
  validationError,
  type ApiErrorBody,
  type ApiErrorDetail
} from "../api-error";
import {
  executeRequestSchema,
  type ParsedExecuteRequest,
  type WorkflowDefinition,
  type WorkflowInput
} from "./schema";

/**
 * Validates and normalizes caller input against a workflow's declared inputs.
 * Trims strings, enforces required fields and enum membership, and rejects keys
 * that the workflow does not declare. The returned object is frozen so callers
 * cannot mutate validated input before execution.
 */
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

/**
 * Validates a runner execute request: first the structural shape via zod, then
 * the caller input against the embedded workflow contract.
 */
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
