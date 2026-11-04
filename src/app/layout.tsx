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
      <body className="font-sans antialiased">
        <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
