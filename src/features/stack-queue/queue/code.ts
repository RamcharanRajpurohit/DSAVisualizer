/* Real implementations of the naive linear-array queue — same names and structure as QUEUE_CODE. */
import type { ClassCode } from "../shared/code";
import type { QueueOpKind } from "./engine";

type Op = Exclude<QueueOpKind, "idle">;

export const QUEUE_IMPL: ClassCode<Op> = {
  python: {
    head: `
class Queue:
    """FIFO queue in a plain array: both indices only move right."""

    def __init__(self, capacity):
        self.A = [None] * capacity
        self.capacity = capacity
        self.front = 0   # first element
        self.rear = -1   # last element; empty when front > rear`,
    methods: {
      new: "",
      enqueue: `
    def enqueue(self, x):
        if self.rear == self.capacity - 1:
            raise IndexError("Queue full")  # even if front > 0!
        self.rear = self.rear + 1
        self.A[self.rear] = x`,
      dequeue: `
    def dequeue(self):
        if self.front > self.rear:
            raise IndexError("Queue empty")
        x = self.A[self.front]
        self.front = self.front + 1  # this slot is lost for good
        return x`,
      peek: `
    def peek(self):
        if self.front > self.rear:
            raise IndexError("Queue empty")
        return self.A[self.front]`,
      compact: `
    def compact(self):
        """Fix #1 for wasted space: shift everything back to index 0, O(n)."""
        n = self.rear - self.front + 1
        for i in range(n):
            self.A[i] = self.A[self.front + i]
        self.front = 0
        self.rear = n - 1`,
      clear: `
    def clear(self):
        self.front = 0
        self.rear = -1`,
    },
    extras: `
    def is_empty(self):
        return self.front > self.rear

    def size(self):
        return self.rear - self.front + 1`,
    tail: "",
  },

  cpp: {
    head: `
#include <stdexcept>
#include <vector>

class Queue {
    std::vector<int> A;
    int capacity;
    int front = 0;   // first element
    int rear = -1;   // last element; empty when front > rear

public:
    explicit Queue(int capacity) : A(capacity), capacity(capacity) {}`,
    methods: {
      new: "",
      enqueue: `
    void enqueue(int x) {
        if (rear == capacity - 1)
            throw std::overflow_error("Queue full");  // even if front > 0!
        rear = rear + 1;
        A[rear] = x;
    }`,
      dequeue: `
    int dequeue() {
        if (front > rear)
            throw std::underflow_error("Queue empty");
        int x = A[front];
        front = front + 1;  // this slot is lost for good
        return x;
    }`,
      peek: `
    int peek() const {
        if (front > rear)
            throw std::underflow_error("Queue empty");
        return A[front];
    }`,
      compact: `
    // Fix #1 for wasted space: shift everything back to index 0, O(n).
    void compact() {
        int n = rear - front + 1;
        for (int i = 0; i < n; i++)
            A[i] = A[front + i];
        front = 0;
        rear = n - 1;
    }`,
      clear: `
    void clear() {
        front = 0;
        rear = -1;
    }`,
    },
    extras: `
    bool isEmpty() const { return front > rear; }
    int size() const { return rear - front + 1; }`,
    tail: "};",
  },

  java: {
    head: `
class Queue {
    private final int[] A;
    private final int capacity;
    private int front = 0;   // first element
    private int rear = -1;   // last element; empty when front > rear

    public Queue(int capacity) {
        this.A = new int[capacity];
        this.capacity = capacity;
    }`,
    methods: {
      new: "",
      enqueue: `
    public void enqueue(int x) {
        if (rear == capacity - 1)
            throw new IllegalStateException("Queue full");  // even if front > 0!
        rear = rear + 1;
        A[rear] = x;
    }`,
      dequeue: `
    public int dequeue() {
        if (front > rear)
            throw new IllegalStateException("Queue empty");
        int x = A[front];
        front = front + 1;  // this slot is lost for good
        return x;
    }`,
      peek: `
    public int peek() {
        if (front > rear)
            throw new IllegalStateException("Queue empty");
        return A[front];
    }`,
      compact: `
    // Fix #1 for wasted space: shift everything back to index 0, O(n).
    public void compact() {
        int n = rear - front + 1;
        for (int i = 0; i < n; i++)
            A[i] = A[front + i];
        front = 0;
        rear = n - 1;
    }`,
      clear: `
    public void clear() {
        front = 0;
        rear = -1;
    }`,
    },
    extras: `
    public boolean isEmpty() { return front > rear; }
    public int size() { return rear - front + 1; }`,
    tail: "}",
  },

  javascript: {
    head: `
class Queue {
  constructor(capacity) {
    this.A = new Array(capacity);
    this.capacity = capacity;
    this.front = 0; // first element
    this.rear = -1; // last element; empty when front > rear
  }`,
    methods: {
      new: "",
      enqueue: `
  enqueue(x) {
    if (this.rear === this.capacity - 1) throw new Error("Queue full"); // even if front > 0!
    this.rear = this.rear + 1;
    this.A[this.rear] = x;
  }`,
      dequeue: `
  dequeue() {
    if (this.front > this.rear) throw new Error("Queue empty");
    const x = this.A[this.front];
    this.front = this.front + 1; // this slot is lost for good
    return x;
  }`,
      peek: `
  peek() {
    if (this.front > this.rear) throw new Error("Queue empty");
    return this.A[this.front];
  }`,
      compact: `
  // Fix #1 for wasted space: shift everything back to index 0, O(n).
  compact() {
    const n = this.rear - this.front + 1;
    for (let i = 0; i < n; i++) this.A[i] = this.A[this.front + i];
    this.front = 0;
    this.rear = n - 1;
  }`,
      clear: `
  clear() {
    this.front = 0;
    this.rear = -1;
  }`,
    },
    extras: `
  isEmpty() {
    return this.front > this.rear;
  }

  size() {
    return this.rear - this.front + 1;
  }`,
    tail: "}",
  },
};
