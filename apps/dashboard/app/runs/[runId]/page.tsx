import { traceEventSchema } from "@agentport/core";
import { parseStoredWorkflow } from "@agentport/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RunTimeline } from "../../../components/run-timeline";
import { RunTracePanel } from "../../../components/run-trace-panel";
import { formatDate, formatDuration } from "../../../lib/format";
import { getRun } from "../../../lib/run-service";

type RunPageProps = {
  params: Promise<{ runId: string }>;
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function parseTraceEvents(events: Array<{ data: unknown }>) {
  return events.flatMap((event) => {
    const parsed = traceEventSchema.safeParse(event.data);
    return parsed.success ? [parsed.data] : [];
  });
}

function ApprovalRecord({
  approval
}: {
  approval: {
    id: string;
    status: string;
    prompt: string;
    stepId: string;
    payload: unknown;
    decidedBy: string | null;
    decidedAt: Date | string | null;
  };
}) {
  const payload = asRecord(approval.payload);

  return (
    <article className="approval-card">
      <div>
        <h3>{approval.status}</h3>
        <p>{approval.prompt}</p>
      </div>
      <dl className="approval-meta">
        <div>
          <dt>Step</dt>
          <dd>{approval.stepId}</dd>
        </div>
        <div>
          <dt>Element</dt>
          <dd>{String(payload.resolvedElement ?? "Unknown")}</dd>
        </div>
        <div>
          <dt>Decided by</dt>
          <dd>{approval.decidedBy ?? "Not decided"}</dd>
        </div>
        <div>
          <dt>Decided</dt>
          <dd>{formatDate(approval.decidedAt)}</dd>
        </div>
      </dl>
      <pre className="result">{JSON.stringify(approval.payload, null, 2)}</pre>
    </article>
  );
}

export default async function RunPage({ params }: RunPageProps) {
  const { runId } = await params;
  const run = await getRun(runId);

  if (!run) {
    notFound();
  }
  const workflow = parseStoredWorkflow(run.tool.workflow.definition);
  const traceEvents = parseTraceEvents(run.auditEvents);

  return (
    <main>
      <div className="shell">
        <section className="panel run-summary">
          <Link href="/runs" className="back-link">
            Back to runs
          </Link>
          <div>
            <p className="eyebrow">Run</p>
            <h1>{run.seq !== null ? `#${run.seq}` : run.id}</h1>
          </div>
          <dl className="run-meta">
            <div>
              <dt>Status</dt>
              <dd>
                <span className={`status-pill ${run.status}`}>
                  {run.status.replace(/_/g, " ")}
                </span>
              </dd>
            </div>
            <div>
              <dt>Run ID</dt>
              <dd className="mono">{run.id}</dd>
            </div>
            <div>
              <dt>Tool</dt>
              <dd>{run.tool.name}</dd>
            </div>
            <div>
              <dt>Workflow</dt>
              <dd>
                v{run.workflowVersion} - {run.tool.workflow.contentHash.slice(0, 12)}
              </dd>
            </div>
            <div>
              <dt>Caller</dt>
              <dd>{run.callerId ?? "Not recorded"}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{formatDate(run.createdAt)}</dd>
            </div>
            <div>
              <dt>Finished</dt>
              <dd>{formatDate(run.finishedAt)}</dd>
            </div>
            <div>
              <dt>Duration</dt>
              <dd>{formatDuration(run.startedAt, run.finishedAt)}</dd>
            </div>
          </dl>
          <pre className="result">{JSON.stringify(run.input, null, 2)}</pre>
        </section>

        {run.error ? (
          <section className="panel validation-panel">
            <div className="section-heading">
              <h2>Failure</h2>
              <span>{run.status}</span>
            </div>
            <p className="form-error">{run.error}</p>
          </section>
        ) : null}

        {run.validations.map((validation) => (
          <section key={validation.id} className="panel validation-panel">
            <div className="section-heading">
              <h2>Validation</h2>
              <span>{validation.passed ? "passed" : "failed"}</span>
            </div>
            {validation.reason ? <p className="muted">{validation.reason}</p> : null}
            <pre className="result">
              {JSON.stringify(
                {
                  expected: validation.expected,
                  actual: validation.actual
                },
                null,
                2
              )}
            </pre>
          </section>
        ))}

        {run.approvals.length > 0 ? (
          <section className="panel validation-panel">
            <div className="section-heading">
              <h2>Approvals</h2>
              <span>{run.approvals.length}</span>
            </div>
            {run.approvals.map((approval) => (
              <ApprovalRecord approval={approval} key={approval.id} />
            ))}
          </section>
        ) : null}

        {run.selectorPatches.length > 0 ? (
          <section className="panel validation-panel">
            <div className="section-heading">
              <h2>Selector Patches</h2>
              <span>{run.selectorPatches.length}</span>
            </div>
            {run.selectorPatches.map((patch) => (
              <article className="approval-card" key={patch.id}>
                <div>
                  <h3>{patch.accepted ? "accepted" : "pending"}</h3>
                  <p>
                    {patch.stepId} - tier {patch.tier} -{" "}
                    {Math.round(patch.confidence * 100)}%
                  </p>
                </div>
                <dl className="approval-meta">
                  <div>
                    <dt>Old selector</dt>
                    <dd>{patch.oldSelector ?? "None"}</dd>
                  </div>
                  <div>
                    <dt>New selector</dt>
                    <dd>{patch.newSelector}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </section>
        ) : null}

        <section className="panel">
          <div className="section-heading">
            <h2>Steps</h2>
            <span>{run.steps.length}</span>
          </div>
          <RunTimeline
            runId={run.id}
            steps={run.steps}
            workflowSteps={workflow.steps}
            artifacts={run.artifacts}
          />
        </section>

        <RunTracePanel runId={run.id} status={run.status} initialEvents={traceEvents} />
      </div>
    </main>
  );
}
