import Link from "next/link";

export const metadata = {
  title: "Imprint · Kernel"
};

export default function ImprintPage() {
  return (
    <main>
      <div className="shell">
        <section className="panel run-summary">
          <Link href="/app" className="back-link">
            Back to home
          </Link>
          <div>
            <p className="eyebrow">Legal</p>
            <h1>Imprint</h1>
          </div>
        </section>

        <section className="panel">
          <div className="prose">
            <h2>Provider</h2>
            <p>
              Kernel
              <br />
              Remote-first, Europe
            </p>

            <h2>Contact</h2>
            <p>
              Email: <a href="mailto:hello@kernel.dev">hello@kernel.dev</a>
            </p>

            <h2>Responsible for content</h2>
            <p>The Kernel team.</p>

            <h2>Disclaimer</h2>
            <p>
              This application is a demonstration of the Kernel platform. The
              procurement portal it operates against is a controlled environment used
              for evaluation. Content is provided as is, without warranty of any kind.
            </p>

            <p>
              See also our <Link href="/about">about page</Link> and{" "}
              <Link href="/contact">contact details</Link>.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
