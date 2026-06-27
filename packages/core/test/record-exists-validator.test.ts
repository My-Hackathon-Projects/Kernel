import { createVendorWorkflowFixture, validateRecordExistsApi } from "@agentport/core";
import { describe, expect, it } from "vitest";

const input = Object.freeze({
  company_name: "Acme GmbH",
  country: "Germany",
  tax_id: "DE123456789",
  risk_level: "medium"
});

describe("validateRecordExistsApi", () => {
  it("passes when the independent API returns the expected fields", async () => {
    const result = await validateRecordExistsApi({
      workflow: createVendorWorkflowFixture(),
      input,
      targetBaseUrl: "http://localhost:3001",
      fetchJson: async () => ({
        ok: true,
        status: 200,
        body: {
          company_name: "Acme GmbH",
          status: "Pending Approval"
        }
      })
    });

    expect(result).toEqual({
      passed: true,
      expected: { status: "Pending Approval" },
      actual: { status: "Pending Approval" }
    });
  });

  it("fails with a clear reason when the expected field does not match", async () => {
    const result = await validateRecordExistsApi({
      workflow: createVendorWorkflowFixture(),
      input,
      targetBaseUrl: "http://localhost:3001",
      fetchJson: async () => ({
        ok: true,
        status: 200,
        body: {
          status: "Approved"
        }
      })
    });

    expect(result).toEqual({
      passed: false,
      expected: { status: "Pending Approval" },
      actual: { status: "Approved" },
      reason: "Expected status to equal Pending Approval"
    });
  });

  it("fails when the independent API does not find the record", async () => {
    const result = await validateRecordExistsApi({
      workflow: createVendorWorkflowFixture(),
      input,
      targetBaseUrl: "http://localhost:3001",
      fetchJson: async () => ({
        ok: false,
        status: 404,
        body: {
          error: {
            code: "not_found"
          }
        }
      })
    });

    expect(result).toEqual({
      passed: false,
      expected: { status: "Pending Approval" },
      actual: null,
      reason: "Validation API returned 404"
    });
  });

  it("fails when the independent API response is malformed", async () => {
    const result = await validateRecordExistsApi({
      workflow: createVendorWorkflowFixture(),
      input,
      targetBaseUrl: "http://localhost:3001",
      fetchJson: async () => ({
        ok: true,
        status: 200,
        body: ["not", "an", "object"]
      })
    });

    expect(result).toEqual({
      passed: false,
      expected: { status: "Pending Approval" },
      actual: null,
      reason: "Validation API response must be an object"
    });
  });
});
