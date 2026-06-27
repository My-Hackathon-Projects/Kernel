import { json, readJsonBody } from "../../../lib/http";
import { createToolFromWorkflow } from "../../../lib/workflow-service";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body.success) {
    return json(body.error, { status: 400 });
  }

  const outcome = await createToolFromWorkflow(body.data);
  if (!outcome.success) {
    return json(outcome.error, { status: outcome.status });
  }

  return json({ tool: outcome.tool }, { status: 201 });
}
