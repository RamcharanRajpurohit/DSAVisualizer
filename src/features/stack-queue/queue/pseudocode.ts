import type { PseudoBlock } from "../shared/types";
import type { QueueOpKind } from "./engine";

export const QUEUE_CODE: Record<QueueOpKind, PseudoBlock> = {
  idle: {
    title: "Queue (linear array)",
    lines: [
      "class Queue:      // linear array",
      "  A     = new array[capacity]",
      "  front = 0    // first element",
      "  rear  = -1   // last element",
      "  // empty when front > rear",
      "  // size = rear - front + 1",
    ],
  },
  new: {
    title: "new Queue(n)",
    lines: ["new Queue(capacity):", "  A = new array[capacity]", "  front = 0", "  rear = -1"],
  },
  enqueue: {
    title: "enqueue(x)",
    lines: [
      "enqueue(x):",
      "  if rear == capacity - 1:",
      '    error "Queue full" // even if front>0',
      "  rear = rear + 1",
      "  A[rear] = x",
    ],
  },
  dequeue: {
    title: "dequeue()",
    lines: [
      "dequeue():",
      "  if front > rear:",
      '    error "Queue empty"',
      "  x = A[front]",
      "  front = front + 1  // slot lost",
      "  return x",
    ],
  },
  peek: {
    title: "peek()",
    lines: ["peek():", "  if front > rear:", '    error "Queue empty"', "  return A[front]"],
  },
  compact: {
    title: "compact()",
    lines: [
      "compact():      // fix #1, O(n)",
      "  n = rear - front + 1",
      "  for i = 0 to n - 1:",
      "    A[i] = A[front + i]",
      "  front = 0",
      "  rear = n - 1",
    ],
  },
  clear: {
    title: "clear()",
    lines: ["clear():", "  front = 0", "  rear = -1"],
  },
};
