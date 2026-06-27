import { createVendorWorkflowFixture } from "@agentport/core";
import { describe, expect, it, vi } from "vitest";
import {
  createAnthropicSelectorResolver,
  type AnthropicSelectorResolverOptions
} from "../src/execution/llm-selector-resolver";

function getSubmitTarget() {
  const step = createVendorWorkflowFixture().steps.find(
    (candidate) => candidate.id === "s7"
  );
  if (!step || !("target" in step)) {
    throw new Error("Submit target fixture is missing");
  }

  return step.target;
}

function createClient(
  create: ReturnType<typeof vi.fn>
): NonNullable<AnthropicSelectorResolverOptions["client"]> {
  return {
    messages: {
      create
    }
  } as unknown as NonNullable<AnthropicSelectorResolverOptions["client"]>;
}

const target = getSubmitTarget();
const selector = 'role=button[name="Send for Approval"]';
const candidate = {
  selector,
  role: "button",
  name: "Send for Approval",
  text: "Send for Approval",
  tagName: "BUTTON"
};

describe("createAnthropicSelectorResolver", () => {
  it("forces Anthropic tool output and parses the selector choice", async () => {
    const create = vi.fn(async (params) => {
      expect(params.model).toBe("claude-test");
      expect(params.tool_choice).toEqual({
        type: "tool",
        name: "select_browser_target",
        disable_parallel_tool_use: true
      });
      expect(params.tools?.[0]).toMatchObject({
        name: "select_browser_target",
        strict: true
      });
      expect(params.tools?.[0].input_schema.properties.selector.enum).toContain(
        selector
      );

      return {
        content: [
          {
            type: "tool_use",
            id: "toolu_selector",
            name: "select_browser_target",
            input: {
              selector,
              confidence: 0.92,
              rationale: "The button label matches the submit intent."
            }
          }
        ]
      };
    });
    const resolve = createAnthropicSelectorResolver({
      env: {
        ANTHROPIC_API_KEY: "test-key",
        ANTHROPIC_MODEL: "claude-test"
      },
      client: createClient(create)
    });

    await expect(
      resolve({
        target,
        candidates: [candidate]
      })
    ).resolves.toEqual({
      selector,
      confidence: 0.92,
      rationale: "The button label matches the submit intent."
    });
    expect(create).toHaveBeenCalledOnce();
  });

  it("rejects a response without selector tool output", async () => {
    const create = vi.fn(async () => ({
      content: [{ type: "text", text: "{}" }]
    }));
    const resolve = createAnthropicSelectorResolver({
      env: { ANTHROPIC_API_KEY: "test-key" },
      client: createClient(create)
    });

    await expect(resolve({ target, candidates: [candidate] })).rejects.toThrow(
      "selector tool output"
    );
  });

  it("rejects malformed tool input", async () => {
    const create = vi.fn(async () => ({
      content: [
        {
          type: "tool_use",
          id: "toolu_selector",
          name: "select_browser_target",
          input: {
            selector,
            confidence: "0.92"
          }
        }
      ]
    }));
    const resolve = createAnthropicSelectorResolver({
      env: { ANTHROPIC_API_KEY: "test-key" },
      client: createClient(create)
    });

    await expect(resolve({ target, candidates: [candidate] })).rejects.toThrow(
      "expected number"
    );
  });
});
