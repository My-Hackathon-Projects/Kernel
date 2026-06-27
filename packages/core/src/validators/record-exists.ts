import { type ValidationResult } from "../run";
import { type WorkflowDefinition, type WorkflowInput } from "../workflow";

export type ValidationFetchResponse = {
  ok: boolean;
  status: number;
  body: unknown;
};

export type ValidationFetch = (url: string) => Promise<ValidationFetchResponse>;

function buildValidationUrl(
  targetBaseUrl: string,
  validation: Extract<WorkflowDefinition["validation"], { type: "record_exists_api" }>,
  input: WorkflowInput
): string {
  const queryValue = input[validation.queryField];
  const url = new URL(validation.endpoint, `${targetBaseUrl}/`);
  url.searchParams.set(validation.queryField, queryValue ?? "");
  return url.toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickExpectedFields(
  actual: Record<string, unknown>,
  expected: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(Object.keys(expected).map((key) => [key, actual[key]]));
}

function mismatchReason(
  expected: Record<string, unknown>,
  actual: Record<string, unknown>
): string | undefined {
  const mismatch = Object.entries(expected).find(
    ([key, value]) => !Object.is(actual[key], value)
  );

  return mismatch
    ? `Expected ${mismatch[0]} to equal ${String(mismatch[1])}`
    : undefined;
}

export async function validateRecordExistsApi(params: {
  workflow: WorkflowDefinition;
  input: WorkflowInput;
  targetBaseUrl: string;
  fetchJson: ValidationFetch;
}): Promise<ValidationResult> {
  if (params.workflow.validation.type !== "record_exists_api") {
    return {
      passed: false,
      expected: {},
      actual: null,
      reason: `Validation type "${params.workflow.validation.type}" is not executable`
    };
  }

  const expected = params.workflow.validation.expect;
  const queryValue = params.input[params.workflow.validation.queryField];
  if (!queryValue) {
    return {
      passed: false,
      expected,
      actual: null,
      reason: `Missing validation input "${params.workflow.validation.queryField}"`
    };
  }

  const response = await params.fetchJson(
    buildValidationUrl(params.targetBaseUrl, params.workflow.validation, params.input)
  );

  if (!response.ok) {
    return {
      passed: false,
      expected,
      actual: null,
      reason: `Validation API returned ${response.status}`
    };
  }

  if (!isRecord(response.body)) {
    return {
      passed: false,
      expected,
      actual: null,
      reason: "Validation API response must be an object"
    };
  }

  const actual = pickExpectedFields(response.body, expected);
  const reason = mismatchReason(expected, response.body);

  return {
    passed: reason === undefined,
    expected,
    actual,
    ...(reason !== undefined ? { reason } : {})
  };
}
