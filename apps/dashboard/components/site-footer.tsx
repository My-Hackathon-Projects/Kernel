import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About us" },
  { href: "/contact", label: "Contact" },
  { href: "/imprint", label: "Imprint" }
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <span className="brand-mark small">
            <img src="/logo.jpeg" alt="" width={32} height={32} />
          </span>
          <div>
            <p className="site-footer-word">Kernel</p>
            <p className="site-footer-tagline">
              The production layer between agents and the software they operate.
            </p>
          </div>
        </div>

        <nav className="site-footer-nav" aria-label="Footer">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="site-footer-legal">
        <p>© {year} Kernel. All rights reserved.</p>
        <p>
          <Link href="/imprint">Imprint</Link> · Kernel Technologies
        </p>
      </div>
    </footer>
  );
}
