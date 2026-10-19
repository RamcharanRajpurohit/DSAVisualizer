import type { ComplexityRow, LegendItem } from "@/components/visualizer";
import { EDGE, VIZ } from "@/lib/theme";

/** Trees the pages open with (deterministic, so there is something to play with immediately). */
export const BST_INITIAL = [50, 30, 70, 20, 40, 60, 80, 35, 45, 90] as const;
export const AVL_INITIAL = [50, 25, 75, 12, 37, 62, 87, 6, 18, 31, 43] as const;

export type PresetId = "balanced" | "skewed" | "zigzag" | "random";

export interface TreePreset {
  id: PresetId;
  label: string;
  /** Tooltip / one-line explanation. */
  hint: string;
  /** Fixed keys; `random` presets generate keys on click. */
  values?: readonly number[];
  /** Insert one by one with full animation (instead of building silently). */
  animate?: boolean;
}

const BALANCED = [50, 25, 75, 12, 37, 62, 87, 6, 18, 31, 43, 56, 68, 81, 93];
const SKEWED = [10, 20, 30, 40, 50, 60, 70];
const ZIGZAG = [50, 10, 45, 15, 40, 20, 35];

export const BST_PRESETS: readonly TreePreset[] = [
  { id: "balanced", label: "Balanced", hint: "A perfect tree: 15 keys in only 4 levels", values: BALANCED },
  { id: "skewed", label: "Skewed", hint: "Sorted input degenerates into a linked list — height 7 for 7 keys", values: SKEWED },
  { id: "zigzag", label: "Zig-zag", hint: "Alternating small/large keys build a zig-zag chain", values: ZIGZAG },
  { id: "random", label: "Random", hint: "Random keys in random order" },
];

export const AVL_PRESETS: readonly TreePreset[] = [
  { id: "balanced", label: "Balanced", hint: "A perfect tree: 15 keys in only 4 levels", values: BALANCED },
  { id: "skewed", label: "Sorted 10…70", hint: "Insert sorted keys one by one and watch rotations keep the tree short", values: SKEWED, animate: true },
  { id: "zigzag", label: "Zig-zag", hint: "Alternating keys trigger the double-rotation (LR / RL) cases", values: ZIGZAG, animate: true },
  { id: "random", label: "Random", hint: "Random keys, built balanced" },
];

export type DemoId = "LL" | "RR" | "LR" | "RL" | "DEL";

export interface AvlDemo {
  title: string;
  short: string;
  /** Play-button label: the operation and the fix, in a few words. */
  line: string;
  base: readonly number[];
  op: "insert" | "delete";
  value: number;
  intro: string;
}

export const AVL_DEMOS: Record<DemoId, AvlDemo> = {
  LL: {
    title: "Left-Left case", short: "LL", line: "Insert 10 · rotate right", base: [50, 30, 70, 20, 40], op: "insert", value: 10,
    intro: "Inserting 10 makes the left side two levels taller than the right. One **right rotation** at 50 fixes it — watch 40 (T2) change parents.",
  },
  RR: {
    title: "Right-Right case", short: "RR", line: "Insert 70 · rotate left", base: [30, 20, 50, 40, 60], op: "insert", value: 70,
    intro: "Inserting 70 makes the right side too tall. One **left rotation** at 30 fixes it — watch 40 (T2) change parents.",
  },
  LR: {
    title: "Left-Right case", short: "LR", line: "Insert 35 · left, then right", base: [50, 30, 70, 20, 40], op: "insert", value: 35,
    intro: "Inserting 35 creates a zig-zag (left, then right). First a **left rotation** at 30 straightens it, then a **right rotation** at 50.",
  },
  RL: {
    title: "Right-Left case", short: "RL", line: "Insert 55 · right, then left", base: [30, 20, 60, 50, 70], op: "insert", value: 55,
    intro: "Inserting 55 creates a zig-zag (right, then left). First a **right rotation** at 60, then a **left rotation** at 30.",
  },
  DEL: {
    title: "Delete → rotation", short: "Delete", line: "Delete 40 · rotate right", base: [30, 20, 40, 10, 25], op: "delete", value: 40,
    intro: "Deleting 40 leaves 30 left-heavy. A **right rotation** at 30 rebalances it, and 25 changes parents.",
  },
};

export const DEMO_IDS: readonly DemoId[] = ["LL", "RR", "LR", "RL", "DEL"];

// ───────────────────────────── insight panels ─────────────────────────────

export const BST_LEGEND: readonly LegendItem[] = [
  { label: "Comparing", color: VIZ.compare[0], stroke: VIZ.compare[1], kind: "dot" },
  { label: "New key / probe", color: VIZ.moving[0], stroke: VIZ.moving[1], kind: "dot" },
  { label: "Found / inserted", color: VIZ.success[0], stroke: VIZ.success[1], kind: "dot" },
  { label: "Delete / not found", color: VIZ.danger[0], stroke: VIZ.danger[1], kind: "dot" },
  { label: "Subtree moving up", color: VIZ.left[0], stroke: VIZ.left[1], kind: "dot" },
  { label: "Output (traversal)", color: VIZ.visited[0], stroke: VIZ.visited[1], kind: "dot" },
  { label: "Search path", color: EDGE.active, kind: "line" },
  { label: "Tree edge", color: EDGE.base, kind: "line" },
];

export const AVL_LEGEND: readonly LegendItem[] = [
  { label: "z · unbalanced", color: VIZ.danger[0], stroke: VIZ.danger[1], kind: "dot" },
  { label: "y · pivot", color: VIZ.moving[0], stroke: VIZ.moving[1], kind: "dot" },
  { label: "T2 · changes parent", color: VIZ.merge[0], stroke: VIZ.merge[1], kind: "dot" },
  { label: "x · grandchild", color: VIZ.left[0], stroke: VIZ.left[1], kind: "dot" },
  { label: "Comparing / checked", color: VIZ.compare[0], stroke: VIZ.compare[1], kind: "dot" },
  { label: "Balanced again", color: VIZ.success[0], stroke: VIZ.success[1], kind: "dot" },
  { label: "Cut link", color: EDGE.rejected, kind: "dashed" },
  { label: "New link", color: EDGE.tree, kind: "line" },
];

export const BST_COMPLEXITY: readonly ComplexityRow[] = [
  { op: "Search", best: "O(1)", avg: "O(log n)", worst: "O(n)" },
  { op: "Insert", best: "O(1)", avg: "O(log n)", worst: "O(n)" },
  { op: "Delete", best: "O(1)", avg: "O(log n)", worst: "O(n)" },
  { op: "Traversal", best: "O(n)", avg: "O(n)", worst: "O(n)" },
];

export const AVL_COMPLEXITY: readonly ComplexityRow[] = [
  { op: "Search", best: "O(1)", avg: "O(log n)", worst: "O(log n)" },
  { op: "Insert", best: "O(log n)", avg: "O(log n)", worst: "O(log n)" },
  { op: "Delete", best: "O(log n)", avg: "O(log n)", worst: "O(log n)" },
  { op: "Rotation", best: "O(1)", avg: "O(1)", worst: "O(1)" },
  { op: "Traversal", best: "O(n)", avg: "O(n)", worst: "O(n)" },
];

export const BST_COMPLEXITY_NOTE =
  "Every operation costs O(height). Random keys give height ≈ log n, but sorted input builds a chain of height n — try the Skewed preset.";

export const AVL_COMPLEXITY_NOTE =
  "Rebalancing keeps the height ≤ 1.44·log₂(n + 2), so every operation is guaranteed O(log n). An insert needs at most one single or double rotation; a delete may rotate at every level on the way up.";
