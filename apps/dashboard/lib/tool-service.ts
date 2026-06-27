import {
  apiError,
  getApiErrorMessage,
  isApiErrorBody,
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
  createValidation,
  ensureCreateVendorTool,
  getPrismaClient,
  getRunDetail,
  getToolWithWorkflow,
  listEnabledTools,
  markRunFinished,
  parseStoredWorkflow
} from "@agentport/db";
import { resolveDashboardConfig } from "./config";
import { validateWorkflowResult } from "./validation";

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

async function readJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function runnerFailure(body: unknown, fallback: string): ApiErrorBody {
  return isApiErrorBody(body)
    ? body
    : apiError("execution_failed", getApiErrorMessage(body, fallback));
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
  const config = resolveDashboardConfig();

  try {
    const response = await fetch(`${config.runnerBaseUrl}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      cache: "no-store"
    });
    const body = await readJsonResponse(response);

    if (!response.ok) {
      return {
        success: false,
        error: runnerFailure(body, `Runner returned ${response.status}`)
      };
    }

    return { success: true, data: body };
  } catch (error) {
    return {
      success: false,
      error: apiError(
        "runner_unavailable",
        error instanceof Error ? error.message : "Runner request failed"
      )
    };
  }
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
    await markRunFinished(prisma, {
      runId: run.id,
      status: "failed",
      error: runnerResult.error.error.message
    });
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
    await markRunFinished(prisma, {
      runId: run.id,
      status: "failed",
      error: "Runner response did not match the execution contract"
    });

    return {
      success: false,
      status: 502,
      error: apiError("runner_contract_mismatch", "Runner response was invalid")
    };
  }

  const validation = await validateWorkflowResult({
    workflow,
    input: parsedInput.data,
    targetBaseUrl: tool.workflow.target.baseUrl
  });

  await createValidation(prisma, {
    runId: run.id,
    type: workflow.validation.type,
    result: validation
  });

  const status = validation.passed ? parsedRunnerResult.data.status : "failed";
  if (!validation.passed) {
    await markRunFinished(prisma, {
      runId: run.id,
      status: "failed",
      error: validation.reason ?? "Validation failed"
    });
  }

  await createAuditEvent(prisma, {
    runId: run.id,
    type: validation.passed ? "validation_passed" : "validation_failed",
    data: validation
  });

  return {
    success: true,
    result: toolInvokeResultSchema.parse({
      run_id: run.id,
      status,
      validation,
      evidence_url: evidenceUrl(run.id)
    })
  };
}
