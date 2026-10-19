import { EDGE, PAPER, TONE_COLOR, VIZ, type Triple } from "@/lib/theme";
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

/**
 * 12 well-separated colours for union-find sets / SCCs (golden-angle hue steps), drawn like the
 * rest of the paper theme: a soft tint, a strong outline and dark text of the same hue.
 */
export const PALETTE: readonly Triple[] = Array.from({ length: 12 }, (_, i) => {
  const h = (215 + i * 137.508) % 360;
  return [hslHex(h, 85, 90), hslHex(h, 75, 38), hslHex(h, 80, 20)] as const;
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
    base: VIZ.base,
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
    base: VIZ.base,
    frontier: VIZ.compare,
    current: VIZ.active,
    ok: VIZ.visited,
    dim: VIZ.dim,
    danger: VIZ.danger,
  } satisfies Record<string, Triple>,
  badge: [PAPER.well, "rgba(26, 26, 26, 0.35)", PAPER.ink] as Triple,
  badgeHot: VIZ.active,
  startRing: EDGE.active,
  rubber: TONE_COLOR.merge,
  deleteHover: TONE_COLOR.danger,
  weightBg: PAPER.well,
  weightBgNeg: VIZ.danger[0],
  weightText: PAPER.ink,
  weightTextNeg: VIZ.danger[2],
  weightStroke: "rgba(26, 26, 26, 0.22)",
  hud: PAPER.inkDim,
  hint: PAPER.inkFaint,
  rowTitle: PAPER.inkDim,
  stripBg: "rgba(247, 242, 234, 0.94)",
  stripLine: PAPER.line,
  /** The only shadow: soft and neutral, like paper cut-outs. */
  shadow: "#000000",
} as const;

const compColors = (tag: string): Triple => PALETTE[Number(tag.slice(1)) % PALETTE.length];

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
