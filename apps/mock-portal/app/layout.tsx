import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Mock Procurement Portal",
  description: "Controlled target app for AgentPort demos"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
