import { createVendorWorkflowFixture } from "@agentport/core";
import { describe, expect, it, vi } from "vitest";

const { upsertWorkflowTool } = vi.hoisted(() => ({ upsertWorkflowTool: vi.fn() }));

vi.mock("@agentport/db", () => ({
  CREATE_VENDOR_TOOL_ID: "tool_create_vendor",
  getPrismaClient: () => ({}),
  upsertWorkflowTool,
  ensureCreateVendorTool: vi.fn(),
  createAuditEvent: vi.fn(),
  createRunForTool: vi.fn(),
  getToolWithWorkflow: vi.fn(),
  listEnabledTools: vi.fn(),
  parseStoredWorkflow: vi.fn()
}));

const { POST } = await import("../app/api/workflows/route");

function toolRow(name: string) {
  return {
    id: "tool_studio",
    name,
    enabled: true,
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {},
      required: []
    },
    workflow: {
      id: "workflow_studio",
      name,
      version: 1,
      contentHash: "0".repeat(64),
      target: { name: "mock-procurement", baseUrl: "http://localhost:3001" }
    }
  };
}

function postWorkflow(body: string): Promise<Response> {
  return POST(new Request("http://localhost/api/workflows", { method: "POST", body }));
}

describe("POST /api/workflows", () => {
  it("compiles and registers a tool from a valid workflow", async () => {
    upsertWorkflowTool.mockResolvedValueOnce(toolRow("create_vendor"));

    const response = await postWorkflow(JSON.stringify(createVendorWorkflowFixture()));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.tool.name).toBe("create_vendor");
    expect(upsertWorkflowTool).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        workflow: expect.objectContaining({ name: "create_vendor" }),
        targetBaseUrl: expect.any(String)
      })
    );
  });

  it("rejects an invalid workflow before touching the database", async () => {
    upsertWorkflowTool.mockClear();
    const workflow = createVendorWorkflowFixture();
    workflow.steps = [];

    const response = await postWorkflow(JSON.stringify(workflow));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("validation_failed");
    expect(upsertWorkflowTool).not.toHaveBeenCalled();
  });

  it("returns a typed error for malformed JSON", async () => {
    const response = await postWorkflow("{not-json");
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("invalid_json");
  });
});
