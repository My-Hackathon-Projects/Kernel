"use client";

import { createVendorWorkflowFixture } from "@agentport/core";
import Link from "next/link";
import { useMemo, useState } from "react";

type ApiError = {
  code: string;
  message: string;
  details?: Array<{ path: string; message: string }>;
};

type ValidateResponse =
  | { valid: true; workflow: { name: string; version: number; stepCount: number } }
  | { error: ApiError };

type CreatedTool = {
  id: string;
  name: string;
  workflow: {
    name: string;
    version: number;
    contentHash: string;
    target: { name: string };
  };
};

type CreateResponse = { tool: CreatedTool } | { error: ApiError };

const REQUEST_FAILED: ApiError = {
  code: "request_failed",
  message: "Could not reach the dashboard API"
};

export function WorkflowStudio() {
  const sampleWorkflow = useMemo(
    () => JSON.stringify(createVendorWorkflowFixture(), null, 2),
    []
  );
  const [value, setValue] = useState(sampleWorkflow);
  const [validation, setValidation] = useState<ValidateResponse | null>(null);
  const [createdTool, setCreatedTool] = useState<CreatedTool | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState<"validate" | "compile" | null>(null);

  async function postWorkflow<T>(path: string): Promise<T | null> {
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: value
      });
      return (await response.json()) as T;
    } catch {
      setError(REQUEST_FAILED);
      return null;
    }
  }

  async function validateWorkflow() {
    setBusy("validate");
    setValidation(null);
    setCreatedTool(null);
    setError(null);

    const payload = await postWorkflow<ValidateResponse>("/api/workflows/validate");
    if (payload) {
      setValidation(payload);
      if ("error" in payload) {
        setError(payload.error);
      }
    }
    setBusy(null);
  }

  async function compileWorkflow() {
    setBusy("compile");
    setValidation(null);
    setCreatedTool(null);
    setError(null);

    const payload = await postWorkflow<CreateResponse>("/api/workflows");
    if (payload) {
      if ("tool" in payload) {
        setCreatedTool(payload.tool);
      } else {
        setError(payload.error);
      }
    }
    setBusy(null);
  }

  return (
    <div className="validator">
      <div className="section-heading">
        <h2>Workflow studio</h2>
        <span>Import and compile</span>
      </div>
      <p className="muted">
        Paste a workflow JSON (start from a recorded session, hand-edited into the
        Kernel shape). Validate the contract, then compile it into a typed tool that is
        exposed over MCP and listed in the registry.
      </p>
      <textarea
        aria-label="Workflow JSON"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <div className="studio-actions">
        <button type="button" onClick={validateWorkflow} disabled={busy !== null}>
          {busy === "validate" ? "Validating" : "Validate"}
        </button>
        <button type="button" onClick={compileWorkflow} disabled={busy !== null}>
          {busy === "compile" ? "Compiling" : "Compile and register tool"}
        </button>
      </div>

      {validation && "valid" in validation ? (
        <p className="result ok">
          Valid: {validation.workflow.name} v{validation.workflow.version} (
          {validation.workflow.stepCount} steps)
        </p>
      ) : null}

      {createdTool ? (
        <div className="invoke-result">
          <h3>Registered {createdTool.name}</h3>
          <p>
            Version {createdTool.workflow.version} · target{" "}
            {createdTool.workflow.target.name}
          </p>
          <p>Content hash {createdTool.workflow.contentHash.slice(0, 12)}</p>
          <p>
            <Link href="/tools">View in tools registry</Link> ·{" "}
            <Link href="/">Test invoke</Link>
          </p>
        </div>
      ) : null}

      {error ? (
        <pre className="result error">{JSON.stringify(error, null, 2)}</pre>
      ) : null}
    </div>
  );
}
