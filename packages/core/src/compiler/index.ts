import { createHash } from "node:crypto";
import { z } from "zod";
import { apiError, type ApiErrorBody } from "../api-error";
import { type WorkflowDefinition } from "../workflow";

export type JsonSchemaProperty =
  { type: "string" } | { type: "string"; enum: string[] };

export type ToolInputJsonSchema = {
  type: "object";
  additionalProperties: false;
  properties: Record<string, JsonSchemaProperty>;
  required: string[];
};

/**
 * Runtime guard for a compiled tool input schema. Tool input schemas are stored
 * as JSON in the database, so consumers that read them back (the MCP server,
 * the tools registry) parse with this instead of casting untyped JSON.
 */
export const toolInputJsonSchemaSchema = z.object({
  type: z.literal("object"),
  additionalProperties: z.literal(false),
  properties: z.record(
    z.string(),
    z.object({
      type: z.literal("string"),
      enum: z.array(z.string()).min(1).optional()
    })
  ),
  required: z.array(z.string())
});

export type CompiledToolDefinition = {
  name: string;
  workflowName: string;
  workflowVersion: number;
  contentHash: string;
  inputSchema: ToolInputJsonSchema;
};

export type CompileToolResult =
  | { success: true; data: CompiledToolDefinition }
  | { success: false; error: ApiErrorBody };

function stableJsonStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJsonStringify).join(",")}]`;
  }

  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );

    return `{${entries
      .map(
        ([key, entryValue]) =>
          `${JSON.stringify(key)}:${stableJsonStringify(entryValue)}`
      )
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function contentHashForWorkflow(workflow: WorkflowDefinition): string {
  return createHash("sha256").update(stableJsonStringify(workflow)).digest("hex");
}

// The workflow schema's `superRefine` already rejects steps whose `field` is not
// a declared input, so a parsed WorkflowDefinition is normally consistent. This
// check is kept deliberately: it lets `compileTool` return a typed
// `compile_failed` error (part of its contract) even when callers pass a
// definition that bypassed schema parsing.
function validateStepFields(workflow: WorkflowDefinition): ApiErrorBody | null {
  const details = workflow.steps.flatMap((step, index) => {
    if (!("field" in step) || Object.hasOwn(workflow.inputs, step.field)) {
      return [];
    }

    return [
      {
        path: `steps.${index}.field`,
        message: `Step field "${step.field}" is not defined in workflow inputs`
      }
    ];
  });

  return details.length > 0
    ? apiError("compile_failed", "Workflow cannot be compiled", details)
    : null;
}

function buildInputSchema(workflow: WorkflowDefinition): ToolInputJsonSchema {
  const properties: Record<string, JsonSchemaProperty> = {};
  const required: string[] = [];

  for (const [name, input] of Object.entries(workflow.inputs)) {
    properties[name] =
      input.type === "enum"
        ? { type: "string", enum: [...input.values] }
        : { type: "string" };

    if (input.required) {
      required.push(name);
    }
  }

  return {
    type: "object",
    additionalProperties: false,
    properties,
    required
  };
}

export function compileTool(workflow: WorkflowDefinition): CompileToolResult {
  const fieldError = validateStepFields(workflow);
  if (fieldError) {
    return { success: false, error: fieldError };
  }

  return {
    success: true,
    data: {
      name: workflow.name,
      workflowName: workflow.name,
      workflowVersion: workflow.version,
      contentHash: contentHashForWorkflow(workflow),
      inputSchema: buildInputSchema(workflow)
    }
  };
}

export function compileToolOrThrow(
  workflow: WorkflowDefinition
): CompiledToolDefinition {
  const compiled = compileTool(workflow);
  if (!compiled.success) {
    throw new Error(compiled.error.error.message);
  }

  return compiled.data;
}
