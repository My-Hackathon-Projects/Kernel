import {
  validateRecordExistsApi,
  type ValidationResult,
  type WorkflowDefinition,
  type WorkflowInput
} from "@agentport/core";

async function fetchJson(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  let body: unknown = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    body
  };
}

export async function validateWorkflowResult(params: {
  workflow: WorkflowDefinition;
  input: WorkflowInput;
  targetBaseUrl: string;
}): Promise<ValidationResult> {
  return validateRecordExistsApi({
    workflow: params.workflow,
    input: params.input,
    targetBaseUrl: params.targetBaseUrl,
    fetchJson
  });
}
