/*
 * Real implementations of the circular queue, one per full/empty rule — same names and structure as
 * CIRC_CODE. "count" keeps a counter (every slot usable); "gap" has rear = next free slot and keeps one
 * slot empty instead of a counter.
 */
import type { ClassCode } from "../shared/code";
import type { CircOpKind, FullRule } from "./engine";

type Op = Exclude<CircOpKind, "idle">;

const COUNT: ClassCode<Op> = {
  python: {
    head: `
class CircularQueue:
    """Ring buffer: indices wrap with (i + 1) % capacity; a counter tells full from empty."""

    def __init__(self, capacity):
        self.A = [None] * capacity
        self.capacity = capacity
        self.front = 0   # first element
        self.rear = -1   # last element
        self.count = 0`,
    methods: {
      new: "",
      enqueue: `
    def enqueue(self, x):
        if self.count == self.capacity:
            raise IndexError("Queue full")
        self.rear = (self.rear + 1) % self.capacity  # wraps to 0 after the last index
        self.A[self.rear] = x
        self.count = self.count + 1`,
      dequeue: `
    def dequeue(self):
        if self.count == 0:
            raise IndexError("Queue empty")
        x = self.A[self.front]
        self.front = (self.front + 1) % self.capacity
        self.count = self.count - 1
        return x`,
      peek: `
    def peek(self):
        if self.count == 0:
            raise IndexError("Queue empty")
        return self.A[self.front]`,
      clear: `
    def clear(self):
        self.front = 0
        self.rear = -1
        self.count = 0`,
    },
    extras: `
    def is_empty(self):
        return self.count == 0

    def is_full(self):
        return self.count == self.capacity`,
    tail: "",
  },

  cpp: {
    head: `
#include <stdexcept>
#include <vector>

class CircularQueue {
    std::vector<int> A;
    int capacity;
    int front = 0;   // first element
    int rear = -1;   // last element
    int count = 0;

public:
    explicit CircularQueue(int capacity) : A(capacity), capacity(capacity) {}`,
    methods: {
      new: "",
      enqueue: `
    void enqueue(int x) {
        if (count == capacity)
            throw std::overflow_error("Queue full");
        rear = (rear + 1) % capacity;  // wraps to 0 after the last index
        A[rear] = x;
        count = count + 1;
    }`,
      dequeue: `
    int dequeue() {
        if (count == 0)
            throw std::underflow_error("Queue empty");
        int x = A[front];
        front = (front + 1) % capacity;
        count = count - 1;
        return x;
    }`,
      peek: `
    int peek() const {
        if (count == 0)
            throw std::underflow_error("Queue empty");
        return A[front];
    }`,
      clear: `
    void clear() {
        front = 0;
        rear = -1;
        count = 0;
    }`,
    },
    extras: `
    bool isEmpty() const { return count == 0; }
    bool isFull() const { return count == capacity; }`,
    tail: "};",
  },

  java: {
    head: `
class CircularQueue {
    private final int[] A;
    private final int capacity;
    private int front = 0;   // first element
    private int rear = -1;   // last element
    private int count = 0;

    public CircularQueue(int capacity) {
        this.A = new int[capacity];
        this.capacity = capacity;
    }`,
    methods: {
      new: "",
      enqueue: `
    public void enqueue(int x) {
        if (count == capacity)
            throw new IllegalStateException("Queue full");
        rear = (rear + 1) % capacity;  // wraps to 0 after the last index
        A[rear] = x;
        count = count + 1;
    }`,
      dequeue: `
    public int dequeue() {
        if (count == 0)
            throw new IllegalStateException("Queue empty");
        int x = A[front];
        front = (front + 1) % capacity;
        count = count - 1;
        return x;
    }`,
      peek: `
    public int peek() {
        if (count == 0)
            throw new IllegalStateException("Queue empty");
        return A[front];
    }`,
      clear: `
    public void clear() {
        front = 0;
        rear = -1;
        count = 0;
    }`,
    },
    extras: `
    public boolean isEmpty() { return count == 0; }
    public boolean isFull() { return count == capacity; }`,
    tail: "}",
  },

  javascript: {
    head: `
class CircularQueue {
  constructor(capacity) {
    this.A = new Array(capacity);
    this.capacity = capacity;
    this.front = 0; // first element
    this.rear = -1; // last element
    this.count = 0;
  }`,
    methods: {
      new: "",
      enqueue: `
  enqueue(x) {
    if (this.count === this.capacity) throw new Error("Queue full");
    this.rear = (this.rear + 1) % this.capacity; // wraps to 0 after the last index
    this.A[this.rear] = x;
    this.count = this.count + 1;
  }`,
      dequeue: `
  dequeue() {
    if (this.count === 0) throw new Error("Queue empty");
    const x = this.A[this.front];
    this.front = (this.front + 1) % this.capacity;
    this.count = this.count - 1;
    return x;
  }`,
      peek: `
  peek() {
    if (this.count === 0) throw new Error("Queue empty");
    return this.A[this.front];
  }`,
      clear: `
  clear() {
    this.front = 0;
    this.rear = -1;
    this.count = 0;
  }`,
    },
    extras: `
  isEmpty() {
    return this.count === 0;
  }

  isFull() {
    return this.count === this.capacity;
  }`,
    tail: "}",
  },
};

