/* Real implementations of the array-backed stack — same names and structure as STACK_CODE (pseudocode.ts). */
import type { ClassCode } from "../shared/code";
import type { StackOpKind } from "./engine";

type Op = Exclude<StackOpKind, "idle">;

export const STACK_IMPL: ClassCode<Op> = {
  python: {
    head: `
class Stack:
    """Array-backed stack with a fixed capacity (LIFO)."""

    def __init__(self, capacity):
        self.A = [None] * capacity
        self.capacity = capacity
        self.top = -1  # index of the top; -1 = empty`,
    methods: {
      new: "",
      push: `
    def push(self, x):
        if self.top == self.capacity - 1:
            raise IndexError("Stack Overflow")
        self.top = self.top + 1
        self.A[self.top] = x`,
      pop: `
    def pop(self):
        if self.top == -1:
            raise IndexError("Stack Underflow")
        x = self.A[self.top]
        self.top = self.top - 1  # A[top + 1] stays behind as garbage
        return x`,
      peek: `
    def peek(self):
        if self.top == -1:
            raise IndexError("Stack is empty")
        return self.A[self.top]  # top unchanged`,
      isEmpty: `
    def is_empty(self):
        return self.top == -1`,
      isFull: `
    def is_full(self):
        return self.top == self.capacity - 1`,
      clear: `
    def clear(self):
        self.top = -1  # O(1): the old values are now garbage`,
    },
    tail: "",
  },

  cpp: {
    head: `
#include <stdexcept>
#include <vector>

class Stack {
    std::vector<int> A;
    int capacity;
    int top = -1;  // index of the top; -1 = empty

public:
    explicit Stack(int capacity) : A(capacity), capacity(capacity) {}`,
    methods: {
      new: "",
      push: `
    void push(int x) {
        if (top == capacity - 1)
            throw std::overflow_error("Stack Overflow");
        top = top + 1;
        A[top] = x;
    }`,
      pop: `
    int pop() {
        if (top == -1)
            throw std::underflow_error("Stack Underflow");
        int x = A[top];
        top = top - 1;  // A[top + 1] stays behind as garbage
        return x;
    }`,
      peek: `
    int peek() const {
        if (top == -1)
            throw std::underflow_error("Stack is empty");
        return A[top];  // top unchanged
    }`,
      isEmpty: `
    bool isEmpty() const { return top == -1; }`,
      isFull: `
    bool isFull() const { return top == capacity - 1; }`,
      clear: `
    void clear() { top = -1; }  // O(1): the old values are now garbage`,
    },
    tail: "};",
  },

  java: {
    head: `
class Stack {
    private final int[] A;
    private final int capacity;
    private int top = -1;  // index of the top; -1 = empty

    public Stack(int capacity) {
        this.A = new int[capacity];
        this.capacity = capacity;
    }`,
    methods: {
      new: "",
      push: `
    public void push(int x) {
        if (top == capacity - 1)
            throw new IllegalStateException("Stack Overflow");
        top = top + 1;
        A[top] = x;
    }`,
      pop: `
    public int pop() {
        if (top == -1)
            throw new IllegalStateException("Stack Underflow");
        int x = A[top];
        top = top - 1;  // A[top + 1] stays behind as garbage
        return x;
    }`,
      peek: `
    public int peek() {
        if (top == -1)
            throw new IllegalStateException("Stack is empty");
        return A[top];  // top unchanged
    }`,
      isEmpty: `
    public boolean isEmpty() { return top == -1; }`,
      isFull: `
    public boolean isFull() { return top == capacity - 1; }`,
      clear: `
    public void clear() { top = -1; }  // O(1): the old values are now garbage`,
    },
    tail: "}",
  },

  javascript: {
    head: `
class Stack {
  constructor(capacity) {
    this.A = new Array(capacity);
    this.capacity = capacity;
    this.top = -1; // index of the top; -1 = empty
  }`,
    methods: {
      new: "",
      push: `
  push(x) {
    if (this.top === this.capacity - 1) throw new Error("Stack Overflow");
    this.top = this.top + 1;
    this.A[this.top] = x;
  }`,
      pop: `
  pop() {
    if (this.top === -1) throw new Error("Stack Underflow");
    const x = this.A[this.top];
    this.top = this.top - 1; // A[top + 1] stays behind as garbage
    return x;
  }`,
      peek: `
  peek() {
    if (this.top === -1) throw new Error("Stack is empty");
    return this.A[this.top]; // top unchanged
  }`,
      isEmpty: `
  isEmpty() {
    return this.top === -1;
  }`,
      isFull: `
  isFull() {
    return this.top === this.capacity - 1;
  }`,
      clear: `
  clear() {
    this.top = -1; // O(1): the old values are now garbage
  }`,
    },
    tail: "}",
  },
};
