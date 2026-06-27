import { formatTraceEventSse } from "../lib/run-stream";
import { describe, expect, it } from "vitest";

describe("formatTraceEventSse", () => {
  it("serializes trace events as named server-sent events", () => {
    expect(
      formatTraceEventSse({
        type: "approval_requested",
        runId: "run_123",
        approvalId: "approval_123",
        stepId: "s7",
        prompt: "Approve create_vendor step s7",
        payload: { input: { company_name: "Acme GmbH" } },
        resolvedElement: 'role=button[name="Submit"]'
      })
    ).toBe(
      'event: approval_requested\ndata: {"type":"approval_requested","runId":"run_123","approvalId":"approval_123","stepId":"s7","prompt":"Approve create_vendor step s7","payload":{"input":{"company_name":"Acme GmbH"}},"resolvedElement":"role=button[name=\\"Submit\\"]"}\n\n'
    );
  });
});
