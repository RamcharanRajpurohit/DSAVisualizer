import type { Lesson } from "@/lib/lesson";

export const QUEUE_LESSON: Lesson = {
  id: "sq.queue",
  title: "Queue",
  slides: [
    {
      title: "First in, first out",
      body: "A queue is a line at a counter: join at the **rear**, leave from the **front**. The oldest element always leaves first — **FIFO**.",
      tryIt: [{ label: "Enqueue 3 values", action: "enqueue3" }],
    },
    {
      title: "Two indices",
      body: "`front` is the first element, `rear` the last; the queue is empty when `front > rear`. **enqueue** moves rear right, **dequeue** moves front right.",
      tryIt: [{ label: "Dequeue twice", action: "dequeue2" }],
    },
    {
      title: "Worked example",
      body: "Enqueue 10 and 20, dequeue (returns **10**), then enqueue 30. The queue is now 20, 30 with front = 1 and rear = 2.",
      tryIt: [{ label: "Run this example", action: "worked" }],
    },
    {
      title: "The wasted-space problem",
      body: "Both indices only move **right**. Once rear reaches the last index, enqueue fails — even when dequeues freed slots at the start.",
      tryIt: [{ label: "Show the wasted-space problem", action: "waste" }],
    },
    {
      title: "Two fixes",
      body: "**Compact**: shift everything back to index 0, which costs O(n). **Circular queue**: let the indices wrap with `% capacity`, which costs O(1).",
      tryIt: [
        { label: "Compact", action: "compact" },
        { label: "Open circular queue", action: "circular" },
      ],
    },
    {
      title: "Complexity and pitfalls",
      body: "enqueue, dequeue and peek are O(1). The size is `rear − front + 1`, not `rear`. In Python, `list.pop(0)` is O(n): use `collections.deque`.",
    },
    {
      title: "Where queues live",
      body: "Print jobs, task schedulers, network buffers and breadth-first search. Anything that must be served in arrival order.",
    },
  ],
};
