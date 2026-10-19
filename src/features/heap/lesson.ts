import type { Lesson } from "@/lib/lesson";

/** Arrays the lesson's "Try it" buttons load (kept here so the slide text and the demo agree). */
export const LESSON_BUILD = [12, 5, 30, 8, 42, 17, 3, 25, 9, 36] as const;
export const LESSON_SORTED = [5, 11, 18, 24, 32, 39, 47, 53, 60, 68, 75, 81, 88, 94, 99] as const;
export const LESSON_SORT = [29, 7, 45, 13, 61, 2, 38, 20] as const;

/** Lesson action ids (handlers live in HeapVisualizer). */
export type HeapLessonAction =
  | "example" | "peek" | "random15" | "insert70" | "insert5" | "extract" | "delete1" | "build" | "buildSorted"
  | "sort" | "switchMin" | "switchMax" | "decreaseKey" | "top3";

export const HEAP_LESSON: Lesson = {
  id: "heap",
  title: "Binary Heap",
  slides: [
    {
      title: "A priority queue in an array",
      body:
        "A heap is a **priority queue**: like ER triage, the most urgent item is always served next. " +
        "It keeps just enough order for an O(1) **peek** and O(log n) **insert** / **extract**. " +
        "Max-heap rule: every parent is **≥ its children**, so the largest key is the root.",
      tryIt: [
        { label: "Load the example", action: "example" },
        { label: "Peek the max", action: "peek" },
      ],
    },
    {
      title: "Tree ↔ array",
      body:
        "A heap is a **complete** tree, so it fits in a plain array with no gaps and no pointers. " +
        "For index `i`: `parent = ⌊(i − 1) / 2⌋`, `left = 2i + 1`, `right = 2i + 2`. " +
        "Hover any key to light up its family.",
      tryIt: [{ label: "Random heap of 15 keys", action: "random15" }],
    },
    {
      title: "Insert = append + sift-up",
      body:
        "Append the key at `a[n]` (the tree stays complete), then **sift up**: swap with the parent while the key beats it. " +
        "Only one leaf-to-root path moves, so insert is **O(log n)**. " +
        "Here 70 climbs past 40, 54 and 61 to the root, while 5 stays put.",
      tryIt: [
        { label: "Insert 70 and watch it sift up", action: "insert70" },
        { label: "Insert 5", action: "insert5" },
      ],
    },
    {
      title: "Extract = swap, then sift-down",
      body:
        "Swap the root with the **last** key, cut that slot off, then **sift the new root down**. " +
        "Always swap with the **larger** child — the smaller one would break the heap again. " +
        "Extract is **O(log n)**, and deleting any index works the same way.",
      tryIt: [
        { label: "Extract the max", action: "extract" },
        { label: "Delete a[1]", action: "delete1" },
      ],
    },
    {
      title: "Build-heap in O(n)",
      body:
        "Leaves `a[⌊n/2⌋ …]` are already heaps, so Floyd's method sifts down each internal node from `⌊n/2⌋ − 1` back to 0. " +
        "A key sinks at most its height, and most nodes sit near the bottom. " +
        "Total work Σ h·n/2^(h+1) < n: **O(n)**, beating n inserts.",
      tryIt: [
        { label: "Build from [12, 5, 30, 8, 42, …]", action: "build" },
        { label: "Sorted input (worst case)", action: "buildSorted" },
      ],
    },
    {
      title: "Heap sort",
      body:
        "Build a max-heap, then repeatedly swap the root to the end and shrink the heap by one. " +
        "**O(n log n)** in every case with **O(1)** extra space. " +
        "It is **not stable**, and usually slower than quicksort in practice.",
      tryIt: [{ label: "Heap-sort 8 keys", action: "sort" }],
    },
    {
      title: "Min-heaps and changing keys",
      body:
        "A **min-heap** flips every comparison, so the smallest key is the root. " +
        "Decreasing a key in a min-heap can only move it up — Dijkstra's **decrease-key**. " +
        "Python `heapq` and Java `PriorityQueue` are min-heaps; C++ `priority_queue` is a max-heap.",
      tryIt: [
        { label: "Switch to min-heap", action: "switchMin" },
        { label: "Decrease 35 → 3", action: "decreaseKey" },
        { label: "Back to max-heap", action: "switchMax" },
      ],
    },
    {
      title: "Where heaps are used",
      body:
        "Dijkstra and Prim pop the closest vertex; schedulers and timers pop the next-due job. " +
        "**Top-k**: stream the data through a min-heap of size k — O(n log k). " +
        "A heap is **not** sorted: only the root is known.",
      tryIt: [{ label: "Top 3: extract the max 3×", action: "top3" }],
    },
  ],
};
