import { APP_IMPL } from "@/features/stack-queue/apps/code";
import { CIRC_IMPL } from "@/features/stack-queue/circular/code";
import { DEQUE_IMPL } from "@/features/stack-queue/deque/code";
import { QUEUE_IMPL } from "@/features/stack-queue/queue/code";
import { fullClass } from "@/features/stack-queue/shared/code";
import { STACK_IMPL } from "@/features/stack-queue/stack/code";
import type { TopicContent } from "../types";

/*
 * Stack & Queue: the hub plus one page per structure and per classic stack application.
 * Reference code is the exact (harness-tested) Python shown in the visualizer's code tab,
 * plus a commented usage example.
 */

const UPDATED = "2026-10-19";
const trim = (s: string) => s.replace(/^\n+|\s+$/g, "");
const py = (src: string, usage = "") => `${trim(src)}\n${usage ? `\n\n${trim(usage)}\n` : ""}`;

const TOKENIZE = `
import re


def tokenize(expr):
    """'a+b*(c^d-e)/f' -> ['a', '+', 'b', '*', '(', 'c', '^', 'd', '-', 'e', ')', '/', 'f']"""
    return re.findall(r"\\d+(?:\\.\\d+)?|[A-Za-z_]\\w*|[-+*/%^()]", expr)
`;

const HUB_CODE = `
from collections import deque

stack = []                 # LIFO: use the end of a list
stack.append(1)            # push
stack.append(2)
stack.append(3)
print(stack.pop())         # 3 - the last one in comes out first
print(stack[-1])           # 2 - peek at the top

queue = deque()            # FIFO: O(1) at both ends
queue.append(1)            # enqueue at the rear
queue.append(2)
queue.append(3)
print(queue.popleft())     # 1 - the first one in comes out first
print(queue[0])            # 2 - peek at the front
`;

