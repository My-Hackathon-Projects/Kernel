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
    steps: unknown[];
    artifacts: unknown[];
  };
  expect(result.status).toBe("succeeded");
  expect(result.steps).toHaveLength(8);
  expect(result.artifacts).toHaveLength(8);

  const runResponse = await request.get(`${dashboardUrl}/api/runs/${runId}`);
  expect(runResponse.status()).toBe(200);
  await expect(runResponse.json()).resolves.toMatchObject({
    run: {
      id: runId,
      status: "succeeded"
    }
  });

  const vendorResponse = await request.get(
    `${mockPortalUrl}/api/vendors?company_name=${encodeURIComponent(companyName)}`
  );
  expect(vendorResponse.status()).toBe(200);
});
