import {
  extractCreateVendorInput,
  extractDischargeInput,
  formatZodError,
  validationError
} from "@agentport/core";
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

  const sourceText = parsed.data.sourceText;
  const vendor = extractCreateVendorInput(sourceText);
  if (vendor.success) {
    return json({
      workflow: "create_vendor",
      label: "Vendor workflow",
      destination: "/console",
      input: vendor.data.input,
      context: {},
      sourceType: vendor.data.sourceType,
      matchedFields: vendor.data.matchedFields,
      missingFields: [],
      confidence: vendor.data.confidence,
      warnings: vendor.data.warnings,
      ready: true
    });
  }

  const discharge = extractDischargeInput(sourceText);
  if (discharge.success) {
    return json({
      workflow: "file_discharge",
      label: "Patient discharge",
      destination: "/demo",
      ...discharge.data
    });
  }

  return json(
    validationError([
      {
        path: "sourceText",
        message: "No recognizable vendor or discharge fields found"
      }
    ]),
    { status: 400 }
  );
}
