import type { ComplexityRow, LegendItem } from "@/components/visualizer";
import { EDGE } from "@/lib/theme";
import { INK, KEY_STYLE, NODE_STYLE } from "./constants";

const node = (label: string, s: keyof typeof NODE_STYLE): LegendItem => ({ label, color: NODE_STYLE[s][0], stroke: NODE_STYLE[s][1] });
const key = (label: string, s: keyof typeof KEY_STYLE): LegendItem => ({ label, color: KEY_STYLE[s][0], stroke: KEY_STYLE[s][1], kind: "dot" });

export const LEGEND: LegendItem[] = [
  node("Node on the path", "visit"),
  node("Overflow / underflow", "danger"),
  node("Sibling that can lend", "donor"),
  node("Merged node", "merge"),
  node("Split: left half", "left"),
  node("Split: right half", "right"),
  key("Key being compared", "compare"),
  key("Key on the move", "moving"),
  key("Found / placed key", "success"),
  key("Key being removed", "danger"),
  { label: "Empty slot (ghost)", color: "transparent", stroke: INK.faint, kind: "dot" },
  { label: "Pointer followed", color: EDGE.active, kind: "line" },
];

export const COMPLEXITY: ComplexityRow[] = [
  { op: "Search", best: "O(1)", avg: "O(log n)", worst: "O(log n)", space: "O(1)" },
  { op: "Insert", best: "O(log n)", avg: "O(log n)", worst: "O(log n)", space: "O(1)" },
  { op: "Delete", best: "O(log n)", avg: "O(log n)", worst: "O(log n)", space: "O(1)" },
  { op: "Storage", worst: "O(n)" },
];

export const COMPLEXITY_NOTE =
  "Levels ≤ log⌈m/2⌉((n+1)/2) + 1, and each operation touches one node per level (plus a few siblings when it rebalances). " +
  "With orders in the hundreds, a lookup among billions of keys reads only 3–4 disk pages.";
