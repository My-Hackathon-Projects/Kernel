import Link from "next/link";

export default function AppHomePage() {
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
            <div className="hero-actions">
              <Link href="/console" className="btn btn-primary">
                Open console
              </Link>
              <Link href="/demo" className="btn btn-ghost">
                Watch demo
              </Link>
            </div>
          </div>
          <div className="hero-art">
            <img src="/logo.svg" alt="Kernel" />
          </div>
        </section>
      </div>
    </main>
  );
}
