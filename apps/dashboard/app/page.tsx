import { ApprovalInbox } from "../components/approval-inbox";
import { ToolInvoker } from "../components/tool-invoker";
import { WorkflowValidator } from "../components/workflow-validator";

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
        </section>
        <section className="panel">
          <ToolInvoker />
        </section>
        <section className="panel">
          <ApprovalInbox />
        </section>
        <section className="panel">
          <WorkflowValidator />
        </section>
      </div>
    </main>
  );
}
