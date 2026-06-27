import { notFound } from "next/navigation";
import { getRun } from "../../../lib/tool-service";

type RunPageProps = {
  params: Promise<{ runId: string }>;
};

function formatDate(value: Date | string | null): string {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "medium"
  }).format(new Date(value));
}

export default async function RunPage({ params }: RunPageProps) {
  const { runId } = await params;
  const run = await getRun(runId);

  if (!run) {
    notFound();
  }

  const artifactsByStep = new Map(
    run.artifacts
      .filter((artifact) => artifact.stepId !== null)
      .map((artifact) => [artifact.stepId, artifact])
  );

  return (
    <main>
      <div className="shell">
        <section className="panel run-summary">
          <a href="/" className="back-link">
            Back to Dashboard
          </a>
          <div>
            <p className="eyebrow">Run</p>
            <h1>{run.id}</h1>
          </div>
          <dl className="run-meta">
            <div>
              <dt>Status</dt>
              <dd>{run.status}</dd>
            </div>
            <div>
              <dt>Tool</dt>
              <dd>{run.tool.name}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{formatDate(run.createdAt)}</dd>
            </div>
            <div>
              <dt>Finished</dt>
              <dd>{formatDate(run.finishedAt)}</dd>
            </div>
          </dl>
          <pre className="result">{JSON.stringify(run.input, null, 2)}</pre>
        </section>

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
              <article className="approval-card" key={approval.id}>
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
                    <dt>Decided by</dt>
                    <dd>{approval.decidedBy ?? "Not decided"}</dd>
                  </div>
                  <div>
                    <dt>Decided</dt>
                    <dd>{formatDate(approval.decidedAt)}</dd>
                  </div>
                </dl>
                <pre className="result">
                  {JSON.stringify(approval.payload, null, 2)}
                </pre>
              </article>
            ))}
          </section>
        ) : null}

        <section className="panel">
          <div className="section-heading">
            <h2>Steps</h2>
            <span>{run.steps.length}</span>
          </div>
          <ol className="step-list">
            {run.steps.map((step) => {
              const artifact = artifactsByStep.get(step.stepId);

              return (
                <li key={step.id}>
                  <div className="step-row">
                    <div>
                      <h3>{step.action}</h3>
                      <p>{step.stepId}</p>
                    </div>
                    <span>{step.status}</span>
                  </div>
                  <dl className="step-meta">
                    <div>
                      <dt>Selector</dt>
                      <dd>{step.selector ?? "None"}</dd>
                    </div>
                    <div>
                      <dt>Duration</dt>
                      <dd>{step.durationMs ?? 0} ms</dd>
                    </div>
                  </dl>
                  {artifact ? (
                    <img
                      className="step-screenshot"
                      src={`/api/runs/${run.id}/artifacts/${artifact.id}`}
                      alt={`Screenshot for ${step.stepId}`}
                    />
                  ) : null}
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </main>
  );
}
