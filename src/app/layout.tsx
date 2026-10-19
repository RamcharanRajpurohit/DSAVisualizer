import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { SITE } from "@/config/site";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} — Learn Data Structures & Algorithms Visually`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  keywords: [
    "DSA visualizer", "data structures", "algorithms", "sorting visualizer", "merge sort", "quick sort",
    "binary search tree", "AVL tree", "B-tree", "heap", "graph algorithms", "Dijkstra", "linked list", "stack", "queue",
  ],
  openGraph: { type: "website", siteName: SITE.name, title: SITE.name, description: SITE.description, url: SITE.url },
  twitter: { card: "summary_large_image", title: SITE.name, description: SITE.description },
  verification: { google: "dmHizS0ow4ZazSg-sAcYxeZ95R7jz6zPcJQARwUmcWI" },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = { themeColor: "#07070a", colorScheme: "dark" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable} antialiased`}>
      <body className="min-h-dvh">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
