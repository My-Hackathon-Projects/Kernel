"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/console", label: "Console" },
  { href: "/runs", label: "Runs" },
  { href: "/tools", label: "Tools" },
  { href: "/studio", label: "Studio" },
  { href: "/patches", label: "Patches" },
  { href: "/about", label: "About us" },
  { href: "/contact", label: "Contact" }
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href: string): boolean {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link
          href="/app"
          className="brand"
          aria-label="Kernel home"
          onClick={() => setOpen(false)}
        >
          <span className="brand-mark">
            <img src="/logo.svg" alt="" width={40} height={40} />
          </span>
          <span className="brand-word">Kernel</span>
        </Link>

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">Menu</span>
          <span aria-hidden="true">{open ? "Close" : "Menu"}</span>
        </button>

        <nav
          id="site-nav"
          className={open ? "site-nav open" : "site-nav"}
          aria-label="Primary"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={isActive(link.href) ? "nav-link active" : "nav-link"}
              aria-current={isActive(link.href) ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
