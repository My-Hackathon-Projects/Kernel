import Link from "next/link";
import { formatDate, formatDuration } from "../../lib/format";
import { getRecentRuns } from "../../lib/run-service";

function companyNameFromInput(input: unknown): string {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return "Not recorded";
  }

  const value = (input as Record<string, unknown>).company_name;
  return typeof value === "string" ? value : "Not recorded";
}

export default async function RunsPage() {
  const runs = await getRecentRuns();

  return (
    <main>
      <div className="shell">
        <section className="panel run-summary">
          <Link href="/" className="back-link">
            Back to Dashboard
          </Link>
          <div>
            <p className="eyebrow">Audit</p>
            <h1>Runs</h1>
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <h2>Recent Runs</h2>
            <span>{runs.length}</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Run</th>
                  <th scope="col">Status</th>
                  <th scope="col">Tool</th>
                  <th scope="col">Company</th>
                  <th scope="col">Started</th>
                  <th scope="col">Finished</th>
                  <th scope="col">Duration</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td>
                      <Link href={`/runs/${run.id}`}>{run.id}</Link>
                    </td>
                    <td>{run.status}</td>
                    <td>{run.tool.name}</td>
                    <td>{companyNameFromInput(run.input)}</td>
                    <td>{formatDate(run.startedAt)}</td>
                    <td>{formatDate(run.finishedAt)}</td>
                    <td>{formatDuration(run.startedAt, run.finishedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
