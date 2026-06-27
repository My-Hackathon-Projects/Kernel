import { createVendorWorkflowFixture } from "@agentport/core";
import { type Page } from "playwright";
import { describe, expect, it } from "vitest";
import { resolveTarget } from "../src/execution/target-resolver";

type LocatorState = {
  visible: boolean;
  count: number;
};

class FakeLocator {
  constructor(private readonly state: LocatorState) {}

  first() {
    return this;
  }

  async waitFor() {
    if (!this.state.visible) {
      throw new Error("not visible");
    }
  }

  async count() {
    return this.state.count;
  }
}

function createFakePage(params: {
  selectors?: Record<string, LocatorState>;
  roles?: Record<string, LocatorState>;
}): Page {
  return {
    locator: (selector: string) =>
      new FakeLocator(params.selectors?.[selector] ?? { visible: false, count: 0 }),
    getByRole: (role: string, options: { name?: string }) =>
      new FakeLocator(
        params.roles?.[`${role}:${String(options.name)}`] ?? {
          visible: false,
          count: 0
        }
      )
  } as unknown as Page;
}

function getSubmitTarget() {
  const step = createVendorWorkflowFixture().steps.find(
    (candidate) => candidate.id === "s7"
  );
  if (!step || !("target" in step)) {
    throw new Error("Submit target fixture is missing");
  }

  return step.target;
}

const submitTarget = getSubmitTarget();

describe("resolveTarget", () => {
  it("uses a confident cached selector as tier 1", async () => {
    const page = createFakePage({
      selectors: {
        'role=button[name="Submit"]': { visible: true, count: 1 }
      }
    });

    await expect(resolveTarget(page, submitTarget)).resolves.toMatchObject({
      selector: 'role=button[name="Submit"]',
      tier: 1,
      patch: null
    });
  });

  it("re-binds by role and records a tier 2 patch when the cache breaks", async () => {
    const page = createFakePage({
      selectors: {
        'role=button[name="Submit"]': { visible: false, count: 0 }
      },
      roles: {
        "button:Send for Approval": { visible: true, count: 1 }
      }
    });

    await expect(resolveTarget(page, submitTarget)).resolves.toMatchObject({
      selector: 'role=button[name="Send for Approval"]',
      tier: 2,
      patch: {
        oldSelector: 'role=button[name="Submit"]',
        newSelector: 'role=button[name="Send for Approval"]',
        tier: 2,
        confidence: 0.95
      }
    });
  });

  it("rejects low-confidence tier 3 selector choices", async () => {
    const page = createFakePage({
      selectors: {
        'role=button[name="Approve Vendor"]': { visible: true, count: 1 }
      }
    });

    await expect(
      resolveTarget(page, submitTarget, {
        collectCandidates: async () => [
          {
            selector: 'role=button[name="Approve Vendor"]',
            role: "button",
            name: "Approve Vendor",
            tagName: "button"
          }
        ],
        llmResolver: async () => ({
          selector: 'role=button[name="Approve Vendor"]',
          confidence: 0.4
        })
      })
    ).rejects.toThrow("below confidence threshold");
  });

  it("uses a tested tier 3 selector and returns a reviewable patch", async () => {
    const page = createFakePage({
      selectors: {
        'role=button[name="Approve Vendor"]': { visible: true, count: 1 }
      }
    });

    await expect(
      resolveTarget(page, submitTarget, {
        collectCandidates: async () => [
          {
            selector: 'role=button[name="Approve Vendor"]',
            role: "button",
            name: "Approve Vendor",
            tagName: "button"
          }
        ],
        llmResolver: async () => ({
          selector: 'role=button[name="Approve Vendor"]',
          confidence: 0.81
        })
      })
    ).resolves.toMatchObject({
      selector: 'role=button[name="Approve Vendor"]',
      tier: 3,
      patch: {
        oldSelector: 'role=button[name="Submit"]',
        newSelector: 'role=button[name="Approve Vendor"]',
        tier: 3,
        confidence: 0.81
      }
    });
  });
});
