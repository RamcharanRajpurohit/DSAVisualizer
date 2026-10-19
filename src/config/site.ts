/**
 * Canonical site URL. Always the production domain so that previews (*.vercel.app) and local
 * builds never emit competing canonicals — all ranking signals consolidate on one host.
 * Override with NEXT_PUBLIC_SITE_URL only if the domain changes.
 */
function resolveSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://algolab.rajpurohit.me").replace(/\/+$/, "");
}

export const SITE = {
  name: "DSA Visualizer",
  /** Brand behind the domain; declared as alternateName so engines and assistants connect the two. */
  alternateName: "AlgoLab",
  url: resolveSiteUrl(),
  tagline: "Learn data structures & algorithms by watching them run",
  description:
    "Free interactive DSA visualizer: step through sorting, stacks, queues, linked lists, heaps, BST, AVL, B-trees and graph algorithms with animations, pseudocode, real code and explanations.",
  repo: "https://github.com/RamcharanRajpurohit/DSAVisualizer",
  locale: "en_US",
  language: "en",
  /** First public release of this version (used in structured data). */
  published: "2026-10-19",
  author: {
    name: "Ramcharan Rajpurohit",
    url: "https://github.com/RamcharanRajpurohit",
    sameAs: ["https://github.com/RamcharanRajpurohit"],
  },
} as const;

export const absoluteUrl = (path: string) => `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
