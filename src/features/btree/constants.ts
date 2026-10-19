import { VIZ, type Triple } from "@/lib/theme";

/** Node box styles: [fill, stroke] — paper boxes with an ink outline; states are soft tints with a strong outline. */
export const NODE_STYLE = {
  base: ["#FBF8F2", "#2A2A2A"],
  visit: ["#E8F0FF", "#2563EB"],
  danger: ["#FDE8E8", "#DC2626"],
  donor: ["#FFF1D9", "#D97706"],
  success: ["#E3F5E9", "#16A34A"],
  merge: ["#F1E9FE", "#7C3AED"],
  left: ["#E6F0FF", "#3B82F6"],
  right: ["#F5EAFD", "#9333EA"],
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

/** Ink colours used directly on the canvas (ghost slots, soft drop shadows). */
export const INK = { faint: "#8C8478", shadow: "#000000" } as const;

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
