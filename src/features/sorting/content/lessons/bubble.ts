import type { Lesson } from "@/lib/lesson";

export const BUBBLE_LESSON: Lesson = {
  id: "sorting.bubble",
  title: "Bubble sort",
  slides: [
    {
      title: "Big values bubble up",
      body:
        "Compare **neighbours** and swap them when the left one is bigger. Each sweep carries the largest unsorted value " +
        "to the end, into its **final position**.",
      tryIt: [{ label: "Watch it on 7 values", action: "small" }],
    },
    {
      title: "One pass",
      body:
        "Pass `i` compares `A[j]` with `A[j+1]` for `j = 0 … n−2−i`, so each pass is one step shorter. A pass with **no " +
        "swaps** means the array is sorted, and the `swapped` flag stops early.",
      tryIt: [{ label: "Play current input", action: "sort" }],
    },
    {
      title: "Worked example",
      body:
        "Pass 1 turns `[38, 27, 43, 3, 9, 82, 10]` into `[27, 38, 3, 9, 43, 10, 82]`, and 82 is final. Four passes sort " +
        "it and a swap-free fifth pass ends it: **20 comparisons, 11 swaps**. The small 3 moves left one slot per pass " +
        "(a \"turtle\").",
      tryIt: [{ label: "Run this example", action: "small" }],
    },
    {
      title: "Complexity",
      body:
        "Reversed input makes every comparison a swap: **n(n−1)/2**, so O(n²). Sorted input needs one pass of n − 1 " +
        "comparisons: **O(n)**. The swap count always equals the number of **inversions** (out-of-order pairs).",
      tryIt: [
        { label: "Worst case", action: "worst" },
        { label: "Best case", action: "best" },
      ],
    },
    {
      title: "Stable and in place",
      body:
        "Equal neighbours are never swapped (strict `>`), so equal values keep their order: **stable**. One temporary is " +
        "all it needs: **in place**, O(1) extra memory.",
      tryIt: [{ label: "Few unique values", action: "fewUnique" }],
    },
    {
      title: "When to use it",
      body:
        "Almost never in practice: insertion sort does the same job with fewer writes. In interviews, mention the " +
        "early-exit flag, swaps = inversions, and turtles (fixed by cocktail shaker and comb sort).",
      tryIt: [
        { label: "Nearly sorted", action: "nearlySorted" },
        { label: "Try insertion sort", action: "algo:insertion" },
      ],
    },
  ],
};
