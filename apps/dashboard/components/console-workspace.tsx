"use client";

import { useEffect, useState } from "react";
import { ApprovalInbox, type DecisionResult } from "./approval-inbox";
import { ToolInvoker, type InvokeResult } from "./tool-invoker";
import { VendorIntake } from "./vendor-intake";

function statusLabel(status: string): string {
  return status
    .split("_")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function toInvokeResult(result: DecisionResult): InvokeResult {
  return {
    run_id: result.runId,
    status: result.status,
    validation: result.validation ?? null,
    approval: result.approval ?? null,
    evidence_url: result.evidenceUrl ?? `/runs/${result.runId}`
  };
}

function RunStatus({ result }: { result: InvokeResult }) {
  return (
    <div className="invoke-result" role="status">
      <h3>{statusLabel(result.status)}</h3>
      <p>
        Validation:{" "}
        {result.validation
          ? result.validation.passed
            ? "passed"
            : "failed"
          : "not run"}
      </p>
      {result.approval ? <p>Approval: {result.approval.status}</p> : null}
      <a href={`/runs/${result.run_id}`}>Open evidence</a>
    </div>
  );
}

export function ConsoleWorkspace() {
  const [currentRun, setCurrentRun] = useState<InvokeResult | null>(null);
  const [extractedInput, setExtractedInput] = useState<Record<string, string> | null>(
    null
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialInput = {
      company_name: params.get("company_name") ?? "",
      country: params.get("country") ?? "",
      tax_id: params.get("tax_id") ?? "",
      risk_level: params.get("risk_level") ?? ""
    };

    if (Object.values(initialInput).every((value) => value.length > 0)) {
      setExtractedInput(initialInput);
    }
  }, []);

  return (
    <>
      <section className="panel">
        <VendorIntake
          onExtractedInput={(input) => {
            setExtractedInput(input);
            setCurrentRun(null);
          }}
        />
      </section>

      <section className="panel">
        <ToolInvoker onResult={setCurrentRun} initialInput={extractedInput} />
        {currentRun ? <RunStatus result={currentRun} /> : null}
      </section>

      <section className="panel">
        <ApprovalInbox
          onDecision={(result) => setCurrentRun(toInvokeResult(result))}
          onReset={() => setCurrentRun(null)}
        />
      </section>
    </>
  );
}
