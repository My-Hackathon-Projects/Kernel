"use client";

import { useRef, useState } from "react";
import { readSheet } from "read-excel-file/browser";
import { isPdfFile, isXlsxFile, spreadsheetRowsToSourceText } from "../lib/source-file";

type VendorInput = {
  company_name: string;
  country: string;
  tax_id: string;
  risk_level: string;
};

type IntakeSuccess = {
  input: VendorInput;
  sourceType: string;
  matchedFields: string[];
  confidence: number;
  warnings: string[];
};

type IntakeError = {
  error: {
    code: string;
    message: string;
    details?: Array<{ path: string; message: string }>;
  };
  extracted?: Partial<VendorInput>;
};

type VendorIntakeProps = {
  onExtractedInput: (input: VendorInput) => void;
};

const SAMPLE_SOURCE = [
  "Company Name: Acme GmbH",
  "Country: Germany",
  "Tax ID: DE123456789",
  "Risk Level: medium"
].join("\n");

function labelForField(field: keyof VendorInput): string {
  return field
    .split("_")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

async function readPdfText(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch("/api/intake/pdf", { method: "POST", body: form });
  const payload = (await response.json()) as { text?: string; error?: { message: string } };

  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message ?? "Could not read the PDF.");
  }

  return payload.text ?? "";
}

async function readFileText(file: File): Promise<string> {
  if (isPdfFile(file)) {
    return readPdfText(file);
  }

  if (isXlsxFile(file)) {
    return spreadsheetRowsToSourceText(await readSheet(file));
  }

  return file.text();
}

export function VendorIntake({ onExtractedInput }: VendorIntakeProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [sourceText, setSourceText] = useState("");
  const [result, setResult] = useState<IntakeSuccess | null>(null);
  const [error, setError] = useState<IntakeError | null>(null);
  const [busy, setBusy] = useState(false);

  async function extract() {
    setBusy(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch("/api/intake/vendor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceText })
      });
      const payload = (await response.json()) as IntakeSuccess | IntakeError;

      if (!response.ok || "error" in payload) {
        setError(payload as IntakeError);
        return;
      }

      setResult(payload);
      onExtractedInput(payload.input);
    } catch {
      setError({
        error: {
          code: "request_failed",
          message: "Could not extract vendor fields"
        }
      });
    } finally {
      setBusy(false);
    }
  }

  async function loadFile(file: File | undefined) {
    if (!file) {
      return;
    }

    setResult(null);
    setError(null);

    try {
      setSourceText(await readFileText(file));
    } catch (caught) {
      setError({
        error: {
          code: "file_read_failed",
          message:
            caught instanceof Error
              ? caught.message
              : "Could not read the selected file. Use .pdf, .xlsx, .csv, .json, .txt, or .tsv."
        }
      });
    }
  }

  return (
    <div className="vendor-intake">
      <div className="section-heading">
        <h2>Source intake</h2>
        <span>vendor data</span>
      </div>

      <div className="intake-actions">
        <button
          type="button"
          className="secondary"
          onClick={() => fileInputRef.current?.click()}
        >
          Upload source
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => setSourceText(SAMPLE_SOURCE)}
        >
          Use sample
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.xlsx,.csv,.json,.txt,.tsv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/json,text/plain"
          className="sr-only"
          onChange={(event) => void loadFile(event.target.files?.[0])}
        />
      </div>

      <label className="source-text">
        <span>Vendor source</span>
        <textarea
          value={sourceText}
          onChange={(event) => setSourceText(event.target.value)}
          placeholder={SAMPLE_SOURCE}
        />
      </label>

      <button type="button" onClick={() => void extract()} disabled={busy}>
        {busy ? "Extracting" : "Extract fields"}
      </button>

      {result ? (
        <div className="intake-result" aria-live="polite">
          <div className="section-heading">
            <h3>Fields ready</h3>
            <span>{Math.round(result.confidence * 100)}%</span>
          </div>
          <dl className="intake-preview">
            {(Object.keys(result.input) as Array<keyof VendorInput>).map((field) => (
              <div key={field}>
                <dt>{labelForField(field)}</dt>
                <dd>{result.input[field]}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {error ? (
        <div className="result error" role="alert">
          <p>{error.error.message}</p>
          {error.error.details ? (
            <ul>
              {error.error.details.map((detail) => (
                <li key={`${detail.path}:${detail.message}`}>
                  {detail.path}: {detail.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