export const STACK_QUEUE_TOPICS: TopicContent[] = [
  // ───────────────────────────── hub ─────────────────────────────
  {
    path: "/stack-queue",
    name: "Stack & Queue",
    title: "Stack & Queue Visualizer — LIFO and FIFO, Animated",
    h1: "Stack & Queue Visualizer",
    description:
      "Stack and queue visualizer: animate push, pop, enqueue and dequeue, compare LIFO with FIFO, and step through circular queues, deques and stack applications.",
    keywords: ["stack and queue visualizer", "stack vs queue", "difference between stack and queue", "LIFO vs FIFO", "stack data structure", "queue data structure"],
    question: "What are stacks and queues?",
    summary:
      "A **stack** and a **queue** are linear collections that only let you add and remove items at fixed ends. A stack is **LIFO** (last in, first out): push and pop both happen at the top, while a queue is **FIFO** (first in, first out): enqueue at the rear, dequeue at the front. Implemented well, every one of these operations takes O(1) time.",
    sections: [
      {
        heading: "Stack vs queue at a glance",
        body: `
- **Removal order**: a stack returns the newest item first (LIFO); a queue returns the oldest item first (FIFO).
- **Where changes happen**: a stack inserts and removes at the same end, the top; a queue inserts at the rear and removes at the front.
- **Operations**: stack — \`push\`, \`pop\`, \`peek\`; queue — \`enqueue\`, \`dequeue\`, \`peek\` (or \`front\`).
- **Array bookkeeping**: a stack needs one index (\`top\`); a queue needs two (\`front\` and \`rear\`), which is why array queues need the circular trick to reuse space.
- **Everyday picture**: a pile of plates versus a line at a ticket counter.
- **Typical algorithms**: depth-first search, backtracking and expression parsing use stacks; breadth-first search, scheduling and buffering use queues.

Put 1, 2, 3 into both: popping the stack gives 3, 2, 1 (reversed), dequeuing the queue gives 1, 2, 3 (preserved). That one property usually decides which a problem needs — "most recent first" points to a stack, "in arrival order" to a queue.`,
      },
      {
        heading: "The four structures in this visualizer",
        body: `
- **Stack**: an array plus a \`top\` index. Pushing onto a full array is an overflow; popping an empty one is an underflow.
- **Linear queue**: an array whose \`front\` and \`rear\` only move right. It is simple, but slots freed by dequeue are never reused — the wasted-space problem.
- **Circular queue**: the same array with indices that wrap around using \`% capacity\`, so every slot is reused and both operations stay O(1).
- **Deque**: a double-ended queue that inserts and removes at both ends in O(1). Use one end and it is a stack; use both and it is a queue.`,
      },
      {
        heading: "Classic stack applications",
        body: `
Stacks shine whenever the most recent unfinished thing has to be finished first. The Applications tab animates the four problems that appear in nearly every data-structures course and coding interview:

- **Balanced parentheses**: push each opening bracket and match every closing bracket against the top.
- **Infix to postfix**: the shunting-yard algorithm parks operators on a stack until precedence lets them out.
- **Postfix evaluation**: push numbers and let each operator pop its two operands.
- **Next greater element**: a monotonic stack answers "first larger value to the right" for every element in O(n).

Outside the classroom the same idea runs your program's call stack (each function call pushes a frame), the undo history of an editor, the back button of a browser and iterative depth-first search.`,
      },
      {
        heading: "Where queues show up",
        body: `
- **Breadth-first search** and level-order tree traversal process nodes in the order they were discovered.
- **Operating systems** keep ready queues of processes, and printers keep a print queue.
- **Devices** — keyboards, sound cards, network cards — buffer data in ring buffers, which are circular queues.
- **Message queues** such as Kafka, RabbitMQ or SQS decouple fast producers from slow consumers.
- **Deques** power the sliding-window maximum trick and 0-1 BFS.

A **priority queue** is the odd one out: it removes the highest-priority item rather than the oldest, so it is not FIFO. It is normally built on a binary heap.`,
      },
      {
        heading: "Stacks and queues in real code",
        body: `
- **Python**: a \`list\` is a fine stack (\`append\`, \`pop\`, \`s[-1]\`). For a queue use \`collections.deque\` (\`append\`, \`popleft\`) — \`list.pop(0)\` is O(n) because every remaining element shifts.
- **Java**: prefer \`ArrayDeque\` for both (\`push\`/\`pop\` and \`offer\`/\`poll\`). The legacy \`Stack\` class is synchronized and extends \`Vector\`.
- **C++**: \`std::stack\` and \`std::queue\` are adapters over \`std::deque\`; \`pop()\` returns nothing, so read \`top()\` or \`front()\` first.
- **JavaScript**: arrays work as stacks (\`push\`/\`pop\`), but \`shift()\` is O(n), so large queues should keep a head index or use a ring buffer.

Interviewers love combining the two: implement a queue with two stacks (amortized O(1) per operation), a stack with queues, or a "min stack" that reports its minimum in O(1) by keeping a second stack of running minimums.`,
      },
    ],
    complexity: [
      { label: "Stack push / pop / peek", time: "O(1)", space: "O(n)", note: "Only the top is touched; with a growable array, push is amortized O(1)." },
      { label: "Queue enqueue / dequeue", time: "O(1)", space: "O(n)", note: "Circular array or linked list: two indices move, nothing shifts." },
      { label: "Deque at either end", time: "O(1)", space: "O(n)", note: "Same circular array, with front allowed to step backwards." },
      { label: "Search for a value", time: "O(n)", space: "O(1)", note: "Neither structure is built for lookup — you scan." },
      { label: "list.pop(0) / array.shift()", time: "O(n)", space: "O(1)", note: "Removing the first element of an array shifts all the others." },
    ],
    code: { language: "python", source: HUB_CODE },
    faqs: [
      {
        q: "What is the difference between a stack and a queue?",
        a: "A stack removes the most recently added item first (LIFO), while a queue removes the oldest item first (FIFO). A stack adds and removes at the same end; a queue adds at the rear and removes at the front.",
      },
      { q: "Is a stack LIFO or FIFO?", a: "A stack is LIFO — last in, first out. A queue is FIFO — first in, first out." },
      {
        q: "Which data structure does BFS use, and which does DFS use?",
        a: "Breadth-first search uses a queue, so it explores nodes in order of distance from the start. Depth-first search uses a stack, either explicitly or through the recursion call stack.",
      },
      {
        q: "How do you implement a queue using two stacks?",
        a: "Push new items onto an *in* stack. To dequeue, pop from an *out* stack; when it is empty, first move everything from *in* to *out*, which reverses the order. Each item moves at most once, so every operation is amortized O(1).",
      },
      {
        q: "Why use collections.deque instead of a list for a queue in Python?",
        a: "`deque.popleft()` is O(1), while `list.pop(0)` is O(n) because every remaining element shifts left. For a stack, a plain list with `append` and `pop` is fine.",
      },
      {
        q: "Are push and pop always O(1)?",
        a: "In a linked-list stack, yes. In a dynamic array, push is amortized O(1): an occasional resize copies all n items, but averaged over many pushes the cost per push is constant.",
      },
    ],
    related: ["/stack-queue/stack", "/stack-queue/queue", "/stack-queue/circular-queue", "/stack-queue/infix-to-postfix", "/linked-list", "/graph"],
    updated: UPDATED,
  },

  // ───────────────────────────── stack ─────────────────────────────
  {
    path: "/stack-queue/stack",
    parent: "/stack-queue",
    name: "Stack",
    title: "Stack Visualizer — Push, Pop and Peek Step by Step",
    h1: "Stack Visualizer",
    description:
      "Interactive stack visualizer: watch push, pop and peek move the top pointer of an array stack, see overflow and underflow happen, and learn why each is O(1).",
    keywords: ["stack visualizer", "stack data structure", "push and pop", "stack operations", "LIFO", "stack overflow and underflow", "array implementation of stack"],
    question: "What is a stack?",
    summary:
      "A **stack** is a linear data structure that follows **LIFO** — last in, first out. You can only add (**push**), remove (**pop**) or read (**peek**) the element on top, and each of those operations takes O(1) time. Picture a pile of plates: the plate you put down last is the first one you pick up.",
    steps: [
      "Store the elements in an array `A` with a fixed `capacity` and keep `top`, the index of the newest element. `top = -1` means the stack is empty.",
      "**push(x)**: if `top == capacity - 1` the stack is full (overflow). Otherwise increment `top` and write `A[top] = x`.",
      "**pop()**: if `top == -1` the stack is empty (underflow). Otherwise read `x = A[top]`, decrement `top` and return `x`.",
      "**peek()**: return `A[top]` without changing `top`.",
      "**isEmpty()** is `top == -1`, **isFull()** is `top == capacity - 1`, and the size is `top + 1`.",
    ],
    sections: [
      {
        heading: "Worked example: push 5, push 9, pop, push 2",
        body: `
Start with an empty stack of capacity 5 (\`top = -1\`):

- \`push(5)\`: top becomes 0 and \`A[0] = 5\`. Stack: [5].
- \`push(9)\`: top becomes 1 and \`A[1] = 9\`. Stack: [5, 9].
- \`pop()\`: reads \`A[1] = 9\`, top drops to 0, and **9** is returned. Stack: [5].
- \`push(2)\`: top becomes 1 again and \`A[1] = 2\` overwrites the old 9. Stack: [5, 2].

Notice that pop never erased the 9 — it only moved \`top\`. The old value stayed in the array as garbage until the next push overwrote it. That is why pop, and even \`clear()\` (just \`top = -1\`), are O(1): no element other than the top is touched. In a garbage-collected language that stores object references, set the freed slot to \`None\` or \`null\` so the object can be reclaimed — still O(1) per pop, though a \`clear()\` that releases every reference must null each slot and becomes O(n).`,
      },
      {
        heading: "Overflow, underflow and growable stacks",
        body: `
A fixed-size array stack can fail in two ways. **Overflow** is pushing onto a full stack — there is no \`A[capacity]\`. **Underflow** is popping or peeking an empty stack — there is no \`A[-1]\`. Check \`isFull()\` and \`isEmpty()\` first, or raise an error as the code below does.

Most real stacks avoid overflow by growing: when the array fills up, allocate a larger one (typically twice the size) and copy the elements across. A single resize costs O(n), but growing by a constant factor makes resizes so rare that push is **amortized O(1)**. Python's \`list\`, Java's \`ArrayDeque\` and C++'s \`std::vector\` all grow this way.

The famous *stack overflow* error is the same idea applied to the call stack: every function call pushes a frame, and infinite or very deep recursion runs out of the memory reserved for it.`,
      },
      {
        heading: "Array stack vs linked-list stack",
        body: `
- **Array**: elements sit next to each other in memory, so it is cache-friendly and has no per-element pointer overhead. A growable array pays for an occasional O(n) resize.
- **Linked list**: push and pop at the head are O(1) in the worst case and it never needs resizing, but every node carries a pointer and lives somewhere else in memory.

Both give exactly the same LIFO behaviour. In practice array-backed stacks are usually faster; a linked list is the natural choice when you are already working with nodes.`,
      },
      {
        heading: "Where stacks are used",
        body: `
- **Function calls**: the call stack stores return addresses and local variables, which is why recursion unwinds in reverse order.
- **Undo and redo** in editors, and the **back button** in a browser.
- **Parsing**: matching brackets, converting infix expressions to postfix and evaluating them.
- **Depth-first search and backtracking** — mazes, Sudoku, permutations — where an explicit stack replaces recursion.
- **Monotonic stacks** for next greater element, stock span and the largest rectangle in a histogram.`,
      },
      {
        heading: "Common mistakes",
        body: `
- Popping or peeking without checking that the stack is non-empty.
- Mixing up \`pop\` (removes the top) and \`peek\` (only reads it).
- Off-by-one errors between the top index and the size: the size is \`top + 1\`.
- Using \`list.pop(0)\` or \`list.insert(0, x)\` in Python — that works on the bottom of the list and costs O(n). A stack uses the end.
- In Java, reaching for the legacy \`Stack\` class (synchronized, extends \`Vector\`) instead of \`ArrayDeque\`.`,
      },
      {
        heading: "Interview questions on stacks",
        body: `
- **Valid parentheses**: push openers, match each closer against the top.
- **Min stack**: keep a second stack of running minimums so \`getMin()\` is O(1).
- **Queue using two stacks**: amortized O(1) per operation.
- **Evaluate reverse Polish notation**, **daily temperatures**, **decode string** and **largest rectangle in histogram** are all one-stack solutions.

The visualizer above lets you rehearse the basics: fill the stack to overflow, pop it to underflow, and use *Quiz me* to predict what the next pop returns.`,
      },
    ],
    complexity: [
      { label: "push", time: "O(1)", space: "O(1)", note: "Writes one slot at top + 1; amortized O(1) if the array has to grow." },
      { label: "pop", time: "O(1)", space: "O(1)", note: "Reads A[top] and moves top down; nothing else moves." },
      { label: "peek / isEmpty / isFull", time: "O(1)", space: "O(1)", note: "A single read or comparison." },
      { label: "search for a value", time: "O(n)", space: "O(1)", note: "There is no access to the middle; you scan from the top." },
      { label: "n elements stored", time: "—", space: "O(n)", note: "One array slot per element (plus unused capacity)." },
    ],
    code: { language: "python", source: py(fullClass(STACK_IMPL.python), "# s = Stack(5); s.push(5); s.push(9); s.pop()  -> 9") },
    faqs: [
      { q: "Is a stack LIFO or FIFO?", a: "A stack is LIFO (last in, first out): the most recently pushed element is the first one popped. A queue is the FIFO counterpart." },
      { q: "What is the time complexity of push and pop?", a: "Both are O(1) because they only touch the top element. With a dynamic array that doubles when it is full, push is amortized O(1)." },
      { q: "What is the difference between pop and peek?", a: "`pop()` removes the top element and returns it; `peek()` (also called `top()`) returns it without removing it. Both fail on an empty stack." },
      {
        q: "What are stack overflow and stack underflow?",
        a: "Overflow is pushing onto a full fixed-size stack; underflow is popping or peeking an empty one. Check `isFull()` or `isEmpty()` first, or use a stack that grows.",
      },
      {
        q: "How do you implement a stack in Python?",
        a: "Use a list: `append(x)` pushes, `pop()` pops and `s[-1]` peeks, all O(1) amortized. The class above shows the same thing with an explicit array and top index.",
      },
      { q: "Can a stack be implemented with a linked list?", a: "Yes. Push and pop at the head of a singly linked list are both O(1) and the stack never fills up; the cost is one pointer per element." },
    ],
    related: ["/stack-queue", "/stack-queue/queue", "/stack-queue/balanced-parentheses", "/stack-queue/infix-to-postfix", "/stack-queue/next-greater-element", "/linked-list"],
    updated: UPDATED,
  },

  // ───────────────────────────── queue ─────────────────────────────
  {
    path: "/stack-queue/queue",
    parent: "/stack-queue",
    name: "Queue",
    title: "Queue Visualizer — Enqueue and Dequeue Step by Step",
    h1: "Queue Visualizer",
    description:
      "Interactive queue visualizer: watch enqueue and dequeue move the front and rear of an array queue, and see the wasted-space problem that circular queues fix.",
    keywords: ["queue visualizer", "queue data structure", "enqueue and dequeue", "FIFO", "queue operations", "array implementation of queue", "linear queue"],
    question: "What is a queue?",
    summary:
      "A **queue** is a linear data structure that follows **FIFO** — first in, first out. Elements join at the **rear** (enqueue) and leave from the **front** (dequeue), like people waiting in line, and both operations take O(1) time. This page animates the simple array version, including the wasted-space flaw that the circular queue fixes.",
    steps: [
      "Keep an array `A` of fixed `capacity` and two indices: `front = 0` (the first element) and `rear = -1` (the last element). The queue is empty when `front > rear`.",
      "**enqueue(x)**: if `rear == capacity - 1` there is no room at the end. Otherwise increment `rear` and write `A[rear] = x`.",
      "**dequeue()**: if `front > rear` the queue is empty (underflow). Otherwise read `x = A[front]`, increment `front` and return `x`.",
      "**peek()** returns `A[front]` without moving anything, and the size is `rear - front + 1`.",
    ],
    sections: [
      {
        heading: "Worked example: enqueue 10, enqueue 20, dequeue, enqueue 30",
        body: `
Capacity 6, starting empty (\`front = 0\`, \`rear = -1\`):

- \`enqueue(10)\`: rear becomes 0 and \`A[0] = 10\`. Queue: [10].
- \`enqueue(20)\`: rear becomes 1 and \`A[1] = 20\`. Queue: [10, 20].
- \`dequeue()\`: returns **10**, because it arrived first; front becomes 1. Queue: [20].
- \`enqueue(30)\`: rear becomes 2 and \`A[2] = 30\`. Queue: [20, 30] with \`front = 1\`, \`rear = 2\`.

Slot 0 is now behind \`front\`. In this simple design neither index ever moves left again, so that slot can never be used again.`,
      },
      {
        heading: "The wasted-space problem",
        body: `
Both indices only move right. After enough operations \`rear\` reaches the last index and enqueue reports *full* — even if dequeues have emptied most of the array. With capacity 6, enqueue six values and dequeue three: three elements remain and three slots are free, but \`rear == 5\`, so the next enqueue is refused.

There are three standard fixes:

- **Compact**: when you run out of room, shift the remaining elements back to index 0. Correct, but O(n).
- **Circular queue**: wrap the indices with \`(i + 1) % capacity\` so freed slots at the start are reused. O(1), nothing shifts.
- **Linked list**: keep head and tail pointers; enqueue appends at the tail and dequeue removes the head. O(1) and unbounded.

The visualizer's *Wasted space* button reproduces the problem, *Compact* shows the O(n) fix, and the Circular tab shows the O(1) one.`,
      },
      {
        heading: "Queues in standard libraries",
        body: `
- **Python**: \`collections.deque\` with \`append\` and \`popleft\`, both O(1); \`queue.Queue\` adds locking for threads. Avoid \`list.pop(0)\`, which is O(n).
- **Java**: the \`Queue\` interface backed by \`ArrayDeque\` or \`LinkedList\`. \`offer\`, \`poll\` and \`peek\` return \`false\` or \`null\` on failure, while \`add\`, \`remove\` and \`element\` throw exceptions.
- **C++**: \`std::queue\` with \`push\`, \`pop\`, \`front\` and \`back\`, an adapter over \`std::deque\` by default. \`pop()\` returns nothing, so read \`front()\` first.
- **JavaScript**: \`array.shift()\` is O(n); for large queues keep a head index into the array or use a ring buffer.`,
      },
      {
        heading: "Where queues are used",
        body: `
- **Breadth-first search** and level-order traversal of trees visit nodes in the order they were discovered.
- **Scheduling**: CPU ready queues, round-robin time slicing, print spoolers and support-ticket lines.
- **Buffering** between a fast producer and a slow consumer: keyboard input, network packets, video frames and message brokers.
- **Rate limiting and caches**: a FIFO of timestamps or keys where the oldest entry is evicted first.

There are several kinds of queue. The **simple (linear) queue** on this page, the **circular queue** that reuses space, the **deque** that works at both ends, and the **priority queue**, which removes the highest-priority element instead of the oldest — usually a binary heap, so it is not FIFO at all.`,
      },
      {
        heading: "Common mistakes and interview questions",
        body: `
- Testing emptiness with \`front == rear\` in this design: a queue with one element also has \`front == rear\`. Empty is \`front > rear\`.
- Forgetting that a linear array queue can refuse an enqueue while it still has free slots.
- Computing the size as \`rear - front\` instead of \`rear - front + 1\`.
- Using \`list.pop(0)\` or \`array.shift()\` inside a loop and turning an O(n) algorithm into O(n²).

Popular interview tasks: implement a queue with two stacks, implement a stack with queues, design a circular queue (LeetCode 622), shortest path in a grid or "rotting oranges" with BFS, and the first non-repeating character in a stream.`,
      },
    ],
    complexity: [
      { label: "enqueue", time: "O(1)", space: "O(1)", note: "Writes one slot after rear." },
      { label: "dequeue", time: "O(1)", space: "O(1)", note: "Moves front one step; nothing shifts." },
      { label: "peek / size / isEmpty", time: "O(1)", space: "O(1)", note: "Index arithmetic only." },
      { label: "compact", time: "O(n)", space: "O(1)", note: "Moves every remaining element back to index 0." },
      { label: "dequeue via list.pop(0)", time: "O(n)", space: "O(1)", note: "Each remaining element shifts one place left." },
    ],
    code: { language: "python", source: py(fullClass(QUEUE_IMPL.python), "# q = Queue(6); q.enqueue(10); q.enqueue(20); q.dequeue()  -> 10") },
    faqs: [
      { q: "Is a queue FIFO or LIFO?", a: "A queue is FIFO: the element that has waited longest leaves first. LIFO describes a stack." },
      { q: "What is the difference between enqueue and dequeue?", a: "Enqueue adds an element at the rear of the queue; dequeue removes and returns the element at the front. Both are O(1)." },
      {
        q: "Why does a linear array queue say it is full when it has empty slots?",
        a: "Because `front` and `rear` only move right, slots before `front` are never revisited. A circular queue wraps the indices around so those slots are reused.",
      },
      { q: "Why is list.pop(0) slow in Python?", a: "Removing the first element shifts every remaining element one place left, which is O(n). `collections.deque.popleft()` is O(1)." },
      {
        q: "Is a priority queue a queue?",
        a: "Only by name: it removes the element with the highest priority rather than the oldest one, so it is not FIFO. It is usually a binary heap with O(log n) insert and remove.",
      },
      {
        q: "What are queue overflow and underflow?",
        a: "Overflow is enqueuing into a full queue; underflow is dequeuing from an empty one. Check `isFull()` or `isEmpty()` first, or use a structure that grows.",
      },
    ],
    related: ["/stack-queue", "/stack-queue/circular-queue", "/stack-queue/deque", "/stack-queue/stack", "/heap", "/graph"],
    updated: UPDATED,
  },

  // ───────────────────────────── circular queue ─────────────────────────────
  {
    path: "/stack-queue/circular-queue",
    parent: "/stack-queue",
    name: "Circular Queue",
    title: "Circular Queue Visualizer — Ring Buffer Step by Step",
    h1: "Circular Queue Visualizer",
    description:
      "Circular queue visualizer: watch front and rear wrap around a ring buffer with (i + 1) % capacity, and learn how to tell a full queue from an empty one.",
    keywords: ["circular queue", "circular queue visualizer", "ring buffer", "circular buffer", "circular queue full condition", "circular queue using array"],
    question: "What is a circular queue?",
    summary:
      "A **circular queue** (or **ring buffer**) is a fixed-size array queue whose indices wrap around: after the last slot comes slot 0, using `(i + 1) % capacity`. Slots freed by dequeue are reused, so enqueue and dequeue stay O(1) and freed slots are never stranded — the reason ring buffers sit inside keyboards, audio drivers and network cards.",
    steps: [
      "Keep an array `A` of `capacity` slots, `front` (index of the first element), `rear` (index of the last element, initially −1) and `count`, the number of elements.",
      "**enqueue(x)**: if `count == capacity` the queue is full. Otherwise set `rear = (rear + 1) % capacity`, write `A[rear] = x` and increase `count`.",
      "**dequeue()**: if `count == 0` the queue is empty. Otherwise read `x = A[front]`, set `front = (front + 1) % capacity`, decrease `count` and return `x`.",
      "**peek()** returns `A[front]`. Both indices only ever step forwards modulo the capacity, so no element ever moves.",
    ],
    sections: [
      {
        heading: "Why wrap around?",
        body: `
In a plain array queue \`front\` and \`rear\` only move right, so the slots before \`front\` are lost and the queue can report *full* while it is half empty. A circular queue treats the array as a ring: when \`rear\` reaches the last index, the next enqueue writes to index 0 if that slot is free.

The modulo operator does the wrapping — \`(5 + 1) % 6 = 0\` — so the code needs no special case for the end of the array. Think of the indices as the hands of a clock: they keep turning forwards, and the hour after 11 is 0 again.`,
      },
      {
        heading: "Worked example: wrapping past the end",
        body: `
Capacity 6, holding 15, 42 and 8 at indices 2–4 (\`front = 2\`, \`rear = 4\`, \`count = 3\`):

- \`enqueue(23)\`: rear = (4 + 1) % 6 = 5, \`A[5] = 23\`, count 4.
- \`enqueue(4)\`: rear = (5 + 1) % 6 = **0** — the index wraps to the start. \`A[0] = 4\`, count 5.
- \`enqueue(16)\`: rear = 1, \`A[1] = 16\`, count 6 = capacity, so the queue is now full.
- \`dequeue()\`: returns **15** from index 2 and front becomes 3, count 5. Slot 2 is free and will be reused when rear comes round to it.

The queue order is always read from \`front\` forwards: 42, 8, 23, 4, 16 — even though 4 and 16 sit at lower indices than 42. The *Wrap-around demo* button in the visualizer plays a similar sequence on whatever is on screen.`,
      },
      {
        heading: "Full or empty? Two ways to tell",
        body: `
With only \`front\` and \`rear\`, a full ring and an empty ring look identical, because in both cases the pointers meet. There are two classic fixes, and the visualizer's *Full check* switch animates both:

- **Counter**: keep \`count\`. Empty is \`count == 0\`, full is \`count == capacity\`, and every slot is usable. This is the version in the code below.
- **Gap slot**: let \`rear\` point at the next free slot and never fill the last free one. Empty is \`front == rear\`; full is \`(rear + 1) % capacity == front\`. You lose one slot but need no counter, which suits lock-free single-producer, single-consumer buffers.

A third design, used by the Linux kernel's \`kfifo\` and many high-performance queues, keeps ever-increasing head and tail counters and reduces them modulo a power-of-two capacity only when indexing; the size is simply \`tail - head\`.`,
      },
      {
        heading: "Common mistakes",
        body: `
- Forgetting the modulo on \`front\` as well as \`rear\` — both pointers must wrap.
- Computing the size as \`rear - front + 1\`; after a wrap that can be negative. Use the counter, or \`(rear - front + capacity) % capacity\` in the gap design.
- Testing \`front == rear\` for *empty* in the counter design — a queue with one element has \`front == rear\` too.
- Stepping backwards with \`(i - 1) % capacity\` in C, C++ or Java, where \`%\` can return a negative number. Write \`(i - 1 + capacity) % capacity\`.
- Reading the array in index order: 4, 16, …, 42, 8, 23 is not the queue order.`,
      },
      {
        heading: "Where ring buffers are used",
        body: `
- Keyboard and serial-port (UART) input buffers, and audio or video streaming buffers.
- Network interface cards and routers queueing packets.
- Keeping the most recent N log lines, an undo history with a size limit, or a moving average over a data stream.
- Producer–consumer pipelines between threads. Python's \`collections.deque(maxlen=n)\` behaves like a ring that drops its oldest item.

In interviews, LeetCode 622 *Design Circular Queue* asks for exactly the counter version below, and 641 *Design Circular Deque* adds the other end. Be ready to explain why the modulo keeps everything O(1), why the gap design sacrifices a slot, and how to grow the buffer: allocate a larger array and copy the elements in queue order, starting from \`front\`.`,
      },
    ],
    complexity: [
      { label: "enqueue", time: "O(1)", space: "O(1)", note: "One modulo step and one write." },
      { label: "dequeue", time: "O(1)", space: "O(1)", note: "front steps forward modulo capacity; nothing shifts." },
      { label: "peek / isFull / isEmpty", time: "O(1)", space: "O(1)", note: "A comparison against count (or the pointers)." },
      { label: "storage", time: "—", space: "O(capacity)", note: "A fixed array; the gap design leaves one slot unused." },
    ],
    code: { language: "python", source: py(fullClass(CIRC_IMPL.count.python), "# q = CircularQueue(3); q.enqueue(1); q.enqueue(2); q.enqueue(3)\n# q.dequeue()  -> 1, then q.enqueue(4) reuses slot 0") },
    faqs: [
      {
        q: "What is a circular queue?",
        a: "A queue stored in a fixed-size array whose front and rear indices wrap around to 0 after the last slot. It reuses the space freed by dequeues, so it never wastes slots.",
      },
      {
        q: "How do you check if a circular queue is full?",
        a: "With a counter, it is full when `count == capacity`. Without one, where `rear` is the next free slot, it is full when `(rear + 1) % capacity == front`.",
      },
      {
        q: "Why does a circular queue keep one slot empty?",
        a: "Only in the design without a counter: if every slot were filled, `front == rear` would mean both full and empty. Leaving one slot empty keeps the two states distinguishable.",
      },
      {
        q: "What is the advantage of a circular queue over a linear queue?",
        a: "It reuses the slots that dequeues free up, so it only reports full when it truly is full — with O(1) enqueue and dequeue and no shifting of elements.",
      },
      {
        q: "How do you find the number of elements in a circular queue?",
        a: "Keep a `count` variable, or compute `(rear - front + capacity) % capacity` when `rear` points at the next free slot.",
      },
      {
        q: "Is a ring buffer the same as a circular queue?",
        a: "In practice, yes: both are a fixed-size array used as a FIFO with wrap-around indices. \"Ring buffer\" or \"circular buffer\" is the more common name in systems programming.",
      },
    ],
    related: ["/stack-queue/queue", "/stack-queue/deque", "/stack-queue", "/stack-queue/stack"],
    updated: UPDATED,
  },

  // ───────────────────────────── deque ─────────────────────────────
  {
    path: "/stack-queue/deque",
    parent: "/stack-queue",
    name: "Deque",
    title: "Deque Visualizer — Double-Ended Queue Step by Step",
    h1: "Deque Visualizer",
    description:
      "Deque visualizer: push and pop at both the front and back of a double-ended queue on a circular array, each in O(1), and see how it acts as a stack or a queue.",
    keywords: ["deque", "double ended queue", "deque visualizer", "deque data structure", "deque operations", "sliding window maximum deque"],
    question: "What is a deque?",
    summary:
      "A **deque** (double-ended queue, pronounced “deck”) lets you insert and remove elements at **both** ends in O(1): push_front, push_back, pop_front and pop_back. It generalizes the other two structures — use only one end and it is a stack; push at the back and pop at the front and it is a queue.",
    steps: [
      "Store the elements in a circular array of `capacity` slots with `front` (index of the first element) and `size`. The last element lives at `(front + size - 1) % capacity`.",
      "**push_front(x)**: step `front` back with `front = (front - 1 + capacity) % capacity`, write `A[front] = x` and increase `size`.",
      "**push_back(x)**: write to the first free slot after the last element, `A[(front + size) % capacity] = x`, and increase `size`.",
      "**pop_front()**: read `A[front]`, move `front = (front + 1) % capacity` and decrease `size`.",
      "**pop_back()**: read `A[(front + size - 1) % capacity]` and decrease `size`; `front` does not move.",
    ],
    sections: [
      {
        heading: "Worked example: pushing past the start of the array",
        body: `
Capacity 7, holding 8, 3 and 5 at indices 0–2 (\`front = 0\`, \`size = 3\`):

- \`push_front(1)\`: front = (0 − 1 + 7) % 7 = **6** — it wraps to the last slot. \`A[6] = 1\`. Deque: [1, 8, 3, 5].
- \`push_front(2)\`: front = 5 and \`A[5] = 2\`. Deque: [2, 1, 8, 3, 5].
- \`push_back(9)\`: writes \`A[(5 + 5) % 7] = A[3] = 9\`. Deque: [2, 1, 8, 3, 5, 9].
- \`pop_back()\`: reads \`A[(5 + 6 - 1) % 7] = A[3]\` and returns **9**; size 5.
- \`pop_front()\`: returns **2** from index 5; front becomes 6.

Nothing ever shifts. Each operation moves one index and touches one slot, so all four are O(1).`,
      },
      {
        heading: "One structure, three behaviours",
        body: `
- **As a stack**: \`push_back\` with \`pop_back\` (or the two front operations) — last in, first out.
- **As a queue**: \`push_back\` with \`pop_front\` — first in, first out.
- **As both at once**: problems such as the sliding-window maximum add at the back and remove from both ends.

Restricted forms appear in textbooks too: an **input-restricted** deque allows insertion at only one end, and an **output-restricted** deque allows deletion at only one end.`,
      },
      {
        heading: "How real deques are implemented",
        body: `
- **Circular array** — this page, Java's \`ArrayDeque\`, Rust's \`VecDeque\`: compact and cache-friendly. When full it moves the elements, in order, into a larger array, so pushes are amortized O(1).
- **Blocks of fixed-size arrays** — C++'s \`std::deque\` and Python's \`collections.deque\`: pushing at either end never moves existing elements. C++ also gives O(1) indexing, while indexing a Python deque is O(n) towards the middle.
- **Doubly linked list**: O(1) at both ends with no resizing, but one node allocation per element.`,
      },
      {
        heading: "Classic deque problem: sliding window maximum",
        body: `
To report the maximum of every window of k consecutive values in O(n), keep a deque of indices whose values **decrease** from front to back. For each new index:

- Pop from the **back** while the value there is smaller than the incoming value — it can never be a window maximum again.
- Push the new index at the back.
- Pop from the **front** if that index has slid out of the window.
- The front now holds the index of the current window's maximum.

For [1, 3, −1, −3, 5, 3, 6, 7] with k = 3 the maxima are [3, 3, 5, 5, 6, 7]. Each index enters and leaves the deque at most once — the same amortized argument as the monotonic stack behind the next greater element. Deques also drive 0-1 BFS (0-weight edges go to the front, 1-weight edges to the back) and work-stealing thread schedulers.`,
      },
      {
        heading: "Common mistakes",
        body: `
- Writing \`(front - 1) % capacity\` in C, C++ or Java: when front is 0 the result is −1, not \`capacity - 1\`. Add \`capacity\` before taking the modulo.
- Moving \`front\` on \`pop_back\` — only \`size\` changes.
- Forgetting that pushing several values at the front reverses them: push_front 1, then 2, gives [2, 1, …].
- Indexing into the middle of Python's \`collections.deque\` inside a loop — each access is O(n); use a list when you need random access.
- Storing \`null\` in Java's \`ArrayDeque\`, which throws a \`NullPointerException\`.`,
      },
    ],
    complexity: [
      { label: "push_front / push_back", time: "O(1)", space: "O(1)", note: "One index step (mod capacity) and one write; amortized O(1) if the array grows." },
      { label: "pop_front / pop_back", time: "O(1)", space: "O(1)", note: "Read one end, then move front or just shrink size." },
      { label: "peek_front / peek_back", time: "O(1)", space: "O(1)", note: "Direct index into the array." },
      { label: "access by position i", time: "O(1)", space: "O(1)", note: "A[(front + i) % capacity] in a circular array; O(n) in a linked list." },
      { label: "search for a value", time: "O(n)", space: "O(1)", note: "Scan from front to back." },
    ],
    code: { language: "python", source: py(fullClass(DEQUE_IMPL.python), "# d = Deque(7); d.push_back(8); d.push_front(1); d.pop_back()  -> 8") },
    faqs: [
      { q: "What is a deque?", a: "A double-ended queue: a sequence that supports insertion and removal at both the front and the back in O(1) time." },
      { q: "How do you pronounce deque?", a: "Like “deck”. It is short for double-ended queue and is a different word from *dequeue*, the queue operation." },
      {
        q: "Is a deque a stack or a queue?",
        a: "Both: using one end only gives stack (LIFO) behaviour, and adding at one end while removing at the other gives queue (FIFO) behaviour.",
      },
      {
        q: "What is the time complexity of deque operations?",
        a: "Push and pop at either end are O(1) (amortized when the backing array grows), peeking at the ends is O(1), and searching is O(n).",
      },
      {
        q: "When should I use collections.deque in Python?",
        a: "Whenever you add or remove at the left end: `appendleft` and `popleft` are O(1), whereas `list.insert(0, x)` and `list.pop(0)` are O(n). `deque(maxlen=n)` also gives a bounded buffer that drops the oldest item.",
      },
      {
        q: "What is the difference between a deque and a circular queue?",
        a: "A circular queue only adds at the rear and removes at the front. A deque on a circular array uses the same wrap-around indices but allows both operations at both ends.",
      },
    ],
    related: ["/stack-queue/circular-queue", "/stack-queue/queue", "/stack-queue/stack", "/stack-queue/next-greater-element", "/linked-list"],
    updated: UPDATED,
  },

  // ───────────────────────────── balanced parentheses ─────────────────────────────
  {
    path: "/stack-queue/balanced-parentheses",
    parent: "/stack-queue",
    name: "Balanced Parentheses",
    title: "Balanced Parentheses Checker — Step by Step",
    h1: "Balanced Parentheses Checker",
    description:
      "Check if parentheses are balanced and watch the stack algorithm step by step: push each opener, match each closer, catch crossed or unclosed brackets in O(n).",
    keywords: ["balanced parentheses", "balanced parentheses checker", "valid parentheses", "balanced brackets using stack", "parenthesis matching", "check balanced parentheses"],
    question: "How do you check if parentheses are balanced?",
    summary:
      "A string of brackets is **balanced** when every opening bracket — `(`, `[` or `{` — is closed by the matching closing bracket in the correct order. Check it with a **stack**: push every opener, and for every closer pop the top and confirm it is the matching opener. The string is balanced only if no check fails and the stack is empty at the end, which takes O(n) time.",
    steps: [
      "Start with an empty stack and scan the string from left to right, ignoring characters that are not brackets.",
      "On an opening bracket `(`, `[` or `{`, push it.",
      "On a closing bracket, if the stack is empty the closer has no partner — **not balanced**.",
      "Otherwise pop the top. If it is not the matching opener (for example `[` popped for a `)`), the brackets cross — **not balanced**.",
      "After the last character the string is balanced only if the stack is empty; anything left is an opener that was never closed.",
    ],
    sections: [
      {
        heading: "Why a stack?",
        body: `
Brackets nest: whatever was opened **last** must be closed **first**. \`{ [ ( ) ] }\` closes in the reverse order it opened, which is exactly last in, first out. The stack holds the openers that are still waiting, and its top is always the one the next closer has to match.

With a single kind of bracket you don't even need a stack — a counter does the job (see below). The stack becomes necessary as soon as there are several kinds, because a counter can't tell \`([)]\` from \`([])\`.`,
      },
      {
        heading: "Worked example: {[()()]}",
        body: `
- \`{\` → push. Stack: \`{\`
- \`[\` → push. Stack: \`{ [\`
- \`(\` → push. Stack: \`{ [ (\`
- \`)\` → pop \`(\`, which matches. Stack: \`{ [\`
- \`(\` → push. Stack: \`{ [ (\`
- \`)\` → pop \`(\`, match. Stack: \`{ [\`
- \`]\` → pop \`[\`, match. Stack: \`{\`
- \`}\` → pop \`{\`, match. Stack: empty

Every closer matched and the stack ended empty, so \`{[()()]}\` is **balanced**. Eight characters, eight O(1) stack operations: the algorithm is O(n) time, and O(n) space in the worst case — a string made only of openers.`,
      },
      {
        heading: "The three ways a string can be unbalanced",
        body: `
- **Crossed brackets** — \`([)]\`: after pushing \`(\` and \`[\`, the \`)\` pops \`[\`. The pair doesn't match, so the brackets overlap instead of nesting.
- **A closer with nothing open** — \`)(\` or \`())\`: the stack is empty when a closing bracket arrives.
- **An opener that is never closed** — \`(()\`: the scan finishes with \`(\` still on the stack.

A correct checker must catch all three, and most buggy solutions miss one. Try each in the visualizer above: the failing bracket and its partner turn red and the explanation says which rule was broken.`,
      },
      {
        heading: "Counter vs stack",
        body: `
With only one bracket type, keep an integer \`depth\`: add 1 on \`(\`, subtract 1 on \`)\`, fail immediately if it goes negative, and require \`depth == 0\` at the end. That uses O(1) space.

With several types a counter breaks down. In \`([)]\` every per-type count stays non-negative and ends at zero, yet the brackets cross. Only a stack remembers the **order** in which the brackets were opened.`,
      },
      {
        heading: "Common mistakes",
        body: `
- Popping without first checking for an empty stack — crashes on inputs like \`)\`.
- Returning \`true\` after the loop without checking that the stack is empty — accepts \`((\`.
- Using one counter for all bracket types — accepts \`([)]\`.
- Hard-coding the pairs in a chain of \`if\` statements and mismatching one; a map from each closer to its opener avoids typos.
- Rejecting other characters: code such as \`if (a[i] == f(x)) { … }\` should be checked by skipping non-bracket characters.
- Using the odd-length shortcut (\`len(s) % 2 == 1\` → false) when the input can contain characters other than brackets.`,
      },
      {
        heading: "Interview variations",
        body: `
- **Valid Parentheses** (LeetCode 20): exactly this algorithm.
- **Minimum Add to Make Parentheses Valid** (921): count unmatched \`(\` and unmatched \`)\`; no stack needed.
- **Minimum Remove to Make Valid Parentheses** (1249): keep a stack of the *indices* of unmatched brackets, then delete them.
- **Longest Valid Parentheses** (32): a stack of indices seeded with −1; after each match the current valid length is \`i - top\`.
- **Generate Parentheses** (22): backtracking that never lets closers outnumber openers.
- **Valid Parenthesis String** with \`*\` wildcards (678): track the range of possible open counts.

HTML and XML validators use the same idea with tags in place of single characters.`,
      },
    ],
    complexity: [
      { label: "Stack algorithm", time: "O(n)", space: "O(n)", note: "Each bracket is pushed and popped at most once; worst case, every opener stays on the stack." },
      { label: "Counter (one bracket type)", time: "O(n)", space: "O(1)", note: "Only the nesting depth is stored." },
      { label: "Early failure at position k", time: "O(k)", space: "O(k)", note: "The scan stops at the first mismatch or unmatched closer." },
    ],
    code: { language: "python", source: py(APP_IMPL.brackets.python, '# is_balanced("{[()()]}")  -> True\n# is_balanced("([)]")      -> False') },
    faqs: [
      {
        q: "Which data structure is used to check balanced parentheses?",
        a: "A stack. The most recently opened bracket must be closed first, and a stack gives exactly that last-in, first-out access.",
      },
      {
        q: "What is the time complexity of checking balanced parentheses?",
        a: "O(n) time for a string of length n, because each character is examined once and pushed or popped at most once, plus O(n) extra space for the stack in the worst case.",
      },
      {
        q: "Why is ([)] not balanced?",
        a: "Because the brackets cross: `[` opens after `(`, so it has to close before `)`. When `)` arrives the top of the stack is `[`, which doesn't match.",
      },
      { q: "Is an empty string balanced?", a: "Yes. It has no unmatched brackets and the stack is empty at the end, so the algorithm returns true." },
      {
        q: "Can you check balanced parentheses without a stack?",
        a: "For a single bracket type, yes: a counter that never drops below zero and ends at zero is enough. For mixed types you need a stack — or recursion, which uses the call stack.",
      },
      {
        q: "How do you check balanced brackets in Python?",
        a: "Loop over the string, append openers to a list, and on a closer pop the list and compare it with a dictionary of pairs; return `not stack` at the end. The full function is shown above.",
      },
    ],
    related: ["/stack-queue/infix-to-postfix", "/stack-queue/postfix-evaluation", "/stack-queue/stack", "/stack-queue/next-greater-element", "/stack-queue"],
    updated: UPDATED,
  },

  // ───────────────────────────── infix to postfix ─────────────────────────────
  {
    path: "/stack-queue/infix-to-postfix",
    parent: "/stack-queue",
    name: "Infix to Postfix",
    title: "Infix to Postfix Converter — Step by Step",
    h1: "Infix to Postfix Converter",
    description:
      "Convert infix to postfix step by step with the shunting-yard algorithm: see the operator stack, precedence and associativity, and the output after every token.",
    keywords: ["infix to postfix", "infix to postfix converter", "infix to postfix conversion using stack", "shunting yard algorithm", "operator precedence and associativity", "reverse polish notation"],
    question: "How do you convert infix to postfix?",
    summary:
      "To convert an **infix** expression like `a + b * c` to **postfix** (`a b c * +`), scan it left to right with an operator stack: operands go straight to the output, while each operator waits on the stack until an operator of lower precedence, a closing parenthesis or the end of the input pops it. This is Dijkstra's **shunting-yard algorithm**, and it runs in O(n) time.",
    steps: [
      "Scan the tokens from left to right, with an empty output list and an empty operator stack.",
      "**Operand** (a number or a variable): append it to the output.",
      "`(`: push it onto the stack.",
      "`)`: pop operators to the output until a `(` is on top, then pop and discard the `(`.",
      "**Operator** `o`: while the top of the stack is an operator that binds tighter than `o` — higher precedence, or equal precedence with `o` left-associative — pop it to the output. Then push `o`.",
      "**End of input**: pop every remaining operator to the output.",
    ],
    sections: [
      {
        heading: "Precedence and associativity rules",
        body: `
Precedence decides which operator is applied first; associativity breaks ties between operators of the same precedence. The visualizer, like most textbooks, uses:

- \`^\` **(power)** — highest precedence (3) and **right-associative**: \`2^3^2\` means \`2^(3^2) = 512\`, so its postfix is \`2 3 2 ^ ^\`.
- \`*\`, \`/\`, \`%\` — precedence 2, **left-associative**: \`a/b*c\` means \`(a/b)*c\`, giving \`a b / c *\`.
- \`+\`, \`-\` — lowest precedence (1), **left-associative**: \`a-b-c\` means \`(a-b)-c\`, giving \`a b - c -\`.
- **Parentheses** override everything. A \`(\` on the stack acts as a wall: operators never pop past it, and only the matching \`)\` removes it.

The whole pop rule fits in one sentence: **pop while the top's precedence is greater than the incoming operator's, or equal and the incoming operator is left-associative.** For \`^\` the equal case does not pop, and that is precisely what makes it right-associative. The precedence card next to the visualizer highlights the two operators being compared at every step.`,
      },
      {
        heading: "Worked example: a+b*(c^d-e)/f",
        body: `
Each line shows the token, then the operator stack (bottom → top) and the output after handling it:

- \`a\` → stack: empty | output: \`a\`
- \`+\` → stack: \`+\` | output: \`a\`
- \`b\` → stack: \`+\` | output: \`a b\`
- \`*\` → \`*\` (2) binds tighter than \`+\` (1), so it is pushed. Stack: \`+ *\` | output: \`a b\`
- \`(\` → stack: \`+ * (\` | output: \`a b\`
- \`c\` → stack: \`+ * (\` | output: \`a b c\`
- \`^\` → the top is \`(\`, a wall, so push. Stack: \`+ * ( ^\` | output: \`a b c\`
- \`d\` → stack: \`+ * ( ^\` | output: \`a b c d\`
- \`-\` → \`^\` (3) beats \`-\` (1): pop it; then \`(\` stops the loop. Stack: \`+ * ( -\` | output: \`a b c d ^\`
- \`e\` → stack: \`+ * ( -\` | output: \`a b c d ^ e\`
- \`)\` → pop \`-\`, discard \`(\`. Stack: \`+ *\` | output: \`a b c d ^ e -\`
- \`/\` → \`*\` has equal precedence and \`/\` is left-associative: pop \`*\`; \`+\` is lower, so stop and push \`/\`. Stack: \`+ /\` | output: \`a b c d ^ e - *\`
- \`f\` → stack: \`+ /\` | output: \`a b c d ^ e - * f\`
- end → pop \`/\`, then \`+\`.

Result: \`a b c d ^ e - * f / +\`. Read back, it is \`a + ((b * (c^d - e)) / f)\`: the operators appear in the order they are applied, so postfix needs neither parentheses nor precedence rules. Press play above to watch each step.`,
      },
      {
        heading: "Why the algorithm works",
        body: `
Postfix keeps the operands in their original order and writes each operator right after both of its operands are complete. So operands go straight to the output, while an operator — whose right operand hasn't been read yet — waits on the stack.

When a new operator arrives, every waiting operator that binds tighter now has a complete right operand, so it is written first. Inside one level of parentheses the stack therefore holds operators in increasing order of precedence from bottom to top (a run of \`^\` is the only tie). Each token is pushed and popped at most once, so the nested loop does O(n) work in total.`,
      },
      {
        heading: "Common mistakes",
        body: `
- Popping on equal precedence for \`^\`: that produces \`2 3 ^ 2 ^\`, which is 64, instead of \`2 3 2 ^ ^\` = 512.
- Not popping on equal precedence for left-associative operators: \`a-b+c\` would become \`a b c + -\`, which means \`a - (b + c)\`.
- Forgetting to pop the remaining operators when the input ends.
- Letting an operator pop past \`(\`, or writing parentheses into the output.
- Treating a unary minus as binary: \`-3+4\` has no left operand for \`-\`. Rewrite it as \`(0-3)+4\` or give unary minus its own higher-precedence token.
- Splitting \`12+3\` into single characters: tokenize first so multi-digit numbers and names stay whole.`,
      },
      {
        heading: "Infix, prefix and postfix compared",
        body: `
- **Infix** \`(a + b) * c\` — operators sit between operands; needs precedence rules and parentheses. Natural for humans.
- **Prefix** (Polish notation) \`* + a b c\` — each operator comes before its operands; no parentheses needed.
- **Postfix** (Reverse Polish notation) \`a b + c *\` — each operator comes after its operands; a machine evaluates it with one stack in a single left-to-right pass.

To get **prefix** from infix, reverse the expression, swap \`(\` and \`)\`, convert to postfix with the tie rule mirrored (on equal precedence, pop only when the incoming operator is the right-associative \`^\`), then reverse the result. Compilers usually build an expression tree instead: postfix is its post-order traversal and prefix its pre-order traversal.`,
      },
      {
        heading: "Interview variations",
        body: `
- **Evaluate the result**: feed the postfix to a stack evaluator — see postfix evaluation.
- **Basic Calculator** (LeetCode 224 and 227): evaluate infix directly with two stacks, one for numbers and one for operators, applying an operator whenever this algorithm would output it.
- **Postfix to infix**: push operands as strings; for each operator pop \`b\` and \`a\` and push \`"(a op b)"\`.
- **Build an expression tree** from postfix with a stack of subtrees.`,
      },
    ],
    complexity: [
      { label: "Conversion", time: "O(n)", space: "O(n)", note: "Each operand is output once; each operator is pushed and popped once." },
      { label: "Tokenizing", time: "O(n)", space: "O(n)", note: "One pass over the characters." },
      { label: "Evaluating the postfix", time: "O(n)", space: "O(n)", note: "A second single pass with a value stack." },
    ],
    code: {
      language: "python",
      source: py(`${trim(TOKENIZE)}\n\n\n${trim(APP_IMPL.infix.python)}`, '# to_postfix(tokenize("a+b*(c^d-e)/f"))\n#   -> [\'a\', \'b\', \'c\', \'d\', \'^\', \'e\', \'-\', \'*\', \'f\', \'/\', \'+\']'),
    },
    faqs: [
      { q: "What is the postfix form of a+b*c?", a: "`a b c * +`. Multiplication binds tighter, so `b * c` is computed first and `+` comes last." },
      { q: "What is the postfix form of (a+b)*c?", a: "`a b + c *`. The parentheses force the addition first, so its operator is written before `*`." },
      {
        q: "Which data structure is used to convert infix to postfix?",
        a: "A stack holds the operators and open parentheses that are still waiting; operands go directly to the output, which is usually a list or a queue.",
      },
      {
        q: "Why is ^ right-associative?",
        a: "By mathematical convention `2^3^2` means `2^(3^2) = 512`, not `(2^3)^2 = 64`. In the algorithm an incoming `^` does not pop a `^` of equal precedence, so the later one is applied first.",
      },
      {
        q: "What is the time complexity of infix to postfix conversion?",
        a: "O(n) for n tokens: every operand is output once and every operator is pushed and popped once, so the inner while loop does O(n) work in total.",
      },
      {
        q: "What is the shunting-yard algorithm?",
        a: "Edsger Dijkstra's 1961 algorithm for parsing infix expressions with an operator stack, named after a railway shunting yard. It produces postfix (Reverse Polish notation) or an expression tree.",
      },
    ],
    related: ["/stack-queue/postfix-evaluation", "/stack-queue/balanced-parentheses", "/stack-queue/stack", "/stack-queue"],
    updated: UPDATED,
  },

  // ───────────────────────────── postfix evaluation ─────────────────────────────
  {
    path: "/stack-queue/postfix-evaluation",
    parent: "/stack-queue",
    name: "Postfix Evaluation",
    title: "Postfix Evaluation Using Stack — Step by Step",
    h1: "Postfix Expression Evaluator",
    description:
      "Evaluate postfix (Reverse Polish) expressions with a stack, step by step: push numbers, pop two operands per operator in the right order, catch invalid input.",
    keywords: ["postfix evaluation", "evaluate postfix expression", "postfix evaluation using stack", "reverse polish notation calculator", "evaluate reverse polish notation", "postfix expression evaluator"],
    question: "How do you evaluate a postfix expression?",
    summary:
      "To evaluate a **postfix** (Reverse Polish) expression such as `5 1 2 + 4 * + 3 -`, scan it left to right with a stack: push every number, and for every operator pop two values — the first pop is the **right** operand — apply the operator and push the result. A valid expression leaves exactly one value on the stack, the answer (14 here), after O(n) work.",
    steps: [
      "Split the expression into tokens and start with an empty stack.",
      "**Number**: push it.",
      "**Operator**: pop `b` (the right operand, pushed last), then pop `a` (the left operand), compute `a op b` and push the result. With fewer than two values on the stack the expression is invalid.",
      "At the end exactly one value must remain: that is the result. More than one means there were too few operators.",
    ],
    sections: [
      {
        heading: "Worked example: 5 1 2 + 4 * + 3 -",
        body: `
- \`5\`, \`1\`, \`2\` → push each. Stack: \`5 1 2\`
- \`+\` → b = 2, a = 1, 1 + 2 = 3. Stack: \`5 3\`
- \`4\` → push. Stack: \`5 3 4\`
- \`*\` → b = 4, a = 3, 3 × 4 = 12. Stack: \`5 12\`
- \`+\` → b = 12, a = 5, 5 + 12 = 17. Stack: \`17\`
- \`3\` → push. Stack: \`17 3\`
- \`-\` → b = 3, a = 17, 17 − 3 = 14. Stack: \`14\`

One value is left, so the expression equals **14**. In infix it reads \`5 + (1 + 2) × 4 - 3\`. This example is preloaded in the visualizer above, which shows the two operands lifting off the stack for every operator.`,
      },
      {
        heading: "Operand order matters",
        body: `
Because the stack returns the most recent value first, the first pop is the **right-hand** operand. For \`+\` and \`*\` the order makes no difference, but for \`-\`, \`/\`, \`%\` and \`^\` it does:

- \`10 4 -\` is 10 − 4 = **6**, not −6.
- \`10 4 - 3 /\` is (10 − 4) / 3 = **2**.
- \`2 3 2 ^ ^\` is 2^(3^2) = **512**, while \`2 3 ^ 2 ^\` is (2^3)^2 = **64** — postfix spells the grouping out explicitly.`,
      },
      {
        heading: "Detecting invalid expressions",
        body: `
- **Not enough operands** — \`1 +\`: the operator finds fewer than two values on the stack (too many operators, or one too early).
- **Too many operands** — \`1 2 3 +\`: two values, 1 and 5, remain at the end (too few operators).
- **Division by zero** — \`8 0 /\`: the expression has no value.
- **Unknown tokens** — a variable such as \`x\` has no value to push.

A quick sanity check for binary operators: a valid postfix expression has exactly one more operand than operators, and while scanning from the left the operands seen always outnumber the operators seen.`,
      },
      {
        heading: "Why postfix? Where it is used",
        body: `
Postfix needs no parentheses and no precedence rules, so a machine can evaluate it in one pass with one stack. That is exactly how **stack machines** work: Java bytecode, .NET CIL, WebAssembly, CPython bytecode, PostScript and Forth all push operands and let instructions pop them.

HP calculators made Reverse Polish notation famous, and compilers turn infix source into an expression tree or postfix-like code before generating instructions. To evaluate an ordinary infix expression yourself, convert it with the shunting-yard algorithm first, then run this evaluator.`,
      },
      {
        heading: "Common mistakes",
        body: `
- Swapping the operands — computing \`b - a\` instead of \`a - b\`.
- Integer-division surprises: in Python \`7 / 2\` is 3.5. LeetCode 150 wants truncation toward zero, which is \`int(a / b)\`, not \`a // b\` (that floors: \`-7 // 2 == -4\`).
- Splitting multi-digit numbers into characters — separate the tokens with spaces.
- Confusing a negative number such as \`-3\` with the operator \`-\` followed by \`3\`: decide how negatives are written and tokenize accordingly.
- Not checking that exactly one value remains at the end.`,
      },
      {
        heading: "Prefix evaluation and interview variations",
        body: `
**Prefix** (Polish) expressions are evaluated the same way but scanned **right to left**, and then the first value popped is the **left** operand. \`- + 5 * + 1 2 4 3\` also gives 14.

- **Evaluate Reverse Polish Notation** (LeetCode 150): this exact algorithm with integer division that truncates toward zero.
- **Postfix to infix**: push strings and build \`"(a op b)"\` for every operator.
- **Expression trees**: push leaf nodes and let each operator pop two subtrees.
- **Basic Calculator**: convert infix to postfix and evaluate it, or merge both passes with two stacks.`,
      },
    ],
    complexity: [
      { label: "Evaluation", time: "O(n)", space: "O(n)", note: "One pass; each token does O(1) stack work. Worst case, all the numbers come first." },
      { label: "Validity count (binary operators)", time: "O(n)", space: "O(1)", note: "Track operands minus operators: it must stay ≥ 1 and end at exactly 1." },
    ],
    code: { language: "python", source: py(APP_IMPL.postfix.python, '# evaluate("5 1 2 + 4 * + 3 -".split())  -> 14.0') },
    faqs: [
      { q: "What is the value of the postfix expression 5 1 2 + 4 * + 3 -?", a: "14. The steps are 1 + 2 = 3, 3 × 4 = 12, 5 + 12 = 17 and 17 − 3 = 14." },
      { q: "Which data structure is used to evaluate a postfix expression?", a: "A stack. Operands wait on it until an operator pops the two most recent ones and pushes the result." },
      { q: "Which operand is popped first in postfix evaluation?", a: "The right operand. For `a b -` the stack pops `b` first, then `a`, and computes `a - b`." },
      {
        q: "What is the time complexity of postfix evaluation?",
        a: "O(n) time and O(n) space for n tokens: each token is either one push, or two pops and one push, all O(1).",
      },
      {
        q: "What is Reverse Polish notation?",
        a: "Another name for postfix notation, where every operator follows its operands, e.g. `3 4 +` for 3 + 4. It needs no parentheses and was popularized by HP calculators.",
      },
      {
        q: "What happens if a postfix expression is invalid?",
        a: "If an operator finds fewer than two values on the stack there are too many operators; if more than one value remains at the end there are too few. Either way the expression has no single value.",
      },
    ],
    related: ["/stack-queue/infix-to-postfix", "/stack-queue/balanced-parentheses", "/stack-queue/stack", "/stack-queue"],
    updated: UPDATED,
  },

  // ───────────────────────────── next greater element ─────────────────────────────
  {
    path: "/stack-queue/next-greater-element",
    parent: "/stack-queue",
    name: "Next Greater Element",
    title: "Next Greater Element — Monotonic Stack, Step by Step",
    h1: "Next Greater Element Visualizer",
    description:
      "Find the next greater element of every array value with a monotonic stack in O(n). Watch each index wait on the stack until a larger value resolves it.",
    keywords: ["next greater element", "next greater element using stack", "monotonic stack", "next greater element visualizer", "daily temperatures", "next greater element in array"],
    question: "What is the next greater element?",
    summary:
      "The **next greater element** (NGE) of `A[i]` is the first value to its right that is strictly larger than `A[i]`, or −1 if there is none. Checking every pair takes O(n²), but a **monotonic stack** of indices, whose values decrease from bottom to top, finds every answer in one pass in O(n) time, because each index is pushed once and popped at most once.",
    steps: [
      "Fill `result` with −1 and start with an empty stack of **indices**.",
      "Scan `i` from left to right. While the stack is not empty and `A[top] < A[i]`, pop `top` and set `result[top] = A[i]` — `A[i]` is the first larger value to its right.",
      "Push `i`: it now waits for its own next greater element.",
      "Indices still on the stack at the end have no larger value to their right and keep −1.",
    ],
    sections: [
      {
        heading: "Worked example: [4, 5, 2, 25, 7, 8]",
        body: `
- i = 0, value 4: the stack is empty, so push 0. Waiting values: [4].
- i = 1, value 5: 4 < 5, so pop it — NGE(4) = 5. Push 1. Waiting: [5].
- i = 2, value 2: 5 ≥ 2, stop. Push 2. Waiting: [5, 2].
- i = 3, value 25: 2 < 25 → NGE(2) = 25; 5 < 25 → NGE(5) = 25. Push 3. Waiting: [25].
- i = 4, value 7: 25 ≥ 7, so just push 4. Waiting: [25, 7].
- i = 5, value 8: 7 < 8 → NGE(7) = 8; 25 ≥ 8, stop. Push 5. Waiting: [25, 8].
- End: 25 and 8 never met a larger value, so their answer is −1.

Result: **[5, 25, 25, −1, 8, −1]**. The stack stores indices (the values are shown here for readability), so each answer can be written to the right position in \`result\` — even when values repeat. This array is preloaded in the visualizer above.`,
      },
      {
        heading: "Why it is O(n) and not O(n²)",
        body: `
The \`while\` loop inside the \`for\` loop looks quadratic, but count the work per element instead of per iteration: every index is pushed exactly once and popped at most once. That is at most 2n stack operations in total, so the whole scan is **O(n)** — an *amortized* argument. A decreasing input such as [5, 4, 3, 2, 1] never pops at all (n pushes; every index keeps −1), an increasing one pops once per step, and [5, 4, 3, 2, 1, 9] pops five indices in a single iteration — yet none of them exceeds 2n operations.

The stack stays **monotonic**: its values never increase from bottom to top. That is why one comparison with the top is enough — if \`A[i]\` is not larger than the top, it is not larger than anything below it either, because those values are bigger still.`,
      },
      {
        heading: "The monotonic stack family",
        body: `
Change the comparison or the scan direction and the same loop answers related questions:

- **Next greater** (this page): pop while \`A[top] < A[i]\`; the stack is decreasing.
- **Next smaller**: pop while \`A[top] > A[i]\`; the stack is increasing.
- **Previous greater or previous smaller**: after the popping loop, whatever is left on top is the answer for \`i\` (−1 if the stack is empty).
- **Strict vs non-strict**: using \`<=\` instead of \`<\` decides how equal values are treated, which matters with duplicates.

Scanning right to left is an equally common variant: pop while \`A[top] <= A[i]\`, and then the top, if any, is the next greater element of \`A[i]\`.`,
      },
      {
        heading: "Common mistakes",
        body: `
- Storing values instead of indices, so you can't tell **which** element was resolved, and duplicates get confused.
- Using \`<=\` when the problem asks for a *strictly* greater element, or the reverse.
- Forgetting the −1 default for elements that are never popped.
- Writing the answer to \`result[i]\` instead of \`result[top]\` — the popped index is the one being resolved.
- For a **circular** array (LeetCode 503), scanning only once: loop \`i\` from 0 to 2n − 1, read \`A[i % n]\`, and push indices only during the first pass.`,
      },
      {
        heading: "Interview variations",
        body: `
- **Next Greater Element I** (LeetCode 496): run this on \`nums2\`, store the answers in a hash map, then look up each value of \`nums1\`.
- **Next Greater Element II** (503): a circular array, handled with two passes.
- **Daily Temperatures** (739): store the distance \`i - top\` (days to wait) instead of the value.
- **Online Stock Span** (901): previous greater element, counted as a span.
- **Largest Rectangle in Histogram** (84): the previous and next *smaller* elements bound each bar.
- **Trapping Rain Water** (42), **Sum of Subarray Minimums** (907) and **Remove K Digits** (402) use the same stack.`,
      },
    ],
    complexity: [
      { label: "Brute force (nested loops)", time: "O(n²)", space: "O(1)", note: "For each element, scan right until a larger value appears." },
      { label: "Monotonic stack", time: "O(n)", space: "O(n)", note: "Each index is pushed once and popped at most once." },
      { label: "Worst-case stack size", time: "—", space: "O(n)", note: "A decreasing array keeps every index on the stack until the end." },
    ],
    code: { language: "python", source: py(APP_IMPL.nge.python, "# next_greater([4, 5, 2, 25, 7, 8])  -> [5, 25, 25, -1, 8, -1]") },
    faqs: [
      { q: "What is the next greater element of the last element?", a: "Always −1, because nothing lies to its right." },
      {
        q: "What is a monotonic stack?",
        a: "A stack whose values stay sorted from bottom to top — decreasing for next-greater problems, increasing for next-smaller ones. Each new element pops everything that would break the order.",
      },
      {
        q: "What is the time complexity of the next greater element algorithm?",
        a: "O(n) with a monotonic stack, since each index is pushed and popped at most once; the brute-force double loop is O(n²).",
      },
      {
        q: "How do you find the next greater element in a circular array?",
        a: "Loop over the array twice (i from 0 to 2n − 1, reading `A[i % n]`) so elements near the end can find larger values at the start, but push indices only during the first pass.",
      },
      {
        q: "How is Daily Temperatures related to next greater element?",
        a: "It is the same algorithm, but instead of the larger value you store the distance `i - top`: the number of days until a warmer temperature.",
      },
      {
        q: "Why does the stack store indices instead of values?",
        a: "The index tells you where to write the answer when the element is popped, and it keeps equal values apart. You can always read the value as `A[index]`.",
      },
    ],
    related: ["/stack-queue/stack", "/stack-queue/deque", "/stack-queue/balanced-parentheses", "/stack-queue/postfix-evaluation", "/stack-queue"],
    updated: UPDATED,
  },
];
