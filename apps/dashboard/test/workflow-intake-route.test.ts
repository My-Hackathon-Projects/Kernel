import { describe, expect, it } from "vitest";

const { POST } = await import("../app/api/intake/workflow/route");

function postIntake(body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/intake/workflow", {
      method: "POST",
      body: JSON.stringify(body)
    })
  );
}

describe("POST /api/intake/workflow", () => {
  it("keeps vendor text on the live create_vendor path", async () => {
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
    expect(body.workflow).toBe("create_vendor");
    expect(body.destination).toBe("/console");
    expect(body.input.company_name).toBe("Acme GmbH");
  });

  it("routes patient discharge text to the guided demo path", async () => {
    const response = await postIntake({
      sourceText: [
        "Gloria Hampton (MRN...4012? yes 4012)",
        "dx = I10",
        "attending: Dr Helen Cho",
        "discharged on 20 June 2026",
        "risk = medium"
      ].join("\n")
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.workflow).toBe("file_discharge");
    expect(body.destination).toBe("/demo");
    expect(body.ready).toBe(true);
    expect(body.input).toMatchObject({
      patient_id: "MRN-4012",
      diagnosis_code: "I10",
      attending_physician: "Dr. Helen Cho",
      discharge_date: "2026-06-20",
      readmission_risk: "medium"
    });
  });
});
