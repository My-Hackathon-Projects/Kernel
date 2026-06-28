import { extractCreateVendorInput } from "@agentport/core";
import { describe, expect, it } from "vitest";

describe("extractCreateVendorInput", () => {
  it("extracts create_vendor input from key-value document text", () => {
    const result = extractCreateVendorInput(`
      Vendor onboarding request
      Company Name: Acme GmbH
      Country: DE
      Tax ID: DE123456789
      Risk: Medium
    `);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.input).toEqual({
        company_name: "Acme GmbH",
        country: "Germany",
        tax_id: "DE123456789",
        risk_level: "medium"
      });
      expect(result.data.sourceType).toBe("key_value");
      expect(result.data.confidence).toBe(1);
    }
  });

  it("extracts create_vendor input from CSV text", () => {
    const result = extractCreateVendorInput(
      [
        "Supplier,Country,VAT Number,Risk Level",
        '"Northwind GmbH","Germany","DE987654321","high"'
      ].join("\n")
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.input).toEqual({
        company_name: "Northwind GmbH",
        country: "Germany",
        tax_id: "DE987654321",
        risk_level: "high"
      });
      expect(result.data.sourceType).toBe("table");
    }
  });

  it("extracts create_vendor input from two-column spreadsheet text", () => {
    const result = extractCreateVendorInput(
      [
        "Company Name\tAcme GmbH",
        "Country\tDE",
        "Tax ID\tDE123456789",
        "Risk Level\tMedium"
      ].join("\n")
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.input).toEqual({
        company_name: "Acme GmbH",
        country: "Germany",
        tax_id: "DE123456789",
        risk_level: "medium"
      });
      expect(result.data.sourceType).toBe("table");
    }
  });

  it("returns field-level errors when required fields are missing", () => {
    const result = extractCreateVendorInput("Company Name: Missing Tax GmbH");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.error.code).toBe("validation_failed");
      expect(result.error.error.details).toEqual(
        expect.arrayContaining([
          { path: "country", message: "Required" },
          { path: "tax_id", message: "Required" },
          { path: "risk_level", message: "Required" }
        ])
      );
      expect(result.extracted).toEqual({ company_name: "Missing Tax GmbH" });
    }
  });
});

