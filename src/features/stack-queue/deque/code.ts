/* Real implementations of the deque on a circular array — same names and structure as DEQUE_CODE. */
import type { ClassCode } from "../shared/code";
import type { DequeOpKind } from "./engine";

type Op = Exclude<DequeOpKind, "idle">;

export const DEQUE_IMPL: ClassCode<Op> = {
  python: {
    head: `
class Deque:
    """Double-ended queue on a circular array: O(1) at both ends."""

    def __init__(self, capacity):
        self.A = [None] * capacity
        self.capacity = capacity
        self.front = 0   # first element
        self.size = 0    # last element: (front + size - 1) % capacity`,
    methods: {
      new: "",
      pushFront: `
    def push_front(self, x):
        if self.size == self.capacity:
            raise IndexError("Deque full")
        self.front = (self.front - 1 + self.capacity) % self.capacity  # step back
        self.A[self.front] = x
        self.size = self.size + 1`,
      pushBack: `
    def push_back(self, x):
        if self.size == self.capacity:
            raise IndexError("Deque full")
        rear = (self.front + self.size) % self.capacity  # first free slot after the last
        self.A[rear] = x
        self.size = self.size + 1`,
      popFront: `
    def pop_front(self):
        if self.size == 0:
            raise IndexError("Deque empty")
        x = self.A[self.front]
        self.front = (self.front + 1) % self.capacity
        self.size = self.size - 1
        return x`,
      popBack: `
    def pop_back(self):
        if self.size == 0:
            raise IndexError("Deque empty")
        rear = (self.front + self.size - 1) % self.capacity
        x = self.A[rear]
        self.size = self.size - 1  # front stays where it is
        return x`,
      peekFront: `
    def peek_front(self):
        if self.size == 0:
            raise IndexError("Deque empty")
        return self.A[self.front]`,
      peekBack: `
    def peek_back(self):
        if self.size == 0:
            raise IndexError("Deque empty")
        return self.A[(self.front + self.size - 1) % self.capacity]`,
      clear: `
    def clear(self):
        self.front = 0
        self.size = 0`,
    },
    extras: `
    def is_empty(self):
        return self.size == 0

    def is_full(self):
        return self.size == self.capacity`,
    tail: "",
  },

  cpp: {
    head: `
#include <stdexcept>
#include <vector>

class Deque {
    std::vector<int> A;
    int capacity;
    int front = 0;   // first element
    int size = 0;    // last element: (front + size - 1) % capacity

public:
    explicit Deque(int capacity) : A(capacity), capacity(capacity) {}`,
    methods: {
      new: "",
      pushFront: `
    void pushFront(int x) {
        if (size == capacity)
            throw std::overflow_error("Deque full");
        front = (front - 1 + capacity) % capacity;  // + capacity: % of a negative stays negative in C++
        A[front] = x;
        size = size + 1;
    }`,
      pushBack: `
    void pushBack(int x) {
        if (size == capacity)
            throw std::overflow_error("Deque full");
        int rear = (front + size) % capacity;  // first free slot after the last
        A[rear] = x;
        size = size + 1;
    }`,
      popFront: `
    int popFront() {
        if (size == 0)
            throw std::underflow_error("Deque empty");
        int x = A[front];
        front = (front + 1) % capacity;
        size = size - 1;
        return x;
    }`,
      popBack: `
    int popBack() {
        if (size == 0)
            throw std::underflow_error("Deque empty");
        int rear = (front + size - 1) % capacity;
        int x = A[rear];
        size = size - 1;  // front stays where it is
        return x;
    }`,
      peekFront: `
    int peekFront() const {
        if (size == 0)
            throw std::underflow_error("Deque empty");
        return A[front];
    }`,
      peekBack: `
    int peekBack() const {
        if (size == 0)
            throw std::underflow_error("Deque empty");
        return A[(front + size - 1) % capacity];
    }`,
      clear: `
    void clear() {
        front = 0;
        size = 0;
    }`,
    },
    extras: `
    bool isEmpty() const { return size == 0; }
    bool isFull() const { return size == capacity; }`,
    tail: "};",
  },

  java: {
    head: `
class Deque {
    private final int[] A;
    private final int capacity;
    private int front = 0;   // first element
    private int size = 0;    // last element: (front + size - 1) % capacity

    public Deque(int capacity) {
        this.A = new int[capacity];
        this.capacity = capacity;
    }`,
    methods: {
      new: "",
      pushFront: `
    public void pushFront(int x) {
        if (size == capacity)
            throw new IllegalStateException("Deque full");
        front = (front - 1 + capacity) % capacity;  // + capacity: Java's % can return a negative
        A[front] = x;
        size = size + 1;
    }`,
      pushBack: `
    public void pushBack(int x) {
        if (size == capacity)
            throw new IllegalStateException("Deque full");
        int rear = (front + size) % capacity;  // first free slot after the last
        A[rear] = x;
        size = size + 1;
    }`,
      popFront: `
    public int popFront() {
        if (size == 0)
            throw new IllegalStateException("Deque empty");
        int x = A[front];
        front = (front + 1) % capacity;
        size = size - 1;
        return x;
    }`,
      popBack: `
    public int popBack() {
        if (size == 0)
            throw new IllegalStateException("Deque empty");
        int rear = (front + size - 1) % capacity;
        int x = A[rear];
        size = size - 1;  // front stays where it is
        return x;
    }`,
      peekFront: `
    public int peekFront() {
        if (size == 0)
            throw new IllegalStateException("Deque empty");
        return A[front];
    }`,
      peekBack: `
    public int peekBack() {
        if (size == 0)
            throw new IllegalStateException("Deque empty");
        return A[(front + size - 1) % capacity];
    }`,
      clear: `
    public void clear() {
        front = 0;
        size = 0;
    }`,
    },
    extras: `
    public boolean isEmpty() { return size == 0; }
    public boolean isFull() { return size == capacity; }`,
    tail: "}",
  },

  javascript: {
    head: `
class Deque {
  constructor(capacity) {
    this.A = new Array(capacity);
    this.capacity = capacity;
    this.front = 0; // first element
    this.size = 0; // last element: (front + size - 1) % capacity
  }`,
    methods: {
      new: "",
      pushFront: `
  pushFront(x) {
    if (this.size === this.capacity) throw new Error("Deque full");
    this.front = (this.front - 1 + this.capacity) % this.capacity; // + capacity: JS % keeps the sign
    this.A[this.front] = x;
    this.size = this.size + 1;
  }`,
      pushBack: `
  pushBack(x) {
    if (this.size === this.capacity) throw new Error("Deque full");
    const rear = (this.front + this.size) % this.capacity; // first free slot after the last
    this.A[rear] = x;
    this.size = this.size + 1;
  }`,
      popFront: `
  popFront() {
    if (this.size === 0) throw new Error("Deque empty");
    const x = this.A[this.front];
    this.front = (this.front + 1) % this.capacity;
    this.size = this.size - 1;
    return x;
  }`,
      popBack: `
  popBack() {
    if (this.size === 0) throw new Error("Deque empty");
    const rear = (this.front + this.size - 1) % this.capacity;
    const x = this.A[rear];
    this.size = this.size - 1; // front stays where it is
    return x;
  }`,
      peekFront: `
  peekFront() {
    if (this.size === 0) throw new Error("Deque empty");
    return this.A[this.front];
  }`,
      peekBack: `
  peekBack() {
    if (this.size === 0) throw new Error("Deque empty");
    return this.A[(this.front + this.size - 1) % this.capacity];
  }`,
      clear: `
  clear() {
    this.front = 0;
    this.size = 0;
  }`,
    },
    extras: `
  isEmpty() {
    return this.size === 0;
  }

  isFull() {
    return this.size === this.capacity;
  }`,
    tail: "}",
  },
};
