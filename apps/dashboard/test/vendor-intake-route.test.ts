import { describe, expect, it } from "vitest";

const { POST } = await import("../app/api/intake/vendor/route");

function postIntake(body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/intake/vendor", {
      method: "POST",
      body: JSON.stringify(body)
    })
  );
}

describe("POST /api/intake/vendor", () => {
  it("extracts create_vendor input from source text", async () => {
    const response = await postIntake({
      sourceText: [
        "Company Name: Acme GmbH",
        "Country: Germany",
        "Tax ID: DE123456789",
        "Risk Level: medium"
      ].join("\n")
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.input).toEqual({
      company_name: "Acme GmbH",
      country: "Germany",
      tax_id: "DE123456789",
      risk_level: "medium"
    });
    expect(body.confidence).toBe(1);
  });

  it("returns a typed validation error when extraction is incomplete", async () => {
    const response = await postIntake({ sourceText: "Company Name: Acme GmbH" });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("validation_failed");
    expect(body.error.details).toEqual(
      expect.arrayContaining([{ path: "country", message: "Required" }])
    );
    expect(body.extracted).toEqual({ company_name: "Acme GmbH" });
  });
});
