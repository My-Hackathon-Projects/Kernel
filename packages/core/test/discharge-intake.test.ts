import { describe, expect, it } from "vitest";
import { extractDischargeInput } from "../src/discharge-intake";

describe("extractDischargeInput", () => {
  it("extracts a ready discharge from loose notes", () => {
    const result = extractDischargeInput(
      [
        "Patient notes - discharges (need to enter later)",
        "Gloria Hampton (MRN...4012? yes 4012)",
        "dx = I10",
        "attending: Dr Helen Cho",
        "discharged on 20 June 2026",
        "risk = medium",
        "FU in about 4 weeks"
      ].join("\n")
    );

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }
    expect(result.data.ready).toBe(true);
    expect(result.data.input).toEqual({
      patient_id: "MRN-4012",
      diagnosis_code: "I10",
      attending_physician: "Dr. Helen Cho",
      discharge_date: "2026-06-20",
      readmission_risk: "medium"
    });
    expect(result.data.context.patient_name).toBe("Gloria Hampton");
  });

  it("extracts partial fields from a prose email", () => {
    const result = extractDischargeInput(
      [
        "Hi Dr. Cho,",
        "I was discharged on 20 June 2026 and should check back in about 4 weeks.",
        "The paperwork had some code on it, I think it was I10?",
        "My hospital paperwork says MRN-4012 somewhere near the top.",
        "Best,",
        "Gloria Hampton"
      ].join("\n")
    );

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }
    expect(result.data.ready).toBe(false);
    expect(result.data.input).toMatchObject({
      patient_id: "MRN-4012",
      diagnosis_code: "I10",
      attending_physician: "Dr. Cho",
      discharge_date: "2026-06-20"
    });
    expect(result.data.context.patient_name).toBe("Gloria Hampton");
    expect(result.data.missingFields).toContain("readmission_risk");
  });

  it("handles month-first discharge dates in patient emails", () => {
    const result = extractDischargeInput(
      [
        "Hi Dr. Cho,",
        "I was discharged on June 20, 2026, if I'm remembering correctly.",
        "You mentioned I should probably check back with you in about 4 weeks.",
        "The paperwork had some code on it, I think it was I10?",
        "My hospital paperwork says MRN-4012 somewhere near the top.",
        "I wasn't sure whether I was supposed to schedule the follow-up myself.",
        "Best,",
        "Gloria Hampton"
      ].join("\n")
    );

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }
    expect(result.data.input).toMatchObject({
      patient_id: "MRN-4012",
      diagnosis_code: "I10",
      attending_physician: "Dr. Cho",
      discharge_date: "2026-06-20"
    });
    expect(result.data.context.follow_up).toBe("about 4 weeks");
    expect(result.data.missingFields).toEqual(["readmission_risk"]);
  });
});
