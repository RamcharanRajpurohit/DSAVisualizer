import { VIZ, type Triple } from "@/lib/theme";
import type { NodeMark } from "./engine/types";

/** Fill / stroke / text for each node state ("ink on paper": soft tints, strong outlines, dark text). */
export const MARK: Record<NodeMark, Triple> = {
  ...VIZ,
  new: ["#D8F1F3", "#0E7490", "#164E63"],
  visited: ["#E6F1E9", "#6FAE86", "#2F5E40"],
};

/** Paper tones used by the drawing. */
export const PAPER = {
  cell: "#FBF8F2",
  hot: "#FCE4EF",
  chip: "#FBF8F2",
  chipStroke: "#B9B0A2",
  faint: "#8C8478",
  tag: "#FFFDF8",
} as const;

/** Pointer arrow colours. */
export const PTR_COLOR = {
  next: "#2563EB",
  prev: "#C2410C",
  hot: "#DB2777",
  removed: "#DC2626",
  dim: "#C9C0B2",
} as const;

/** Named pointer variables: ink colour and stacking order (lower = closer to the node). */
export const TAGS: Record<string, { color: string; order: number }> = {
  head: { color: "#15803D", order: 0 },
  tail: { color: "#BE185D", order: 1 },
  dummy: { color: "#6B6358", order: 2 },
  a: { color: "#2563EB", order: 3 },
  b: { color: "#9333EA", order: 4 },
  curr: { color: "#B45309", order: 5 },
  prev: { color: "#7C3AED", order: 6 },
  next: { color: "#1D4ED8", order: 7 },
  new: { color: "#0E7490", order: 8 },
  temp: { color: "#DC2626", order: 9 },
  last: { color: "#C2410C", order: 10 },
  slow: { color: "#2563EB", order: 11 },
  fast: { color: "#9333EA", order: 12 },
};
export const tagStyle = (name: string) => TAGS[name] ?? { color: "#6B6358", order: 50 };

export const BADGE_COLOR = {
  ok: "#15803D",
  warn: "#B45309",
  danger: "#DC2626",
  info: "#2563EB",
  merge: "#7C3AED",
} as const;

/** Deterministic list the page opens with. */
export const DEFAULT_VALUES = [12, 7, 33, 5, 21, 48];

export const PRESETS: { label: string; values: number[] }[] = [
  { label: "Classic", values: [12, 7, 33, 5, 21, 48] },
  { label: "Sorted", values: [3, 8, 15, 22, 37, 41, 56] },
  { label: "Duplicates", values: [4, 9, 4, 17, 9, 9, 23, 4] },
  { label: "Long", values: [31, 6, 72, 14, 58, 3, 90, 27, 45, 11, 66, 39] },
  { label: "One node", values: [42] },
];

export const MERGE_DEFAULT = { a: [2, 9, 14, 30], b: [5, 7, 21, 40, 52] };
