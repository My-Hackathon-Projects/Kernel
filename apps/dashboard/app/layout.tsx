import "./globals.css";
import type { ReactNode } from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ProductShell } from "../components/product-shell";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans-var",
  weight: ["400", "500", "600", "700", "800", "900"]
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-var",
  weight: ["400", "500", "700"]
});

export const metadata = {
  title: "Kernel · Turn messy business data into validated, automated actions",
  description:
    "Kernel observes your repetitive data workflows, validates the data, and builds a skill your AI agent can run. You approve every output."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body>
        <ProductShell>{children}</ProductShell>
      </body>
    </html>
  );
}
