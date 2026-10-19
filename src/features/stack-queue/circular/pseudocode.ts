import type { PseudoBlock } from "../shared/types";
import type { CircOpKind, FullRule } from "./engine";

export const CIRC_CODE: Record<FullRule, Record<CircOpKind, PseudoBlock>> = {
  count: {
    idle: {
      title: "CircularQueue (count)",
      lines: [
        "class CircularQueue:",
        "  A     = new array[capacity]",
        "  front = 0    // first element",
        "  rear  = -1   // last element",
        "  count = 0",
        "  // empty: count == 0",
        "  // full:  count == capacity",
        "  // indices move i = (i+1) % capacity",
      ],
    },
    new: {
      title: "new CircularQueue(n)",
      lines: ["new CircularQueue(capacity):", "  A = new array[capacity]", "  front = 0", "  rear = -1", "  count = 0"],
    },
    enqueue: {
      title: "enqueue(x)",
      lines: [
        "enqueue(x):",
        "  if count == capacity:",
        '    error "Queue full"',
        "  rear = (rear + 1) % capacity",
        "  A[rear] = x",
        "  count = count + 1",
      ],
    },
    dequeue: {
      title: "dequeue()",
      lines: [
        "dequeue():",
        "  if count == 0:",
        '    error "Queue empty"',
        "  x = A[front]",
        "  front = (front + 1) % capacity",
        "  count = count - 1",
        "  return x",
      ],
    },
    peek: {
      title: "peek()",
      lines: ["peek():", "  if count == 0:", '    error "Queue empty"', "  return A[front]"],
    },
    clear: {
      title: "clear()",
      lines: ["clear():", "  front = 0", "  rear = -1", "  count = 0"],
    },
  },
  gap: {
    idle: {
      title: "CircularQueue (one-slot gap)",
      lines: [
        "class CircularQueue:   // no counter",
        "  A     = new array[capacity]",
        "  front = 0    // first element",
        "  rear  = 0    // NEXT FREE slot",
        "  // empty: front == rear",
        "  // full: (rear+1) % capacity == front",
        "  // → one slot always stays unused",
      ],
    },
    new: {
      title: "new CircularQueue(n)",
      lines: ["new CircularQueue(capacity):", "  A = new array[capacity]", "  front = 0", "  rear = 0"],
    },
    enqueue: {
      title: "enqueue(x)",
      lines: [
        "enqueue(x):",
        "  if (rear + 1) % capacity == front:",
        '    error "Queue full"  // 1 slot free',
        "  A[rear] = x",
        "  rear = (rear + 1) % capacity",
      ],
    },
    dequeue: {
      title: "dequeue()",
      lines: [
        "dequeue():",
        "  if front == rear:",
        '    error "Queue empty"',
        "  x = A[front]",
        "  front = (front + 1) % capacity",
        "  return x",
      ],
    },
    peek: {
      title: "peek()",
      lines: ["peek():", "  if front == rear:", '    error "Queue empty"', "  return A[front]"],
    },
    clear: {
      title: "clear()",
      lines: ["clear():", "  front = 0", "  rear = 0"],
    },
  },
};
