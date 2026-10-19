import type { PseudoBlock } from "../shared/types";
import type { StackOpKind } from "./engine";

export const STACK_CODE: Record<StackOpKind, PseudoBlock> = {
  idle: {
    title: "Stack (array)",
    lines: [
      "class Stack:",
      "  A   = new array[capacity]",
      "  top = -1   // index of the top",
      "",
      "  push(x)  pop()  peek()",
      "  isEmpty()  isFull()  clear()",
    ],
  },
  new: {
    title: "new Stack(n)",
    lines: [
      "new Stack(capacity):",
      "  A = new array[capacity]",
      "  top = -1   // empty: no top yet",
    ],
  },
  push: {
    title: "push(x)",
    lines: [
      "push(x):",
      "  if top == capacity - 1:",
      '    error "Stack Overflow"',
      "  top = top + 1",
      "  A[top] = x",
    ],
  },
  pop: {
    title: "pop()",
    lines: [
      "pop():",
      "  if top == -1:",
      '    error "Stack Underflow"',
      "  x = A[top]",
      "  top = top - 1",
      "  return x",
    ],
  },
  peek: {
    title: "peek()",
    lines: [
      "peek():",
      "  if top == -1:",
      '    error "Stack is empty"',
      "  return A[top]  // top unchanged",
    ],
  },
  isEmpty: {
    title: "isEmpty()",
    lines: ["isEmpty():", "  return top == -1"],
  },
  isFull: {
    title: "isFull()",
    lines: ["isFull():", "  return top == capacity - 1"],
  },
  clear: {
    title: "clear()",
    lines: ["clear():", "  top = -1   // O(1): rest is garbage"],
  },
};
