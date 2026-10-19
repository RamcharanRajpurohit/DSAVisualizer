import type { Lesson } from "@/lib/lesson";

export const SELECTION_LESSON: Lesson = {
  id: "sorting.selection",
  title: "Selection sort",
  slides: [
    {
      title: "Pick the smallest, put it first",
      body:
        "The array is a sorted prefix plus an unsorted rest. Each pass **selects** the minimum of the rest and swaps it " +
        "into the next prefix slot.",
      tryIt: [{ label: "Watch it on 7 values", action: "small" }],
    },
    {
      title: "One pass",
      body:
        "Scan `j = i+1 … n−1`, keeping `min` as the index of the smallest value seen. One swap `A[i] ↔ A[min]` then makes " +
        "index `i` **final**.",
      tryIt: [{ label: "Play current input", action: "sort" }],
    },
    {
      title: "Worked example",
      body:
        "On `[38, 27, 43, 3, 9, 82, 10]`, pass 1 swaps 3 with 38, then 9 and 10 follow. In total: **21 comparisons** " +
        "(7·6/2) but only **5 swaps**.",
      tryIt: [{ label: "Run this example", action: "small" }],
    },
    {
      title: "Always Θ(n²) comparisons",
      body:
        "The scan never stops early, so every input costs **n(n−1)/2** comparisons. Swaps are at most **n − 1**, the " +
        "fewest of the simple sorts. Sorted and reversed input give the same comparison count.",
      tryIt: [
        { label: "Sorted input", action: "best" },
        { label: "Reversed input", action: "worst" },
      ],
    },
    {
      title: "In place, not stable",
      body:
        "Only a few indices are stored: **in place**. The long swap can jump an element over an equal one, so " +
        "`[5, 5′, 2]` becomes `[2, 5′, 5]`: **not stable**.",
      tryIt: [{ label: "Few unique values", action: "fewUnique" }],
    },
    {
      title: "When to use it",
      body:
        "Use it when **writes are expensive**, like flash memory: it makes only O(n) swaps. Otherwise insertion sort is " +
        "faster. **Heap sort** is selection sort with a heap, which makes it O(n log n).",
      tryIt: [{ label: "Try insertion sort", action: "algo:insertion" }],
    },
  ],
};
