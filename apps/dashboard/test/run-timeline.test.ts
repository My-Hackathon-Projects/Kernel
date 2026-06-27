import { createVendorWorkflowFixture } from "@agentport/core";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RunTimeline } from "../components/run-timeline";

const workflowSteps = createVendorWorkflowFixture().steps;

function renderTimeline(status: string) {
  return renderToStaticMarkup(
    React.createElement(RunTimeline, {
      runId: "run_123",
      workflowSteps,
      steps: [
        {
          id: `step_${status}`,
          stepId: "s7",
          action: "click",
          status,
          selector: 'role=button[name="Submit"]',
          resolvedTier: 2,
          durationMs: 12,
          screenshotId: "artifact_123"
        }
      ],
      artifacts: [{ id: "artifact_123", stepId: "s7" }]
    })
  );
}

describe("RunTimeline", () => {
  it.each([
    "succeeded",
    "awaiting_approval",
    "rejected",
    "failed",
    "validation_failed"
  ])("renders %s step evidence", (status) => {
    const html = renderTimeline(status);

    expect(html).toContain(status);
    expect(html).toContain("submit_vendor");
    expect(html).toContain("role=button");
    expect(html).toContain("artifact_123");
  });
});
