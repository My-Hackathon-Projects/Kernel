import { ApprovalInbox } from "../components/approval-inbox";
import { ToolInvoker } from "../components/tool-invoker";
import { WorkflowStudio } from "../components/workflow-studio";

export default function DashboardPage() {
  return (
    <main>
      <div className="shell">
        <section className="panel summary">
          <h1>AgentPort</h1>
          <p>
            AgentPort compiles a recorded browser workflow into a typed tool, executes
            it through the runner, validates the result, and stores replayable evidence.
          </p>
          <nav className="dashboard-nav" aria-label="Dashboard navigation">
            <a href="/studio">Workflow studio</a>
            <a href="/tools">Tools</a>
            <a href="/runs">Runs</a>
            <a href="/patches">Selector patches</a>
          </nav>
        </section>
        <section className="panel">
          <ToolInvoker />
        </section>
        <section className="panel">
          <ApprovalInbox />
        </section>
        <section className="panel">
          <WorkflowStudio />
        </section>
      </div>
    </main>
  );
}
