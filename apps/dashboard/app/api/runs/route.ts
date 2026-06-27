import { getRecentRuns } from "../../../lib/run-service";
import { json } from "../../../lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return json({ runs: await getRecentRuns() });
}
