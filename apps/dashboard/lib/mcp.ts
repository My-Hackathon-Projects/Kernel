import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { toolInputJsonSchemaSchema } from "@agentport/core/compiler";
import {
  parseStoredWorkflow,
  getPrismaClient,
  getToolWithWorkflow
} from "@agentport/db";
import { invokeTool, listTools, type DashboardTool } from "./tool-service";

function toolInputShape(tool: DashboardTool): Record<string, z.ZodType> {
  const parsed = toolInputJsonSchemaSchema.safeParse(tool.inputSchema);
  const properties = parsed.success ? parsed.data.properties : {};
  const shape: Record<string, z.ZodType> = {};

  for (const [name, property] of Object.entries(properties)) {
    shape[name] =
      property.enum && property.enum.length > 0
        ? z.enum(property.enum as [string, ...string[]])
        : z.string().min(1);
  }

  return shape;
}

async function toolDescription(tool: DashboardTool): Promise<string> {
  const storedTool = await getToolWithWorkflow(getPrismaClient(), tool.id);
  if (!storedTool) {
    return `Execute the ${tool.name} browser workflow`;
  }

  const workflow = parseStoredWorkflow(storedTool.workflow.definition);
  return `Execute ${workflow.name} v${workflow.version} in ${workflow.target}`;
}

export async function buildMcpServer(): Promise<McpServer> {
  const server = new McpServer({
    name: "agentport-dashboard",
    version: "0.3.0"
  });
  const tools = await listTools();

  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        title: tool.name,
        description: await toolDescription(tool),
        inputSchema: z.object(toolInputShape(tool)).strict()
      },
      async (args) => {
        const outcome = await invokeTool({
          toolId: tool.id,
          input: args as Record<string, unknown>,
          callerId: "mcp"
        });

        if (!outcome.success) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: JSON.stringify(outcome.error)
              }
            ]
          };
        }

        return {
          structuredContent: { result: outcome.result },
          content: [
            {
              type: "text",
              text: JSON.stringify(outcome.result)
            }
          ]
        };
      }
    );
  }

  return server;
}

export async function handleMcpRequest(request: Request): Promise<Response> {
  const server = await buildMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true
  });

  await server.connect(transport);
  return transport.handleRequest(request);
}
