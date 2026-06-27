import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { expect, test, type TestInfo } from "@playwright/test";

const execFileAsync = promisify(execFile);
const dashboardUrl = process.env.DASHBOARD_BASE_URL ?? "http://localhost:3000";

function uniqueCompanyName(prefix: string, testInfo: TestInfo): string {
  return `${prefix} ${testInfo.workerIndex}-${Date.now()}`;
}

function pnpmCommand(): { command: string; args: string[] } {
  if (process.env.npm_execpath) {
    return {
      command: process.execPath,
      args: [process.env.npm_execpath, "mcp:create-vendor"]
    };
  }

  return { command: "pnpm", args: ["mcp:create-vendor"] };
}

function parseJsonFromStdout(stdout: string): unknown {
  const start = stdout.indexOf("{");
  if (start < 0) {
    throw new Error(`No JSON object found in stdout: ${stdout}`);
  }

  return JSON.parse(stdout.slice(start));
}

test("external MCP client discovers and calls create_vendor", async () => {
  const testInfo = test.info();
  const companyName = uniqueCompanyName("MCP Vendor", testInfo);
  const { command, args } = pnpmCommand();
  const { stdout } = await execFileAsync(command, args, {
    cwd: process.cwd(),
    timeout: 120_000,
    env: {
      ...process.env,
      AGENTPORT_COMPANY_NAME: companyName,
      AGENTPORT_MCP_URL: `${dashboardUrl}/mcp`
    }
  });

  const result = parseJsonFromStdout(stdout) as {
    run_id: string;
    status: string;
    validation: { passed: boolean } | null;
  };

  expect(result.status).toBe("succeeded");
  expect(result.validation?.passed).toBe(true);
  expect(result.run_id.length).toBeGreaterThan(0);
});
