import { EDGE, TONE_COLOR, TONE_LABEL, VIZ, type Triple } from "@/lib/theme";

/*
 * Tree-engine colours on the light "ink on paper" theme: paper-white nodes with ink outlines,
 * states are soft tints with a strong outline and dark text. No glows — emphasis comes from a
 * thicker outline; shadows are soft and neutral.
 */

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
  visited: VIZ.visited,
};

/** Outline width: highlighted states draw a heavier pen line instead of glowing. */
export const STROKE = { base: 2, emphasis: 3.25 } as const;

/** One soft, neutral drop shadow for nodes and callouts. */
export const SHADOW = { color: "#000000", blur: 3, opacity: 0.12, offsetY: 1 } as const;

export type LineStyle = "base" | "active" | "cut" | "fresh";

export const LINE: Record<LineStyle, { stroke: string; width: number; dash?: number[] }> = {
  base: { stroke: EDGE.base, width: 2 },
  active: { stroke: EDGE.active, width: 3.5 },
  cut: { stroke: EDGE.rejected, width: 2.5, dash: [6, 6] },
  fresh: { stroke: EDGE.tree, width: 3.5 },
};

/** Balance-factor badge: [background, border, text]. */
export const BADGE = {
  ok: ["#fbf8f2", "#c9c0b2", "#4b463f"],
  lean: VIZ.compare,
  bad: VIZ.danger,
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

/** Height labels, the OUTPUT caption. */
export const MUTED_TEXT = "#8c8478";
/** Dashed outline of the hole a deleted two-child node leaves behind. */
export const HOLE_STROKE = "#8c8478";
