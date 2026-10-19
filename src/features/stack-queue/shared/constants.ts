import type { LegendItem } from "@/components/visualizer";
import { EDGE, PAPER, TONE_COLOR, VIZ, type Triple } from "@/lib/theme";
import type { ChipTone } from "./types";

/** [fill, stroke, text] for every chip role (paper-white elements, soft tints for states). */
export const CHIP: Record<ChipTone, Triple> = {
  base: VIZ.base,
  new: VIZ.compare,
  active: VIZ.active,
  ok: VIZ.success,
  danger: VIZ.danger,
  out: VIZ.merge,
  dim: VIZ.dim,
};

/** Pointer colours, the same in every mode. */
export const PTR = {
  top: VIZ.pivot[1],
  front: TONE_COLOR.ok,
  rear: TONE_COLOR.info,
} as const;

/** Ink-on-paper chrome for the canvases (walls, slot outlines, faint labels, state tints). */
export const INK = {
  wall: EDGE.base,
  slot: "rgba(26,26,26,0.18)",
  line: "rgba(26,26,26,0.12)",
  text: PAPER.ink,
  dim: PAPER.inkDim,
  faint: PAPER.inkFaint,
  card: PAPER.card,
  well: PAPER.well,
  danger: VIZ.danger[1],
  dangerTint: "rgba(220,38,38,0.10)",
  warn: VIZ.active[1],
  warnTint: "rgba(217,119,6,0.12)",
  info: VIZ.compare[1],
  infoTint: "rgba(37,99,235,0.07)",
  ok: VIZ.success[1],
  okTint: "rgba(22,163,74,0.10)",
  /** Soft neutral shadow — the only kind the paper theme allows. */
  shadow: "0 1px 2px rgba(0,0,0,0.06)",
  none: "0 0 0 rgba(0,0,0,0)",
} as const;

export const EASE = [0.4, 0, 0.2, 1] as const;

export const chipLegend = (extra: readonly LegendItem[] = []): LegendItem[] => [
  { label: "Stored element", color: CHIP.base[0], stroke: CHIP.base[1] },
  { label: "Incoming", color: CHIP.new[0], stroke: CHIP.new[1] },
  { label: "Being read", color: CHIP.active[0], stroke: CHIP.active[1] },
  { label: "Just written", color: CHIP.ok[0], stroke: CHIP.ok[1] },
  { label: "Leaving / returned", color: CHIP.out[0], stroke: CHIP.out[1] },
  { label: "Error", color: CHIP.danger[0], stroke: CHIP.danger[1] },
  ...extra,
];
