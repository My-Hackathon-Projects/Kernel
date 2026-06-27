import {
  formatZodError,
  workflowDefinitionSchema,
  type ApiErrorBody
} from "@agentport/core";
import { getPrismaClient, upsertWorkflowTool } from "@agentport/db";
import { resolveDashboardConfig } from "./config";
import { toDashboardTool, type DashboardTool } from "./tool-service";

export type CreateToolOutcome =
  | { success: true; tool: DashboardTool }
  | { success: false; status: number; error: ApiErrorBody };

/**
 * Validates a workflow definition and persists it as a typed tool. The workflow
 * schema enforces that every step field is a declared input, so a parsed
 * definition always compiles; `upsertWorkflowTool` performs the compilation.
 * The compiled tool is exposed over MCP and the tools registry automatically,
 * since both read from the same enabled-tool list.
 */
export async function createToolFromWorkflow(
  definition: unknown
): Promise<CreateToolOutcome> {
  const parsed = workflowDefinitionSchema.safeParse(definition);
  if (!parsed.success) {
    return { success: false, status: 400, error: formatZodError(parsed.error) };
  }

  const config = resolveDashboardConfig();
  const tool = await upsertWorkflowTool(getPrismaClient(), {
    workflow: parsed.data,
    targetBaseUrl: config.mockPortalBaseUrl
  });

  return { success: true, tool: toDashboardTool(tool) };
}
