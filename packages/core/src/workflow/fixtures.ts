import { type WorkflowDefinition } from "./schema";

/**
 * The reference create_vendor workflow contract. Used by the dashboard validator
 * UI, the runner execute tests, and as the canonical example of the semantic
 * workflow shape until the M2 recorder produces real definitions.
 */
export function createVendorWorkflowFixture(): WorkflowDefinition {
  return {
    name: "create_vendor",
    version: 1,
    target: "mock-procurement",
    startUrl: "/vendors/new",
    inputs: {
      company_name: { type: "string", required: true },
      country: { type: "string", required: true },
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
        action: "click",
        target: {
          role: "button",
          intent: "open_create_form",
          nameHints: ["Create Vendor"]
        }
      },
      {
        id: "s2",
        action: "fill",
        field: "company_name",
        target: {
          role: "textbox",
          intent: "field.company_name",
          nameHints: ["Company name"]
        }
      },
      {
        id: "s3",
        action: "fill",
        field: "tax_id",
        target: {
          role: "textbox",
          intent: "field.tax_id",
          nameHints: ["Tax ID"]
        }
      },
      {
        id: "s4",
        action: "select",
        field: "country",
        target: {
          role: "combobox",
          intent: "field.country",
          nameHints: ["Country"]
        }
      },
      {
        id: "s5",
        action: "click",
        risk: "write",
        target: {
          role: "button",
          intent: "submit_vendor",
          nameHints: ["Submit", "Send for Approval"]
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
