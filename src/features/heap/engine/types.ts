import type { StepBase } from "@/lib/player/types";
import type { Tone } from "@/lib/theme";

export type HeapKind = "min" | "max";

/**
 * One key in the heap. `id` is its identity: it never changes while the key moves around, so the
 * renderer can glide the same circle / array cell from slot to slot (swaps travel along the edge).
 */
export interface HeapItem {
  readonly id: number;
  readonly v: number;
}

/** Which operation a step belongs to (selects the pseudocode listing). */
export type OpCode = "idle" | "insert" | "extract" | "peek" | "delete" | "update" | "build" | "sort";

/** Highlight for one array slot (tree node + array cell share it). */
export type Mark =
  | "current" // the key being sifted
  | "compare" // a key it is being compared with
  | "best" // the chosen (larger / smaller) child
  | "violation" // heap property broken between this pair
  | "ok" // in order / settled
  | "new" // freshly inserted or updated key
  | "removed"; // about to leave the heap

/** Highlight for the tree edge parent(c) → c, keyed by the child index c. */
export type EdgeMark = "compare" | "swap" | "violation" | "ok";

/** On-canvas label pointing at a tree node (by index) or at a removed key in the tray (by id). */
export interface Callout {
  key: string;
  text: string;
  tone: Tone;
  at?: number;
  outId?: number;
}

/** Connector drawn under the array between two cells (parent ↔ child index relation). */
export interface Arc {
  from: number;
  to: number;
  label: string;
  tone: Tone;
}

/** A key that left the heap during this operation (shown in the "removed" tray). */
export interface OutItem {
  item: HeapItem;
  label: string;
}

/** A complete picture of the heap at one moment of an operation. */
export interface HeapStep extends StepBase {
  op: OpCode;
  kind: HeapKind;
  /** The whole backing array (during heap sort it also holds the sorted tail). */
  arr: readonly HeapItem[];
  /** Heap size n. Slots ≥ size are the sorted region during heap sort. */
  size: number;
  sorting: boolean;
  marks: Readonly<Record<number, Mark>>;
  edges: Readonly<Record<number, EdgeMark>>;
  /** Child indices whose edge to the parent currently violates the heap property. */
  bad: readonly number[];
  callouts: readonly Callout[];
  arcs: readonly Arc[];
  /** Named pointers under the array, e.g. { i: 4, p: 1 }. */
  ptrs: Readonly<Record<string, number>>;
  /** Index arithmetic for this step, e.g. "parent(5) = ⌊(5 − 1) / 2⌋ = 2". */
  formula?: string;
  out: readonly OutItem[];
  /** Two text lines per tree level for the left gutter (build-heap shows heights here). */
  levelNotes?: readonly (readonly string[])[];
  /** Ids of the two keys that were just swapped [moved up, moved down]. */
  swap?: readonly [number, number];
}

export interface OpResult {
  steps: HeapStep[];
  /** The heap after the operation (what the next operation starts from). */
  final: HeapItem[];
}
