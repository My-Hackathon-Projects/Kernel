import { getApprovals } from "../../../lib/approval-service";
import { json } from "../../../lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "pending";

  return json({ approvals: await getApprovals(status) });
}
