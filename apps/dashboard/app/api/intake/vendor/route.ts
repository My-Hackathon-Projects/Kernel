import { extractCreateVendorInput, formatZodError } from "@agentport/core";
import { z } from "zod";
import { json, readJsonBody } from "../../../../lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const intakeRequestSchema = z
  .object({
    sourceText: z.string().trim().min(1, "Required").max(50_000)
  })
  .strict();

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body.success) {
    return json(body.error, { status: 400 });
  }

  const parsed = intakeRequestSchema.safeParse(body.data);
  if (!parsed.success) {
    return json(formatZodError(parsed.error), {
      status: 400
    });
  }

  const result = extractCreateVendorInput(parsed.data.sourceText);
  if (!result.success) {
    return json(
      {
        ...result.error,
        extracted: result.extracted
      },
      { status: 400 }
    );
  }

  return json(result.data);
}
