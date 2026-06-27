import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "AgentPort Dashboard",
  description: "Control plane for typed, audited web workflows"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
