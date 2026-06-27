import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

type TextContent = {
  type: "text";
  text: string;
};

const endpoint = process.env.AGENTPORT_MCP_URL ?? "http://localhost:3000/mcp";
const companyName = process.env.AGENTPORT_COMPANY_NAME ?? `MCP Vendor ${Date.now()}`;

const input = {
  company_name: companyName,
  country: process.env.AGENTPORT_COUNTRY ?? "Germany",
  tax_id: process.env.AGENTPORT_TAX_ID ?? "DE123456789",
  risk_level: process.env.AGENTPORT_RISK_LEVEL ?? "medium"
};

function firstTextContent(content: unknown): TextContent | null {
  if (!Array.isArray(content)) {
    return null;
  }

  const text = content.find(
    (item): item is TextContent =>
      typeof item === "object" &&
      item !== null &&
      (item as { type?: unknown }).type === "text" &&
      typeof (item as { text?: unknown }).text === "string"
  );

  return text ?? null;
}

const client = new Client({
  name: "agentport-smoke-client",
  version: "0.1.0"
});
const transport = new StreamableHTTPClientTransport(new URL(endpoint));

try {
  await client.connect(transport);

  const tools = await client.listTools();
  if (!tools.tools.some((tool) => tool.name === "create_vendor")) {
    throw new Error("create_vendor tool was not discovered");
  }

  const result = await client.callTool({
    name: "create_vendor",
    arguments: input
  });
  const text = firstTextContent(result.content);

  if (!text) {
    throw new Error("Tool result did not include text content");
  }

  console.log(JSON.stringify(JSON.parse(text.text), null, 2));
} finally {
  await client.close();
}
