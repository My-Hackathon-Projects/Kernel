import Link from "next/link";

export default function PortalHomePage() {
  return (
    <main>
      <section className="portal-shell">
        <div className="page-header">
          <div>
            <p className="eyebrow">Procurement portal</p>
            <h1>Vendor Management Portal</h1>
          </div>
          <Link className="button primary" href="/vendors">
            Vendors
          </Link>
        </div>
      </section>
    </main>
  );
}
