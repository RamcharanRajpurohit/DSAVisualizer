/**
 * The product tour video on the home page (rendered from /video — see video/README.md).
 * One source of truth for the player and its VideoObject structured data. Files are versioned
 * (`-v1`, `-v2`…) so a new cut never fights a cached old one; older cuts stay in public/video.
 */
export const TOUR = {
  title: "AlgoLab, the tour",
  /** Section heading on the home page. */
  heading: "Take the tour",
  description:
    "An 83-second tour of the DSA Visualizer: the three-pane workspace, merge sort, a sorting race, linked lists, infix to postfix, building a heap, an AVL rotation, a B-tree split, Dijkstra and three more graph algorithms side by side, and the playback controls and code tabs.",
  /** ISO 8601 duration and seconds, kept in sync with video/composition/scenes.js. */
  duration: "PT83S",
  seconds: 83,
  /** The cut has a soundtrack (it still autoplays muted; the player offers "Sound on"). */
  hasAudio: true,
  uploadDate: "2026-10-19T19:00:00+05:30",
  width: 1920,
  height: 1080,
  poster: "/video/algolab-tour-v3-poster.jpg",
  /** AV1 1080p for current browsers, H.264 720p for everything else (the browser takes the first it can play). */
  sources: [
    { src: "/video/algolab-tour-v3-av1.mp4", type: 'video/mp4; codecs="av01.0.08M.08"' },
    { src: "/video/algolab-tour-v3.mp4", type: "video/mp4" },
  ],
} as const;
