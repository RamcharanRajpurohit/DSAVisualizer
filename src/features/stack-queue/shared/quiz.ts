/*
 * Helpers for the "Quiz me" generators (pure TS, no path aliases at runtime — runnable with tsx).
 *
 * Every generator returns a `SQQuestion`: a normal QuizQuestion plus `type` and `meta` describing the
 * exact scenario asked about, so a script can replay the scenario through the engine and check the answer.
 */
import type { QuizQuestion } from "@/lib/lesson";

export type Rng = () => number;

export interface SQQuestion extends QuizQuestion {
  /** Which question generator produced it. */
  type: string;
  /** The scenario's parameters (k, x, index…), for verification. */
  meta: Record<string, unknown>;
}

export const rint = (rng: Rng, a: number, b: number) => a + Math.floor(rng() * (b - a + 1));
export const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];

export function shuffled<T>(rng: Rng, xs: readonly T[]): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Multiple choice from a correct answer and candidate distractors: duplicates (and anything equal to the
 * answer) are dropped, at most `max` choices are kept, and the order is shuffled.
 * Returns null when fewer than three distinct choices remain.
 */
export function mcq(
  rng: Rng, type: string, prompt: string, correct: string, distractors: readonly (string | null | undefined)[],
  explain: string, meta: Record<string, unknown> = {}, max = 4,
): SQQuestion | null {
  const seen = new Set([correct]);
  const ds: string[] = [];
  for (const d of distractors) {
    if (d == null || seen.has(d)) continue;
    seen.add(d);
    ds.push(d);
    if (ds.length >= max - 1) break;
  }
  if (ds.length < 2) return null;
  const choices = shuffled(rng, [correct, ...ds]);
  return { prompt, choices, answer: choices.indexOf(correct), explain, type, meta };
}

/** Plausible wrong numbers around `n` (nearest first), never negative unless `allowNegative`. */
export function nearNumbers(n: number, count = 4, allowNegative = false): string[] {
  const out: string[] = [];
  for (let d = 1; out.length < count && d < 50; d++) {
    for (const c of [n + d, n - d]) if ((allowNegative || c >= 0) && out.length < count) out.push(String(c));
  }
  return out;
}

/** Try the generators in random order and return the first question one of them can ask. */
export function firstQuestion(rng: Rng, gens: readonly (() => SQQuestion | null)[]): SQQuestion | null {
  for (const g of shuffled(rng, gens)) {
    const q = g();
    if (q) return q;
  }
  return null;
}

export const listText = (xs: readonly (string | number)[]) => (xs.length ? xs.join(", ") : "nothing");

/** A random value 1–99 that is not in `taken` (for "push(x)" style questions). */
export function fresh(taken: readonly number[], rng: Rng): number {
  for (let k = 0; k < 500; k++) {
    const v = rint(rng, 1, 99);
    if (!taken.includes(v)) return v;
  }
  return 100;
}
