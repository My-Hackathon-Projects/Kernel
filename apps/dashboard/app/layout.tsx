import "./globals.css";
import type { ReactNode } from "react";
import { Inter, Bricolage_Grotesque } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"]
});

export const metadata = {
  title: "AgentPort — Safe MCP tools from any web workflow",
  description: "Record a human workflow once. Compile it into a typed agent action. Run with replayable evidence."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
