import { expect, test, type TestInfo } from "@playwright/test";
import { createVendorWorkflowFixture } from "../packages/core/src/workflow/fixtures";

function uniqueCompanyName(prefix: string, testInfo: TestInfo): string {
  return `${prefix} ${testInfo.workerIndex}-${Date.now()}`;
}

test("dashboard test invoke runs the compiled tool and opens evidence", async ({
  page
}, testInfo) => {
  const companyName = uniqueCompanyName("Dashboard Vendor", testInfo);

  await page.goto("/console");
  const companyField = page.getByRole("textbox", { name: "Company Name" });
  const countryField = page.getByRole("combobox", { name: "Country" });
  const taxField = page.getByRole("textbox", { name: "Tax Id" });
  const riskField = page.getByRole("combobox", { name: "Risk Level" });

  await expect(companyField).toHaveValue("");
  await expect(companyField).toHaveAttribute("placeholder", "Acme GmbH");
  await expect(countryField).toHaveValue("");
  await expect(taxField).toHaveValue("");
  await expect(taxField).toHaveAttribute("placeholder", "DE123456789");
  await expect(riskField).toHaveValue("");

  await page
    .getByLabel("Vendor source")
    .fill(
      [
        `Company Name: ${companyName}`,
        "Country: Germany",
        "Tax ID: DE123456789",
        "Risk Level: medium"
      ].join("\n")
    );
  await page.getByRole("button", { name: "Extract fields" }).click();
  await expect(page.getByRole("heading", { name: "Fields ready" })).toBeVisible();
  await expect(companyField).toHaveValue(companyName);
  await expect(countryField).toHaveValue("Germany");
  await expect(taxField).toHaveValue("DE123456789");
  await expect(riskField).toHaveValue("medium");

  await page.getByRole("button", { name: "Run workflow" }).click();

  await expect(page.getByRole("status")).toContainText("Awaiting Approval", {
    timeout: 60_000
  });
  await expect(page.getByRole("status")).toContainText("Approval: pending");

  const approvalCard = page.locator(".approval-card").filter({ hasText: companyName });
  await expect(approvalCard).toBeVisible({ timeout: 10_000 });
  await approvalCard.getByRole("button", { name: "Approve" }).click();

  await expect(page.getByRole("status")).toHaveCount(1);
  const completedStatus = page.getByRole("status").filter({ hasText: "Succeeded" });
  await expect(completedStatus).toContainText("Validation: passed", {
    timeout: 60_000
  });
  await expect(completedStatus).not.toContainText("Awaiting Approval");

  await completedStatus.getByRole("link", { name: "Open evidence" }).click();
  await expect(page).toHaveURL(/\/runs\//);
  await expect(page.getByRole("heading", { name: "Steps" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Approvals" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Validation", exact: true })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Trace Events" })).toBeVisible();
  await expect(page.locator(".step-list li")).toHaveCount(8);
  await expect(page.locator(".step-screenshot").first()).toBeVisible();

  await page.goto("/runs");
  await expect(page.getByRole("heading", { name: "Recent Runs" })).toBeVisible();
  await expect(page.getByText(companyName)).toBeVisible();
});

test("console accepts extracted fields from the browser extension", async ({
  page
}) => {
  await page.goto(
    `/console?${new URLSearchParams({
      company_name: "Extension Vendor GmbH",
      country: "Germany",
      tax_id: "DE111222333",
      risk_level: "medium"
    }).toString()}`
  );

  await expect(page.getByRole("textbox", { name: "Company Name" })).toHaveValue(
    "Extension Vendor GmbH"
  );
  await expect(page.getByRole("combobox", { name: "Country" })).toHaveValue("Germany");
  await expect(page.getByRole("textbox", { name: "Tax Id" })).toHaveValue(
    "DE111222333"
  );
  await expect(page.getByRole("combobox", { name: "Risk Level" })).toHaveValue(
    "medium"
  );
});

test("dashboard rejection removes the pending approval card", async ({
  page
}, testInfo) => {
  const companyName = uniqueCompanyName("Rejected Dashboard Vendor", testInfo);

  await page.goto(
    `/console?${new URLSearchParams({
      company_name: companyName,
      country: "Germany",
      tax_id: "DE123456789",
      risk_level: "medium"
    }).toString()}`
  );

  await page.getByRole("button", { name: "Run workflow" }).click();
  await expect(page.getByRole("status")).toContainText("Awaiting Approval", {
    timeout: 60_000
  });

  const approvalCard = page.locator(".approval-card").filter({ hasText: companyName });
  await expect(approvalCard).toBeVisible({ timeout: 10_000 });
  await approvalCard.getByRole("button", { name: "Reject" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Rejected" })).toBeVisible({
    timeout: 60_000
  });
  await expect(approvalCard).toHaveCount(0);
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

test("workflow studio compiles an imported workflow into a callable tool", async ({
  page,
  request
}, testInfo) => {
  const workflow = createVendorWorkflowFixture();
  workflow.name = "create_vendor_studio";

  const createResponse = await request.post("/api/workflows", { data: workflow });
  expect(createResponse.status()).toBe(201);
  const created = (await createResponse.json()) as {
    tool: { id: string; name: string };
  };
  expect(created.tool.name).toBe("create_vendor_studio");
  const toolId = created.tool.id;

  const toolsResponse = await request.get("/api/tools");
  const tools = ((await toolsResponse.json()) as { tools: Array<{ id: string }> })
    .tools;
  expect(tools.some((tool) => tool.id === toolId)).toBe(true);

  await page.goto("/tools");
  await expect(
    page.getByRole("heading", { name: "create_vendor_studio" })
  ).toBeVisible();

  const companyName = uniqueCompanyName("Studio Vendor", testInfo);
  const invokeResponse = await request.post(`/api/tools/${toolId}/runs`, {
    data: {
      input: {
        company_name: companyName,
        country: "Germany",
        tax_id: "DE123456789",
        risk_level: "medium"
      }
    }
  });
  expect(invokeResponse.status()).toBe(202);
  expect(((await invokeResponse.json()) as { status: string }).status).toBe(
    "awaiting_approval"
  );

  const approvalsResponse = await request.get("/api/approvals");
  const approvals = (
    (await approvalsResponse.json()) as {
      approvals: Array<{ id: string; payload: { input?: Record<string, unknown> } }>;
    }
  ).approvals;
  const approval = approvals.find(
    (candidate) => candidate.payload.input?.company_name === companyName
  );
  expect(approval).toBeTruthy();

  const rejectResponse = await request.post(`/api/approvals/${approval?.id}/decision`, {
    data: { decision: "reject" }
  });
  expect(rejectResponse.status()).toBe(200);
});

test("runs carry a sequential number and can be deleted from the record", async ({
  request
}, testInfo) => {
  const companyName = uniqueCompanyName("Delete Vendor", testInfo);
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
  expect(invokeResponse.status()).toBe(202);
  const runId = ((await invokeResponse.json()) as { run_id: string }).run_id;

  const approvalsResponse = await request.get("/api/approvals");
  const approvals = (
    (await approvalsResponse.json()) as {
      approvals: Array<{ id: string; payload: { input?: Record<string, unknown> } }>;
    }
  ).approvals;
  const approval = approvals.find(
    (candidate) => candidate.payload.input?.company_name === companyName
  );
  await request.post(`/api/approvals/${approval?.id}/decision`, {
    data: { decision: "reject" }
  });

  const detailResponse = await request.get(`/api/runs/${runId}`);
  const detail = (await detailResponse.json()) as { run: { seq: number | null } };
  expect(typeof detail.run.seq).toBe("number");
  expect(detail.run.seq).toBeGreaterThan(100000);

  const deleteResponse = await request.delete(`/api/runs/${runId}`);
  expect(deleteResponse.status()).toBe(200);

  const afterResponse = await request.get(`/api/runs/${runId}`);
  expect(afterResponse.status()).toBe(404);
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
