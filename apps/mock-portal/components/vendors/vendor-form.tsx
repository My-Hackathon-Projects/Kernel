"use client";

import { useCreateVendor } from "../../hooks/use-create-vendor";
import {
  FIELD_ORDER,
  SUBMIT_LABELS,
  type VendorFormVariant
} from "../../lib/vendor-form-config";
import { VendorCreatedSummary } from "./vendor-created-summary";
import { VendorFormField } from "./vendor-form-field";

type VendorFormProps = {
  variant: VendorFormVariant;
};

export function VendorForm({ variant }: VendorFormProps) {
  const {
    form,
    createdVendor,
    errorMessage,
    isReady,
    isSubmitting,
    updateField,
    handleSubmit
  } = useCreateVendor();

  return (
    <div className="vendor-workflow">
      <form className="vendor-form" onSubmit={handleSubmit}>
        {FIELD_ORDER[variant].map((field) => (
          <div key={field}>
            <VendorFormField field={field} form={form} onChange={updateField} />
          </div>
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
            disabled={!isReady || isSubmitting}
          >
            {isSubmitting ? "Creating..." : SUBMIT_LABELS[variant]}
          </button>
        </div>
      </form>

      {createdVendor ? <VendorCreatedSummary vendor={createdVendor} /> : null}
    </div>
  );
}
