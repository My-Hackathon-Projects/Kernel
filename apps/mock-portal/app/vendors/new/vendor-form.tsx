"use client";

import {
  vendorRecordSchema,
  vendorRiskLevels,
  type CreateVendorInput,
  type VendorRecord,
  type VendorRiskLevel
} from "@agentport/core";
import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useState
} from "react";

export type VendorFormVariant = "v1" | "v2";

type VendorField = keyof CreateVendorInput;

type VendorFormProps = {
  variant: VendorFormVariant;
};

const COUNTRY_OPTIONS = [
  "Germany",
  "United States",
  "France",
  "United Kingdom"
] as const;

const FIELD_ORDER: Record<VendorFormVariant, VendorField[]> = {
  v1: ["company_name", "country", "tax_id", "risk_level"],
  v2: ["tax_id", "company_name", "risk_level", "country"]
};

const INITIAL_FORM: CreateVendorInput = {
  company_name: "",
  country: COUNTRY_OPTIONS[0],
  tax_id: "",
  risk_level: "medium"
};

function readErrorMessage(body: unknown): string {
  if (typeof body !== "object" || body === null || !("error" in body)) {
    return "Vendor could not be created";
  }

  const error = (body as { error?: { message?: unknown } }).error;
  return typeof error?.message === "string"
    ? error.message
    : "Vendor could not be created";
}

function isVendorRiskLevel(value: string): value is VendorRiskLevel {
  return vendorRiskLevels.includes(value as VendorRiskLevel);
}

export function VendorForm({ variant }: VendorFormProps) {
  const [form, setForm] = useState<CreateVendorInput>(INITIAL_FORM);
  const [createdVendor, setCreatedVendor] = useState<VendorRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  function updateField<Field extends VendorField>(
    field: Field,
    value: CreateVendorInput[Field]
  ): void {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setCreatedVendor(null);
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const responseBody: unknown = await response.json();

      if (!response.ok) {
        setErrorMessage(readErrorMessage(responseBody));
        return;
      }

      const parsedVendor = vendorRecordSchema.safeParse(responseBody);
      if (!parsedVendor.success) {
        setErrorMessage("Vendor response was invalid");
        return;
      }

      setCreatedVendor(parsedVendor.data);
      setForm(INITIAL_FORM);
    } catch {
      setErrorMessage("Vendor could not be created");
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderField(field: VendorField): ReactNode {
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
                updateField("company_name", event.target.value)
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
                updateField("country", event.target.value)
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
                updateField("tax_id", event.target.value)
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
                  updateField("risk_level", event.target.value);
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

  return (
    <div className="vendor-workflow">
      <form className="vendor-form" onSubmit={handleSubmit}>
        {FIELD_ORDER[variant].map((field) => (
          <div key={field}>{renderField(field)}</div>
        ))}

        {errorMessage ? (
          <p role="alert" className="form-error">
            {errorMessage}
          </p>
        ) : null}

        <div className="form-actions">
          <button
            className="button primary"
            type="submit"
            disabled={!isHydrated || isSubmitting}
          >
            {isSubmitting
              ? "Creating..."
              : variant === "v2"
                ? "Send for Approval"
                : "Submit"}
          </button>
        </div>
      </form>

      {createdVendor ? (
        <section className="success-state" role="status" aria-live="polite">
          <h2>Vendor created</h2>
          <dl>
            <div>
              <dt>Company</dt>
              <dd>{createdVendor.company_name}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{createdVendor.status}</dd>
            </div>
          </dl>
        </section>
      ) : null}
    </div>
  );
}
