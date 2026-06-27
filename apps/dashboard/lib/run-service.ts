import { unlink } from "node:fs/promises";
import {
  deleteAllRuns,
  deleteRun,
  getPrismaClient,
  getRunDetail,
  listRecentRuns
} from "@agentport/db";

export async function getRun(runId: string) {
  return getRunDetail(getPrismaClient(), runId);
}

export async function getRecentRuns(limit = 50) {
  return listRecentRuns(getPrismaClient(), limit);
}

/**
 * Deletes a run and removes its stored screenshot files. Returns false when the
 * run does not exist so the route can answer 404.
 */
export async function deleteRunById(runId: string): Promise<boolean> {
  const artifactUris = await deleteRun(getPrismaClient(), runId);
  if (artifactUris === null) {
    return false;
  }

  await Promise.all(artifactUris.map((uri) => unlink(uri).catch(() => undefined)));
  return true;
}

export async function resetRunData(): Promise<void> {
  const artifactUris = await deleteAllRuns(getPrismaClient());
  await Promise.all(artifactUris.map((uri) => unlink(uri).catch(() => undefined)));
}
