import type { StepBase } from "@/lib/player/types";
import type { VizState } from "@/lib/theme";

/** Kinds of list the visualizer can show. */
export type ListKind = "singly" | "doubly" | "circular";

/** A pointer (or the data) field inside a node box. */
export type Field = "next" | "prev" | "data";

/** Colour state of a node box. `new` = freshly allocated (cyan). */
export type NodeMark = VizState | "new";

/** A node of the committed list (what survives between operations). */
export interface ListNode {
  id: string;
  value: number;
  /** Fake heap address, e.g. "0x1a40" — shown under the node. */
  addr: string;
}

/** The committed list between operations. Node order = list order from head. */
export interface ListState {
  kind: ListKind;
  /** Whether the list keeps a `tail` pointer. */
  tailPtr: boolean;
  nodes: ListNode[];
  /** Allocation counter (ids and addresses). */
  seq: number;
}

/**
 * Where a node is drawn. `line` is a logical row of the drawing (merge uses 3: A, B, result);
 * `slot` is the position along the line (fractional = between two nodes, negative = before the first);
 * `lane` 0 is the list itself, lane 1 is just below it (freshly allocated / unlinked nodes).
 */
export interface Place {
  line: number;
  slot: number;
  lane: number;
}

export interface NodeSnap {
  id: string;
  value: number;
  addr: string;
  /** Overrides the value text (e.g. the merge dummy node). */
  label?: string;
  place: Place;
  mark: NodeMark;
  /** Fields written in this very step (they glow). */
  hot: Field[];
  next: string | null;
  prev: string | null;
  /** Small caption shown instead of the address, e.g. "= 42 ✓", "dup", "middle". */
  badge?: string;
  badgeTone?: "ok" | "warn" | "danger" | "info" | "merge";
}

/** A named pointer variable (head, curr, prev, slow…). `to: null` = NULL. */
export interface PtrSnap {
  name: string;
  to: string | null;
  /** Where to draw a NULL pointer (defaults to just after the last node of line 0). */
  at?: Place;
}

export interface LLStep extends StepBase {
  kind: ListKind;
  nodes: NodeSnap[];
  ptrs: PtrSnap[];
  /** Pseudocode shown for this step (composite operations switch code mid-way). */
  code: readonly string[];
  /** Short statement / comparison shown on the canvas, e.g. "new.next = curr.next". */
  callout?: string;
  /** Route cross-row pointers as direct curves (merge) instead of around the margin. */
  direct?: boolean;
}

export type OpId =
  | "idle"
  | "build"
  | "clear"
  | "kind"
  | "tailPtr"
  | "insertHead"
  | "insertTail"
  | "insertAt"
  | "deleteHead"
  | "deleteTail"
  | "deleteAt"
  | "deleteValue"
  | "search"
  | "reverse"
  | "middle"
  | "cycle"
  | "dedupe"
  | "merge"
  | "bug"
  | "invalid";

/** A recorded operation: every step plus the list it leaves behind. */
export interface Recording {
  op: OpId;
  label: string;
  steps: LLStep[];
  final: ListState;
}

/** What the controls ask the engine to do. */
export type OpRequest =
  | { op: "build"; values: number[]; label?: string }
  | { op: "clear" }
  | { op: "kind"; kind: ListKind }
  | { op: "tailPtr"; on: boolean }
  | { op: "insertHead"; values: number[] }
  | { op: "insertTail"; values: number[] }
  | { op: "insertAt"; index: number | null; values: number[] }
  | { op: "deleteHead" }
  | { op: "deleteTail" }
  | { op: "deleteAt"; index: number | null }
  | { op: "deleteValue"; values: number[] }
  | { op: "search"; values: number[] }
  | { op: "reverse" }
  | { op: "middle" }
  | { op: "cycle"; to: number | null }
  | { op: "dedupe" }
  | { op: "merge"; a: number[]; b: number[] }
  | { op: "bug"; index: number | null; value: number };
