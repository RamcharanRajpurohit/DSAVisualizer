import { VIZ, type Triple } from "@/lib/theme";

/** Node box styles: [fill, stroke]. */
export const NODE_STYLE = {
  base: ["#2b2b35", "#55555f"],
  visit: ["#0f2f4a", "#39aaff"],
  danger: ["#4a1b1b", "#ff5c5c"],
  donor: ["#46380f", "#ffc53d"],
  success: ["#103a25", "#2ee68a"],
  merge: ["#33204a", "#c08bff"],
  left: ["#12304a", "#5ab4ff"],
  right: ["#2f1b3d", "#c77ddb"],
} as const satisfies Record<string, readonly [string, string]>;
export type NodeStyle = keyof typeof NODE_STYLE;

/** Key circle styles: [fill, stroke, text] — the shared visualizer palette. */
export const KEY_STYLE = {
  base: VIZ.base,
  compare: VIZ.compare,
  moving: VIZ.moving,
  danger: VIZ.danger,
  success: VIZ.success,
  left: VIZ.left,
  right: VIZ.right,
  merge: VIZ.merge,
} as const satisfies Record<string, Triple>;
export type KeyStyle = keyof typeof KEY_STYLE;

/** Glow colour drawn around highlighted nodes and keys. */
export const GLOW: Partial<Record<NodeStyle | KeyStyle, string>> = {
  visit: "#39aaff",
  compare: "#39aaff",
  danger: "#ff5c5c",
  donor: "#ffc53d",
  moving: "#ffb000",
  success: "#2ee68a",
  merge: "#c08bff",
  left: "#5ab4ff",
  right: "#c77ddb",
};

/** Geometry (world units, scaled to fit the canvas). */
export const GEO = { slot: 42, pad: 8, r: 17, nodeH: 44, levelGap: 96, gap: 26, top: 96 } as const;

export const ORDERS = [3, 4, 5, 6, 7] as const;
export const DEFAULT_ORDER = 3;

/** Deterministic tree shown when the page opens (and by "Sample"). */
export const SAMPLE = [40, 20, 60, 10, 30, 50, 70, 5, 15, 25, 35, 45, 55, 65, 75];

/** Ascending keys — shows that even sorted input keeps a B-tree perfectly balanced. */
export const ASCENDING = Array.from({ length: 16 }, (_, i) => (i + 1) * 5);

/** How many random keys the dice puts in the box (each one is animated). */
export const DICE_COUNT = 4;
/** Max values per typed batch. */
export const MAX_BATCH = 20;
/** Keep the drawing readable. */
export const MAX_KEYS = 120;
