import { toolInputJsonSchemaSchema } from "@agentport/core/compiler";
import Link from "next/link";
import { resolveDashboardConfig } from "../../lib/config";
import { listTools, type DashboardTool } from "../../lib/tool-service";

export const dynamic = "force-dynamic";

function inputFields(tool: DashboardTool): string[] {
  const parsed = toolInputJsonSchemaSchema.safeParse(tool.inputSchema);
  if (!parsed.success) {
    return [];
  }

  return Object.entries(parsed.data.properties).map(([name, property]) =>
    property.enum ? `${name} (${property.enum.join(" | ")})` : name
  );
}

export default async function ToolsPage() {
  const tools = await listTools();
  const mcpEndpoint = `${resolveDashboardConfig().dashboardBaseUrl}/mcp`;

  return (
    <main>
      <div className="shell">
        <section className="panel run-summary">
          <Link href="/" className="back-link">
            Back to home
          </Link>
          <div>
            <p className="eyebrow">Registry</p>
            <h1>Tools</h1>
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <h2>Compiled tools</h2>
            <span>{tools.length}</span>
          </div>
          <p className="muted">
            Every enabled tool is exposed over the MCP endpoint at {mcpEndpoint}.
            Connect an MCP client and call a tool by name, or use Test invoke on the
            dashboard for create_vendor.
          </p>
          <div className="tools-registry">
            {tools.map((tool) => {
              const fields = inputFields(tool);
              return (
                <article className="tool-card" key={tool.id}>
                  <div className="section-heading">
                    <h3>{tool.name}</h3>
                    <span>v{tool.workflow.version}</span>
                  </div>
                  <p>
                    Target {tool.workflow.target.name} · {tool.workflow.target.baseUrl}
                  </p>
                  <p>Inputs: {fields.length > 0 ? fields.join(", ") : "none"}</p>
                  <p>Content hash {tool.workflow.contentHash.slice(0, 12)}</p>
                  <pre className="mcp-snippet">{`POST ${mcpEndpoint}\ntools/call ${tool.name}`}</pre>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
