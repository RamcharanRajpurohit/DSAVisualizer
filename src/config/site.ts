export const SITE = {
  name: "DSA Visualizer",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://dsa-visualizer.vercel.app",
  description:
    "Interactive, step-by-step visualizations of data structures and algorithms — sorting, trees, heaps, graphs, linked lists, stacks and queues — with pseudocode, playback and explanations.",
  repo: "https://github.com/RamcharanRajpurohit/DSAVisualizer",
} as const;
