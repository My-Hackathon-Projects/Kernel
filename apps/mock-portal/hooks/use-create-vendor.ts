"use client";

import {
  getApiErrorMessage,
  vendorRecordSchema,
  type CreateVendorInput,
  type VendorRecord
} from "@agentport/core";
import { type FormEvent, useEffect, useState } from "react";
import { INITIAL_FORM, type VendorField } from "../lib/vendor-form-config";

const CREATE_FAILED_MESSAGE = "Vendor could not be created";

export type UseCreateVendor = {
  form: CreateVendorInput;
  createdVendor: VendorRecord | null;
  errorMessage: string | null;
  /** True once the client has hydrated; used to gate submit until JS is ready. */
  isReady: boolean;
  isSubmitting: boolean;
  updateField: <Field extends VendorField>(
    field: Field,
    value: CreateVendorInput[Field]
  ) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

/**
 * Owns the create-vendor form state and submission flow: posts to the validated
 * API, parses the typed response, and surfaces a readable error on failure.
 */
export function useCreateVendor(): UseCreateVendor {
  const [form, setForm] = useState<CreateVendorInput>(INITIAL_FORM);
  const [createdVendor, setCreatedVendor] = useState<VendorRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsReady(true);
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
        setErrorMessage(getApiErrorMessage(responseBody, CREATE_FAILED_MESSAGE));
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
      setErrorMessage(CREATE_FAILED_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    form,
    createdVendor,
    errorMessage,
    isReady,
    isSubmitting,
    updateField,
    handleSubmit
  };
}
