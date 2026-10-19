import { EDGE, TONE_COLOR, VIZ, type Triple } from "@/lib/theme";
import { isComp } from "./recorder";
import type { ChipTone, EdgeState, NodeState } from "./types";

const hslHex = (h: number, s: number, l: number) => {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return "#" + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
};

/** 12 well-separated colours for union-find sets / SCCs: [fill, stroke] (golden-angle hue steps). */
export const PALETTE: readonly (readonly [string, string])[] = Array.from({ length: 12 }, (_, i) => {
  const h = (205 + i * 137.508) % 360;
  return [hslHex(h, 60, 38), hslHex(h, 95, 72)] as const;
});

export interface EdgeStyle {
  stroke: string;
  width: number;
  opacity: number;
  dash?: number[];
}

/** Graph-specific palette — the shared VIZ / EDGE colours where they match. */
export const GTHEME = {
  node: {
    base: ["#2f2f39", "#6c6c78", "#ececec"],
    frontier: VIZ.compare,
    current: VIZ.active,
    visited: VIZ.visited,
    danger: VIZ.danger,
    selected: VIZ.merge,
  } satisfies Record<string, Triple>,
  edge: {
    base: { stroke: EDGE.base, width: 2.5, opacity: 0.9 },
    active: { stroke: EDGE.active, width: 4.5, opacity: 1 },
    tree: { stroke: EDGE.tree, width: 4.5, opacity: 1 },
    frontier: { stroke: EDGE.frontier, width: 3.5, opacity: 1, dash: [9, 6] },
    rejected: { stroke: EDGE.rejected, width: 3, opacity: 1, dash: [6, 6] },
    faded: { stroke: EDGE.base, width: 2, opacity: 0.16 },
  } satisfies Record<string, EdgeStyle>,
  chip: {
    base: ["#2b2b35", "#6c6c78", "#ececec"],
    frontier: VIZ.compare,
    current: VIZ.active,
    ok: VIZ.visited,
    dim: VIZ.dim,
    danger: VIZ.danger,
  } satisfies Record<string, Triple>,
  badge: ["#0f1b27", "#39aaff", "#cfe8ff"] as Triple,
  badgeHot: VIZ.active,
  startRing: "#00f2ff",
  rubber: TONE_COLOR.merge,
  deleteHover: TONE_COLOR.danger,
  weightBg: "#16161c",
  weightBgNeg: "#3a1414",
  weightText: "#d6d6e0",
  weightTextNeg: "#ff9a9a",
  weightStroke: "#55555f",
  hud: "#8a8a96",
  hint: "#6c6c78",
  rowTitle: "#6c6c78",
  stripBg: "rgba(10, 10, 14, 0.72)",
  stripLine: "rgba(255, 255, 255, 0.07)",
} as const;

const compColors = (tag: string): Triple => {
  const p = PALETTE[Number(tag.slice(1)) % PALETTE.length];
  return [p[0], p[1], "#ffffff"];
};

export function nodeColors(state: NodeState | null | undefined): Triple {
  if (!state) return GTHEME.node.base;
  if (isComp(state)) return compColors(state);
  return GTHEME.node[state] ?? GTHEME.node.base;
}

export function edgeStyle(state: EdgeState | null | undefined): EdgeStyle {
  if (!state) return GTHEME.edge.base;
  if (isComp(state)) return { stroke: PALETTE[Number(state.slice(1)) % PALETTE.length][1], width: 4, opacity: 1 };
  return GTHEME.edge[state] ?? GTHEME.edge.base;
}

export function chipColors(tone: ChipTone): Triple {
  if (isComp(tone)) return compColors(tone);
  return GTHEME.chip[tone] ?? GTHEME.chip.base;
}
