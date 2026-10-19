/**
 * Shared visualizer palette. Keep in sync with the --viz-* tokens in app/globals.css.
 *
 * Each state is a [fill, stroke, text] triple so a node, key, bar or chip looks the
 * same whether it is drawn with Konva, SVG or HTML.
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
  base: ["#454552", "#6c6c78", "#ececec"],
  compare: ["#0b6fb8", "#5ab4ff", "#ffffff"],
  active: ["#ffb000", "#ffd466", "#1a1a1a"],
  moving: ["#ffb000", "#ffd466", "#1a1a1a"],
  visited: ["#00a854", "#5cffa8", "#ffffff"],
  success: ["#00a854", "#5cffa8", "#ffffff"],
  danger: ["#d93636", "#ff8a8a", "#ffffff"],
  merge: ["#7a45b8", "#d2adff", "#ffffff"],
  pivot: ["#c2185b", "#ff7ac6", "#ffffff"],
  left: ["#1e6fb8", "#7cc4ff", "#ffffff"],
  right: ["#7b3a9c", "#dba4ec", "#ffffff"],
  dim: ["#1d1d24", "#34343e", "#6c6c78"],
};

/** Accent colour per tone, used for status titles, labels and badges. */
export const TONE_COLOR: Record<Tone, string> = {
  info: "#39aaff",
  ok: "#2ee68a",
  warn: "#ffb000",
  danger: "#ff5c5c",
  merge: "#c08bff",
  muted: "#a3a3b2",
};

/** Label backgrounds for on-canvas callouts: [background, text]. */
export const TONE_LABEL: Record<Tone, readonly [string, string]> = {
  info: ["#0a84d6", "#ffffff"],
  ok: ["#00c864", "#06140c"],
  warn: ["#ffb000", "#1a1a1a"],
  danger: ["#e53935", "#ffffff"],
  merge: ["#8e5bd6", "#ffffff"],
  muted: ["#3a3a46", "#ececf1"],
};

export const EDGE = {
  base: "#5c5c6a",
  active: "#39aaff",
  tree: "#2ee68a",
  frontier: "#ffb000",
  rejected: "#ff5c5c",
} as const;

export const MONO_FONT = "'JetBrains Mono', Consolas, Monaco, monospace";
