import "./globals.css";
import type { ReactNode } from "react";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";

export const metadata = {
  title: "Kernel — Agent-ready workflows",
  description:
    "Kernel turns a recorded web workflow into a typed, audited tool that agents call safely."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-frame">
          <SiteHeader />
          <div className="app-main">{children}</div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
