import { createVendorWorkflowFixture } from "@agentport/core";
import { afterEach, describe, expect, it } from "vitest";
import { buildRunner } from "../src/app";
import { type ExecuteWorkflow } from "../src/execution/workflow-executor";
import { resolveRunnerConfig } from "../src/index";

const apps: Array<ReturnType<typeof buildRunner>> = [];

function createApp(executeWorkflow?: ExecuteWorkflow) {
  const app = executeWorkflow
    ? buildRunner({ logger: false, executeWorkflow })
    : buildRunner({ logger: false });
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

  it("executes a valid request after API validation", async () => {
    const executeWorkflow: ExecuteWorkflow = async (request) => ({
      runId: request.runId,
      status: "succeeded",
      steps: [],
      artifacts: [],
      evidenceUrl: `/runs/${request.runId}`
    });

    const response = await createApp(executeWorkflow).inject({
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
      evidenceUrl: "/runs/run_123"
    });
  });

  it("rejects an invalid execute request before execution", async () => {
    let executionStarted = false;
    const response = await createApp(async () => {
      executionStarted = true;
      throw new Error("Should not execute");
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
    const response = await createApp(async () => {
      throw new Error("Target could not be resolved");
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
