import { type WorkflowDefinition } from "./schema";

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
