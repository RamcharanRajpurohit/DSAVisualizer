/*
 * Step recorder shared by every mode (same idea as the `Rec` class in the legacy graph.js).
 *
 * An operation runs once, up front, against an immutable state object `s`. Whenever something worth
 * showing happens the engine calls `snap(...)`, which stores the CURRENT `s` (states are never mutated,
 * only replaced, so storing the reference is a safe snapshot) together with the explanation, the
 * pseudocode line, the watch variables and any one-step visual effects. The UI then plays the steps
 * back with useStepPlayer — forwards, backwards or scrubbing — because every step is a full picture.
 */
import type { Tone } from "@/lib/theme";
import type { SnapStep, Vars } from "./types";

export interface SnapOptions<F> {
  tone?: Tone;
  line?: number | readonly number[];
  vars?: Vars;
  hold?: number;
  fx?: F;
}

export class Recorder<Op extends string, S, F extends object> {
  readonly steps: SnapStep<Op, S, F>[] = [];

  constructor(
    /** Current state. Replace it (never mutate) to move the structure forward. */
    public s: S,
    /** Operation whose pseudocode the next snaps belong to. */
    public op: Op,
    /** Watch variables derived from the state (top, front, rear, size…). */
    private readonly baseVars: (s: S) => Vars,
  ) {}

  snap(title: string, detail: string, o: SnapOptions<F> = {}): void {
    this.steps.push({
      title,
      detail,
      tone: o.tone ?? "info",
      line: o.line,
      hold: o.hold,
      vars: { ...this.baseVars(this.s), ...o.vars },
      op: this.op,
      s: this.s,
      fx: o.fx ?? ({} as F),
    });
  }
}

/** Result of running one or more operations: the steps to play and the state to keep. */
export interface RunResult<Op extends string, S, F> {
  steps: SnapStep<Op, S, F>[];
  state: S;
}
