/**
 * The product tour video on the home page (rendered from /video — see video/README.md).
 * One source of truth for the player and its VideoObject structured data. Files are versioned
 * (`-v1`, `-v2`…) so a new cut never fights a cached old one; older cuts stay in public/video.
 */
export const TOUR = {
  title: "AlgoLab in one minute",
  /** Section heading on the home page. */
  heading: "The one-minute tour",
  description:
    "A one-minute tour of the DSA Visualizer: merge sort's split-and-merge tree, a sorting race, reversing a linked list, infix to postfix with a stack, building a heap, an AVL rotation, a B-tree split and Dijkstra's shortest paths.",
  /** ISO 8601 duration and seconds, kept in sync with video/composition/scenes.js. */
  duration: "PT56S",
  seconds: 56,
  uploadDate: "2026-10-19T16:30:00+05:30",
  width: 1920,
  height: 1080,
  poster: "/video/algolab-tour-v2-poster.jpg",
  /** AV1 1080p for current browsers, H.264 720p for everything else (the browser takes the first it can play). */
  sources: [
    { src: "/video/algolab-tour-v2-av1.mp4", type: 'video/mp4; codecs="av01.0.08M.08"' },
    { src: "/video/algolab-tour-v2.mp4", type: "video/mp4" },
  ],
} as const;
