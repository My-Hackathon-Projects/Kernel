import Link from "next/link";

export const metadata = {
  title: "About us · Kernel"
};

export default function AboutPage() {
  return (
    <main>
      <div className="shell">
        <section className="panel run-summary">
          <Link href="/app" className="back-link">
            Back to home
          </Link>
          <div>
            <p className="eyebrow">Company</p>
            <h1>About us</h1>
          </div>
        </section>

        <section className="panel">
          <div className="prose">
            <p>
              Kernel is the production layer between AI agents and the business software
              people already use. Procurement portals, internal admin tools, and legacy
              systems rarely expose a clean API, and they will not get one soon. Agents
              can reason about them, but driving a browser click by click is brittle,
              unsafe, and impossible to audit.
            </p>
            <p>
              We take a different path. Record a workflow once and Kernel turns it into
              a typed, permissioned, audited tool that an agent can call over a standard
              protocol. The agent supplies intent and structured input. Kernel executes
              the workflow deterministically, pauses for human approval before any
              write, and confirms the result through an independent channel.
            </p>

            <h2>What we believe</h2>
            <p>
              The model should handle intent, not action. We confine the model to two
              jobs: mapping a request to typed inputs, and re-binding a changed page to
              the original intent. Everything else is deterministic and replayable. That
              line is what makes agent automation safe enough to run inside a company.
            </p>

            <h2>How we are different</h2>
            <p>
              A browser agent improvises live. A macro recorder breaks the moment a
              layout changes. Kernel records intent, binds it to the live page at run
              time, gates risky steps behind human approval, and validates the outcome
              through a channel independent of the one it acted through.
            </p>

            <p>
              Want to see it run? Open the <Link href="/console">console</Link> or
              compile a workflow in the <Link href="/studio">studio</Link>.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
