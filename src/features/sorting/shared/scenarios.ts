/*
 * Worst / best case inputs per algorithm, for the lesson's "Try it" buttons.
 * Uses Math.random (via the preset builders) — call from event handlers only.
 */
import { VALUE_MAX } from "@/config/input";
import type { Tone } from "@/lib/theme";
import { randInt, shuffle } from "@/lib/utils";
import type { AnySortAlgorithm, SortRunOptions } from "../types";
import { makePreset } from "./presets";

export interface ScenarioNote {
  title: string;
  /** RichText. */
  detail: string;
  tone: Tone;
}

export interface Scenario {
  values: number[];
  /** Options to merge into the algorithm's current options (quick sort's pivot / scheme). */
  opts?: SortRunOptions;
  note: ScenarioNote;
}

const pairs = (n: number) => (n * (n - 1)) / 2;
const log2 = (n: number) => Math.max(1, Math.ceil(Math.log2(Math.max(2, n))));

/** `count` distinct integers in [lo, hi] (fewer when the range is too small). */
function distinctIn(count: number, lo: number, hi: number): number[] {
  const pool = new Set<number>();
  const want = Math.min(count, hi - lo + 1);
  while (pool.size < want) pool.add(randInt(lo, hi));
  return [...pool];
}

export function scenario(algo: AnySortAlgorithm, which: "worst" | "best", n: number): Scenario {
  const worst = which === "worst";
  switch (algo.key) {
    case "bubble":
      return worst
        ? {
            values: makePreset("reversed", n),
            note: {
              title: "Worst case: reversed input",
              detail: `Every one of the n(n−1)/2 = **${pairs(n)}** pairs is out of order, so every comparison triggers a swap and no pass can stop early — O(n²).`,
              tone: "danger",
            },
          }
        : {
            values: makePreset("sorted", n),
            note: {
              title: "Best case: already sorted",
              detail: `The first pass makes n − 1 = **${n - 1}** comparisons, swaps nothing, and the \`swapped\` flag ends the sort — O(n).`,
              tone: "ok",
            },
          };
    case "selection":
      return worst
        ? {
            values: makePreset("reversed", n),
            note: {
              title: "Reversed input",
              detail: `Selection sort always scans the rest of the array for the minimum: n(n−1)/2 = **${pairs(n)}** comparisons on any input. Reversed input only changes the swaps (⌊n/2⌋ = ${Math.floor(n / 2)}).`,
              tone: "danger",
            },
          }
        : {
            values: makePreset("sorted", n),
            note: {
              title: "Sorted input — still quadratic",
              detail: `Still n(n−1)/2 = **${pairs(n)}** comparisons: selection sort can't notice the array is sorted. It just makes **0** swaps.`,
              tone: "warn",
            },
          };
    case "insertion":
      return worst
        ? {
            values: makePreset("reversed", n),
            note: {
              title: "Worst case: reversed input",
              detail: `Each new key must slide past every key before it: n(n−1)/2 = **${pairs(n)}** shifts — O(n²).`,
              tone: "danger",
            },
          }
        : {
            values: makePreset("sorted", n),
            note: {
              title: "Best case: already sorted",
              detail: `Each key is compared once with its left neighbour and stays put: n − 1 = **${n - 1}** comparisons, **0** shifts — O(n).`,
              tone: "ok",
            },
          };
    case "shell":
      return worst
        ? {
            values: makePreset("reversed", n),
            note: {
              title: "Reversed input",
              detail:
                "Insertion sort's worst case — watch the big gaps fix it in a few long jumps. (Shell's n/2 gaps do have Θ(n²) inputs, " +
                "but they are specially constructed.)",
              tone: "warn",
            },
          }
        : {
            values: makePreset("sorted", n),
            note: {
              title: "Best case: already sorted",
              detail: `Every gapped pass only compares (about ${log2(n)} passes × n), nothing moves — O(n log n).`,
              tone: "ok",
            },
          };
    case "merge":
      return worst
        ? {
            values: makePreset("random", n),
            note: {
              title: "Merge sort has no bad input",
              detail:
                `It always splits in half and merges all ⌈log₂ n⌉ = **${log2(n)}** levels, so every input costs O(n log n). ` +
                "Random input needs the most comparisons per merge, because the two runs interleave.",
              tone: "merge",
            },
          }
        : {
            values: makePreset("sorted", n),
            note: {
              title: "Sorted input — still n log n",
              detail:
                "Each merge stops comparing once the left run is used up (about half the comparisons), but the splits and copies are " +
                "identical: merge sort is O(n log n) in every case.",
              tone: "merge",
            },
          };
    case "quick":
      return worst
        ? {
            values: makePreset("sorted", n),
            opts: { pivot: "last", scheme: "lomuto" },
            note: {
              title: "Worst case: sorted input, last-element pivot",
              detail: `Every pivot is the largest key of its range, so each Lomuto partition peels off one element: n(n−1)/2 = **${pairs(n)}** comparisons and recursion depth n.`,
              tone: "danger",
            },
          }
        : {
            values: makePreset("random", n),
            opts: { pivot: "median3" },
            note: {
              title: "Best case: balanced splits",
              detail: `Random input with a median-of-three pivot splits near the middle, so the recursion is about log₂ n ≈ **${log2(n)}** levels deep — O(n log n).`,
              tone: "ok",
            },
          };
    case "counting": {
      if (worst) {
        const values = shuffle([randInt(1, 30), randInt(VALUE_MAX - 30, VALUE_MAX), ...distinctIn(n - 2, 31, VALUE_MAX - 31)]).slice(0, n);
        const k = Math.max(...values) - Math.min(...values) + 1;
        return {
          values,
          note: {
            title: "Worst case: a wide value range",
            detail: `k = max − min + 1 = **${k}** counters for only n = ${n} values. The prefix-sum loop runs k − 1 times — the sparse view hides the zero counters it walks over — so O(n + k) is dominated by k.`,
            tone: "danger",
          },
        };
      }
      const lo = randInt(1, 90);
      const values = Array.from({ length: n }, () => randInt(lo, lo + 4));
      return {
        values,
        note: {
          title: "Best case: a small value range",
          detail: `Only k = **${Math.max(...values) - Math.min(...values) + 1}** counters: counting, prefix sums and placement are all tiny — O(n + k) ≈ O(n). Duplicates show it is stable.`,
          tone: "ok",
        },
      };
    }
    case "radix":
      return worst
        ? {
            values: distinctIn(n, 100, VALUE_MAX),
            note: {
              title: "Worst case: wide range, more digits",
              detail: "Three-digit keys need **3** distribute-and-collect passes (ones, tens, hundreds): cost d·(n + 10) grows with the number of digits.",
              tone: "danger",
            },
          }
        : {
            values: Array.from({ length: n }, () => randInt(0, 9)),
            note: {
              title: "Best case: one digit",
              detail: "Single-digit keys are sorted after **1** pass: d = 1, so the cost is just n + 10 bucket operations.",
              tone: "ok",
            },
          };
    default:
      return {
        values: makePreset(worst ? "reversed" : "sorted", n),
        note: {
          title: worst ? "Reversed input" : "Sorted input",
          detail: worst ? "Descending input is the classic hard case for simple sorts." : "Already sorted input is the classic easy case.",
          tone: worst ? "danger" : "ok",
        },
      };
  }
}
