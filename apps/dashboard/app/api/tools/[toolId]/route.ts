import { apiError } from "@agentport/core";
import { json } from "../../../../lib/http";
import { getDashboardTool } from "../../../../lib/tool-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ toolId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { toolId } = await context.params;
  const tool = await getDashboardTool(toolId);

  if (!tool) {
    return json(apiError("not_found", "Tool not found"), { status: 404 });
  }

  return json({ tool });
}
