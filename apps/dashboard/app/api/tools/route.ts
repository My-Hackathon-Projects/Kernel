import { listTools } from "../../../lib/tool-service";
import { json } from "../../../lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return json({ tools: await listTools() });
}
