import Link from "next/link";

export const metadata = {
  title: "Contact — Kernel"
};

export default function ContactPage() {
  return (
    <main>
      <div className="shell">
        <section className="panel run-summary">
          <Link href="/" className="back-link">
            Back to home
          </Link>
          <div>
            <p className="eyebrow">Get in touch</p>
            <h1>Contact</h1>
            <p className="muted">
              Questions about deploying Kernel, a pilot, or the platform? Reach the
              team.
            </p>
          </div>
        </section>

        <section className="panel">
          <div className="contact-grid">
            <div className="contact-card">
              <h3>General</h3>
              <p>
                <a href="mailto:hello@kernel.dev">hello@kernel.dev</a>
              </p>
            </div>
            <div className="contact-card">
              <h3>Sales and pilots</h3>
              <p>
                <a href="mailto:sales@kernel.dev">sales@kernel.dev</a>
              </p>
            </div>
            <div className="contact-card">
              <h3>Security</h3>
              <p>
                <a href="mailto:security@kernel.dev">security@kernel.dev</a>
              </p>
            </div>
            <div className="contact-card">
              <h3>Office</h3>
              <p>Kernel Technologies</p>
              <p>Remote-first, Europe</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
