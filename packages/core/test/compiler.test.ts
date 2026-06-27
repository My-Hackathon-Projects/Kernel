import { createVendorWorkflowFixture } from "@agentport/core";
import { compileTool, toolInputJsonSchemaSchema } from "@agentport/core/compiler";
import { describe, expect, it } from "vitest";

describe("compileTool", () => {
  it("compiles workflow inputs into a stable tool JSON Schema", () => {
    const compiled = compileTool(createVendorWorkflowFixture());

    expect(compiled.success).toBe(true);
    if (compiled.success) {
      expect(compiled.data).toMatchObject({
        name: "create_vendor",
        workflowName: "create_vendor",
        workflowVersion: 1,
        inputSchema: {
          type: "object",
          additionalProperties: false,
          required: ["company_name", "country", "tax_id", "risk_level"],
          properties: {
            company_name: { type: "string" },
            country: { type: "string" },
            tax_id: { type: "string" },
            risk_level: { type: "string", enum: ["low", "medium", "high"] }
          }
        }
      });
      expect(compiled.data.contentHash).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it("rejects a workflow step that references an undeclared field", () => {
    const workflow = createVendorWorkflowFixture();
    const step = workflow.steps.find((candidate) => candidate.action === "fill");

    if (!step || step.action !== "fill") {
      throw new Error("Expected fixture to contain a fill step");
    }

    workflow.steps[2] = { ...step, field: "unknown_field" };

    const compiled = compileTool(workflow);

    expect(compiled.success).toBe(false);
    if (!compiled.success) {
      expect(compiled.error.error).toMatchObject({
        code: "compile_failed",
        message: "Workflow cannot be compiled"
      });
      expect(compiled.error.error.details?.[0]).toMatchObject({
        message: 'Step field "unknown_field" is not defined in workflow inputs'
      });
    }
  });

  it("uses a stable content hash for identical workflow content", () => {
    const first = compileTool(createVendorWorkflowFixture());
    const second = compileTool(createVendorWorkflowFixture());

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    if (first.success && second.success) {
      expect(first.data.contentHash).toBe(second.data.contentHash);
    }
  });

  it("changes the content hash when workflow content changes", () => {
    const first = compileTool(createVendorWorkflowFixture());
    const workflow = createVendorWorkflowFixture();
    workflow.version = 2;
    const second = compileTool(workflow);

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    if (first.success && second.success) {
      expect(first.data.contentHash).not.toBe(second.data.contentHash);
    }
  });
});

describe("toolInputJsonSchemaSchema", () => {
  it("parses a compiled tool input schema and exposes enum values", () => {
    const compiled = compileTool(createVendorWorkflowFixture());

    expect(compiled.success).toBe(true);
    if (compiled.success) {
      const parsed = toolInputJsonSchemaSchema.safeParse(compiled.data.inputSchema);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.properties.risk_level?.enum).toEqual([
          "low",
          "medium",
          "high"
        ]);
        expect(parsed.data.properties.company_name?.enum).toBeUndefined();
      }
    }
  });

  it("rejects a value that is not a compiled tool input schema", () => {
    expect(toolInputJsonSchemaSchema.safeParse({ type: "string" }).success).toBe(false);
  });
});
