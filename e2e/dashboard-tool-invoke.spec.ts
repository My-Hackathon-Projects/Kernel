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

  await expect(page.getByRole("status")).toContainText("succeeded", {
    timeout: 60_000
  });
  await expect(page.getByRole("status")).toContainText("Validation: passed");

  await page.getByRole("link", { name: "Open evidence" }).click();
  await expect(page).toHaveURL(/\/runs\//);
  await expect(page.getByRole("heading", { name: "Steps" })).toBeVisible();
  await expect(page.locator(".step-list li")).toHaveCount(8);
  await expect(page.locator(".step-screenshot").first()).toBeVisible();
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
