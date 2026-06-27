import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Vendor Management Portal",
  description: "Controlled procurement target app operated by Kernel"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
