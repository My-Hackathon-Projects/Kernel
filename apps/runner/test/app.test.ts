import { createVendorWorkflowFixture } from "@agentport/core";
import { afterEach, describe, expect, it } from "vitest";
import { buildRunner } from "../src/app";
import { resolveRunnerConfig } from "../src/index";

const apps: Array<ReturnType<typeof buildRunner>> = [];

function createApp() {
  const app = buildRunner({ logger: false });
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

  it("accepts a valid execute request after API validation", async () => {
    const response = await createApp().inject({
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

    expect(response.statusCode).toBe(202);
    expect(response.json()).toMatchObject({
      runId: "run_123",
      status: "accepted"
    });
  });

  it("rejects an invalid execute request before execution", async () => {
    const response = await createApp().inject({
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
