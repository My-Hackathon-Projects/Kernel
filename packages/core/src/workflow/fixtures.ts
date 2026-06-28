import { type WorkflowDefinition } from "./schema";
import { vendorCountries } from "../vendor";

/**
 * The reference create_vendor workflow contract. Used by the dashboard studio
 * sample, the runner execute tests, and as the canonical example of the semantic
 * workflow shape.
 */
export function createVendorWorkflowFixture(): WorkflowDefinition {
  return {
    name: "create_vendor",
    version: 1,
    target: "procurement-portal",
    startUrl: "/vendors",
    inputs: {
      company_name: { type: "string", required: true },
      country: {
        type: "enum",
        values: [...vendorCountries],
        required: true
      },
      tax_id: { type: "string", required: true },
      risk_level: {
        type: "enum",
        values: ["low", "medium", "high"],
        required: true
      }
    },
    steps: [
      {
        id: "s1",
        action: "goto",
        url: "/vendors"
      },
      {
        id: "s2",
        action: "click",
        target: {
          role: "link",
          intent: "open_create_form",
          nameHints: ["Create Vendor"]
        }
      },
      {
        id: "s3",
        action: "fill",
        field: "company_name",
        target: {
          role: "textbox",
          intent: "field.company_name",
          nameHints: ["Company name"]
        }
      },
      {
        id: "s4",
        action: "fill",
        field: "tax_id",
        target: {
          role: "textbox",
          intent: "field.tax_id",
          nameHints: ["Tax ID"]
        }
      },
      {
        id: "s5",
        action: "select",
        field: "country",
        target: {
          role: "combobox",
          intent: "field.country",
          nameHints: ["Country"]
        }
      },
      {
        id: "s6",
        action: "select",
        field: "risk_level",
        target: {
          role: "combobox",
          intent: "field.risk_level",
          nameHints: ["Risk level"]
        }
      },
      {
        id: "s7",
        action: "click",
        risk: "write",
        target: {
          role: "button",
          intent: "submit_vendor",
          nameHints: ["Submit", "Send for Approval"],
          cachedSelector: 'role=button[name="Submit"]',
          cacheConfidence: 0.95
        }
      },
      {
        id: "s8",
        action: "waitFor",
        target: {
          role: "heading",
          intent: "success.vendor_created",
          nameHints: ["Vendor created"]
        }
      }
    ],
    validation: {
      type: "record_exists_api",
      endpoint: "/api/vendors",
      queryField: "company_name",
      expect: { status: "Pending Approval" }
    }
  };
}

/**
 * Healthcare reference workflow: filing a patient discharge into a hospital
 * portal. Same semantic-target shape as create_vendor, different domain. Used
 * by the guided demo to show the loop is portal-agnostic. The risk-like input
 * (`readmission_risk`) is what a prompt-injection attack would try to tamper
 * with, which makes the approval-gate beat concrete.
 */
export function createDischargeWorkflowFixture(): WorkflowDefinition {
  return {
    name: "file_discharge",
    version: 1,
    target: "hospital-portal",
    startUrl: "/discharges",
    inputs: {
      patient_id: { type: "string", required: true },
      diagnosis_code: { type: "string", required: true },
      attending_physician: { type: "string", required: true },
      discharge_date: { type: "string", required: true },
      readmission_risk: {
        type: "enum",
        values: ["low", "medium", "high"],
        required: true
      }
    },
    steps: [
      {
        id: "s1",
        action: "goto",
        url: "/discharges"
      },
      {
        id: "s2",
        action: "click",
        target: {
          role: "link",
          intent: "open_discharge_form",
          nameHints: ["New Discharge"]
        }
      },
      {
        id: "s3",
        action: "fill",
        field: "patient_id",
        target: {
          role: "textbox",
          intent: "field.patient_id",
          nameHints: ["Patient ID", "MRN"]
        }
      },
      {
        id: "s4",
        action: "fill",
        field: "diagnosis_code",
        target: {
          role: "textbox",
          intent: "field.diagnosis_code",
          nameHints: ["Diagnosis Code"]
        }
      },
      {
        id: "s5",
        action: "fill",
        field: "attending_physician",
        target: {
          role: "textbox",
          intent: "field.attending_physician",
          nameHints: ["Attending Physician"]
        }
      },
      {
        id: "s6",
        action: "fill",
        field: "discharge_date",
        target: {
          role: "textbox",
          intent: "field.discharge_date",
          nameHints: ["Discharge Date"]
        }
      },
      {
        id: "s7",
        action: "select",
        field: "readmission_risk",
        target: {
          role: "combobox",
          intent: "field.readmission_risk",
          nameHints: ["Readmission Risk"]
        }
      },
      {
        id: "s8",
        action: "click",
        risk: "write",
        target: {
          role: "button",
          intent: "submit_discharge",
          nameHints: ["Submit", "File Discharge"],
          cachedSelector: 'role=button[name="File Discharge"]',
          cacheConfidence: 0.95
        }
      },
      {
        id: "s9",
        action: "waitFor",
        target: {
          role: "heading",
          intent: "success.discharge_filed",
          nameHints: ["Discharge filed"]
        }
      }
    ],
    validation: {
      type: "record_exists_api",
      endpoint: "/api/discharges",
      queryField: "patient_id",
      expect: { status: "Filed" }
    }
  };
}
