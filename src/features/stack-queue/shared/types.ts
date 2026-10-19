import type { StepBase, WatchValue } from "@/lib/player/types";
import type { Tone } from "@/lib/theme";

/** One stored element. `id` is stable for the element's whole life so the renderer can glide it between steps. */
export interface Item {
  id: string;
  v: number;
}

/** Colour role of a chip on the canvas (see CHIP in constants.ts). */
export type ChipTone = "base" | "new" | "active" | "ok" | "danger" | "out" | "dim";

export interface Callout {
  text: string;
  tone: Tone;
}

export type Vars = Record<string, WatchValue>;

/**
 * A recorded step: the usual title / detail / tone / line / vars plus
 *  - `op`  which operation's pseudocode to show,
 *  - `s`   an immutable snapshot of the whole structure,
 *  - `fx`  transient visual effects that belong to this step only (floating element, highlight, callout…).
 */
export interface SnapStep<Op extends string, S, F> extends StepBase {
  op: Op;
  s: S;
  fx: F;
}

export interface PseudoBlock {
  /** Shown in the pseudocode panel header, e.g. "push(x)". */
  title: string;
  lines: readonly string[];
}

export type SQMode = "stack" | "queue" | "circular" | "deque" | "apps";
