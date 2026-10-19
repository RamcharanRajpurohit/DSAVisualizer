import type { Lesson } from "@/lib/lesson";

export const QUICK_LESSON: Lesson = {
  id: "sorting.quick",
  title: "Quick sort",
  slides: [
    {
      title: "Partition around a pivot",
      body:
        "Pick a **pivot** and move smaller values to its left and larger ones to its right. The pivot is then final, " +
        "and both sides are sorted recursively.",
      tryIt: [{ label: "Watch it on 7 values", action: "small" }],
    },
    {
      title: "Lomuto partition",
      body:
        "The pivot waits at `A[hi]` while `j` scans and swaps values ≤ pivot into a growing left region. On the " +
        "example, pivot 10 sends 3 and 9 left and lands at index 2.",
      tryIt: [
        { label: "Use Lomuto", action: "quick:lomuto" },
        { label: "Last-element pivot", action: "pivot:last" },
      ],
    },
    {
      title: "Hoare partition",
      body:
        "Two pointers move inward and swap pairs on the wrong sides until they cross. It makes about **3× fewer " +
        "swaps** and handles duplicates better, but the pivot isn't fixed in place.",
      tryIt: [{ label: "Use Hoare", action: "quick:hoare" }],
    },
    {
      title: "The worst case",
      body:
        "Balanced splits give **O(n log n)**. If the pivot is always the smallest or largest value, like sorted input " +
        "with a last-element pivot, it degrades to **O(n²)**.",
      tryIt: [
        { label: "Worst case", action: "worst" },
        { label: "Best case", action: "best" },
      ],
    },
    {
      title: "Fixing the pivot",
      body:
        "A **median-of-three** or **random** pivot keeps sorted input balanced. Libraries also switch to heap sort when " +
        "the recursion gets too deep (introsort).",
      tryIt: [
        { label: "Worst case", action: "worst" },
        { label: "Median of three", action: "pivot:median3" },
        { label: "Random pivot", action: "pivot:random" },
      ],
    },
    {
      title: "Tips",
      body:
        "It is **in place** but **not stable**. Recurse into the smaller side first to keep the stack at O(log n). " +
        "**Quickselect** reuses partition to find the k-th smallest in O(n) on average.",
      tryIt: [
        { label: "Few unique values", action: "fewUnique" },
        { label: "Try merge sort", action: "algo:merge" },
      ],
    },
  ],
};
