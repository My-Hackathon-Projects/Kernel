import { createVendorInputSchema, formatZodError } from "@agentport/core";
import { describe, expect, it } from "vitest";

describe("createVendorInputSchema", () => {
  it("trims and accepts a valid vendor create payload", () => {
    const result = createVendorInputSchema.safeParse({
      company_name: " Acme GmbH ",
      country: " Germany ",
      tax_id: " DE123456789 ",
      risk_level: "medium"
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        company_name: "Acme GmbH",
        country: "Germany",
        tax_id: "DE123456789",
        risk_level: "medium"
      });
    }
  });

  it("rejects invalid risk levels and unexpected fields", () => {
    const result = createVendorInputSchema.safeParse({
      company_name: "Acme GmbH",
      country: "Germany",
      tax_id: "DE123456789",
      risk_level: "urgent",
      auto_approve: true
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(formatZodError(result.error).error.details).toEqual(
        expect.arrayContaining([
          {
            path: "risk_level",
            message: expect.stringContaining("Invalid option")
          },
          {
            path: "auto_approve",
            message: "Unrecognized input"
          }
        ])
      );
    }
  });
});
