import type { Metadata } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const grotesk = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-grotesk" });

export const metadata: Metadata = {
  title: "Marketing Performance Explorer",
  description: "Explore marketing performance by brand, market, channel and period.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={grotesk.variable}>
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
