import { RANDOM_MAX, RANDOM_MIN } from "@/config/input";
import { randomValues } from "@/lib/values";
import { randInt } from "@/lib/utils";

export type PresetKind = "random" | "sorted" | "reversed" | "nearly" | "few";

export const PRESETS: readonly { kind: PresetKind; label: string; title: string }[] = [
  { kind: "random", label: "Random", title: "Random — distinct values" },
  { kind: "sorted", label: "Sorted", title: "Already sorted — quick sort's worst case with a last-element pivot" },
  { kind: "reversed", label: "Reversed", title: "Reversed — worst case for many sorts" },
  { kind: "nearly", label: "Nearly", title: "Nearly sorted — a couple of elements out of place" },
  { kind: "few", label: "Dupes", title: "Few unique values — shows stability" },
];

/** The page opens on this array (deterministic, so server and client render the same thing). */
export const DEFAULT_VALUES: readonly number[] = [38, 27, 43, 3, 9, 82, 10];

/**
 * Opening example per algorithm where the default array would hide what makes it interesting:
 * shell sort needs enough elements for several gaps, counting sort a small value range with
 * duplicates, radix sort keys with different digit counts. The topic articles walk through these.
 */
const EXAMPLES: Readonly<Record<string, readonly number[]>> = {
  shell: [62, 83, 18, 53, 7, 17, 95, 86, 47, 69],
  counting: [5, 2, 7, 2, 4, 5, 1, 3],
  radix: [170, 45, 75, 90, 802, 24, 2, 66],
};

/** The example an algorithm's page opens with. */
export const exampleFor = (algoKey: string): readonly number[] => EXAMPLES[algoKey] ?? DEFAULT_VALUES;

/** Build an input array of `n` values of the given kind. Uses Math.random — call from event handlers only. */
export function makePreset(kind: PresetKind, n: number): number[] {
  if (n <= 0) return [];
  switch (kind) {
    case "random":
      return randomValues(n);
    case "sorted":
      return randomValues(n).sort((a, b) => a - b);
    case "reversed":
      return randomValues(n).sort((a, b) => b - a);
    case "nearly": {
      const a = randomValues(n).sort((x, y) => x - y);
      const swaps = Math.max(1, Math.round(n / 6));
      for (let s = 0; s < swaps && n > 1; s++) {
        const i = randInt(0, n - 2);
        const j = Math.min(n - 1, i + randInt(1, 2));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }
    case "few": {
      const k = Math.max(2, Math.min(4, Math.ceil(n / 4)));
      const pool = randomValues(k);
      return Array.from({ length: n }, () => pool[randInt(0, k - 1)]);
    }
  }
}

export const RANDOM_RANGE_TEXT = `${RANDOM_MIN}–${RANDOM_MAX}`;
