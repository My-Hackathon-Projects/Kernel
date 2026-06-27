import { readFile } from "node:fs/promises";
import { apiError } from "@agentport/core";
import { json } from "../../../../../../lib/http";
import { getRun } from "../../../../../../lib/run-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ runId: string; artifactId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { runId, artifactId } = await context.params;
  const run = await getRun(runId);
  const artifact = run?.artifacts.find((candidate) => candidate.id === artifactId);

  if (!artifact) {
    return json(apiError("not_found", "Artifact not found"), { status: 404 });
  }

  try {
    const file = await readFile(artifact.uri);
    return new Response(file, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type":
          artifact.kind === "screenshot" ? "image/png" : "application/octet-stream"
      }
    });
  } catch {
    return json(apiError("not_found", "Artifact file not found"), { status: 404 });
  }
}
