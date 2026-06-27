import { createVendorWorkflowFixture } from "@agentport/core";
import { describe, expect, it } from "vitest";
import { POST } from "../app/api/workflows/validate/route";

describe("POST /api/workflows/validate", () => {
  it("returns workflow metadata for a valid workflow", async () => {
    const response = await POST(
      new Request("http://localhost/api/workflows/validate", {
        method: "POST",
        body: JSON.stringify(createVendorWorkflowFixture())
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      valid: true,
      workflow: {
        name: "create_vendor",
        version: 1,
        stepCount: 5
      }
    });
  });

  it("returns a typed validation error for an invalid workflow", async () => {
    const workflow = createVendorWorkflowFixture();
    workflow.steps = [];

    const response = await POST(
      new Request("http://localhost/api/workflows/validate", {
        method: "POST",
        body: JSON.stringify(workflow)
      })
    );

    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("validation_failed");
    expect(body.error.details[0].path).toBe("steps");
  });

  it("returns a typed error for malformed JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/workflows/validate", {
        method: "POST",
        body: "{not-json"
      })
    );

    await expect(response.json()).resolves.toEqual({
      error: {
        code: "invalid_json",
        message: "Request body must be valid JSON"
      }
    });
    expect(response.status).toBe(400);
  });
});
