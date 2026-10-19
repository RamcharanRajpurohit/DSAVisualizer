import type { Lesson } from "@/lib/lesson";

export const DEQUE_LESSON: Lesson = {
  id: "sq.deque",
  title: "Deque",
  slides: [
    {
      title: "Two open ends",
      body: "A **deque** (double-ended queue) adds and removes at both the front and the back. It is a stack and a queue in one.",
      tryIt: [{ label: "Push to both ends", action: "both" }],
    },
    {
      title: "Front steps backwards",
      body: "On a circular array, `pushFront` moves front back: `front = (front − 1 + capacity) % capacity`. From index 0 it wraps to the last index.",
      tryIt: [{ label: "Wrap front backwards", action: "wrapFront" }],
    },
    {
      title: "The back end",
      body: "The back element sits at `(front + size − 1) % capacity`. `pushBack` writes at `(front + size) % capacity`, and front stays put.",
      tryIt: [{ label: "Push back past the end", action: "wrapBack" }],
    },
    {
      title: "Stack or queue",
      body: "Push and pop the **same** end and it behaves like a stack. Push back, pop front and it is a queue.",
      tryIt: [
        { label: "Use it as a stack", action: "asStack" },
        { label: "Use it as a queue", action: "asQueue" },
      ],
    },
    {
      title: "Why O(1) at both ends",
      body: "Only an index and the size change — no element shifts. A plain array would need O(n) for pushFront.",
      tryIt: [{ label: "Pop both ends", action: "popBoth" }],
    },
    {
      title: "Interview tips",
      body: "Python has `collections.deque`, Java `ArrayDeque`, C++ `std::deque`. Classic uses: sliding-window maximum and 0-1 BFS.",
    },
    {
      title: "Where deques live",
      body: "Undo history with a size limit, work-stealing schedulers, palindrome checks and browser history.",
    },
  ],
};
