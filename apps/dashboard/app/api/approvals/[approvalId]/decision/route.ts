import { apiError, approvalDecisionSchema } from "@agentport/core";
import { decideApproval } from "../../../../../lib/approval-service";
import { json, readJsonBody } from "../../../../../lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ approvalId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const body = await readJsonBody(request);
  if (!body.success) {
    return json(body.error, { status: 400 });
  }

  const decision =
    typeof body.data === "object" && body.data !== null && "decision" in body.data
      ? (body.data as { decision?: unknown }).decision
      : undefined;
  const parsed = approvalDecisionSchema.safeParse(decision);
  if (!parsed.success) {
    return json(apiError("validation_failed", "Invalid approval decision"), {
      status: 400
    });
  }

  const { approvalId } = await context.params;
  const outcome = await decideApproval({
    approvalId,
    decision: parsed.data
  });

  if (!outcome.success) {
    return json(outcome.error, { status: outcome.status });
  }

  return json(outcome.result);
}
