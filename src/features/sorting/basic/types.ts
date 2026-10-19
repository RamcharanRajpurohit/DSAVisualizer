import type { StepBase } from "@/lib/player/types";
import type { Tone, VizState } from "@/lib/theme";

/**
 * Step shapes recorded by the simple / non-comparison sorts.
 * Type-only module (no runtime imports) so the engines stay runnable with plain `tsx`.
 */

/** One array element. `id` is stable for the whole recording so the renderer can glide it. */
export interface SortItem {
  id: number;
  value: number;
}

/** Colour names a pointer / tag can use (mapped to the theme in the canvas). */
export type PointerColor = "amber" | "blue" | "pink" | "purple" | "green" | "gray";

/** Labelled arrow under the bars, e.g. `i`, `j`, `min`. Same `id` ⇒ it slides between steps. */
export interface Pointer {
  id: string;
  label: string;
  /** Slot index; -1 and n are allowed (just outside the array). */
  at: number;
  color: PointerColor;
}

/** On-canvas speech bubble with a bracket pointing at one or more slots. */
export interface Callout {
  at: readonly number[];
  text: string;
  tone: Tone;
}

/** Per-slot (or per-item) colour state. */
export type Marks = Partial<Record<number, VizState>>;

// ── Bars (bubble / selection / insertion / shell) ─────────────────────────────

/** An element lifted out of the array (insertion-sort key, shell-sort temp). */
export interface FloatingItem {
  item: SortItem;
  /** Slot it hovers above. */
  at: number;
  state: VizState;
  label: string;
}

/** Dashed partition line between `at - 1` and `at`; the tinted region is on `side`. */
export interface Boundary {
  at: number;
  side: "left" | "right";
  label: string;
  /** Colour of the label and the region tint. */
  state: VizState;
}

export interface BarsStep extends StepBase {
  kind: "bars";
  /** The array; `null` is a gap left by a lifted element. */
  slots: (SortItem | null)[];
  /** Colour per slot index. */
  marks: Marks;
  floating: FloatingItem[];
  pointers: Pointer[];
  boundary?: Boundary;
  /** Slots whose items were just exchanged (drawn with an arc). */
  swap?: readonly [number, number];
  callout?: Callout;
  /** Short badge in the canvas corner ("Pass 2 / 7", "gap 4"). */
  tag?: string;
  /** Reserve head-room above the bars for lifted elements (constant per algorithm). */
  liftRoom: boolean;
  done?: boolean;
}

// ── Counting sort ─────────────────────────────────────────────────────────────

export type CountingPhase = "setup" | "count" | "prefix" | "place" | "done";

export interface CountingStep extends StepBase {
  kind: "counting";
  phase: CountingPhase;
  /** Input array A (null once an element has been moved to the output). */
  input: (SortItem | null)[];
  /** Output array B (null = not written yet). */
  output: (SortItem | null)[];
  /** Value counted by each drawn column of C. */
  columns: number[];
  /** C, one entry per drawn column. */
  counts: number[];
  /** Index into the real C (value − lo) for each column. */
  colIndex: number[];
  /** Sparse mode: zero-count values are hidden because the range k is too wide to draw. */
  sparse: boolean;
  lo: number;
  k: number;
  /** Highest value C will ever hold (n) — fixed so the histogram scale never jumps. */
  countMax: number;
  inputMarks: Marks;
  outputMarks: Marks;
  countMarks: Marks;
  /** Prefix-sum arrow from column `from` to column `to`. */
  carry?: { from: number; to: number };
  pointers: Pointer[];
  callout?: { row: "input" | "count" | "output"; at: readonly number[]; text: string; tone: Tone };
  tag?: string;
  done?: boolean;
}

// ── Radix sort (LSD) ──────────────────────────────────────────────────────────

export interface RadixStep extends StepBase {
  kind: "radix";
  /** The array row (null = element currently sitting in a bucket). */
  row: (SortItem | null)[];
  /** Ten FIFO buckets, first-in at the top. */
  buckets: SortItem[][];
  /** Added to every value so keys are non-negative (|min| when there are negatives). */
  offset: number;
  /** Digits in the largest key (fixed). */
  digits: number;
  /** 0 = ones, 1 = tens, … ; -1 before the first pass / after the last. */
  digitPos: number;
  /** Largest bucket occupancy over the whole run (fixed, for sizing). */
  maxStack: number;
  /** Colour per item id. */
  marks: Marks;
  activeBucket?: number;
  pointers: Pointer[];
  callout?: { target: "row" | "bucket"; at: number; text: string; tone: Tone };
  tag?: string;
  done?: boolean;
}

export type BasicSortStep = BarsStep | CountingStep | RadixStep;
