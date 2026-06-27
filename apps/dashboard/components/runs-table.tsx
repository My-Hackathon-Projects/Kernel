"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDate, formatDuration } from "../lib/format";

export type RunRow = {
  id: string;
  seq: number | null;
  status: string;
  toolName: string;
  companyName: string;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
};

type SortKey = "run" | "status" | "tool" | "company" | "started" | "duration";
type SortDir = "asc" | "desc";

function runNumber(row: RunRow): string {
  return row.seq !== null ? `#${row.seq}` : row.id.slice(0, 6);
}

function durationMs(row: RunRow): number | null {
  if (!row.startedAt || !row.finishedAt) {
    return null;
  }
  return new Date(row.finishedAt).getTime() - new Date(row.startedAt).getTime();
}

function compare(a: RunRow, b: RunRow, key: SortKey): number {
  switch (key) {
    case "run":
      return (a.seq ?? 0) - (b.seq ?? 0);
    case "status":
      return a.status.localeCompare(b.status);
    case "tool":
      return a.toolName.localeCompare(b.toolName);
    case "company":
      return a.companyName.localeCompare(b.companyName);
    case "started":
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    case "duration":
      return (durationMs(a) ?? -1) - (durationMs(b) ?? -1);
  }
}

const COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: "run", label: "Run" },
  { key: "status", label: "Status" },
  { key: "tool", label: "Tool" },
  { key: "company", label: "Company" },
  { key: "started", label: "Started" },
  { key: "duration", label: "Duration" }
];

export function RunsTable({ rows }: { rows: RunRow[] }) {
  const [runs, setRuns] = useState(rows);
  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("run");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const query = filter.trim().toLowerCase();
    const filtered = query
      ? runs.filter((row) =>
          [runNumber(row), row.status, row.toolName, row.companyName]
            .join(" ")
            .toLowerCase()
            .includes(query)
        )
      : runs;

    const sorted = [...filtered].sort((a, b) => compare(a, b, sortKey));
    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [runs, filter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(
        key === "run" || key === "started" || key === "duration" ? "desc" : "asc"
      );
    }
  }

  async function deleteRun(row: RunRow) {
    if (!window.confirm(`Delete run ${runNumber(row)}? This cannot be undone.`)) {
      return;
    }

    setDeletingId(row.id);
    setError(null);
    try {
      const response = await fetch(`/api/runs/${row.id}`, { method: "DELETE" });
      if (!response.ok) {
        setError(`Could not delete run ${runNumber(row)}`);
        return;
      }
      setRuns((current) => current.filter((candidate) => candidate.id !== row.id));
    } catch {
      setError(`Could not delete run ${runNumber(row)}`);
    } finally {
      setDeletingId(null);
    }
  }

  async function resetDemoData() {
    if (!window.confirm("Clear demo runs, pending approvals, and evidence?")) {
      return;
    }

    setResetting(true);
    setError(null);
    try {
      const response = await fetch("/api/runs", { method: "DELETE" });
      if (!response.ok) {
        setError("Could not reset demo data");
        return;
      }

      setRuns([]);
    } catch {
      setError("Could not reset demo data");
    } finally {
      setResetting(false);
    }
  }

  function arrow(key: SortKey): string {
    if (key !== sortKey) {
      return "";
    }
    return sortDir === "asc" ? "▲" : "▼";
  }

  return (
    <div>
      <div className="runs-toolbar">
        <div className="runs-filter">
          <input
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter by run number, status, tool, or company"
            aria-label="Filter runs"
          />
        </div>
        <span className="runs-count">
          {visible.length} of {runs.length}
        </span>
        <button
          type="button"
          className="reset-demo"
          disabled={resetting || runs.length === 0}
          onClick={() => void resetDemoData()}
        >
          {resetting ? "Resetting" : "Reset demo data"}
        </button>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {COLUMNS.map((column) => (
                <th key={column.key} scope="col">
                  <button
                    type="button"
                    className="sort-button"
                    onClick={() => toggleSort(column.key)}
                  >
                    {column.label} <span className="arrow">{arrow(column.key)}</span>
                  </button>
                </th>
              ))}
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id}>
                <td>
                  <Link href={`/runs/${row.id}`} className="run-number">
                    {runNumber(row)}
                  </Link>
                </td>
                <td>
                  <span className={`status-pill ${row.status}`}>
                    {row.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td>{row.toolName}</td>
                <td>{row.companyName}</td>
                <td>{formatDate(row.startedAt ?? row.createdAt)}</td>
                <td>{formatDuration(row.startedAt, row.finishedAt)}</td>
                <td>
                  <button
                    type="button"
                    className="row-delete"
                    onClick={() => deleteRun(row)}
                    disabled={deletingId === row.id}
                  >
                    {deletingId === row.id ? "Deleting" : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 1}>
                  <div className="empty-state">No runs match this filter.</div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
