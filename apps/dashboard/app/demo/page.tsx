import { createDischargeWorkflowFixture } from "@agentport/core";
import { compileToolOrThrow } from "@agentport/core/compiler";
import Link from "next/link";
import { DemoExperience } from "../../components/demo-experience";
import { resolveDashboardConfig } from "../../lib/config";

export const dynamic = "force-dynamic";

export default function DemoPage() {
  const workflow = createDischargeWorkflowFixture();
  const compiled = compileToolOrThrow(workflow);
  const mcpEndpoint = `${resolveDashboardConfig().dashboardBaseUrl}/mcp`;

  return (
    <main>
      <div className="shell">
        <section className="panel run-summary">
          <Link href="/app" className="back-link">
            Back to home
          </Link>
          <div>
            <p className="eyebrow">Guided demo</p>
            <h1>Watch the demo</h1>
            <p className="muted">
              Drop in a discharge export from any hospital system, watch Kernel file a
              patient discharge into the portal step by step, approve the write, and
              walk away with the agent-callable MCP tool and a full audit trail.
            </p>
          </div>
        </section>

        <DemoExperience
          workflow={workflow}
          toolName={compiled.name}
          version={compiled.workflowVersion}
          inputSchema={compiled.inputSchema}
          contentHash={compiled.contentHash}
          mcpEndpoint={mcpEndpoint}
          sampleCsvPath="/discharges-sample.csv"
        />
      </div>
    </main>
  );
}
