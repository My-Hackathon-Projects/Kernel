import Link from "next/link";
import { RunsTable, type RunRow } from "../../components/runs-table";
import { getRecentRuns } from "../../lib/run-service";

export const dynamic = "force-dynamic";

function companyNameFromInput(input: unknown): string {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return "Not recorded";
  }

  const value = (input as Record<string, unknown>).company_name;
  return typeof value === "string" ? value : "Not recorded";
}

export default async function RunsPage() {
  const runs = await getRecentRuns(100);

  const rows: RunRow[] = runs.map((run) => ({
    id: run.id,
    seq: run.seq,
    status: run.status,
    toolName: run.tool.name,
    companyName: companyNameFromInput(run.input),
    startedAt: run.startedAt ? run.startedAt.toISOString() : null,
    finishedAt: run.finishedAt ? run.finishedAt.toISOString() : null,
    createdAt: run.createdAt.toISOString()
  }));

  return (
    <main>
      <div className="shell">
        <section className="panel run-summary">
          <Link href="/app" className="back-link">
            Back to home
          </Link>
          <div>
            <p className="eyebrow">Audit</p>
            <h1>Runs</h1>
            <p className="muted">
              Every run is numbered. Sort or filter the table, open a run for full
              evidence, or delete a run to remove it from the record.
            </p>
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <h2>Recent runs</h2>
            <span>{rows.length}</span>
          </div>
          <RunsTable rows={rows} />
        </section>
      </div>
    </main>
  );
}
