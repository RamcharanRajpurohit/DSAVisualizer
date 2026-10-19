/**
 * Shared visualizer palette — "ink on paper". Keep in sync with the --viz-* tokens in app/globals.css.
 *
 * Each state is a [fill, stroke, text] triple so a node, key, bar or chip looks the same whether it
 * is drawn with Konva, SVG or HTML: paper-white shapes with ink outlines, and soft tints with a
 * strong outline for states — like a diagram drawn on paper.
 */
export type Tone = "info" | "ok" | "warn" | "danger" | "merge" | "muted";

export type VizState =
  | "base"
  | "compare"
  | "active"
  | "moving"
  | "visited"
  | "success"
  | "danger"
  | "merge"
  | "pivot"
  | "left"
  | "right"
  | "dim";

export type Triple = readonly [fill: string, stroke: string, text: string];

export const VIZ: Record<VizState, Triple> = {
  base: ["#fffdf8", "#2a2a2a", "#1a1a1a"],
  compare: ["#dce8ff", "#2563eb", "#1e3a8a"],
  active: ["#ffe7bf", "#d97706", "#7c2d12"],
  moving: ["#ffe7bf", "#d97706", "#7c2d12"],
  visited: ["#d9f2e1", "#16a34a", "#14532d"],
  success: ["#d9f2e1", "#16a34a", "#14532d"],
  danger: ["#fddede", "#dc2626", "#7f1d1d"],
  merge: ["#ece1fd", "#7c3aed", "#4c1d95"],
  pivot: ["#fce0ec", "#db2777", "#831843"],
  left: ["#ddebff", "#3b82f6", "#1e3a8a"],
  right: ["#f1e2fc", "#9333ea", "#581c87"],
  dim: ["#ece6dc", "#c9c0b2", "#9a9184"],
};

/** Accent colour per tone, used for status titles, labels and badges (readable on paper). */
export const TONE_COLOR: Record<Tone, string> = {
  info: "#1e40af",
  ok: "#166534",
  warn: "#92400e",
  danger: "#991b1b",
  merge: "#5b21b6",
  muted: "#4b463f",
};

/** Label backgrounds for on-canvas callouts: [background, text]. */
export const TONE_LABEL: Record<Tone, readonly [string, string]> = {
  info: ["#1d4ed8", "#ffffff"],
  ok: ["#15803d", "#ffffff"],
  warn: ["#b45309", "#ffffff"],
  danger: ["#b91c1c", "#ffffff"],
  merge: ["#6d28d9", "#ffffff"],
  muted: ["#1a1a1a", "#fbf8f2"],
};

export const EDGE = {
  base: "#3d3a35",
  active: "#2563eb",
  tree: "#16a34a",
  frontier: "#d97706",
  rejected: "#dc2626",
} as const;

/** Paper & ink, for canvas engines that need the chrome colours directly. */
export const PAPER = {
  bg: "#efe8dd",
  card: "#f7f2ea",
  well: "#fbf8f2",
  ink: "#1a1a1a",
  inkDim: "#4b463f",
  inkFaint: "#8c8478",
  line: "rgba(26,26,26,0.12)",
} as const;

export const MONO_FONT = "'JetBrains Mono', Consolas, Monaco, monospace";
