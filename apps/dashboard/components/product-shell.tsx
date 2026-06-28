"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

/**
 * Chrome for the product area. The marketing site at /homepage brings its own
 * navigation and footer and renders full-bleed, so it opts out of the product
 * header/footer frame. Every other route gets the Kernel SiteHeader and
 * SiteFooter.
 */
export function ProductShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/homepage") {
    return <>{children}</>;
  }

  return (
    <div className="app-frame">
      <SiteHeader />
      <div className="app-main">{children}</div>
      <SiteFooter />
    </div>
  );
}
