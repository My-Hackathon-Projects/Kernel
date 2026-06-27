"use client";

import { useEffect, useMemo, useState } from "react";

type ToolInputProperty = {
  type: string;
  enum?: string[];
};

type DashboardTool = {
  id: string;
  name: string;
  inputSchema: {
    properties?: Record<string, ToolInputProperty>;
    required?: string[];
  };
};

type ToolsResponse = {
  tools: DashboardTool[];
};

type InvokeResult = {
  run_id: string;
  status: string;
  evidence_url: string;
  validation: {
    passed: boolean;
    reason?: string;
  } | null;
  approval?: {
    id: string;
    status: string;
  } | null;
};

type ApiError = {
  error: {
    code: string;
    message: string;
    details?: Array<{ path: string; message: string }>;
  };
};

const FIELD_PLACEHOLDERS: Record<string, string> = {
  company_name: "Acme GmbH",
  country: "Select country",
  tax_id: "DE123456789",
  risk_level: "Select risk level"
};

function labelForField(field: string): string {
  return field
    .split("_")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function normalizeToolsResponse(value: unknown): DashboardTool[] {
  const response = value as Partial<ToolsResponse>;
  return Array.isArray(response.tools) ? response.tools : [];
}

export function ToolInvoker() {
  const [tool, setTool] = useState<DashboardTool | null>(null);
  const [input, setInput] = useState<Record<string, string>>({});
  const [result, setResult] = useState<InvokeResult | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadTool() {
      try {
        const response = await fetch("/api/tools", { cache: "no-store" });
        const tools = normalizeToolsResponse(await response.json());
        const defaultTool = tools.find(
          (candidate) => candidate.name === "create_vendor"
        );

        if (!cancelled) {
          setTool(defaultTool ?? null);
          setError(
            defaultTool
              ? null
              : { error: { code: "not_found", message: "Tool not found" } }
          );
        }
      } catch {
        if (!cancelled) {
          setError({
            error: {
              code: "request_failed",
              message: "Could not load tools"
            }
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadTool();

    return () => {
      cancelled = true;
    };
  }, []);

  const fields = useMemo(
    () => Object.entries(tool?.inputSchema.properties ?? {}),
    [tool]
  );
  const requiredFields = useMemo(
    () => new Set(tool?.inputSchema.required ?? []),
    [tool]
  );

  async function invoke() {
    if (!tool) {
      return;
    }

    setSubmitting(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch(`/api/tools/${tool.id}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input })
      });
      const payload = (await response.json()) as InvokeResult | ApiError;

      if (!response.ok || "error" in payload) {
        setError(payload as ApiError);
        return;
      }

      setResult(payload);
    } catch {
      setError({
        error: {
          code: "request_failed",
          message: "Could not invoke the tool"
        }
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="tool-invoker">
      <div className="section-heading">
        <h2>Test Invoke</h2>
        <span>{tool?.name ?? "create_vendor"}</span>
      </div>

      {loading ? <p className="muted">Loading tool</p> : null}

      {fields.length > 0 ? (
        <form
          className="invoke-form"
          onSubmit={(event) => {
            event.preventDefault();
            void invoke();
          }}
        >
          {fields.map(([field, property]) => (
            <label key={field}>
              <span>{labelForField(field)}</span>
              {property.enum ? (
                <select
                  required={requiredFields.has(field)}
                  value={input[field] ?? ""}
                  onChange={(event) =>
                    setInput((current) => ({ ...current, [field]: event.target.value }))
                  }
                >
                  <option value="" disabled>
                    {FIELD_PLACEHOLDERS[field] ?? `Select ${labelForField(field)}`}
                  </option>
                  {property.enum.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  required={requiredFields.has(field)}
                  placeholder={FIELD_PLACEHOLDERS[field] ?? labelForField(field)}
                  value={input[field] ?? ""}
                  onChange={(event) =>
                    setInput((current) => ({ ...current, [field]: event.target.value }))
                  }
                />
              )}
            </label>
          ))}

          <button type="submit" disabled={submitting || !tool}>
            {submitting ? "Invoking" : "Run tool"}
          </button>
        </form>
      ) : null}

      {result ? (
        <div className="invoke-result" role="status">
          <h3>{result.status}</h3>
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
      ) : null}

      {error ? (
        <pre className="result error" role="alert">
          {JSON.stringify(error, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
