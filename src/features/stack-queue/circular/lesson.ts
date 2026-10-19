import type { Lesson } from "@/lib/lesson";

export const CIRC_LESSON: Lesson = {
  id: "sq.circular",
  title: "Circular queue",
  slides: [
    {
      title: "Glue the ends together",
      body: "Treat the array as a ring: after the last index comes index 0. Slots freed by dequeue get reused, so nothing is wasted.",
      tryIt: [{ label: "Wrap rear around", action: "wrap" }],
    },
    {
      title: "The modulo step",
      body: "Every move is `i = (i + 1) % capacity`. With capacity 6, `(5 + 1) % 6 = 0` — that is the wrap.",
      tryIt: [{ label: "Step past the last index", action: "step" }],
    },
    {
      title: "Full or empty?",
      body: "On a ring, full and empty can look the same. Fix #1 keeps a **count**: empty is `count == 0`, full is `count == capacity`.",
      tryIt: [{ label: "Fill it (count)", action: "fillCount" }],
    },
    {
      title: "The one-slot gap",
      body: "Fix #2 drops the counter and lets `rear` mark the next free slot. Empty is `front == rear`; full is `(rear + 1) % capacity == front`, so one slot stays unused.",
      tryIt: [{ label: "Fill it (gap)", action: "fillGap" }],
    },
    {
      title: "Worked example",
      body: "Capacity 6, front = 4, three values. Three dequeues move front 4 → 5 → 0 → 1 — the index never leaves 0..5.",
      tryIt: [{ label: "Wrap front around", action: "frontWrap" }],
    },
    {
      title: "Complexity and pitfalls",
      body: "Every operation is O(1) and no element ever moves. Without a counter, size is `(rear − front + capacity) % capacity`.",
    },
    {
      title: "Where ring buffers live",
      body: "Audio and video buffers, keyboard input, network packets and \"keep the last N\" logs. Producer–consumer queues in operating systems use them too.",
      tryIt: [{ label: "Keep cycling", action: "cycle" }],
    },
  ],
};
