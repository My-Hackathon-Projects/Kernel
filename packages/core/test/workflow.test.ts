import {
  createVendorWorkflowFixture,
  parseExecuteRequest,
  workflowDefinitionSchema
} from "@agentport/core";
import { describe, expect, it } from "vitest";

describe("workflowDefinitionSchema", () => {
  it("accepts the create_vendor semantic workflow contract", () => {
    const result = workflowDefinitionSchema.safeParse(createVendorWorkflowFixture());

    expect(result.success).toBe(true);
  });

  it("rejects a step field that is not declared as an input", () => {
    const workflow = createVendorWorkflowFixture();
    const stepIndex = workflow.steps.findIndex((step) => step.action === "fill");
    const step = workflow.steps[stepIndex];

    if (!step || step.action !== "fill") {
      throw new Error("Expected fixture to contain a fill step");
    }

    workflow.steps[stepIndex] = { ...step, field: "unknown_field" };

    const result = workflowDefinitionSchema.safeParse(workflow);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["steps", stepIndex, "field"]);
    }
  });

  it("rejects duplicate step ids", () => {
    const workflow = createVendorWorkflowFixture();
    workflow.steps[1] = { ...workflow.steps[1]!, id: "s1" };

    const result = workflowDefinitionSchema.safeParse(workflow);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["steps", 1, "id"]);
    }
  });

  it("rejects absolute validation endpoints", () => {
    const workflow = createVendorWorkflowFixture();
    workflow.validation = {
      type: "record_exists_api",
      endpoint: "https://example.com/api/vendors",
      queryField: "company_name",
      expect: { status: "Pending Approval" }
    };

    const result = workflowDefinitionSchema.safeParse(workflow);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["validation", "endpoint"]);
    }
  });
});

describe("parseExecuteRequest", () => {
  it("validates and freezes workflow input for execution", () => {
    const result = parseExecuteRequest({
      runId: "run_123",
      workflow: createVendorWorkflowFixture(),
      input: {
        company_name: "Acme GmbH",
        country: "Germany",
        tax_id: "DE123456789",
        risk_level: "low"
      }
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.isFrozen(result.data.input)).toBe(true);
      expect(result.data.input.company_name).toBe("Acme GmbH");
    }
  });

  it("rejects missing required input before execution", () => {
    const result = parseExecuteRequest({
      runId: "run_123",
      workflow: createVendorWorkflowFixture(),
      input: {
        country: "Germany",
        tax_id: "DE123456789",
        risk_level: "low"
      }
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.error.code).toBe("validation_failed");
      expect(result.error.error.details?.[0]?.path).toBe("company_name");
    }
  });

  it("rejects enum values outside the workflow contract", () => {
    const result = parseExecuteRequest({
      runId: "run_123",
      workflow: createVendorWorkflowFixture(),
      input: {
        company_name: "Acme GmbH",
        country: "Germany",
        tax_id: "DE123456789",
        risk_level: "urgent"
      }
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.error.details?.[0]).toEqual({
        path: "risk_level",
        message: "Expected one of: low, medium, high"
      });
    }
  });

  it("rejects unexpected input keys", () => {
    const result = parseExecuteRequest({
      runId: "run_123",
      workflow: createVendorWorkflowFixture(),
      input: {
        company_name: "Acme GmbH",
        country: "Germany",
        tax_id: "DE123456789",
        risk_level: "low",
        auto_approve: "true"
      }
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.error.details?.at(-1)).toEqual({
        path: "auto_approve",
        message: "Unrecognized input"
      });
    }
  });
});
