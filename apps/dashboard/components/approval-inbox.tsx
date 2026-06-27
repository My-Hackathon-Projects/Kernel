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

type ApprovalResponse = {
  approvals: ApprovalSummary[];
};

type DecisionResult = {
  runId: string;
  status: string;
  validation?: { passed: boolean } | null;
};

function normalizeApprovals(value: unknown): ApprovalSummary[] {
  const response = value as Partial<ApprovalResponse>;
  return Array.isArray(response.approvals) ? response.approvals : [];
}

export function ApprovalInbox() {
  const [approvals, setApprovals] = useState<ApprovalSummary[]>([]);
  const [decisionResult, setDecisionResult] = useState<DecisionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyApprovalId, setBusyApprovalId] = useState<string | null>(null);

  async function loadApprovals() {
    try {
      const response = await fetch("/api/approvals", { cache: "no-store" });
      setApprovals(normalizeApprovals(await response.json()));
      setError(null);
    } catch {
      setError("Could not load approvals");
    }
  }

  useEffect(() => {
    void loadApprovals();
    const interval = setInterval(() => void loadApprovals(), 2_000);

    return () => clearInterval(interval);
  }, []);

  async function decide(approvalId: string, decision: "approve" | "reject") {
    setBusyApprovalId(approvalId);
    setError(null);

    try {
      const response = await fetch(`/api/approvals/${approvalId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision })
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error?.message ?? "Approval decision failed");
        return;
      }

      setDecisionResult({
        runId: payload.runId,
        status: payload.status,
        validation: payload.validation
      });
      await loadApprovals();
    } catch {
      setError("Approval decision failed");
    } finally {
      setBusyApprovalId(null);
    }
  }

  return (
    <div className="approval-inbox">
      <div className="section-heading">
        <h2>Approval Inbox</h2>
        <span>{approvals.length}</span>
      </div>

      {approvals.length === 0 ? <p className="muted">No pending approvals</p> : null}

      {approvals.map((approval) => (
        <article className="approval-card" key={approval.id}>
          <div>
            <h3>{approval.prompt}</h3>
            <p>{approval.toolName}</p>
          </div>
          <dl className="approval-meta">
            <div>
              <dt>Run</dt>
              <dd>{approval.runId}</dd>
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
          <pre className="result">
            {JSON.stringify(approval.payload.input ?? {}, null, 2)}
          </pre>
          <div className="approval-actions">
            <button
              type="button"
              disabled={busyApprovalId === approval.id}
              onClick={() => void decide(approval.id, "approve")}
            >
              Approve
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
          <h3>{decisionResult.status}</h3>
          <p>
            Validation:{" "}
            {decisionResult.validation
              ? decisionResult.validation.passed
                ? "passed"
                : "failed"
              : "not run"}
          </p>
          <a href={`/runs/${decisionResult.runId}`}>Open evidence</a>
        </div>
      ) : null}

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
