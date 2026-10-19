import type { LegendItem } from "@/components/visualizer";
import { TONE_COLOR, VIZ, type Triple } from "@/lib/theme";
import type { ChipTone } from "./types";

/** [fill, stroke, text] for every chip role. */
export const CHIP: Record<ChipTone, Triple> = {
  base: ["#2a3446", "#5d7ca6", "#e8f1ff"],
  new: VIZ.compare,
  active: VIZ.active,
  ok: VIZ.success,
  danger: VIZ.danger,
  out: VIZ.merge,
  dim: VIZ.dim,
};

/** Pointer colours, the same in every mode. */
export const PTR = {
  top: "#ff7ac6",
  front: TONE_COLOR.ok,
  rear: TONE_COLOR.info,
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
