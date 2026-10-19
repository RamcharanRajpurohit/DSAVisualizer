import { VIZ, type Triple } from "@/lib/theme";
import type { NodeMark } from "./engine/types";

/** Fill / stroke / text for each node state. `new` (freshly allocated) is cyan. */
export const MARK: Record<NodeMark, Triple> = {
  ...VIZ,
  new: ["#0b4f5c", "#00e5f2", "#ffffff"],
  visited: ["#1d3a31", "#3f9a72", "#d4f5e4"],
};

/** Pointer arrow colours. */
export const PTR_COLOR = {
  next: "#5ab4ff",
  prev: "#ffa94d",
  hot: "#ffd466",
  removed: "#ff5c5c",
  dim: "#4a4a58",
} as const;

/** Named pointer variables: colour and stacking order (lower = closer to the node). */
export const TAGS: Record<string, { color: string; order: number }> = {
  head: { color: "#2ee68a", order: 0 },
  tail: { color: "#ff7ac6", order: 1 },
  dummy: { color: "#a3a3b2", order: 2 },
  a: { color: "#7cc4ff", order: 3 },
  b: { color: "#dba4ec", order: 4 },
  curr: { color: "#ffb000", order: 5 },
  prev: { color: "#c08bff", order: 6 },
  next: { color: "#39aaff", order: 7 },
  new: { color: "#00e5f2", order: 8 },
  temp: { color: "#ff5c5c", order: 9 },
  last: { color: "#ff9f43", order: 10 },
  slow: { color: "#7cc4ff", order: 11 },
  fast: { color: "#dba4ec", order: 12 },
};
export const tagStyle = (name: string) => TAGS[name] ?? { color: "#a3a3b2", order: 50 };

export const BADGE_COLOR = {
  ok: "#2ee68a",
  warn: "#ffb000",
  danger: "#ff5c5c",
  info: "#39aaff",
  merge: "#c08bff",
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
