/**
 * The product tour video on the home page (rendered from /video — see video/README.md).
 * One source of truth for the player and its VideoObject structured data. Files are versioned
 * (`-v1`, `-v2`…) so a new cut never fights a cached old one.
 */
export const TOUR = {
  title: "AlgoLab in 50 seconds",
  description:
    "A 50-second tour of the DSA Visualizer: merge sort's split-and-merge tree, quick sort partitions, a sorting race, Dijkstra's shortest paths, an AVL double rotation and infix-to-postfix with a stack.",
  /** ISO 8601 duration and seconds, kept in sync with video/composition/scenes.js. */
  duration: "PT52S",
  seconds: 52,
  uploadDate: "2026-10-19T12:00:00+05:30",
  width: 1920,
  height: 1080,
  poster: "/video/algolab-tour-v1-poster.jpg",
  /** AV1 1080p for current browsers, H.264 720p for everything else (the browser takes the first it can play). */
  sources: [
    { src: "/video/algolab-tour-v1-av1.mp4", type: 'video/mp4; codecs="av01.0.08M.08"' },
    { src: "/video/algolab-tour-v1.mp4", type: "video/mp4" },
  ],
} as const;
