"use client";

import { useEffect, useState } from "react";

type ApprovalSummary = {
  id: string;
  runId: string;
  toolName: string;
  stepId: string;
  prompt: string;
  payload: {
    input?: Record<string, unknown>;
    resolvedElement?: string;
  };
  status: string;
};

type DecisionResult = {
  runId: string;
  status: string;
  validation?: { passed: boolean } | null;
};

const DEMO_APPROVAL_KEY = "demo:approvals";

function readApprovals(): ApprovalSummary[] {
  try {
    return JSON.parse(sessionStorage.getItem(DEMO_APPROVAL_KEY) ?? "[]") as ApprovalSummary[];
  } catch {
    return [];
  }
}

function writeApprovals(approvals: ApprovalSummary[]) {
  try {
    sessionStorage.setItem(DEMO_APPROVAL_KEY, JSON.stringify(approvals));
  } catch {
    // noop
  }
}

function InputGrid({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return <p className="muted">No input data</p>;
  return (
    <div className="input-grid">
      {entries.map(([key, val]) => (
        <div key={key} className="kv-row">
          <span className="kv-key">{key}</span>
          <span className="kv-val">
            {typeof val === "object" ? JSON.stringify(val) : String(val)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ApprovalInbox() {
  const [approvals, setApprovals] = useState<ApprovalSummary[]>([]);
  const [decisionResult, setDecisionResult] = useState<DecisionResult | null>(null);
  const [busyApprovalId, setBusyApprovalId] = useState<string | null>(null);

  function loadApprovals() {
    setApprovals(readApprovals());
  }

  useEffect(() => {
    loadApprovals();
    const interval = setInterval(loadApprovals, 1_500);
    return () => clearInterval(interval);
  }, []);

  async function decide(approvalId: string, decision: "approve" | "reject") {
    setBusyApprovalId(approvalId);

    await new Promise((r) => setTimeout(r, 900));

    const approval = approvals.find((a) => a.id === approvalId);
    const remaining = readApprovals().filter((a) => a.id !== approvalId);
    writeApprovals(remaining);

    setDecisionResult({
      runId: approval?.runId ?? "demo-run",
      status: decision === "approve" ? "completed" : "rejected",
      validation: decision === "approve" ? { passed: true } : null
    });

    setApprovals(remaining);
    setBusyApprovalId(null);
  }

  return (
    <div className="approval-inbox">
      <div className="section-heading">
        <h2>Approval inbox</h2>
        <span>{approvals.length}</span>
      </div>

      {approvals.length === 0 && !decisionResult ? (
        <p className="muted">No pending approvals — run a tool to trigger one.</p>
      ) : null}

      {approvals.map((approval) => (
        <article className="approval-card" key={approval.id}>
          <div>
            <h3>{approval.prompt}</h3>
            <p>{approval.toolName}</p>
          </div>

          <dl className="approval-meta">
            <div>
              <dt>Run</dt>
              <dd>{approval.runId.slice(0, 12)}…</dd>
            </div>
            <div>
              <dt>Step</dt>
              <dd>{approval.stepId}</dd>
            </div>
            <div>
              <dt>Element</dt>
              <dd>{approval.payload.resolvedElement ?? "Unknown"}</dd>
            </div>
          </dl>

          <InputGrid data={approval.payload.input ?? {}} />

          <div className="approval-actions">
            <button
              type="button"
              disabled={busyApprovalId === approval.id}
              onClick={() => void decide(approval.id, "approve")}
            >
              {busyApprovalId === approval.id ? "Processing…" : "Approve"}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={busyApprovalId === approval.id}
              onClick={() => void decide(approval.id, "reject")}
            >
              Reject
            </button>
          </div>
        </article>
      ))}

      {decisionResult ? (
        <div className="invoke-result" role="status">
          <div className="result-badges">
            <span className={`badge badge-${decisionResult.status}`}>
              {decisionResult.status}
            </span>
            {decisionResult.validation ? (
              <span className={`badge ${decisionResult.validation.passed ? "badge-ok" : "badge-error"}`}>
                {decisionResult.validation.passed ? "Validated ✓" : "Validation failed"}
              </span>
            ) : null}
          </div>
          <a className="evidence-link" href={`/runs/${decisionResult.runId}`}>
            Open evidence trail →
          </a>
        </div>
      ) : null}
    </div>
  );
}
