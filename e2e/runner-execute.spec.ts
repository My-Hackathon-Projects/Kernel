import { expect, test, type TestInfo } from "@playwright/test";
import { createVendorWorkflowFixture } from "../packages/core/src/workflow/fixtures";

const dashboardUrl = process.env.DASHBOARD_BASE_URL ?? "http://localhost:3000";
const mockPortalUrl = process.env.MOCK_PORTAL_BASE_URL ?? "http://localhost:3001";
const runnerUrl = process.env.RUNNER_BASE_URL ?? "http://127.0.0.1:4000";

function uniqueCompanyName(prefix: string, testInfo: TestInfo): string {
  return `${prefix} ${testInfo.workerIndex}-${Date.now()}`;
}

test("runner executes a workflow and records step evidence", async ({
  request
}, testInfo) => {
  const runId = `run_e2e_${testInfo.workerIndex}_${Date.now()}`;
  const companyName = uniqueCompanyName("Runner Vendor", testInfo);
  const response = await request.post(`${runnerUrl}/execute`, {
    data: {
      runId,
      workflow: createVendorWorkflowFixture(),
      input: {
        company_name: companyName,
        country: "Germany",
        tax_id: "DE123456789",
        risk_level: "medium"
      }
    }
  });

  expect(response.status()).toBe(200);
  const result = (await response.json()) as {
    status: string;
    approval: { id: string } | null;
    steps: unknown[];
    artifacts: unknown[];
  };
  expect(result.status).toBe("awaiting_approval");
  expect(result.approval?.id).toBeTruthy();
  expect(result.steps).toHaveLength(7);
  expect(result.artifacts).toHaveLength(7);

  const resumeResponse = await request.post(`${runnerUrl}/resume`, {
    data: {
      runId,
      approvalId: result.approval?.id,
      decision: "approve"
    }
  });
  const resumeResult = (await resumeResponse.json()) as {
    status: string;
    validation: { passed: boolean } | null;
    steps: unknown[];
    artifacts: unknown[];
  };

  expect(resumeResponse.status()).toBe(200);
  expect(resumeResult.status).toBe("succeeded");
  expect(resumeResult.validation?.passed).toBe(true);
  expect(resumeResult.steps).toHaveLength(8);
  expect(resumeResult.artifacts).toHaveLength(9);

  const runResponse = await request.get(`${dashboardUrl}/api/runs/${runId}`);
  expect(runResponse.status()).toBe(200);
  await expect(runResponse.json()).resolves.toMatchObject({
    run: {
      id: runId,
      status: "succeeded",
      validations: [{ passed: true }]
    }
  });

  const vendorResponse = await request.get(
    `${mockPortalUrl}/api/vendors?company_name=${encodeURIComponent(companyName)}`
  );
  expect(vendorResponse.status()).toBe(200);
});

test("runner records validation failure separately from browser failure", async ({
  request
}, testInfo) => {
  const runId = `run_validation_fail_${testInfo.workerIndex}_${Date.now()}`;
  const companyName = uniqueCompanyName("Validation Fail Vendor", testInfo);
  const workflow = createVendorWorkflowFixture();
  workflow.validation.expect = { status: "Approved" };

  const response = await request.post(`${runnerUrl}/execute`, {
    data: {
      runId,
      workflow,
      input: {
        company_name: companyName,
        country: "Germany",
        tax_id: "DE123456789",
        risk_level: "medium"
      }
    }
  });
  const result = (await response.json()) as {
    approval: { id: string } | null;
  };

  expect(response.status()).toBe(200);
  expect(result.approval?.id).toBeTruthy();

  const resumeResponse = await request.post(`${runnerUrl}/resume`, {
    data: {
      runId,
      approvalId: result.approval?.id,
      decision: "approve"
    }
  });
  const resumeResult = (await resumeResponse.json()) as {
    status: string;
    validation: { passed: boolean; reason?: string } | null;
  };

  expect(resumeResponse.status()).toBe(200);
  expect(resumeResult.status).toBe("validation_failed");
  expect(resumeResult.validation).toMatchObject({
    passed: false,
    reason: "Expected status to equal Approved"
  });

  const runResponse = await request.get(`${dashboardUrl}/api/runs/${runId}`);
  expect(runResponse.status()).toBe(200);
  await expect(runResponse.json()).resolves.toMatchObject({
    run: {
      status: "validation_failed",
      validations: [{ passed: false }]
    }
  });
});

test("runner recovers from the variant submit button and records a selector patch", async ({
  page,
  request
}, testInfo) => {
  const runId = `run_variant_patch_${testInfo.workerIndex}_${Date.now()}`;
  const companyName = uniqueCompanyName("Variant Patch Vendor", testInfo);
  const workflow = createVendorWorkflowFixture();
  workflow.steps = workflow.steps.filter((step) => step.id !== "s2");
  workflow.steps[0] = {
    id: "s1",
    action: "goto",
    url: "/vendors/new?variant=v2"
  };

  const response = await request.post(`${runnerUrl}/execute`, {
    data: {
      runId,
      workflow,
      input: {
        company_name: companyName,
        country: "Germany",
        tax_id: "DE123456789",
        risk_level: "high"
      }
    }
  });
  const result = (await response.json()) as {
    status: string;
    approval: { id: string } | null;
  };

  expect(response.status()).toBe(200);
  expect(result.status).toBe("awaiting_approval");
  expect(result.approval?.id).toBeTruthy();

  const detailResponse = await request.get(`${dashboardUrl}/api/runs/${runId}`);
  const detail = (await detailResponse.json()) as {
    run: {
      selectorPatches: Array<{
        stepId: string;
        oldSelector: string | null;
        newSelector: string;
        tier: number;
        confidence: number;
      }>;
    };
  };
  expect(detail.run.selectorPatches).toEqual([
    expect.objectContaining({
      stepId: "s7",
      oldSelector: 'role=button[name="Submit"]',
      newSelector: 'role=button[name="Send for Approval"]',
      tier: 2,
      confidence: 0.95
    })
  ]);

  const resumeResponse = await request.post(`${runnerUrl}/resume`, {
    data: {
      runId,
      approvalId: result.approval?.id,
      decision: "approve"
    }
  });
  const resumeResult = (await resumeResponse.json()) as {
    status: string;
    validation: { passed: boolean } | null;
  };

  expect(resumeResponse.status()).toBe(200);
  expect(resumeResult.status).toBe("succeeded");
  expect(resumeResult.validation?.passed).toBe(true);

  const vendorResponse = await request.get(
    `${mockPortalUrl}/api/vendors?company_name=${encodeURIComponent(companyName)}`
  );
  await expect(vendorResponse.json()).resolves.toMatchObject({
    risk_level: "high"
  });

  await page.goto(`/runs/${runId}`);
  await expect(page.getByRole("heading", { name: "Selector Patches" })).toBeVisible();
  await expect(
    page.getByText('role=button[name="Send for Approval"]').first()
  ).toBeVisible();

  await page.goto("/patches");
  await expect(
    page.getByText('role=button[name="Send for Approval"]').first()
  ).toBeVisible();
});
