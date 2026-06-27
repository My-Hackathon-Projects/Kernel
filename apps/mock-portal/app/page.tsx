import Link from "next/link";

export default function MockPortalPage() {
  return (
    <main>
      <section className="portal-shell">
        <div className="page-header">
          <div>
            <p className="eyebrow">AgentPort demo target</p>
            <h1>Mock Procurement Portal</h1>
          </div>
          <Link className="button primary" href="/vendors">
            Vendors
          </Link>
        </div>
      </section>
    </main>
  );
}
