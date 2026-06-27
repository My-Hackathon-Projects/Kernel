import Anthropic from "@anthropic-ai/sdk";
import { type Message } from "@anthropic-ai/sdk/resources/messages";
import {
  llmSelectorResolutionSchema,
  type LlmSelectorResolution,
  type WorkflowDefinition
} from "@agentport/core";
import { type ElementCandidate } from "./dom-candidates";

type SemanticTarget = Extract<
  WorkflowDefinition["steps"][number],
  { target: unknown }
>["target"];

export type LlmSelectorRequest = {
  target: SemanticTarget;
  candidates: ElementCandidate[];
};

export type LlmSelectorResolver = (
  request: LlmSelectorRequest
) => Promise<LlmSelectorResolution>;

const SELECTOR_TOOL_NAME = "select_browser_target";

type ToolUseBlock = Extract<Message["content"][number], { type: "tool_use" }>;

type AnthropicSelectorClient = {
  messages: {
    create: Anthropic["messages"]["create"];
  };
};

export type AnthropicSelectorResolverOptions = {
  env?: NodeJS.ProcessEnv;
  client?: AnthropicSelectorClient;
};

function extractSelectorToolInput(message: Message): unknown {
  const block = message.content.find(
    (part): part is ToolUseBlock =>
      part.type === "tool_use" && part.name === SELECTOR_TOOL_NAME
  );

  if (!block) {
    throw new Error("Anthropic response did not include selector tool output");
  }

  return block.input;
}

export function createAnthropicSelectorResolver(
  options: AnthropicSelectorResolverOptions = {}
): LlmSelectorResolver {
  const env = options.env ?? process.env;
  const client =
    options.client ??
    new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY
    });
  const model = env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5";

  return async function resolveWithAnthropic(request) {
    const selectorValues = request.candidates.map((candidate) => candidate.selector);
    const selectorSchema =
      selectorValues.length > 0
        ? {
            type: "string",
            enum: selectorValues
          }
        : {
            type: "string",
            minLength: 1
          };

    const message = await client.messages.create({
      model,
      max_tokens: 300,
      system:
        "Choose one existing browser selector from provided candidates. " +
        "Use the selector tool exactly once. Do not invent selectors, actions, fields, or input values.",
      tools: [
        {
          name: SELECTOR_TOOL_NAME,
          description:
            "Return the browser selector that best matches the fixed semantic target.",
          input_schema: {
            type: "object",
            properties: {
              selector: selectorSchema,
              confidence: {
                type: "number"
              },
              rationale: {
                type: "string"
              }
            },
            required: ["selector", "confidence"],
            additionalProperties: false
          },
          strict: true
        }
      ],
      tool_choice: {
        type: "tool",
        name: SELECTOR_TOOL_NAME,
        disable_parallel_tool_use: true
      },
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            target: {
              role: request.target.role,
              intent: request.target.intent,
              nameHints: request.target.nameHints,
              nearText: request.target.nearText ?? null
            },
            candidates: request.candidates.map((candidate) => ({
              selector: candidate.selector,
              role: candidate.role,
              name: candidate.name,
              tagName: candidate.tagName
            }))
          })
        }
      ]
    });

    return llmSelectorResolutionSchema.parse(extractSelectorToolInput(message));
  };
}
