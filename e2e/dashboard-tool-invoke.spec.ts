import { expect, test, type TestInfo } from "@playwright/test";

function uniqueCompanyName(prefix: string, testInfo: TestInfo): string {
  return `${prefix} ${testInfo.workerIndex}-${Date.now()}`;
}

test("dashboard test invoke runs the compiled tool and opens evidence", async ({
  page
}, testInfo) => {
  const companyName = uniqueCompanyName("Dashboard Vendor", testInfo);

  await page.goto("/");
  await page.getByLabel("Company Name").fill(companyName);
  await page.getByLabel("Tax Id").fill("DE123456789");
  await page.getByRole("button", { name: "Run tool" }).click();

  await expect(page.getByRole("status")).toContainText("awaiting_approval", {
    timeout: 60_000
  });
  await expect(page.getByRole("status")).toContainText("Approval: pending");

  const approvalCard = page.locator(".approval-card").filter({ hasText: companyName });
  await expect(approvalCard).toBeVisible({ timeout: 10_000 });
  await approvalCard.getByRole("button", { name: "Approve" }).click();

  const completedStatus = page.getByRole("status").filter({ hasText: "succeeded" });
  await expect(completedStatus).toContainText("Validation: passed", {
    timeout: 60_000
  });

  await completedStatus.getByRole("link", { name: "Open evidence" }).click();
  await expect(page).toHaveURL(/\/runs\//);
  await expect(page.getByRole("heading", { name: "Steps" })).toBeVisible();
  await expect(page.locator(".step-list li")).toHaveCount(8);
  await expect(page.locator(".step-screenshot").first()).toBeVisible();
});

test("rejecting a pending approval prevents the write action", async ({
  request
}, testInfo) => {
  const mockPortalUrl = process.env.MOCK_PORTAL_BASE_URL ?? "http://localhost:3001";
  const companyName = uniqueCompanyName("Rejected Vendor", testInfo);
  const invokeResponse = await request.post("/api/tools/tool_create_vendor/runs", {
    data: {
      input: {
        company_name: companyName,
        country: "Germany",
        tax_id: "DE123456789",
        risk_level: "medium"
      }
    }
  });
  const invokeResult = await invokeResponse.json();

  expect(invokeResponse.status()).toBe(202);
  expect(invokeResult.status).toBe("awaiting_approval");

  const approvalsResponse = await request.get("/api/approvals");
  const approvals = (
    (await approvalsResponse.json()) as {
      approvals: Array<{
        id: string;
        payload: { input?: Record<string, unknown> };
      }>;
    }
  ).approvals;
  const approval = approvals.find(
    (candidate) => candidate.payload.input?.company_name === companyName
  );

  expect(approval).toBeTruthy();
  const rejectResponse = await request.post(`/api/approvals/${approval?.id}/decision`, {
    data: { decision: "reject" }
  });
  const rejectResult = await rejectResponse.json();

  expect(rejectResponse.status()).toBe(200);
  expect(rejectResult.status).toBe("rejected");

  const vendorResponse = await request.get(
    `${mockPortalUrl}/api/vendors?company_name=${encodeURIComponent(companyName)}`
  );
  expect(vendorResponse.status()).toBe(404);
});

test("tool invoke API rejects invalid input before execution", async ({ request }) => {
  const response = await request.post("/api/tools/tool_create_vendor/runs", {
    data: {
      input: {
        country: "Germany",
        tax_id: "DE123456789",
        risk_level: "medium"
      }
    }
  });
  const body = await response.json();

  expect(response.status()).toBe(400);
  expect(body.error.code).toBe("validation_failed");
  expect(body.error.details[0].path).toBe("company_name");
});
