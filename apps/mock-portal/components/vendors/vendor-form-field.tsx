import { type CreateVendorInput } from "@agentport/core";
import { type ChangeEvent, type ReactNode } from "react";
import {
  COUNTRY_OPTIONS,
  isVendorRiskLevel,
  type VendorField
} from "../../lib/vendor-form-config";

type VendorFormFieldProps = {
  field: VendorField;
  form: CreateVendorInput;
  onChange: <Field extends VendorField>(
    field: Field,
    value: CreateVendorInput[Field]
  ) => void;
};

/**
 * Renders a single labelled control for the vendor form. Accessible names are
 * fixed per field so form variants can reorder fields without breaking selectors.
 */
export function VendorFormField({
  field,
  form,
  onChange
}: VendorFormFieldProps): ReactNode {
  switch (field) {
    case "company_name":
      return (
        <label className="field" htmlFor="company_name">
          <span>Company name</span>
          <input
            id="company_name"
            name="company_name"
            type="text"
            autoComplete="organization"
            required
            value={form.company_name}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onChange("company_name", event.target.value)
            }
          />
        </label>
      );
    case "country":
      return (
        <label className="field" htmlFor="country">
          <span>Country</span>
          <select
            id="country"
            name="country"
            required
            value={form.country}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              onChange("country", event.target.value)
            }
          >
            {COUNTRY_OPTIONS.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </label>
      );
    case "tax_id":
      return (
        <label className="field" htmlFor="tax_id">
          <span>Tax ID</span>
          <input
            id="tax_id"
            name="tax_id"
            type="text"
            autoComplete="off"
            required
            value={form.tax_id}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onChange("tax_id", event.target.value)
            }
          />
        </label>
      );
    case "risk_level":
      return (
        <label className="field" htmlFor="risk_level">
          <span>Risk level</span>
          <select
            id="risk_level"
            name="risk_level"
            required
            value={form.risk_level}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => {
              if (isVendorRiskLevel(event.target.value)) {
                onChange("risk_level", event.target.value);
              }
            }}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
      );
  }
}
