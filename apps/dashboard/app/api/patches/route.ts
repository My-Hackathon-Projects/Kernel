import { getSelectorPatches } from "../../../lib/patch-service";
import { json } from "../../../lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const acceptedParam = url.searchParams.get("accepted");
  const accepted =
    acceptedParam === null ? undefined : acceptedParam === "true" ? true : false;

  return json({ patches: await getSelectorPatches(accepted) });
}
