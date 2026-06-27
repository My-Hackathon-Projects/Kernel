import { formatZodError, workflowDefinitionSchema } from "@agentport/core";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      {
        error: {
          code: "invalid_json",
          message: "Request body must be valid JSON"
        }
      },
      { status: 400 }
    );
  }

  const parsed = workflowDefinitionSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(formatZodError(parsed.error), { status: 400 });
  }

  return Response.json({
    valid: true,
    workflow: {
      name: parsed.data.name,
      version: parsed.data.version,
      stepCount: parsed.data.steps.length
    }
  });
}
