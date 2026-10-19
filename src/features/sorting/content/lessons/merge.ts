import type { Lesson } from "@/lib/lesson";

export const MERGE_LESSON: Lesson = {
  id: "sorting.merge",
  title: "Merge sort",
  slides: [
    {
      title: "Divide and conquer",
      body:
        "One element is already sorted, and two sorted lists are easy to **merge**. So split the array in half, sort " +
        "each half recursively, then merge them.",
      tryIt: [{ label: "Watch it on 7 values", action: "small" }],
    },
    {
      title: "Split, then merge",
      body:
        "The split tree shows every call, about log₂ n levels deep. Merging compares the fronts `L[i]` and `R[j]` and " +
        "writes the smaller one to `A[k]`.",
      tryIt: [{ label: "Play current input", action: "sort" }],
    },
    {
      title: "Worked example",
      body:
        "`[38, 27, 43, 3, 9, 82, 10]` splits into `[38, 27, 43, 3]` and `[9, 82, 10]`, then down to single values. " +
        "Merging back up takes **14 comparisons**, against 20 for bubble sort.",
      tryIt: [{ label: "Run this example", action: "small" }],
    },
    {
      title: "Always O(n log n)",
      body:
        "Each level merges n elements, and there are about log₂ n levels: **O(n log n)**. Input order barely matters, " +
        "but merging needs **O(n)** extra memory.",
      tryIt: [
        { label: "Sorted input", action: "best" },
        { label: "Random input", action: "worst" },
        { label: "Reversed input", action: "reversed" },
      ],
    },
    {
      title: "Stable, not in place",
      body:
        "On ties, `L[i] <= R[j]` takes from the left run, so it is **stable**. That is why it powers Timsort, external " +
        "sorting and linked-list sorting.",
      tryIt: [{ label: "Few unique values", action: "fewUnique" }],
    },
    {
      title: "Interview tips",
      body:
        "Count inversions with a modified merge. Skip the merge when `A[mid] ≤ A[mid+1]`. Compute " +
        "`mid = lo + (hi − lo) / 2` to avoid overflow.",
      tryIt: [{ label: "Try quick sort", action: "algo:quick" }],
    },
  ],
};
