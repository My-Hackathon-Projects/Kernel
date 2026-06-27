import { apiError, type ApiErrorBody } from "@agentport/core";

export function json(body: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store");

  return Response.json(body, { ...init, headers });
}

export async function readJsonBody(
  request: Request
): Promise<{ success: true; data: unknown } | { success: false; error: ApiErrorBody }> {
  try {
    return { success: true, data: await request.json() };
  } catch {
    return {
      success: false,
      error: apiError("invalid_json", "Request body must be valid JSON")
    };
  }
}
