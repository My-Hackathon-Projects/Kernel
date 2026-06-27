import { mkdir } from "node:fs/promises";
import path from "node:path";
import { type Page } from "playwright";

export type ScreenshotArtifact = {
  stepId: string;
  uri: string;
};

function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export async function captureStepScreenshot(
  page: Page,
  params: {
    artifactRoot: string;
    runId: string;
    stepId: string;
  }
): Promise<ScreenshotArtifact> {
  const runDir = path.resolve(
    params.artifactRoot,
    "runs",
    sanitizePathSegment(params.runId)
  );
  await mkdir(runDir, { recursive: true });

  const filePath = path.join(runDir, `${sanitizePathSegment(params.stepId)}.png`);
  await page.screenshot({ path: filePath, fullPage: true });

  return {
    stepId: params.stepId,
    uri: filePath
  };
}
