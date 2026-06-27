"use client";

import { useMemo, useState } from "react";

type ToolInputProperty = {
  type: string;
  enum?: string[];
};

type InvokeResult = {
  run_id: string;
  status: string;
  validation: { passed: boolean; reason?: string } | null;
  approval?: { id: string; status: string } | null;
};

const MOCK_TOOL = {
  id: "demo-create-vendor",
  name: "create_vendor",
  inputSchema: {
    properties: {
      company_name: { type: "string" },
      country:      { type: "string" },
      tax_id:       { type: "string" },
      risk_level:   { type: "string", enum: ["low", "medium", "high"] }
    } as Record<string, ToolInputProperty>,
    required: ["company_name", "country", "tax_id", "risk_level"]
  }
};

const DEFAULT_INPUT: Record<string, string> = {
  company_name: "Acme GmbH",
  country: "Germany",
  tax_id: "DE123456789",
  risk_level: "medium"
};

const DEMO_APPROVAL_KEY = "demo:approvals";

function labelForField(field: string): string {
  return field
    .split("_")
    .map((p) => `${p[0].toUpperCase()}${p.slice(1)}`)
    .join(" ");
}

function randomId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function statusBadgeClass(status: string): string {
  if (status === "completed" || status === "approved") return "badge badge-completed";
  if (status === "failed" || status === "rejected") return "badge badge-error";
  if (status === "awaiting_approval" || status === "pending") return "badge badge-pending";
  if (status === "running") return "badge badge-running";
  return "badge";
}

export function ToolInvoker() {
  const [input, setInput] = useState<Record<string, string>>(DEFAULT_INPUT);
  const [result, setResult] = useState<InvokeResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fields = useMemo(
    () => Object.entries(MOCK_TOOL.inputSchema.properties),
    []
  );

  async function invoke() {
    setSubmitting(true);
    setResult(null);

    // Simulate network latency
    await new Promise((r) => setTimeout(r, 1400));

    const runId = randomId("run");
    const approvalId = randomId("appr");

    // Write mock approval into sessionStorage for ApprovalInbox to pick up
    try {
      const existing: unknown[] = JSON.parse(
        sessionStorage.getItem(DEMO_APPROVAL_KEY) ?? "[]"
      );
      const newApproval = {
        id: approvalId,
        runId,
        toolName: MOCK_TOOL.name,
        stepId: "submit-vendor-form",
        prompt: "Agent wants to submit vendor registration",
        payload: {
          input: { ...input },
          resolvedElement: "#submit-btn"
        },
        status: "pending"
      };
      sessionStorage.setItem(
        DEMO_APPROVAL_KEY,
        JSON.stringify([...existing, newApproval])
      );
    } catch {
      // sessionStorage unavailable (SSR guard)
    }

    setResult({
      run_id: runId,
      status: "awaiting_approval",
      validation: null,
      approval: { id: approvalId, status: "pending" }
    });

    setSubmitting(false);
  }

  return (
    <div className="tool-invoker">
      <div className="section-heading">
        <h2>Invoke tool</h2>
        <span>{MOCK_TOOL.name}</span>
      </div>

      <form
        className="invoke-form"
        onSubmit={(e) => { e.preventDefault(); void invoke(); }}
      >
        {fields.map(([field, property]) => (
          <label key={field}>
            <span>{labelForField(field)}</span>
            {property.enum ? (
              <select
                value={input[field] ?? ""}
                onChange={(e) =>
                  setInput((cur) => ({ ...cur, [field]: e.target.value }))
                }
              >
                {property.enum.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <input
                value={input[field] ?? ""}
                onChange={(e) =>
                  setInput((cur) => ({ ...cur, [field]: e.target.value }))
                }
              />
            )}
          </label>
        ))}

        <button type="submit" disabled={submitting}>
          {submitting ? "Running workflow…" : "Run tool"}
        </button>
      </form>

      {result ? (
        <div className="invoke-result" role="status">
          <div className="result-badges">
            <span className={statusBadgeClass(result.status)}>{result.status}</span>
            {result.validation ? (
              <span className={`badge ${result.validation.passed ? "badge-ok" : "badge-error"}`}>
                {result.validation.passed ? "Validated ✓" : "Validation failed"}
              </span>
            ) : null}
            {result.approval ? (
              <span className="badge badge-pending">
                Approval pending — check inbox ↓
              </span>
            ) : null}
          </div>
          <a className="evidence-link" href={`/runs/${result.run_id}`}>
            Open evidence trail →
          </a>
        </div>
      ) : null}
    </div>
  );
}
