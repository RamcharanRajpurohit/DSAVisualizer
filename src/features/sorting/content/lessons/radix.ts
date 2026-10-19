import type { Lesson } from "@/lib/lesson";

export const RADIX_LESSON: Lesson = {
  id: "sorting.radix",
  title: "Radix sort (LSD)",
  slides: [
    {
      title: "One digit at a time",
      body:
        "Sort by the ones digit, then the tens, then the hundreds. Each pass deals the values into 10 buckets and " +
        "collects them back in order.",
      tryIt: [{ label: "Watch it on 7 values", action: "small" }],
    },
    {
      title: "One pass",
      body:
        "The digit `d = ⌊A[i] / exp⌋ mod 10` picks the bucket, and each value joins the **end** of it. Then buckets " +
        "0 … 9 are concatenated back into `A`.",
      tryIt: [{ label: "Play current input", action: "sort" }],
    },
    {
      title: "Worked example",
      body:
        "The ones pass turns `[38, 27, 43, 3, 9, 82, 10]` into `[10, 82, 43, 3, 27, 38, 9]`. The tens pass sorts it, " +
        "and 3 and 9 share bucket 0 in their previous order.",
      tryIt: [{ label: "Run this example", action: "small" }],
    },
    {
      title: "Why stability matters",
      body:
        "After pass p the array is sorted by its last p digits. Each pass must be **stable** to keep that order for " +
        "values with equal digits.",
      tryIt: [{ label: "Random input", action: "random" }],
    },
    {
      title: "Complexity",
      body:
        "d passes of O(n + 10) each give **O(d · (n + b))**, whatever the input order. It needs O(n) extra memory and " +
        "handles negatives by shifting keys by `−min`.",
      tryIt: [
        { label: "3-digit keys", action: "worst" },
        { label: "1-digit keys", action: "best" },
        { label: "Sorted input", action: "sorted" },
      ],
    },
    {
      title: "When to use it",
      body:
        "It is great for many fixed-length keys: integers, IDs, dates, IP addresses. MSD radix sort starts from the " +
        "leftmost digit instead and suits variable-length strings.",
      tryIt: [{ label: "See counting sort", action: "algo:counting" }],
    },
  ],
};
