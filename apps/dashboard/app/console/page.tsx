import Link from "next/link";
import { ConsoleWorkspace } from "../../components/console-workspace";

export default function ConsolePage() {
  return (
    <main>
      <div className="shell">
        <section className="panel run-summary">
          <Link href="/" className="back-link">
            Back to home
          </Link>
          <div>
            <p className="eyebrow">Operate</p>
            <h1>Console</h1>
            <p className="muted">
              Extract vendor details, run the portal workflow, approve the submit, and
              open the evidence record.
            </p>
          </div>
        </section>

        <ConsoleWorkspace />
      </div>
    </main>
  );
}
