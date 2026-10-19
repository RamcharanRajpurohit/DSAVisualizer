import type { Lesson } from "@/lib/lesson";

export const INSERTION_LESSON: Lesson = {
  id: "sorting.insertion",
  title: "Insertion sort",
  slides: [
    {
      title: "Like sorting a hand of cards",
      body: "Keep the left part `A[0..i−1]` sorted. Take the next element and slide it left into its place.",
      tryIt: [{ label: "Watch it on 7 values", action: "small" }],
    },
    {
      title: "One insertion",
      body:
        "Lift the **key** `A[i]` out and shift bigger elements one slot right. Then drop the key into the gap at " +
        "`A[j + 1]`.",
      tryIt: [{ label: "Play current input", action: "sort" }],
    },
    {
      title: "Worked example",
      body:
        "On `[38, 27, 43, 3, 9, 82, 10]`, key 3 shifts 43, 38 and 27 and lands at index 0. The whole run takes **15 " +
        "comparisons and 11 shifts**. Each shift fixes exactly one **inversion** (out-of-order pair).",
      tryIt: [{ label: "Run this example", action: "small" }],
    },
    {
      title: "Best O(n), worst O(n²)",
      body:
        "Sorted input: every key stops at once, so **n − 1 comparisons and 0 shifts**. Reversed input: every key shifts " +
        "all the way, n(n−1)/2 in total. The cost is O(n + inversions), so it is **adaptive**.",
      tryIt: [
        { label: "Best case", action: "best" },
        { label: "Worst case", action: "worst" },
      ],
    },
    {
      title: "Stable, in place, online",
      body:
        "The key stops at an equal value, so it is **stable**, and one temporary makes it **in place**. It is also " +
        "**online**: it can sort items as they arrive.",
      tryIt: [{ label: "Few unique values", action: "fewUnique" }],
    },
    {
      title: "When to use it",
      body:
        "It is the best simple sort for tiny arrays and **nearly sorted** data. That is why Timsort and introsort (C++ " +
        "`std::sort`) use it for small slices. Binary search finds the spot faster, but the shifts keep it O(n²).",
      tryIt: [
        { label: "Nearly sorted", action: "nearlySorted" },
        { label: "Next: Shell sort", action: "algo:shell" },
      ],
    },
  ],
};
