import { apiError } from "@agentport/core";
import { json } from "../../../../lib/http";
import { deleteRunById, getRun } from "../../../../lib/run-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ runId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { runId } = await context.params;
  const run = await getRun(runId);

  if (!run) {
    return json(apiError("not_found", "Run not found"), { status: 404 });
  }

  return json({ run });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { runId } = await context.params;
  const deleted = await deleteRunById(runId);

  if (!deleted) {
    return json(apiError("not_found", "Run not found"), { status: 404 });
  }

  return json({ deleted: true });
}
