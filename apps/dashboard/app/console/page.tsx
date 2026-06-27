import Link from "next/link";
import { ApprovalInbox } from "../../components/approval-inbox";
import { ToolInvoker } from "../../components/tool-invoker";

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
              Call a compiled tool and approve the write action when the run pauses.
            </p>
          </div>
        </section>

        <section className="panel">
          <ToolInvoker />
        </section>

        <section className="panel">
          <ApprovalInbox />
        </section>
      </div>
    </main>
  );
}
