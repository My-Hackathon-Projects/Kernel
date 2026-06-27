"use client";

import { createVendorWorkflowFixture } from "@agentport/core";
import { useMemo, useState } from "react";

type ApiResult =
  | { valid: true; workflow: { name: string; version: number; stepCount: number } }
  | {
      error: {
        code: string;
        message: string;
        details?: Array<{ path: string; message: string }>;
      };
    };

export function WorkflowValidator() {
  const sampleWorkflow = useMemo(
    () => JSON.stringify(createVendorWorkflowFixture(), null, 2),
    []
  );
  const [value, setValue] = useState(sampleWorkflow);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function validateWorkflow() {
    setSubmitting(true);
    setResult(null);

    try {
      const response = await fetch("/api/workflows/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: value
      });
      const payload = (await response.json()) as ApiResult;
      setResult(payload);
    } catch {
      setResult({
        error: {
          code: "request_failed",
          message: "Could not validate the workflow payload"
        }
      });
    } finally {
      setSubmitting(false);
    }
  }

  const resultClass = result && "valid" in result ? "result ok" : "result error";

  return (
    <div className="validator">
      <h2>Workflow contract check</h2>
      <textarea
        aria-label="Workflow JSON"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <button type="button" onClick={validateWorkflow} disabled={submitting}>
        {submitting ? "Validating" : "Validate workflow"}
      </button>
      {result ? (
        <pre className={resultClass}>{JSON.stringify(result, null, 2)}</pre>
      ) : null}
    </div>
  );
}
