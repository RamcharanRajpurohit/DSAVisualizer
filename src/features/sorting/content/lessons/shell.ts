import type { Lesson } from "@/lib/lesson";

export const SHELL_LESSON: Lesson = {
  id: "sorting.shell",
  title: "Shell sort",
  slides: [
    {
      title: "Fix far-away values first",
      body:
        "Insertion sort moves values one slot at a time. Shell sort first sorts elements a **gap** apart, so values " +
        "jump far, then shrinks the gap down to 1.",
      tryIt: [{ label: "Watch it on 7 values", action: "small" }],
    },
    {
      title: "How the gaps work",
      body:
        "For gaps `n/2, n/4, …, 1`, run insertion sort where the neighbour of `A[i]` is `A[i − gap]`. The last pass, " +
        "gap 1, is plain insertion sort on an almost sorted array.",
      tryIt: [{ label: "Play current input", action: "sort" }],
    },
    {
      title: "Worked example",
      body:
        "For n = 7 the gaps are 3 and 1. Gap 3 sorts {38, 3, 10}, {27, 9} and {43, 82} separately, giving " +
        "`[3, 9, 43, 10, 27, 82, 38]`. Total: **7 shifts**, against 11 for plain insertion sort.",
      tryIt: [
        { label: "Run this example", action: "small" },
        { label: "Compare insertion sort", action: "algo:insertion" },
      ],
    },
    {
      title: "Complexity depends on the gaps",
      body:
        "Halving gaps (used here) are **Θ(n²)** in the worst case. Knuth's gaps 1, 4, 13, 40, … give O(n^1.5), and " +
        "Ciura's gaps are the fastest known in practice.",
      tryIt: [
        { label: "Reversed input", action: "worst" },
        { label: "Sorted input", action: "best" },
      ],
    },
    {
      title: "Not stable, but in place",
      body:
        "A long jump can pass over an equal value, so it is **not stable**. It is **in place** and needs no recursion, " +
        "which suits embedded code.",
      tryIt: [{ label: "Few unique values", action: "fewUnique" }],
    },
    {
      title: "Pitfalls",
      body:
        "The last gap must be **1**, or the array may stay unsorted. Gaps that share factors, like powers of two, " +
        "waste work.",
      tryIt: [
        { label: "Nearly sorted", action: "nearlySorted" },
        { label: "Next: merge sort", action: "algo:merge" },
      ],
    },
  ],
};
