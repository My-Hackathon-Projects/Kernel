import { createVendorWorkflowFixture } from "@agentport/core";
import { afterEach, describe, expect, it } from "vitest";
import { buildRunner } from "../src/app";
import {
  type ExecuteWorkflow,
  type ResumeWorkflow
} from "../src/execution/workflow-executor";
import { resolveRunnerConfig } from "../src/index";

const apps: Array<ReturnType<typeof buildRunner>> = [];

function createApp(
  options: {
    executeWorkflow?: ExecuteWorkflow;
    resumeWorkflow?: ResumeWorkflow;
  } = {}
) {
  const app = buildRunner({
    logger: false,
    ...(options.executeWorkflow ? { executeWorkflow: options.executeWorkflow } : {}),
    ...(options.resumeWorkflow ? { resumeWorkflow: options.resumeWorkflow } : {})
  });
  apps.push(app);
  return app;
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("runner scaffold", () => {
  it("reports health", async () => {
    const response = await createApp().inject({
      method: "GET",
      url: "/health"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
      service: "agentport-runner"
    });
  });

  it("resumes a paused workflow after API validation", async () => {
    const resumeWorkflow: ResumeWorkflow = async (request) => ({
      runId: request.runId,
      status: "succeeded",
      steps: [],
      artifacts: [],
      approval: {
        id: request.approvalId,
        status: "approved"
      },
      validation: {
        passed: true,
        expected: { status: "Pending Approval" },
        actual: { status: "Pending Approval" }
      },
      evidenceUrl: `/runs/${request.runId}`
    });

    const response = await createApp({ resumeWorkflow }).inject({
      method: "POST",
      url: "/resume",
      payload: {
        runId: "run_123",
        approvalId: "approval_123",
        decision: "approve"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      runId: "run_123",
      status: "succeeded",
      approval: {
        id: "approval_123",
        status: "approved"
      },
      validation: {
        passed: true
      }
    });
  });

  it("rejects an invalid resume request before resuming", async () => {
    let resumeStarted = false;
    const response = await createApp({
      resumeWorkflow: async () => {
        resumeStarted = true;
        throw new Error("Should not resume");
      }
    }).inject({
      method: "POST",
      url: "/resume",
      payload: {
        runId: "run_123",
        approvalId: "approval_123",
        decision: "maybe"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("validation_failed");
    expect(resumeStarted).toBe(false);
  });

  it("returns a typed resume error when the resumer fails", async () => {
    const response = await createApp({
      resumeWorkflow: async () => {
        throw new Error("No pending execution");
      }
    }).inject({
      method: "POST",
      url: "/resume",
      payload: {
        runId: "run_123",
        approvalId: "approval_123",
        decision: "approve"
      }
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: {
        code: "resume_failed",
        message: "No pending execution"
      }
    });
  });

  it("executes a valid request after API validation", async () => {
    const executeWorkflow: ExecuteWorkflow = async (request) => ({
      runId: request.runId,
      status: "succeeded",
      steps: [],
      artifacts: [],
      approval: null,
      validation: null,
      evidenceUrl: `/runs/${request.runId}`
    });

    const response = await createApp({ executeWorkflow }).inject({
      method: "POST",
      url: "/execute",
      payload: {
        runId: "run_123",
        workflow: createVendorWorkflowFixture(),
        input: {
          company_name: "Acme GmbH",
          country: "Germany",
          tax_id: "DE123456789",
          risk_level: "low"
        }
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      runId: "run_123",
      status: "succeeded",
      steps: [],
      artifacts: [],
      approval: null,
      validation: null,
      evidenceUrl: "/runs/run_123"
    });
  });

  it("rejects an invalid execute request before execution", async () => {
    let executionStarted = false;
    const response = await createApp({
      executeWorkflow: async () => {
        executionStarted = true;
        throw new Error("Should not execute");
      }
    }).inject({
      method: "POST",
      url: "/execute",
      payload: {
        runId: "run_123",
        workflow: createVendorWorkflowFixture(),
        input: {
          country: "Germany",
          tax_id: "DE123456789",
          risk_level: "low"
        }
      }
    });

    const body = response.json();

    expect(response.statusCode).toBe(400);
    expect(body.error.code).toBe("validation_failed");
    expect(body.error.details[0].path).toBe("company_name");
    expect(executionStarted).toBe(false);
  });

  it("returns a typed execution error when the executor fails", async () => {
    const response = await createApp({
      executeWorkflow: async () => {
        throw new Error("Target could not be resolved");
      }
    }).inject({
      method: "POST",
      url: "/execute",
      payload: {
        runId: "run_123",
        workflow: createVendorWorkflowFixture(),
        input: {
          company_name: "Acme GmbH",
          country: "Germany",
          tax_id: "DE123456789",
          risk_level: "low"
        }
      }
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: {
        code: "execution_failed",
        message: "Target could not be resolved"
      }
    });
  });
});

describe("resolveRunnerConfig", () => {
  it("uses safe local defaults", () => {
    expect(resolveRunnerConfig({})).toEqual({
      host: "127.0.0.1",
      port: 4000
    });
  });

  it("rejects invalid runner ports", () => {
    expect(() => resolveRunnerConfig({ RUNNER_PORT: "not-a-port" })).toThrow(
      "RUNNER_PORT must be an integer from 1 to 65535"
    );
    expect(() => resolveRunnerConfig({ RUNNER_PORT: "70000" })).toThrow(
      "RUNNER_PORT must be an integer from 1 to 65535"
    );
  });
});
