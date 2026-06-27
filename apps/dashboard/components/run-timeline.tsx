import { type WorkflowDefinition } from "@agentport/core";

type RunStepSummary = {
  id: string;
  stepId: string;
  action: string;
  status: string;
  selector: string | null;
  resolvedTier: number | null;
  durationMs: number | null;
  screenshotId: string | null;
};

type ArtifactSummary = {
  id: string;
  stepId: string | null;
};

type RunTimelineProps = {
  runId: string;
  steps: RunStepSummary[];
  workflowSteps: WorkflowDefinition["steps"];
  artifacts: ArtifactSummary[];
};

function intentForStep(
  workflowSteps: WorkflowDefinition["steps"],
  stepId: string
): string {
  const workflowStep = workflowSteps.find((step) => step.id === stepId);
  return workflowStep && "target" in workflowStep
    ? workflowStep.target.intent
    : "No target";
}

function screenshotForStep(
  step: RunStepSummary,
  artifacts: ArtifactSummary[]
): ArtifactSummary | null {
  return (
    artifacts.find((artifact) => artifact.id === step.screenshotId) ??
    artifacts.find((artifact) => artifact.stepId === step.stepId) ??
    null
  );
}

export function RunTimeline({
  runId,
  steps,
  workflowSteps,
  artifacts
}: RunTimelineProps) {
  return (
    <ol className="step-list">
      {steps.map((step) => {
        const artifact = screenshotForStep(step, artifacts);

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
                <dt>Intent</dt>
                <dd>{intentForStep(workflowSteps, step.stepId)}</dd>
              </div>
              <div>
                <dt>Selector</dt>
                <dd>{step.selector ?? "None"}</dd>
              </div>
              <div>
                <dt>Tier</dt>
                <dd>{step.resolvedTier ?? "None"}</dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd>{step.durationMs ?? 0} ms</dd>
              </div>
            </dl>
            {artifact ? (
              <img
                className="step-screenshot"
                src={`/api/runs/${runId}/artifacts/${artifact.id}`}
                alt={`Screenshot for ${step.stepId}`}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
