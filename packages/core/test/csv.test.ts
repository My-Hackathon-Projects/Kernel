import { parseDelimitedRows } from "@agentport/core";
import { describe, expect, it } from "vitest";

describe("parseDelimitedRows", () => {
  it("parses a header and one record per data row, keyed by column", () => {
    const doc = parseDelimitedRows(
      [
        "Patient ID,Diagnosis Code,Discharge Date,Clinical Notes",
        "MRN-4471,J18.9,2026-06-27,Stable on discharge",
        "MRN-5582,I50.9,2026-06-28,Follow-up in 2 weeks"
      ].join("\n")
    );

    expect(doc.headers).toEqual([
      "Patient ID",
      "Diagnosis Code",
      "Discharge Date",
      "Clinical Notes"
    ]);
    expect(doc.rows).toHaveLength(2);
    expect(doc.rows[0]).toEqual({
      "Patient ID": "MRN-4471",
      "Diagnosis Code": "J18.9",
      "Discharge Date": "2026-06-27",
      "Clinical Notes": "Stable on discharge"
    });
  });

  it("keeps quoted values that contain the delimiter intact", () => {
    const doc = parseDelimitedRows(
      ["Name,Note", '"Doe, John","Admitted, then discharged"'].join("\n")
    );

    expect(doc.rows[0]).toEqual({
      Name: "Doe, John",
      Note: "Admitted, then discharged"
    });
  });

  it("supports tab-separated documents", () => {
    const doc = parseDelimitedRows(["A\tB", "1\t2"].join("\n"));
    expect(doc.headers).toEqual(["A", "B"]);
    expect(doc.rows[0]).toEqual({ A: "1", B: "2" });
  });

  it("returns an empty document when there is no data row", () => {
    expect(parseDelimitedRows("Patient ID,Diagnosis Code")).toEqual({
      headers: [],
      rows: []
    });
    expect(parseDelimitedRows("")).toEqual({ headers: [], rows: [] });
  });
});
