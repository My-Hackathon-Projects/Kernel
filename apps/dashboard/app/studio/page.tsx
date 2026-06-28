import Link from "next/link";
import { WorkflowStudio } from "../../components/workflow-studio";

export default function StudioPage() {
  return (
    <main>
      <div className="shell">
        <section className="panel run-summary">
          <Link href="/app" className="back-link">
            Back to home
          </Link>
          <div>
            <p className="eyebrow">Recorder</p>
            <h1>Workflow studio</h1>
          </div>
        </section>

        <section className="panel">
          <WorkflowStudio />
        </section>
      </div>
    </main>
  );
}
