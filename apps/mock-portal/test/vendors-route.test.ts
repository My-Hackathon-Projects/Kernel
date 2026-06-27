import { type ApiErrorBody, type VendorRecord } from "@agentport/core";
import { beforeEach, describe, expect, it } from "vitest";
import { GET, POST } from "../app/api/vendors/route";
import { resetVendorStoreForTest } from "../lib/vendor-store";

const validVendorInput = {
  company_name: " Acme GmbH ",
  country: " Germany ",
  tax_id: " DE123456789 ",
  risk_level: "high"
};

function postVendor(body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
  );
}

function getVendors(url = "http://localhost/api/vendors"): Promise<Response> {
  return GET(new Request(url));
}

describe("GET and POST /api/vendors", () => {
  beforeEach(() => {
    resetVendorStoreForTest();
  });

  it("creates a pending vendor and returns it through the read API", async () => {
    const createResponse = await postVendor(validVendorInput);
    const createdVendor = (await createResponse.json()) as VendorRecord;

    expect(createResponse.status).toBe(201);
    expect(createdVendor).toMatchObject({
      company_name: "Acme GmbH",
      country: "Germany",
      tax_id: "DE123456789",
      risk_level: "high",
      status: "Pending Approval"
    });
    expect(createdVendor.id).toEqual(expect.any(String));
    expect(createdVendor.createdAt).toEqual(expect.any(String));

    const lookupResponse = await getVendors(
      "http://localhost/api/vendors?company_name=Acme"
    );
    const foundVendor = (await lookupResponse.json()) as VendorRecord;

    expect(lookupResponse.status).toBe(200);
    expect(foundVendor).toEqual(createdVendor);
  });

  it("lists created vendors", async () => {
    await postVendor(validVendorInput);

    const response = await getVendors();
    const body = (await response.json()) as { vendors: VendorRecord[] };

    expect(response.status).toBe(200);
    expect(body.vendors).toHaveLength(1);
    expect(body.vendors[0]?.company_name).toBe("Acme GmbH");
  });

  it("returns a typed validation error for invalid vendor input", async () => {
    const response = await postVendor({
      company_name: "",
      country: "Germany",
      tax_id: "DE123456789",
      risk_level: "urgent",
      auto_approve: true
    });
    const body = (await response.json()) as ApiErrorBody;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("validation_failed");
    expect(body.error.details).toEqual(
      expect.arrayContaining([
        { path: "company_name", message: "Required" },
        { path: "auto_approve", message: "Unrecognized input" }
      ])
    );
    expect(body.error.details?.some((detail) => detail.path === "risk_level")).toBe(
      true
    );
  });

  it("returns a typed error for malformed JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/vendors", {
        method: "POST",
        body: "{not-json"
      })
    );

    await expect(response.json()).resolves.toEqual({
      error: {
        code: "invalid_json",
        message: "Request body must be valid JSON"
      }
    });
    expect(response.status).toBe(400);
  });

  it("returns a typed error when a vendor is not found", async () => {
    const response = await getVendors(
      "http://localhost/api/vendors?company_name=Missing"
    );
    const body = (await response.json()) as ApiErrorBody;

    expect(response.status).toBe(404);
    expect(body).toEqual({
      error: {
        code: "not_found",
        message: "Vendor not found"
      }
    });
  });
});
