import type { Lesson } from "@/lib/lesson";

export const STACK_LESSON: Lesson = {
  id: "sq.stack",
  title: "Stack",
  slides: [
    {
      title: "Last in, first out",
      body: "A stack is a pile of plates: you add and remove only at the **top**. The last value pushed is the first one popped — **LIFO**.",
      tryIt: [{ label: "Push 3 values", action: "push3" }],
    },
    {
      title: "One array, one index",
      body: "Values live in an array `A`; `top` is the index of the newest one (`-1` when empty). **push** does `top = top + 1`, then writes `A[top]`. **pop** reads `A[top]`, then moves top down.",
      tryIt: [
        { label: "Push 50", action: "push50" },
        { label: "Pop", action: "pop" },
      ],
    },
    {
      title: "Worked example",
      body: "Start empty: push 5, push 9, pop, push 2. The pop returns **9**, the newest value. `top` goes −1 → 0 → 1 → 0 → 1.",
      tryIt: [{ label: "Run this example", action: "worked" }],
    },
    {
      title: "Overflow and underflow",
      body: "A fixed array fills up: pushing when `top == capacity − 1` is a **Stack Overflow**. Popping when `top == -1` is an **underflow**.",
      tryIt: [
        { label: "Fill until overflow", action: "overflow" },
        { label: "Pop until underflow", action: "underflow" },
      ],
    },
    {
      title: "Why everything is O(1)",
      body: "Every operation touches only `A[top]` — nothing shifts. Even `clear()` is O(1): set `top = -1`, and the old values become garbage that later pushes overwrite.",
      tryIt: [{ label: "Clear, then push", action: "clear" }],
    },
    {
      title: "Interview tips",
      body: "Check `isEmpty()` before pop or peek. Dynamic arrays (Python list, `ArrayList`, `vector`) grow instead of overflowing: push is O(1) amortized. Classics: min-stack, queue from two stacks, valid parentheses.",
    },
    {
      title: "Where stacks live",
      body: "Function calls (the **call stack**), undo, the browser's back button and expression parsing. The Applications tab shows four of them step by step.",
      tryIt: [{ label: "Open Applications", action: "apps" }],
    },
  ],
};
