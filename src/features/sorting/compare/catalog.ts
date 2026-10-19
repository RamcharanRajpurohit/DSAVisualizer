/*
 * What Compare mode can race (columns) and on what (rows). Pure data + seeded input builders.
 */
import { seededRandom } from "../shared/items";
import type { CompareAlgoKey } from "./trace";

export interface CompareAlgo {
  key: CompareAlgoKey;
  name: string;
  /** Short label for narrow column headers. */
  short: string;
  /** Average-case growth, shown under the column name. */
  big: string;
  /** Raced by default. */
  initial: boolean;
}

export const COMPARE_ALGOS: readonly CompareAlgo[] = [
  { key: "bubble", name: "Bubble", short: "Bubble", big: "n²", initial: true },
  { key: "selection", name: "Selection", short: "Select", big: "n²", initial: true },
  { key: "insertion", name: "Insertion", short: "Insert", big: "n²", initial: true },
  { key: "shell", name: "Shell", short: "Shell", big: "n^1.5", initial: true },
  { key: "merge", name: "Merge", short: "Merge", big: "n log n", initial: true },
  { key: "quick", name: "Quick", short: "Quick", big: "n log n", initial: true },
  { key: "quick3", name: "Quick · med-3", short: "Quick m3", big: "n log n", initial: false },
  { key: "counting", name: "Counting", short: "Count", big: "n + k", initial: false },
  { key: "radix", name: "Radix (LSD)", short: "Radix", big: "d(n + 10)", initial: false },
];

export const COMPARE_ALGO_KEYS = COMPARE_ALGOS.map((a) => a.key);
export const DEFAULT_COMPARE_ALGOS: readonly CompareAlgoKey[] = COMPARE_ALGOS.filter((a) => a.initial).map((a) => a.key);
export const compareAlgo = (key: CompareAlgoKey) => COMPARE_ALGOS.find((a) => a.key === key) ?? COMPARE_ALGOS[0];

export type InputKind = "random" | "nearly" | "reversed" | "few";

export const INPUT_KINDS: readonly { kind: InputKind; label: string; hint: string }[] = [
  { kind: "random", label: "Random", hint: "Shuffled — the average case" },
  { kind: "nearly", label: "Nearly sorted", hint: "Sorted, then a few neighbours swapped" },
  { kind: "reversed", label: "Reversed", hint: "Descending — every pair is out of order" },
  { kind: "few", label: "Few unique", hint: "Only four distinct values, many duplicates" },
];

export const COMPARE_MIN = 10;
export const COMPARE_MAX = 60;
export const COMPARE_DEFAULT_N = 30;
export const COMPARE_DEFAULT_SEED = 20240611;
export const COMPARE_SPEEDS = [0.25, 0.5, 1, 2, 4, 8] as const;

/** n evenly spread heights in 1…99 (distinct for n ≤ 60), ascending — the classic "staircase". */
function staircase(n: number): number[] {
  return Array.from({ length: n }, (_, k) => Math.max(1, Math.round(((k + 1) * 99) / n)));
}

/** One input per row kind, all built from the same seed so a shared link reproduces them exactly. */
export function makeRowInputs(n: number, seed: number): Record<InputKind, number[]> {
  const rng = seededRandom(seed);
  const pick = (max: number) => Math.floor(rng() * max);
  const base = staircase(n);

  const random = base.slice();
  for (let i = random.length - 1; i > 0; i--) {
    const j = pick(i + 1);
    [random[i], random[j]] = [random[j], random[i]];
  }

  const nearly = base.slice();
  const swaps = Math.max(2, Math.round(n / 8));
  for (let s = 0; s < swaps; s++) {
    const i = pick(n - 1);
    const j = Math.min(n - 1, i + 1 + pick(2));
    [nearly[i], nearly[j]] = [nearly[j], nearly[i]];
  }

  const reversed = base.slice().reverse();

  const levels = [25, 50, 75, 99];
  const few = Array.from({ length: n }, () => levels[pick(levels.length)]);

  return { random, nearly, reversed, few };
}
