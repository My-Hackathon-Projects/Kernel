import {
  vendorCountries,
  vendorRiskLevels,
  type CreateVendorInput,
  type VendorCountry,
  type VendorRiskLevel
} from "@agentport/core";

export type VendorFormVariant = "v1" | "v2";
export type VendorField = keyof CreateVendorInput;

export const COUNTRY_OPTIONS = vendorCountries;

/**
 * Field order per form variant. v2 deliberately reorders the inputs to exercise
 * selector resilience without changing any accessible names.
 */
export const FIELD_ORDER: Record<VendorFormVariant, VendorField[]> = {
  v1: ["company_name", "country", "tax_id", "risk_level"],
  v2: ["tax_id", "company_name", "risk_level", "country"]
};

export const SUBMIT_LABELS: Record<VendorFormVariant, string> = {
  v1: "Submit",
  v2: "Send for Approval"
};

export const INITIAL_FORM: CreateVendorInput = {
  company_name: "",
  country: COUNTRY_OPTIONS[0],
  tax_id: "",
  risk_level: "medium"
};

export function parseVariant(value: string | string[] | undefined): VendorFormVariant {
  const variant = Array.isArray(value) ? value[0] : value;
  return variant === "v2" ? "v2" : "v1";
}

export function isVendorRiskLevel(value: string): value is VendorRiskLevel {
  return vendorRiskLevels.includes(value as VendorRiskLevel);
}

export function isVendorCountry(value: string): value is VendorCountry {
  return COUNTRY_OPTIONS.includes(value as VendorCountry);
}
