import { apiError, createVendorInputSchema, formatZodError } from "@agentport/core";
import {
  createVendor,
  findVendorByCompanyName,
  listVendors
} from "../../../lib/vendor-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(body: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store");

  return Response.json(body, { ...init, headers });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const companyName = url.searchParams.get("company_name");

  if (companyName !== null) {
    if (companyName.trim().length === 0) {
      return json(
        apiError("validation_failed", "Request validation failed", [
          { path: "company_name", message: "Required" }
        ]),
        { status: 400 }
      );
    }

    const vendor = findVendorByCompanyName(companyName);
    if (!vendor) {
      return json(apiError("not_found", "Vendor not found"), { status: 404 });
    }

    return json(vendor);
  }

  return json({ vendors: listVendors() });
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return json(apiError("invalid_json", "Request body must be valid JSON"), {
      status: 400
    });
  }

  const parsed = createVendorInputSchema.safeParse(payload);
  if (!parsed.success) {
    return json(formatZodError(parsed.error), { status: 400 });
  }

  return json(createVendor(parsed.data), { status: 201 });
}
