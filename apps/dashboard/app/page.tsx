import { WorkflowValidator } from "./components/workflow-validator";

export default function DashboardPage() {
  return (
    <main>
      <div className="shell">
        <section className="panel summary">
          <h1>AgentPort</h1>
          <p>
            M0 is the project foundation: shared workflow contracts, validated API
            boundaries, a runner service shell, the mock portal shell, and quality gates
            that future milestones build on.
          </p>
        </section>
        <section className="panel">
          <WorkflowValidator />
        </section>
      </div>
    </main>
  );
}
