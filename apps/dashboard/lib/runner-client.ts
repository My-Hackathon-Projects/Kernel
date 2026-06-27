import {
  apiError,
  getApiErrorMessage,
  isApiErrorBody,
  type ApiErrorBody
} from "@agentport/core";
import { resolveDashboardConfig } from "./config";

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

export async function postRunnerJson(params: {
  path: "/execute" | "/resume";
  body: unknown;
}): Promise<
  { success: true; data: unknown } | { success: false; error: ApiErrorBody }
> {
  const config = resolveDashboardConfig();

  try {
    const response = await fetch(`${config.runnerBaseUrl}${params.path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params.body),
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
