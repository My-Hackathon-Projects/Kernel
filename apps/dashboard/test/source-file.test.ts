import { describe, expect, it } from "vitest";
import { spreadsheetRowsToSourceText } from "../lib/source-file";

describe("spreadsheetRowsToSourceText", () => {
  it("converts spreadsheet rows into tab-delimited source text", () => {
    expect(
      spreadsheetRowsToSourceText([
        ["Company Name", "Acme GmbH"],
        ["Country", "Germany"],
        ["Tax ID", "DE123456789"],
        ["Risk Level", "medium"]
      ])
    ).toBe(
      [
        "Company Name\tAcme GmbH",
        "Country\tGermany",
        "Tax ID\tDE123456789",
        "Risk Level\tmedium"
      ].join("\n")
    );
  });

  it("drops empty rows and preserves table columns", () => {
    expect(
      spreadsheetRowsToSourceText([
        ["Company Name", "Country", "Tax ID", "Risk Level"],
        [null, undefined, "", ""],
        ["Acme GmbH", "Germany", "DE123456789", "medium"]
      ])
    ).toBe(
      [
        "Company Name\tCountry\tTax ID\tRisk Level",
        "Acme GmbH\tGermany\tDE123456789\tmedium"
      ].join("\n")
    );
  });
});
