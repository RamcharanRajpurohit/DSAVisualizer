import { EDGE, TONE_COLOR, TONE_LABEL, VIZ, type Triple } from "@/lib/theme";

/** Node colour roles used by the tree engines (all from the shared palette). */
export type NodeStyle = "base" | "compare" | "moving" | "danger" | "success" | "left" | "merge" | "visited";

export const NODE: Record<NodeStyle, Triple> = {
  base: VIZ.base,
  compare: VIZ.compare,
  moving: VIZ.moving,
  danger: VIZ.danger,
  success: VIZ.success,
  left: VIZ.left,
  merge: VIZ.merge,
  // A quieter green for "already output" during traversals.
  visited: ["#0f4a2c", "#2ee68a", "#d6ffe9"],
};

/** Glow colour around highlighted nodes (Konva shadow). */
export const GLOW: Partial<Record<NodeStyle, string>> = {
  compare: "#39aaff",
  moving: "#ffb000",
  danger: "#ff5c5c",
  success: "#2ee68a",
  left: "#7cc4ff",
  merge: "#c08bff",
};

export type LineStyle = "base" | "active" | "cut" | "fresh";

export const LINE: Record<LineStyle, { stroke: string; width: number; dash?: number[] }> = {
  base: { stroke: EDGE.base, width: 2.5 },
  active: { stroke: EDGE.active, width: 4 },
  cut: { stroke: EDGE.rejected, width: 3, dash: [6, 6] },
  fresh: { stroke: EDGE.tree, width: 4 },
};

/** Balance-factor badge: [background, border, text]. */
export const BADGE = {
  ok: ["#1b1b22", "#55555f", "#b8b8c4"],
  lean: ["#1e2a3a", "#39aaff", "#9fd3ff"],
  bad: ["#4a1b1b", "#ff5c5c", "#ffb0b0"],
} as const;

export type LabelTone = "info" | "warn" | "danger" | "ok" | "merge";

export const LABEL: Record<LabelTone, readonly [string, string]> = {
  info: TONE_LABEL.info,
  warn: TONE_LABEL.warn,
  danger: TONE_LABEL.danger,
  ok: TONE_LABEL.ok,
  merge: TONE_LABEL.merge,
};

export const ARROW = { z: TONE_COLOR.danger, y: TONE_COLOR.warn };

export const MUTED_TEXT = "#7a7a86";
export const HOLE_STROKE = "#8a8a96";
