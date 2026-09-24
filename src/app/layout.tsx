import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Geist_Mono, Nunito } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { Providers } from "@/components/Providers";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const assetBase = process.env.PACT_BASE_PATH || process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  title: { default: "Today", template: "%s · Pact" },
  description: "Four daily boxes with the people you choose: sleep, protein, water, and training.",
  applicationName: "Pact",
  manifest: `${assetBase}/manifest.webmanifest`,
  icons: { icon: `${assetBase}/icons/icon-192.png`, apple: `${assetBase}/icons/icon-180.png` },
  appleWebApp: { capable: true, title: "Pact", statusBarStyle: "black-translucent" },
};

export const viewport = {
  themeColor: "#f6efe6",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} ${fraunces.variable} ${geistMono.variable} light h-full antialiased`}
    >
      <body className="min-h-full bg-ink font-sans text-cream">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:rounded-full focus:bg-acid focus:px-4 focus:py-2 focus:text-ink"
        >
          Skip to content
        </a>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
