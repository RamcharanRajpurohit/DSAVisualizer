import type { ComplexityRow, LegendItem } from "@/components/visualizer";
import { EDGE, TONE_COLOR, VIZ, type Triple } from "@/lib/theme";
import type { EdgeMark, HeapKind, Mark } from "./engine/types";

/** Five full levels (1 + 2 + 4 + 8 + 16) — the most that stays readable on a laptop screen. */
export const CAPACITY = 31;

/** Deterministic example the page opens with (heapified on load, so it is already a valid heap). */
export const DEFAULT_VALUES = [35, 12, 48, 7, 61, 23, 9, 54, 18, 40] as const;

export const FILL_SIZES = [7, 10, 15, 20, 31] as const;

export const PRESETS: readonly { id: string; label: string; title: string }[] = [
  { id: "random", label: "Random", title: "Random distinct values" },
  { id: "sorted", label: "Sorted", title: "Already ascending — worst case for a max-heap build" },
  { id: "reversed", label: "Reversed", title: "Descending — already a max-heap" },
  { id: "dups", label: "Duplicates", title: "Many equal keys" },
  { id: "full", label: "31 keys", title: "Fill all five levels" },
];

/** [fill, stroke, text] per highlight. */
export const SORTED_STYLE: Triple = ["#EEF3EC", "#8DBB9B", "#2F5D3F"];
export const REMOVED_STYLE: Triple = ["#FFE4E6", "#E11D48", "#881337"];

export const MARK_STYLE: Record<Mark | "base", Triple> = {
  base: VIZ.base,
  current: VIZ.active,
  compare: VIZ.compare,
  best: VIZ.merge,
  violation: VIZ.danger,
  ok: VIZ.success,
  new: VIZ.pivot,
  removed: REMOVED_STYLE,
};

export interface EdgeStyle {
  stroke: string;
  width: number;
  dash?: string;
  opacity: number;
}

export const EDGE_STYLE: Record<EdgeMark | "base" | "bad" | "locked", EdgeStyle> = {
  base: { stroke: EDGE.base, width: 2.5, opacity: 0.85 },
  compare: { stroke: EDGE.active, width: 4, opacity: 1 },
  swap: { stroke: EDGE.frontier, width: 5, opacity: 1 },
  violation: { stroke: EDGE.rejected, width: 4, opacity: 1 },
  ok: { stroke: EDGE.tree, width: 4, opacity: 1 },
  bad: { stroke: EDGE.rejected, width: 2.5, dash: "7 5", opacity: 0.8 },
  locked: { stroke: VIZ.dim[1], width: 1.5, dash: "3 5", opacity: 0.8 },
};

export const POINTER_COLOR: Record<string, string> = {
  i: TONE_COLOR.warn,
  k: TONE_COLOR.warn,
  p: TONE_COLOR.info,
  l: TONE_COLOR.info,
  r: TONE_COLOR.info,
  end: TONE_COLOR.ok,
  first: TONE_COLOR.ok,
  "a[0]": TONE_COLOR.ok,
};

export const LEGEND: readonly LegendItem[] = [
  { label: "Sifting key", color: VIZ.active[0], stroke: VIZ.active[1], kind: "dot" },
  { label: "Comparing", color: VIZ.compare[0], stroke: VIZ.compare[1], kind: "dot" },
  { label: "Chosen child", color: VIZ.merge[0], stroke: VIZ.merge[1], kind: "dot" },
  { label: "Violation", color: VIZ.danger[0], stroke: VIZ.danger[1], kind: "dot" },
  { label: "In order", color: VIZ.success[0], stroke: VIZ.success[1], kind: "dot" },
  { label: "New / updated", color: VIZ.pivot[0], stroke: VIZ.pivot[1], kind: "dot" },
  { label: "Removed", color: REMOVED_STYLE[0], stroke: REMOVED_STYLE[1], kind: "dot" },
  { label: "Sorted (locked)", color: SORTED_STYLE[0], stroke: SORTED_STYLE[1], kind: "swatch" },
  { label: "Order broken", color: EDGE.rejected, kind: "dashed" },
  { label: "Swap path", color: EDGE.frontier, kind: "line" },
];

export const COMPLEXITY: readonly ComplexityRow[] = [
  { op: "peek", best: "O(1)", worst: "O(1)" },
  { op: "insert", best: "O(1)", avg: "O(1)", worst: "O(log n)" },
  { op: "extract", best: "O(1)", avg: "O(log n)", worst: "O(log n)" },
  { op: "delete / update", best: "O(1)", worst: "O(log n)" },
  { op: "build-heap", best: "O(n)", avg: "O(n)", worst: "O(n)", space: "O(1)" },
  { op: "heap sort", best: "O(n log n)", avg: "O(n log n)", worst: "O(n log n)", space: "O(1)" },
];

export const COMPLEXITY_NOTE =
  "Build-heap is linear, not n log n: n/2 leaves do no work, n/4 nodes sink ≤ 1 level, n/8 ≤ 2 … Σ h·n/2^(h+1) < n. " +
  "Heap sort is in place but not stable.";

export const kindLabel = (k: HeapKind) => (k === "max" ? "Max-heap" : "Min-heap");
