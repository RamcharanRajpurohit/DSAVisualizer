/*
 * Shared model for the stack applications. Every app scans an input "tape" of tokens left to right with
 * a cursor, keeps a stack, and may write to an output (postfix queue, or one result per input element).
 * Chips keep their id when they move between tape → stack → output, so the canvas can fly them around.
 */
import type { Tone } from "@/lib/theme";
import { Recorder } from "../shared/recorder";
import type { ChipTone, SnapStep, Vars } from "../shared/types";

export type AppKind = "brackets" | "infix" | "postfix" | "nge";

/** How a tape cell looks. */
export type Mark = "idle" | "current" | "done" | "skip" | "wait" | "ok" | "error";

export interface Tok {
  id: string;
  text: string;
}

export interface SItem {
  id: string;
  text: string;
  /** Tape index the chip came from (it flies in from there). */
  src?: number;
  /** Small caption, e.g. "i=2". */
  sub?: string;
  /** Exact numeric value when `text` is a rounded display of it (postfix evaluation). */
  num?: number;
}

export interface AppSnap {
  tokens: readonly Tok[];
  marks: readonly Mark[];
  /** Index of the token being processed; -1 before the scan, tokens.length after it. */
  cursor: number;
  /** Bottom → top. */
  stack: readonly SItem[];
  /** Postfix output queue (infix → postfix). */
  output: readonly SItem[];
  /** One result per token (next greater element). */
  aligned: readonly (SItem | null)[] | null;
}

export interface AppFx {
  hl?: Record<string, ChipTone>;
  /** Operands lifted off the stack for a computation (postfix evaluation). */
  floats?: { item: SItem; slot: "a" | "b" }[];
  /** Small on-canvas card explaining the current comparison / computation. */
  card?: { title: string; body: string; tone: Tone };
  verdict?: { text: string; tone: Tone };
  /** Operators being compared in the precedence table (infix → postfix). */
  prec?: { incoming?: string; top?: string };
  stackAlert?: boolean;
}

export type AppStep = SnapStep<AppKind, AppSnap, AppFx>;
export type AppRec = Recorder<AppKind, AppSnap, AppFx>;

export const MAX_TOKENS = 32;

export function newRec(kind: AppKind, tokens: readonly Tok[], withAligned = false): AppRec {
  const s: AppSnap = {
    tokens,
    marks: tokens.map(() => "idle"),
    cursor: -1,
    stack: [],
    output: [],
    aligned: withAligned ? tokens.map(() => null) : null,
  };
  return new Recorder<AppKind, AppSnap, AppFx>(s, kind, (st): Vars => ({ "stack size": st.stack.length }));
}

export const toks = (texts: readonly string[]): Tok[] => texts.map((text, i) => ({ id: `t${i}`, text }));

/** Immutable helpers on the recorder's snapshot. */
export const mark = (R: AppRec, i: number, m: Mark) => {
  const marks = R.s.marks.slice();
  marks[i] = m;
  R.s = { ...R.s, marks };
};
export const markAll = (R: AppRec, idx: readonly number[], m: Mark) => {
  const marks = R.s.marks.slice();
  for (const i of idx) marks[i] = m;
  R.s = { ...R.s, marks };
};
export const setCursor = (R: AppRec, i: number) => {
  R.s = { ...R.s, cursor: i };
};
export const push = (R: AppRec, it: SItem) => {
  R.s = { ...R.s, stack: [...R.s.stack, it] };
};
export const pop = (R: AppRec): SItem | undefined => {
  const top = R.s.stack[R.s.stack.length - 1];
  if (top) R.s = { ...R.s, stack: R.s.stack.slice(0, -1) };
  return top;
};
export const peekTop = (R: AppRec): SItem | undefined => R.s.stack[R.s.stack.length - 1];
export const emit = (R: AppRec, it: SItem) => {
  R.s = { ...R.s, output: [...R.s.output, it] };
};

/** A one-step run that just explains why the input can't be processed. */
export function invalid(kind: AppKind, title: string, detail: string, tokens: readonly Tok[] = [], badIndex = -1, tone: Tone = "warn"): AppStep[] {
  const R = newRec(kind, tokens, kind === "nge");
  if (badIndex >= 0) {
    mark(R, badIndex, "error");
    setCursor(R, badIndex);
  }
  R.snap(title, detail, { tone, fx: { verdict: { text: tone === "danger" ? "Invalid input" : "Nothing to do yet", tone } } });
  return R.steps;
}

export const stackText = (s: AppSnap) => (s.stack.length ? s.stack.map((x) => x.text).join(" ") : "empty");
