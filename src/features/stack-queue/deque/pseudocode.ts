import type { PseudoBlock } from "../shared/types";
import type { DequeOpKind } from "./engine";

export const DEQUE_CODE: Record<DequeOpKind, PseudoBlock> = {
  idle: {
    title: "Deque (circular array)",
    lines: [
      "class Deque:      // circular array",
      "  A     = new array[capacity]",
      "  front = 0    // first element",
      "  size  = 0",
      "  // last element is at index",
      "  //   (front + size - 1) % capacity",
    ],
  },
  new: {
    title: "new Deque(n)",
    lines: ["new Deque(capacity):", "  A = new array[capacity]", "  front = 0", "  size = 0"],
  },
  pushFront: {
    title: "pushFront(x)",
    lines: [
      "pushFront(x):",
      "  if size == capacity:",
      '    error "Deque full"',
      "  front = (front - 1 + capacity) % capacity",
      "  A[front] = x",
      "  size = size + 1",
    ],
  },
  pushBack: {
    title: "pushBack(x)",
    lines: [
      "pushBack(x):",
      "  if size == capacity:",
      '    error "Deque full"',
      "  rear = (front + size) % capacity",
      "  A[rear] = x",
      "  size = size + 1",
    ],
  },
  popFront: {
    title: "popFront()",
    lines: [
      "popFront():",
      "  if size == 0:",
      '    error "Deque empty"',
      "  x = A[front]",
      "  front = (front + 1) % capacity",
      "  size = size - 1",
      "  return x",
    ],
  },
  popBack: {
    title: "popBack()",
    lines: [
      "popBack():",
      "  if size == 0:",
      '    error "Deque empty"',
      "  rear = (front + size - 1) % capacity",
      "  x = A[rear]",
      "  size = size - 1",
      "  return x",
    ],
  },
  peekFront: {
    title: "peekFront()",
    lines: ["peekFront():", "  if size == 0:", '    error "Deque empty"', "  return A[front]"],
  },
  peekBack: {
    title: "peekBack()",
    lines: ["peekBack():", "  if size == 0:", '    error "Deque empty"', "  return A[(front + size - 1) % capacity]"],
  },
  clear: {
    title: "clear()",
    lines: ["clear():", "  front = 0", "  size = 0"],
  },
};
