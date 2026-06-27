import Link from "next/link";

const FEATURES = [
  {
    href: "/console",
    tag: "Operate",
    title: "Console",
    description:
      "Call a typed tool and approve write actions in one place. The run pauses before any write until a human decides."
  },
  {
    href: "/studio",
    tag: "Author",
    title: "Workflow studio",
    description:
      "Turn a recorded workflow into a typed, registered tool. Validate the contract, then compile it for agents to call."
  },
  {
    href: "/tools",
    tag: "Distribute",
    title: "Tools registry",
    description:
      "Every compiled tool is exposed over the MCP endpoint with a typed input schema and a copy-ready connection snippet."
  },
  {
    href: "/runs",
    tag: "Audit",
    title: "Runs and evidence",
    description:
      "Replay any run with screenshots, resolver tiers, approval records, and independent validation results."
  },
  {
    href: "/patches",
    tag: "Resilience",
    title: "Selector patches",
    description:
      "When a page changes, the resolver re-binds to intent and proposes a patch you can review and accept."
  }
];

const FLOW = [
  {
    title: "Record once",
    body: "Capture a workflow and map which fields are typed tool inputs."
  },
  {
    title: "Compile to a tool",
    body: "The workflow becomes a typed tool with a strict input schema."
  },
  {
    title: "Agent calls it",
    body: "An MCP client calls the tool with structured input. The browser never improvises."
  },
  {
    title: "Human approves",
    body: "The run pauses before the write action and shows the exact resolved element."
  },
  {
    title: "Validate and audit",
    body: "An independent channel confirms the result, and the full run is stored for replay."
  }
];

export default function HomePage() {
  return (
    <main>
      <div className="shell">
        <section className="hero">
          <div>
            <span className="hero-eyebrow">Agent-ready workflows</span>
            <h1>
              The production layer between agents and your{" "}
              <span className="accent">existing software</span>.
            </h1>
            <p className="hero-lead">
              Kernel records a human web workflow once and turns it into a typed,
              audited tool that agents call safely. The model maps intent to inputs.
              Kernel executes deterministically, pauses for human approval, validates
              the result, and stores replayable evidence.
            </p>
            <div className="hero-actions">
              <Link href="/console" className="btn btn-primary">
                Open the console
              </Link>
              <Link href="/studio" className="btn btn-ghost">
                Compile a workflow
              </Link>
            </div>
          </div>
          <div className="hero-art">
            <img src="/logo.jpeg" alt="Kernel" />
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <h2>What you can do</h2>
            <span>One platform, five surfaces</span>
          </div>
          <div className="feature-grid">
            {FEATURES.map((feature) => (
              <Link key={feature.href} href={feature.href} className="feature-card">
                <span className="feature-tag">{feature.tag}</span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <h2>How it works</h2>
            <span>Intent in, deterministic action out</span>
          </div>
          <ol className="flow-steps">
            {FLOW.map((step) => (
              <li key={step.title}>
                <strong>{step.title}</strong>
                <br />
                {step.body}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
