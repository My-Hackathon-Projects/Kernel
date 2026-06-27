import { createScreenshotArtifact, getPrismaClient } from "@agentport/db";
import { captureStepScreenshot } from "./artifact-writer";
import { type ExecutionState } from "./execution-state";
import { emitTrace } from "./trace-recorder";

export async function recordStepScreenshot(
  state: ExecutionState,
  stepId: string
): Promise<{ id: string; uri: string }> {
  const screenshot = await captureStepScreenshot(state.page, {
    artifactRoot: state.config.artifactRoot,
    runId: state.runId,
    stepId
  });
  const artifact = await createScreenshotArtifact(getPrismaClient(), {
    runId: state.runId,
    stepId,
    uri: screenshot.uri
  });

  state.artifacts.push({
    id: artifact.id,
    stepId,
    kind: "screenshot",
    uri: artifact.uri
  });
  await emitTrace(state.runId, {
    type: "screenshot",
    stepId,
    artifactId: artifact.id
  });

  return artifact;
}
