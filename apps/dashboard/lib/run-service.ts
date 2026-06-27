import { getPrismaClient, getRunDetail, listRecentRuns } from "@agentport/db";

export async function getRun(runId: string) {
  return getRunDetail(getPrismaClient(), runId);
}

export async function getRecentRuns(limit = 20) {
  return listRecentRuns(getPrismaClient(), limit);
}
