import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { SiteAgentTools } from "@/components/agents/SiteAgentTools";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE } from "@/config/site";
import { MascotLoader } from "@/features/mascot/MascotLoader";
import { siteJsonLd } from "@/lib/seo";
import "./globals.css";

// Body text uses the system stack (Helvetica Neue / SF / Segoe), like the reference design — no web-font cost.
// Web fonts use display "optional": used if they arrive within ~100 ms (preloaded, then cached), never
// swapped in late — a late swap re-wraps headers and badges and shifts the layout (CLS).
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], display: "optional" });
// Headlines are the largest paint: "optional" uses the serif if it arrives within ~100 ms (or is cached)
// and otherwise keeps the fallback for that visit — no late swap, so no layout shift and a fast LCP.
const serif = Instrument_Serif({ variable: "--font-instrument-serif", subsets: ["latin"], weight: "400", style: ["normal", "italic"], display: "optional" });

const isPreview = process.env.VERCEL_ENV === "preview";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} — Learn Data Structures & Algorithms Visually`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.author.name, url: SITE.author.url }],
  creator: SITE.author.name,
  publisher: SITE.author.name,
  category: "education",
  keywords: [
    "DSA visualizer", "algorithm visualizer", "data structure visualizer", "sorting visualizer", "merge sort visualizer",
    "quick sort visualizer", "binary search tree visualizer", "AVL tree visualizer", "B-tree visualizer", "heap visualizer",
    "graph algorithm visualizer", "Dijkstra visualizer", "linked list visualizer", "stack and queue visualizer", "AlgoLab",
  ],
  openGraph: { type: "website", siteName: SITE.name, locale: SITE.locale, title: SITE.name, description: SITE.description, url: "/" },
  twitter: { card: "summary_large_image", title: SITE.name, description: SITE.description },
  // Previews never compete with production; production allows full snippets and large previews
  // (which is also what AI Overviews / AI Mode quote from).
  robots: isPreview
    ? { index: false, follow: false }
    : { index: true, follow: true, googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large", "max-video-preview": -1 } },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION ?? "dmHizS0ow4ZazSg-sAcYxeZ95R7jz6zPcJQARwUmcWI",
    ...(process.env.BING_SITE_VERIFICATION ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } } : {}),
  },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = { themeColor: "#efe8dd", colorScheme: "light" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${jetbrains.variable} ${serif.variable} antialiased`}>
      <body className="min-h-dvh">
        {/* Discovery for AI agents (hoisted into <head> by React): ARD catalog and llms.txt. */}
        <link rel="ai-catalog" href="/.well-known/ai-catalog.json" type="application/json" />
        <link rel="alternate" href="/llms.txt" type="text/plain" title="llms.txt" />
        <JsonLd data={siteJsonLd()} />
        <a
          href="#main-content"
          className="sr-only z-[80] rounded-lg bg-fg px-3 py-2 text-sm text-bg-elev focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
        >
          Skip to content
        </a>
        <Navbar />
        <main id="main-content">{children}</main>
        <Footer />
        <MascotLoader />
        <SiteAgentTools />
      </body>
    </html>
  );
}
