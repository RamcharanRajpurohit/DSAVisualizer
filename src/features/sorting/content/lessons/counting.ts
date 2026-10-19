import type { Lesson } from "@/lib/lesson";

export const COUNTING_LESSON: Lesson = {
  id: "sorting.counting",
  title: "Counting sort",
  slides: [
    {
      title: "Count instead of compare",
      body:
        "When values come from a **small range**, count how often each one occurs. The counts tell you exactly where " +
        "each value goes, with no comparisons at all.",
      tryIt: [{ label: "Watch it on 7 values", action: "small" }],
    },
    {
      title: "Three passes",
      body:
        "**Count**: `C[A[i] − lo]++`. **Prefix sums**: `C[v] += C[v − 1]` turns counts into end positions. **Place** " +
        "right to left: `C[v]--`, then `B[C[v]] ← A[i]`.",
      tryIt: [{ label: "Play current input", action: "sort" }],
    },
    {
      title: "Worked example",
      body:
        "For `[38, 27, 43, 3, 9, 82, 10]`, lo = 3 and k = 80: 80 counters for 7 values. Filling each block from its " +
        "end, right to left, keeps equal keys in order: **stable**.",
      tryIt: [
        { label: "Run this example", action: "small" },
        { label: "Few unique values", action: "fewUnique" },
      ],
    },
    {
      title: "Complexity: Θ(n + k)",
      body:
        "Two passes over the input and one over the counters cost **Θ(n + k)** time and memory. That is great when k is " +
        "small and terrible when k ≫ n.",
      tryIt: [
        { label: "Wide range", action: "worst" },
        { label: "Small range", action: "best" },
      ],
    },
    {
      title: "Stable, not in place",
      body:
        "The output array `B` and the counters `C` make it **not in place**. Its stability is exactly what makes " +
        "**radix sort** correct.",
      tryIt: [{ label: "Next: radix sort", action: "algo:radix" }],
    },
    {
      title: "When to use it",
      body:
        "Use it for small integer ranges: grades, ages, bytes. Offset negatives by the minimum and avoid huge ranges. " +
        "Placing left to right still sorts, but loses stability.",
      tryIt: [{ label: "Few unique values", action: "fewUnique" }],
    },
  ],
};
