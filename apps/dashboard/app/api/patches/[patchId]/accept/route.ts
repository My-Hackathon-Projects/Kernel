import { apiError } from "@agentport/core";
import { acceptPatch } from "../../../../../lib/patch-service";
import { json } from "../../../../../lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ patchId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { patchId } = await context.params;
  const patch = await acceptPatch(patchId);

  if (!patch) {
    return json(apiError("not_found", "Selector patch not found"), {
      status: 404
    });
  }

  return json({ patch });
}
