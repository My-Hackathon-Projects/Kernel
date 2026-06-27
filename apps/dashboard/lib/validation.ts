import {
  type ValidationResult,
  type WorkflowDefinition,
  type WorkflowInput
} from "@agentport/core";

function buildValidationUrl(
  targetBaseUrl: string,
  validation: Extract<WorkflowDefinition["validation"], { type: "record_exists_api" }>,
  input: WorkflowInput
): string {
  const url = new URL(validation.endpoint, `${targetBaseUrl}/`);
  url.searchParams.set(validation.queryField, input[validation.queryField] ?? "");
  return url.toString();
}

function pickExpectedFields(
  actual: Record<string, unknown>,
  expected: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(Object.keys(expected).map((key) => [key, actual[key]]));
}

function matchesExpected(
  actual: Record<string, unknown>,
  expected: Record<string, unknown>
): boolean {
  return Object.entries(expected).every(([key, value]) =>
    Object.is(actual[key], value)
  );
}

export async function validateWorkflowResult(params: {
  workflow: WorkflowDefinition;
  input: WorkflowInput;
  targetBaseUrl: string;
}): Promise<ValidationResult> {
  if (params.workflow.validation.type !== "record_exists_api") {
    return {
      passed: false,
      expected: {},
      actual: null,
      reason: `Validation type "${params.workflow.validation.type}" is not executable yet`
    };
  }

  const expected = params.workflow.validation.expect;
  const url = buildValidationUrl(
    params.targetBaseUrl,
    params.workflow.validation,
    params.input
  );

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return {
        passed: false,
        expected,
        actual: null,
        reason: `Validation API returned ${response.status}`
      };
    }

    const actual = (await response.json()) as Record<string, unknown>;
    const actualFields = pickExpectedFields(actual, expected);

    return {
      passed: matchesExpected(actual, expected),
      expected,
      actual: actualFields
    };
  } catch (error) {
    return {
      passed: false,
      expected,
      actual: null,
      reason: error instanceof Error ? error.message : "Validation request failed"
    };
  }
}
