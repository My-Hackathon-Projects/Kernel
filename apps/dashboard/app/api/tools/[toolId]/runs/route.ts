import { apiError } from "@agentport/core";
import { z } from "zod";
import { json, readJsonBody } from "../../../../../lib/http";
import { invokeTool } from "../../../../../lib/tool-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const invokeRequestSchema = z.object({
  input: z.record(z.string().min(1), z.unknown())
});

type RouteContext = {
  params: Promise<{ toolId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const body = await readJsonBody(request);
  if (!body.success) {
    return json(body.error, { status: 400 });
  }

  const parsed = invokeRequestSchema.safeParse(body.data);
  if (!parsed.success) {
    return json(apiError("validation_failed", "Request validation failed"), {
      status: 400
    });
  }

  const { toolId } = await context.params;
  const outcome = await invokeTool({
    toolId,
    input: parsed.data.input,
    callerId: "dashboard"
  });

  if (!outcome.success) {
    return json(outcome.error, { status: outcome.status });
  }

  return json(outcome.result, {
    status: outcome.result.status === "awaiting_approval" ? 202 : 201
  });
}