const GAP: ClassCode<Op> = {
  python: {
    head: `
class CircularQueue:
    """Ring buffer without a counter: one slot always stays empty."""

    def __init__(self, capacity):
        self.A = [None] * capacity
        self.capacity = capacity
        self.front = 0   # first element
        self.rear = 0    # NEXT FREE slot; empty when front == rear`,
    methods: {
      new: "",
      enqueue: `
    def enqueue(self, x):
        if (self.rear + 1) % self.capacity == self.front:
            raise IndexError("Queue full")  # one slot is still free, on purpose
        self.A[self.rear] = x
        self.rear = (self.rear + 1) % self.capacity`,
      dequeue: `
    def dequeue(self):
        if self.front == self.rear:
            raise IndexError("Queue empty")
        x = self.A[self.front]
        self.front = (self.front + 1) % self.capacity
        return x`,
      peek: `
    def peek(self):
        if self.front == self.rear:
            raise IndexError("Queue empty")
        return self.A[self.front]`,
      clear: `
    def clear(self):
        self.front = 0
        self.rear = 0`,
    },
    extras: `
    def is_empty(self):
        return self.front == self.rear

    def is_full(self):
        return (self.rear + 1) % self.capacity == self.front

    def size(self):
        return (self.rear - self.front + self.capacity) % self.capacity`,
    tail: "",
  },

  cpp: {
    head: `
#include <stdexcept>
#include <vector>

class CircularQueue {
    std::vector<int> A;
    int capacity;
    int front = 0;   // first element
    int rear = 0;    // NEXT FREE slot; empty when front == rear

public:
    explicit CircularQueue(int capacity) : A(capacity), capacity(capacity) {}`,
    methods: {
      new: "",
      enqueue: `
    void enqueue(int x) {
        if ((rear + 1) % capacity == front)
            throw std::overflow_error("Queue full");  // one slot is still free, on purpose
        A[rear] = x;
        rear = (rear + 1) % capacity;
    }`,
      dequeue: `
    int dequeue() {
        if (front == rear)
            throw std::underflow_error("Queue empty");
        int x = A[front];
        front = (front + 1) % capacity;
        return x;
    }`,
      peek: `
    int peek() const {
        if (front == rear)
            throw std::underflow_error("Queue empty");
        return A[front];
    }`,
      clear: `
    void clear() {
        front = 0;
        rear = 0;
    }`,
    },
    extras: `
    bool isEmpty() const { return front == rear; }
    bool isFull() const { return (rear + 1) % capacity == front; }
    int size() const { return (rear - front + capacity) % capacity; }`,
    tail: "};",
  },

  java: {
    head: `
class CircularQueue {
    private final int[] A;
    private final int capacity;
    private int front = 0;   // first element
    private int rear = 0;    // NEXT FREE slot; empty when front == rear

    public CircularQueue(int capacity) {
        this.A = new int[capacity];
        this.capacity = capacity;
    }`,
    methods: {
      new: "",
      enqueue: `
    public void enqueue(int x) {
        if ((rear + 1) % capacity == front)
            throw new IllegalStateException("Queue full");  // one slot is still free, on purpose
        A[rear] = x;
        rear = (rear + 1) % capacity;
    }`,
      dequeue: `
    public int dequeue() {
        if (front == rear)
            throw new IllegalStateException("Queue empty");
        int x = A[front];
        front = (front + 1) % capacity;
        return x;
    }`,
      peek: `
    public int peek() {
        if (front == rear)
            throw new IllegalStateException("Queue empty");
        return A[front];
    }`,
      clear: `
    public void clear() {
        front = 0;
        rear = 0;
    }`,
    },
    extras: `
    public boolean isEmpty() { return front == rear; }
    public boolean isFull() { return (rear + 1) % capacity == front; }
    public int size() { return (rear - front + capacity) % capacity; }`,
    tail: "}",
  },

  javascript: {
    head: `
class CircularQueue {
  constructor(capacity) {
    this.A = new Array(capacity);
    this.capacity = capacity;
    this.front = 0; // first element
    this.rear = 0; // NEXT FREE slot; empty when front == rear
  }`,
    methods: {
      new: "",
      enqueue: `
  enqueue(x) {
    if ((this.rear + 1) % this.capacity === this.front) throw new Error("Queue full"); // one slot stays free
    this.A[this.rear] = x;
    this.rear = (this.rear + 1) % this.capacity;
  }`,
      dequeue: `
  dequeue() {
    if (this.front === this.rear) throw new Error("Queue empty");
    const x = this.A[this.front];
    this.front = (this.front + 1) % this.capacity;
    return x;
  }`,
      peek: `
  peek() {
    if (this.front === this.rear) throw new Error("Queue empty");
    return this.A[this.front];
  }`,
      clear: `
  clear() {
    this.front = 0;
    this.rear = 0;
  }`,
    },
    extras: `
  isEmpty() {
    return this.front === this.rear;
  }

  isFull() {
    return (this.rear + 1) % this.capacity === this.front;
  }

  size() {
    return (this.rear - this.front + this.capacity) % this.capacity;
  }`,
    tail: "}",
  },
};

export const CIRC_IMPL: Record<FullRule, ClassCode<Op>> = { count: COUNT, gap: GAP };
