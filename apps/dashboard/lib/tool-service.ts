import {
  apiError,
  parseWorkflowInput,
  runnerExecuteResultSchema,
  toolInvokeResultSchema,
  type ApiErrorBody,
  type ToolInvokeResult,
  type WorkflowInput
} from "@agentport/core";
import {
  CREATE_VENDOR_TOOL_ID,
  createAuditEvent,
  createRunForTool,
  ensureCreateVendorTool,
  getPrismaClient,
  getRunDetail,
  getToolWithWorkflow,
  listEnabledTools,
  parseStoredWorkflow
} from "@agentport/db";
import { resolveDashboardConfig } from "./config";
import { postRunnerJson } from "./runner-client";

export type DashboardTool = {
  id: string;
  name: string;
  enabled: boolean;
  workflow: {
    id: string;
    name: string;
    version: number;
    contentHash: string;
    target: {
      name: string;
      baseUrl: string;
    };
  };
  inputSchema: unknown;
};

export type ToolInvocationOutcome =
  | { success: true; result: ToolInvokeResult }
  | { success: false; status: number; error: ApiErrorBody };

function toDashboardTool(
  tool: Awaited<ReturnType<typeof ensureCreateVendorTool>>
): DashboardTool {
  return {
    id: tool.id,
    name: tool.name,
    enabled: tool.enabled,
    inputSchema: tool.inputSchema,
    workflow: {
      id: tool.workflow.id,
      name: tool.workflow.name,
      version: tool.workflow.version,
      contentHash: tool.workflow.contentHash,
      target: {
        name: tool.workflow.target.name,
        baseUrl: tool.workflow.target.baseUrl
      }
    }
  };
}

async function ensureDefaultTool() {
  const prisma = getPrismaClient();
  const config = resolveDashboardConfig();

  return ensureCreateVendorTool(prisma, {
    targetBaseUrl: config.mockPortalBaseUrl
  });
}

function evidenceUrl(runId: string): string {
  return `${resolveDashboardConfig().dashboardBaseUrl}/runs/${runId}`;
}

export async function listTools(): Promise<DashboardTool[]> {
  await ensureDefaultTool();

  const tools = await listEnabledTools(getPrismaClient());
  return tools.map(toDashboardTool);
}

export async function getDashboardTool(toolId: string): Promise<DashboardTool | null> {
  await ensureDefaultTool();

  const tool = await getToolWithWorkflow(getPrismaClient(), toolId);
  return tool ? toDashboardTool(tool) : null;
}

export async function getDefaultTool(): Promise<DashboardTool> {
  const tool = await getDashboardTool(CREATE_VENDOR_TOOL_ID);
  if (!tool) {
    throw new Error("Default create_vendor tool was not provisioned");
  }

  return tool;
}

export async function getRun(runId: string) {
  return getRunDetail(getPrismaClient(), runId);
}

async function callRunner(params: {
  runId: string;
  workflow: unknown;
  input: WorkflowInput;
}): Promise<
  { success: true; data: unknown } | { success: false; error: ApiErrorBody }
> {
  return postRunnerJson({ path: "/execute", body: params });
}

export async function invokeTool(params: {
  toolId: string;
  input: Record<string, unknown>;
  callerId?: string;
}): Promise<ToolInvocationOutcome> {
  await ensureDefaultTool();

  const prisma = getPrismaClient();
  const tool = await getToolWithWorkflow(prisma, params.toolId);
  if (!tool) {
    return {
      success: false,
      status: 404,
      error: apiError("not_found", "Tool not found")
    };
  }

  const workflow = parseStoredWorkflow(tool.workflow.definition);
  const parsedInput = parseWorkflowInput(workflow, params.input);
  if (!parsedInput.success) {
    return {
      success: false,
      status: 400,
      error: parsedInput.error
    };
  }

  const run = await createRunForTool(prisma, {
    toolId: tool.id,
    workflowVersion: workflow.version,
    input: parsedInput.data,
    ...(params.callerId !== undefined ? { callerId: params.callerId } : {})
  });

  await createAuditEvent(prisma, {
    runId: run.id,
    type: "tool_invoked",
    data: { tool: tool.name, callerId: params.callerId ?? null }
  });

  const runnerResult = await callRunner({
    runId: run.id,
    workflow,
    input: parsedInput.data
  });

  if (!runnerResult.success) {
    await createAuditEvent(prisma, {
      runId: run.id,
      type: "runner_failed",
      data: runnerResult.error
    });

    return {
      success: false,
      status: runnerResult.error.error.code === "validation_failed" ? 400 : 502,
      error: runnerResult.error
    };
  }

  const parsedRunnerResult = runnerExecuteResultSchema.safeParse(runnerResult.data);
  if (!parsedRunnerResult.success) {
    return {
      success: false,
      status: 502,
      error: apiError("runner_contract_mismatch", "Runner response was invalid")
    };
  }

  await createAuditEvent(prisma, {
    runId: run.id,
    type: "runner_completed",
    data: {
      status: parsedRunnerResult.data.status,
      approval: parsedRunnerResult.data.approval,
      validation: parsedRunnerResult.data.validation
    }
  });

  return {
    success: true,
    result: toolInvokeResultSchema.parse({
      run_id: run.id,
      status: parsedRunnerResult.data.status,
      validation: parsedRunnerResult.data.validation,
      approval: parsedRunnerResult.data.approval,
      evidence_url: evidenceUrl(run.id)
    })
  };
}
