import { implementationsFor } from "@/features/heap/code/implementations";
import type { HeapKind, OpCode } from "@/features/heap/engine/types";
import type { TopicContent } from "../types";

const UPDATED = "2026-10-19";

/**
 * Python for the article, taken from the visualizer's code tab (verified by the scratchpad harness).
 * Each listing already carries the helpers it needs, so the chosen ones never repeat a function.
 */
const python = (kind: HeapKind, ...ops: OpCode[]) =>
  ops
    .map((op) => implementationsFor(op, kind).python.trim())
    .join("\n\n")
    .replace(/\n+(?=def )/g, "\n\n\n"); // PEP 8: two blank lines between top-level functions

export const HEAP_TOPICS: TopicContent[] = [
  // ───────────────────────────── hub ─────────────────────────────
  {
    path: "/heap",
    name: "Binary Heap",
    title: "Binary Heap Visualizer — Min Heap & Max Heap",
    h1: "Binary Heap Visualizer",
    description:
      "Binary heap visualizer: watch sift-up and sift-down in the tree and array side by side. Learn min-heap vs max-heap and O(log n) insert and extract, with code.",
    keywords: [
      "binary heap",
      "heap data structure",
      "min heap",
      "max heap",
      "heap visualizer",
      "heap insert and delete",
      "heap array representation",
    ],
    question: "What is a binary heap?",
    summary:
      "A **binary heap** is a complete binary tree stored in a plain array in which every parent is ordered before its children — at least as large in a **max-heap**, at most as large in a **min-heap** — so the top-priority key is always at index 0. It answers \"what is the largest (or smallest)?\" in O(1), inserts and removes in O(log n), and can be built from n keys in O(n).",
    steps: [
      "Store the tree level by level in an array. For index `i`: left child `2i + 1`, right child `2i + 2`, parent `⌊(i − 1) / 2⌋`.",
      "**Peek:** the root `a[0]` is the maximum (or minimum). O(1).",
      "**Insert:** append the key at `a[n]` so the tree stays complete, then **sift up** — swap it with its parent while it beats the parent.",
      "**Extract:** save `a[0]`, move the last key into the root, shrink the heap, then **sift down** — swap with the better child while a child beats it.",
      "**Build:** sift down every internal node from `⌊n/2⌋ − 1` back to 0, which heapifies an arbitrary array in O(n).",
    ],
    sections: [
      {
        heading: "Two rules: shape and order",
        body: `
Every binary heap maintains two invariants at once.

- **Shape:** the tree is **complete** — every level is full except possibly the last, which fills from left to right. A complete tree of n nodes has height ⌊log₂ n⌋, which is where every O(log n) bound comes from.
- **Order (the heap property):** in a max-heap every parent is ≥ each of its children; in a min-heap, ≤.

Notice what the order rule does **not** say. Siblings are unordered, and a key on the left side of the tree can be smaller than a key one level lower on the right. A heap is not sorted — the only guarantee runs along each root-to-leaf path. That weaker promise is exactly why heaps are cheaper to maintain than sorted arrays or search trees.
`,
      },
      {
        heading: "Why a heap lives in an array",
        body: `
Because the tree is complete, writing it out level by level leaves no gaps, so no pointers are needed: positions alone encode the structure. With 0-based indexing the children of \`i\` are \`2i + 1\` and \`2i + 2\` and its parent is \`⌊(i − 1) / 2⌋\`; with the 1-based indexing common in textbooks they are \`2i\`, \`2i + 1\` and \`⌊i / 2⌋\`.

That makes heaps compact and fast — one contiguous block, no per-node allocation — and it is why the visualizer draws the tree and the array together. Hover any key and the same element lights up in both views, along with its parent and children.
`,
      },
      {
        heading: "Worked example: insert 70 into a max-heap",
        body: `
The page opens with a max-heap built from \`35, 12, 48, 7, 61, 23, 9, 54, 18, 40\`. After the bottom-up build it is stored as \`[61, 54, 48, 35, 40, 23, 9, 7, 18, 12]\`.

- **Append:** 70 goes to \`a[10]\`, the next free slot. Its parent is \`a[⌊9 / 2⌋] = a[4] = 40\`.
- **Sift up:** 70 > 40, swap. At index 4 its parent is \`a[1] = 54\`; 70 > 54, swap. At index 1 its parent is \`a[0] = 61\`; 70 > 61, swap.
- **Stop:** 70 has reached the root. The heap is now \`[70, 61, 48, 35, 54, 23, 9, 7, 18, 12, 40]\`.

Three swaps in a tree of height 3 — the worst case, because 70 is the new maximum. Insert 5 instead and it stays at the bottom with zero swaps; for random keys an insert moves only a constant number of levels on average.
`,
      },
      {
        heading: "Min-heap vs max-heap",
        body: `
The two are mirror images: the code is identical except for the direction of each comparison. Use a **max-heap** when you repeatedly need the largest key (in-place heap sort, keeping the k smallest items seen so far) and a **min-heap** when you need the smallest (Dijkstra's shortest paths, event schedulers, merging sorted streams).

Libraries pick different defaults. Python's \`heapq\` and Java's \`PriorityQueue\` are min-heaps; C++'s \`std::priority_queue\` is a max-heap. To get the other kind, negate numeric keys or pass a reversed comparator. The Min/Max switch in the visualizer rebuilds the current keys under the other rule so you can compare the two trees.
`,
      },
      {
        heading: "Heap vs sorted array vs balanced BST",
        body: `
All three can serve as a priority queue; they differ in what they pay for.

- **Sorted array:** O(1) minimum or maximum, but O(n) insert because elements shift.
- **Balanced BST** (AVL, red-black): O(log n) for everything, plus ordered iteration and search for any key — at the cost of pointers, rotations and more memory.
- **Binary heap:** O(1) peek, O(log n) insert and extract, O(n) build, no pointers. Searching for an arbitrary key is O(n), and there is no sorted iteration.

If you only ever need the extreme element, the heap does the least work. If you also need "find 42" or "everything between 10 and 20", use a search tree.
`,
      },
      {
        heading: "Common mistakes",
        body: `
- **Mixing 0-based and 1-based formulas** — \`2i\` and \`2i + 1\` are the children only when the root sits at index 1.
- **Swapping with the wrong child in sift-down.** In a max-heap you must swap with the **larger** child; swapping with the smaller one puts a smaller key above a larger one.
- **Assuming the array is sorted.** Only \`a[0]\` is guaranteed. To get every key in order, extract repeatedly — that is heap sort.
- **Building by repeated insertion** when all keys are known up front. The bottom-up build is O(n) instead of O(n log n).
`,
      },
    ],
    complexity: [
      { label: "Peek (find max / min)", time: "O(1)", space: "O(1)", note: "The answer is always `a[0]`." },
      { label: "Insert", time: "O(log n)", space: "O(1)", note: "Sift-up climbs at most the tree height ⌊log₂ n⌋; O(1) on average for random keys." },
      { label: "Extract max / min", time: "O(log n)", space: "O(1)", note: "Sift-down from the root follows one root-to-leaf path." },
      { label: "Delete or update at an index", time: "O(log n)", space: "O(1)", note: "The moved key goes either up or down, never both." },
      { label: "Build heap", time: "O(n)", space: "O(1)", note: "Most nodes are near the bottom and sink only a level or two." },
      { label: "Search for any key", time: "O(n)", space: "O(1)", note: "The heap property does not say which subtree a key is in." },
      { label: "Heap sort", time: "O(n log n)", space: "O(1)", note: "Build once, then n − 1 extractions." },
    ],
    code: { language: "python", source: python("max", "peek", "insert", "extract") },
    faqs: [
      {
        q: "Is a binary heap a binary search tree?",
        a: "No. A BST orders left < parent < right, so you can search it; a heap only orders each parent before its children, so the maximum (or minimum) is at the root but any other key could be in either subtree. Heaps are also always complete and stored in an array.",
      },
      {
        q: "What is the difference between a min-heap and a max-heap?",
        a: "In a min-heap every parent is ≤ its children, so the smallest key is the root; in a max-heap every parent is ≥ its children, so the largest key is the root. The algorithms are identical except that every comparison is reversed.",
      },
      {
        q: "How do you find the parent and children of a node in a heap array?",
        a: "With 0-based indexing the children of index i are at `2i + 1` and `2i + 2` and its parent is at `(i − 1) // 2`. With 1-based indexing they are `2i`, `2i + 1` and `i // 2`.",
      },
      {
        q: "Is Python's heapq a min-heap or a max-heap?",
        a: "A min-heap: `heapq.heappop` always returns the smallest item. For max-heap behaviour, push negated keys (`-x`) and negate again when you pop, or wrap items in a class whose `__lt__` compares in reverse.",
      },
      {
        q: "Is a heap sorted?",
        a: "No. Only the root is guaranteed to be the maximum (or minimum); siblings and cousins are in no particular order. Repeatedly extracting the root produces sorted output, which is exactly how heap sort works.",
      },
      {
        q: "Why is heap insert O(log n)?",
        a: "The new key starts at the bottom and moves up one level per swap, and a complete binary tree with n nodes is only ⌊log₂ n⌋ levels tall. So an insert makes at most ⌊log₂ n⌋ swaps.",
      },
    ],
    related: ["/heap/priority-queue", "/heap/heap-sort", "/heap/build-heap", "/graph/dijkstra", "/bst"],
    updated: UPDATED,
  },

  // ───────────────────────────── heap sort ─────────────────────────────
  {
    path: "/heap/heap-sort",
    parent: "/heap",
    name: "Heap Sort",
    title: "Heap Sort Visualizer — Step by Step with Code",
    h1: "Heap Sort Visualizer",
    description:
      "Heap sort visualizer: build a max-heap, then swap the root to the end and sift down, step by step. O(n log n) worst case, in place but not stable, with code.",
    keywords: [
      "heap sort",
      "heap sort visualizer",
      "heapsort algorithm",
      "heap sort time complexity",
      "is heap sort stable",
      "heap sort python",
    ],
    question: "What is heap sort?",
    summary:
      "**Heap sort** is an in-place comparison sort that first turns the array into a max-heap, then repeatedly swaps the root — the largest remaining key — with the last element of the heap, shrinks the heap by one and sifts the new root down. It always runs in O(n log n) time with O(1) extra memory, but it is not stable.",
    steps: [
      "**Phase 1 — build a max-heap** in place with the bottom-up method: sift down every internal node from `⌊n/2⌋ − 1` to 0. O(n).",
      "**Phase 2:** for `end` from n − 1 down to 1, swap `a[0]` (the current maximum) with `a[end]`. That key is now in its final position.",
      "The heap is now `a[0 … end − 1]`; sift the new root down within that range to restore the heap property.",
      "When `end` reaches 0 the array is sorted in ascending order — the sorted tail has grown to cover everything.",
    ],
    sections: [
      {
        heading: "The idea: a shrinking heap and a growing sorted tail",
        body: `
Heap sort is selection sort with a better data structure. Selection sort finds the maximum by scanning every remaining element — O(n) per pick. Heap sort keeps the remaining elements in a max-heap, so the maximum is always at \`a[0]\` and restoring the heap after removing it costs only O(log n).

Throughout phase 2 the array has two regions: a max-heap at the front and a sorted run of the largest keys at the back. Each swap moves the current maximum from the root to the slot just before the sorted run, so the run grows by one and the heap shrinks by one — no second array needed.
`,
      },
      {
        heading: "Worked example: 29, 7, 45, 13, 61, 2, 38, 20",
        body: `
This input is preloaded in the visualizer above.

**Phase 1.** n = 8, so sift-down runs on indices 3, 2, 1, 0: 13 sinks below 20, 45 already beats its children, 7 sinks below 61, and 29 sinks below 61. Three swaps produce the max-heap \`[61, 29, 45, 20, 7, 2, 38, 13]\`.

**Phase 2**, shown as heap | sorted tail after each round:

- swap 61 ↔ 13, sift 13 down → \`[45, 29, 38, 20, 7, 2, 13] | [61]\`
- swap 45 ↔ 13, sift down → \`[38, 29, 13, 20, 7, 2] | [45, 61]\`
- swap 38 ↔ 2, sift down → \`[29, 20, 13, 2, 7] | [38, 45, 61]\`
- swap 29 ↔ 7, sift down → \`[20, 7, 13, 2] | [29, 38, 45, 61]\`
- swap 20 ↔ 2, sift down → \`[13, 7, 2] | [20, 29, 38, 45, 61]\`
- swap 13 ↔ 2, sift down → \`[7, 2] | [13, 20, 29, 38, 45, 61]\`
- swap 7 ↔ 2 → \`[2] | [7, 13, 20, 29, 38, 45, 61]\`

Result: \`2, 7, 13, 20, 29, 38, 45, 61\`. Press play to watch each swap travel along the tree edges while the locked, sorted tail fills the array from the right.
`,
      },
      {
        heading: "Heap sort vs quick sort vs merge sort",
        body: `
- **Worst case:** heap sort and merge sort are O(n log n) on every input; quick sort degrades to O(n²) on bad pivots.
- **Extra memory:** heap sort needs O(1), quick sort O(log n) for its recursion, array merge sort O(n).
- **Stability:** only merge sort is stable.
- **Speed in practice:** quick sort is usually fastest, then merge sort. Heap sort trails because sift-down jumps from index i to 2i + 1, scattering memory accesses and defeating the CPU cache on large arrays.

That combination — a guaranteed O(n log n) with no extra memory, but a slower constant factor — is exactly why **introsort**, the algorithm behind most C++ \`std::sort\` implementations, starts with quick sort and switches to heap sort only when the recursion gets suspiciously deep.
`,
      },
      {
        heading: "Why heap sort is not stable",
        body: `
A sort is stable if equal keys keep their original order. Heap sort breaks this because the long-distance swap of the root with \`a[end]\` can carry one equal key past another. Take \`[5a, 5b, 3]\`, which is already a max-heap. The first round swaps the root 5a to the end, leaving \`[3, 5b] | [5a]\`; sifting gives \`[5b, 3]\`, and the next round puts 5b in slot 1. The output is \`3, 5b, 5a\` — the two 5s have changed places. If you need stability, use merge sort, or sort \`(key, original_index)\` pairs.
`,
      },
      {
        heading: "Variations: descending order and partial sorting",
        body: `
Build a **min-heap** instead and the same loop moves the smallest key to the end each round, so the array comes out in **descending** order — switch the visualizer to Min to see it. If you only need the k largest keys, stop phase 2 after k rounds: the cost is O(n + k log n), which beats a full sort when k is small. Heaps are the standard tool for such top-k problems; C++'s \`std::partial_sort\` is heap-based too.
`,
      },
      {
        heading: "Common mistakes",
        body: `
- **Sifting down with the full length n** instead of the current heap size \`end\` — the sift then drags already-sorted keys back into the heap.
- **Using a min-heap and expecting ascending order in place.** In-place heap sort with a min-heap yields descending order.
- **Running the loop down to zero.** The last remaining key is already in place, so the loop stops at \`end = 1\`.
- **Skipping phase 1.** Swapping out the root of an array that is not yet a heap does not move the maximum.
`,
      },
    ],
    complexity: [
      { label: "Best case", time: "O(n log n)", space: "O(1)", note: "Θ(n log n) for distinct keys; only an all-equal array finishes in O(n), because every sift-down stops at once." },
      { label: "Average case", time: "O(n log n)", space: "O(1)", note: "n − 1 sift-downs of up to ⌊log₂ n⌋ levels each." },
      { label: "Worst case", time: "O(n log n)", space: "O(1)", note: "No bad inputs: the heap's height bounds every round." },
      { label: "Build phase", time: "O(n)", space: "O(1)", note: "Bottom-up heapify; the extraction phase dominates." },
    ],
    code: { language: "python", source: python("max", "sort") },
    faqs: [
      {
        q: "Is heap sort stable?",
        a: "No. Swapping the root with the last heap element can move a key past another key with the same value, so equal keys may come out in a different order than they went in.",
      },
      {
        q: "Is heap sort an in-place algorithm?",
        a: "Yes. The heap and the sorted output share the input array, so heap sort needs only O(1) extra memory — one of its main advantages over merge sort.",
      },
      {
        q: "What is the time complexity of heap sort?",
        a: "O(n log n) in the best, average and worst case for distinct keys. Building the heap is O(n), and each of the n − 1 extractions costs O(log n).",
      },
      {
        q: "Why is heap sort slower than quick sort in practice?",
        a: "Both are O(n log n) on average, but sift-down compares elements far apart in the array (i and 2i + 1), which causes cache misses, and heap sort makes more comparisons overall. Quick sort scans memory sequentially and has a smaller constant factor.",
      },
      {
        q: "Does heap sort use a min-heap or a max-heap?",
        a: "Ascending in-place heap sort uses a max-heap: the largest key is swapped to the end each round. A min-heap gives descending order in place, or ascending order if you pop into a separate output array.",
      },
      {
        q: "Is heap sort adaptive?",
        a: "No. Already sorted or nearly sorted input still takes O(n log n), because building the heap scrambles the order and every extraction sifts through the full height. Insertion sort and Timsort are the adaptive choices.",
      },
    ],
    related: ["/heap", "/heap/build-heap", "/heap/priority-queue", "/sorting", "/sorting/merge-sort", "/sorting/quick-sort"],
    updated: UPDATED,
  },

  // ───────────────────────────── priority queue ─────────────────────────────
  {
    path: "/heap/priority-queue",
    parent: "/heap",
    name: "Priority Queue",
    title: "Priority Queue Visualizer — Binary Heap Implementation",
    h1: "Priority Queue Visualizer",
    description:
      "Priority queue visualizer: a binary heap always serves the top-priority item first. Watch insert, peek and extract in O(log n) and see how Dijkstra uses it.",
    keywords: [
      "priority queue",
      "priority queue visualizer",
      "priority queue using heap",
      "min priority queue",
      "priority queue time complexity",
      "priority queue python heapq",
    ],
    question: "What is a priority queue?",
    summary:
      "A **priority queue** is an abstract data type in which every element has a priority and the next element served is always the one with the highest priority — or the lowest, in a min-priority queue — rather than the one that arrived first. It is almost always implemented with a binary heap, which gives O(1) peek and O(log n) insert and extract, and it powers Dijkstra's shortest paths, event schedulers, Huffman coding and top-k queries.",
    steps: [
      "**insert(x)** (push): append `x` at the end of the heap array and sift it up while it has higher priority than its parent. O(log n).",
      "**peek()**: return the root `a[0]` without removing it. O(1).",
      "**extract()** (pop): remember the root, move the last element into its place, shrink the array and sift the new root down. O(log n).",
      "**change priority**: overwrite an element's key, then sift it up if its priority rose or down if it fell. O(log n) when you know its index.",
    ],
    sections: [
      {
        heading: "Priority queue vs queue vs heap",
        body: `
A **queue** serves elements in arrival order (FIFO); a **stack** serves the newest first (LIFO). A priority queue generalises both: each element carries a priority and the queue always serves the best one. Use each element's arrival time as its priority and you get a queue back; use the negative arrival time and you get a stack.

"Priority queue" names the **interface** — insert, peek, extract — while a **heap** is its most common **implementation**. The two words are often used interchangeably, but a priority queue can also be built on a sorted array, a balanced search tree or one of the more exotic heaps.
`,
      },
      {
        heading: "Implementation choices compared",
        body: `
- **Unsorted array or list:** insert O(1), extract O(n) — every extraction scans for the best element.
- **Sorted array:** extract O(1) from the end, insert O(n) — elements shift to make room.
- **Balanced BST:** insert and extract O(log n), plus ordered iteration, but with pointers and rebalancing overhead.
- **Binary heap:** O(1) peek, O(log n) insert and extract, O(n) to build from a batch, all in one compact array — the default choice.
- **d-ary, pairing and Fibonacci heaps:** tuned variants. A Fibonacci heap makes decrease-key O(1) amortised, which improves Dijkstra's theoretical bound to O(E + V log V), although binary heaps are usually faster in practice.
`,
      },
      {
        heading: "Worked example: serving the smallest key first",
        body: `
This page opens with a min-priority queue holding \`35, 12, 48, 7, 61, 23, 9, 54, 18, 40\` — think of them as minutes until each task is due. As a min-heap the array is \`[7, 12, 9, 18, 40, 23, 48, 54, 35, 61]\`, and an **extract-min** is ready to play:

- The answer is the root: **7**, the most urgent task.
- The last element, 61, moves into the root and the heap shrinks to nine elements: \`[61, 12, 9, 18, 40, 23, 48, 54, 35]\`.
- **Sift down:** 61's children are 12 and 9; the smaller is 9, so they swap. At index 2 its children are 23 and 48; it swaps with 23.
- 61 is now a leaf, so the heap is valid again: \`[9, 12, 23, 18, 40, 61, 48, 54, 35]\`.

Two swaps, and the next task — 9 — is already waiting at the root. An insert is the mirror image: add the new key at the end and let it climb while it is smaller than its parent.
`,
      },
      {
        heading: "Where priority queues are used",
        body: `
- **Dijkstra's shortest paths and A* search:** the queue holds (distance, vertex) pairs and always expands the closest unsettled vertex. With a binary heap Dijkstra runs in O((V + E) log V).
- **Prim's minimum spanning tree:** repeatedly take the cheapest edge leaving the tree.
- **Schedulers and timers:** run the job with the earliest deadline or highest priority next. Java's \`ScheduledThreadPoolExecutor\` and the Go runtime's timers both keep pending work in a heap.
- **Event-driven simulation:** process events in timestamp order, inserting new future events as you go.
- **Huffman coding:** repeatedly merge the two least frequent symbols.
- **Top-k and streaming:** keep the k largest items seen so far in a min-heap of size k (O(n log k)), track a running median with two heaps, or merge k sorted lists by always taking the smallest head.
`,
      },
      {
        heading: "Priority queues in Python, Java and C++",
        body: `
- **Python:** \`heapq\` turns a plain list into a min-heap — \`heappush\`, \`heappop\`, \`heapify\` (O(n)) and \`nsmallest\`/\`nlargest\`. \`queue.PriorityQueue\` wraps it with locking for threads.
- **Java:** \`java.util.PriorityQueue\` is a min-heap by default; pass \`Comparator.reverseOrder()\` for a max-heap.
- **C++:** \`std::priority_queue\` is a max-heap by default; declare \`std::priority_queue<int, std::vector<int>, std::greater<int>>\` for a min-heap.

Heaps are not stable: two items with equal priority can come out in either order. When ties must be served first-come-first-served — or when the payloads cannot be compared — push \`(priority, counter, item)\` tuples with an increasing counter.
`,
      },
      {
        heading: "Common mistakes",
        body: `
- **Iterating over the heap and expecting sorted order.** Only the root is in order; pop repeatedly to get a sorted sequence.
- **Changing an element's priority in place** without sifting it, which silently breaks the heap. Either re-sift from its index, or push the updated entry and skip stale ones when they are popped — the usual "lazy deletion" trick for Dijkstra with \`heapq\`.
- **Comparing payloads on ties.** In Python, comparing \`(3, {"job": 1})\` with \`(3, {"job": 2})\` raises \`TypeError\`; add a counter as the second tuple field.
- **Assuming the library default.** Python and Java give you a min-heap, C++ a max-heap.
`,
      },
    ],
    complexity: [
      { label: "peek", time: "O(1)", space: "O(1)", note: "The highest-priority element is the root." },
      { label: "insert / push", time: "O(log n)", space: "O(1)", note: "Sift-up along one leaf-to-root path." },
      { label: "extract / pop", time: "O(log n)", space: "O(1)", note: "Sift-down along one root-to-leaf path." },
      { label: "change priority", time: "O(log n)", space: "O(1)", note: "Re-sift from the element's index; finding the element first is O(n) without an index map." },
      { label: "build from n items", time: "O(n)", space: "O(1)", note: "Bottom-up heapify instead of n separate inserts." },
      { label: "Storage", time: "—", space: "O(n)", note: "One array slot per element, no pointers." },
    ],
    code: { language: "python", source: python("min", "peek", "insert", "extract") },
    faqs: [
      {
        q: "Is a priority queue the same as a heap?",
        a: "Not exactly. A priority queue is the abstract interface (insert, peek, extract the best element); a binary heap is the data structure most often used to implement it. The same interface could sit on a sorted array or a balanced BST, just with different costs.",
      },
      {
        q: "What is the time complexity of a priority queue?",
        a: "With a binary heap: O(1) to peek, O(log n) to insert, O(log n) to extract the top element and O(n) to build one from n items. Searching for an arbitrary element is O(n).",
      },
      {
        q: "Why does Dijkstra's algorithm use a priority queue?",
        a: "Dijkstra repeatedly picks the unvisited vertex with the smallest tentative distance. A min-priority queue returns it in O(log V) instead of scanning all vertices in O(V), bringing the total from O(V²) down to O((V + E) log V) on sparse graphs.",
      },
      {
        q: "How do you make a max priority queue in Python?",
        a: "`heapq` only provides a min-heap, so push negated priorities — `heappush(h, (-priority, item))` — and negate again after `heappop`. For non-numeric keys, wrap items in a class whose `__lt__` compares in reverse.",
      },
      {
        q: "Does a priority queue keep FIFO order for equal priorities?",
        a: "No. Heap operations can reorder elements with equal priority. If ties must be served first-come-first-served, store `(priority, sequence_number, item)` so the sequence number breaks ties.",
      },
      {
        q: "What is decrease-key in a priority queue?",
        a: "An operation that raises an element's priority (lowers its key in a min-heap) and sifts it up to its new place in O(log n). It needs the element's index, so implementations keep a map from item to position; many Dijkstra implementations avoid it by pushing duplicates instead.",
      },
    ],
    related: ["/heap", "/heap/heap-sort", "/heap/build-heap", "/graph/dijkstra", "/graph/prim", "/stack-queue/queue"],
    updated: UPDATED,
  },

  // ───────────────────────────── build heap ─────────────────────────────
  {
    path: "/heap/build-heap",
    parent: "/heap",
    name: "Build Heap",
    title: "Build Heap (Heapify) Visualizer — Why It's O(n)",
    h1: "Build Heap (Heapify) — Why It's O(n)",
    description:
      "Build-heap (heapify) turns an array into a binary heap in O(n) by sifting down from the last parent up to the root. Watch it and see why it beats n inserts.",
    keywords: [
      "build heap",
      "heapify",
      "build heap time complexity",
      "why is build heap O(n)",
      "heapify algorithm",
      "bottom-up heap construction",
    ],
    question: "What is build-heap (heapify)?",
    summary:
      "**Build-heap** — also called **heapify** — turns an arbitrary array into a binary heap in place by sifting down every internal node, starting with the last one at index ⌊n/2⌋ − 1 and working back to the root. A single sift-down can cost O(log n), but most nodes sit near the bottom of the tree and barely move, so the total is O(n) — fewer than n swaps — compared with O(n log n) for inserting the keys one at a time.",
    steps: [
      "Read the array as a complete binary tree: `a[0]` is the root and the children of `i` are `2i + 1` and `2i + 2`.",
      "Skip the leaves. Indices `⌊n/2⌋` to `n − 1` have no children, so each is already a one-node heap.",
      "For `i` from `⌊n/2⌋ − 1` down to 0, **sift down** `a[i]`: swap it with its larger child (in a max-heap) until it is ≥ both children or becomes a leaf.",
      "When the loop finishes at the root, every subtree — and therefore the whole array — satisfies the heap property.",
    ],
    sections: [
      {
        heading: "Why bottom-up works",
        body: `
Sift-down has one precondition: both subtrees below \`i\` must already be heaps, so the only key that can be out of place is \`a[i]\` itself. Processing indices from the back towards the front guarantees that. The children of \`i\` sit at larger indices, so by the time the loop reaches \`i\` their subtrees have already been fixed. Each step merges two valid heaps and one new key into a bigger valid heap, and the final step at index 0 produces the whole heap.

Going the other way — sifting down from the root first — does not work. When the root is processed its subtrees are still unordered, so a large key buried deep in the tree never gets a chance to rise.
`,
      },
      {
        heading: "Why it is O(n), not O(n log n)",
        body: `
The naive bound multiplies n/2 sift-downs by O(log n) each. That badly overestimates, because a sift-down costs the **height of its node**, not the height of the tree, and most nodes are short.

In a complete tree of n nodes about n/2 nodes are leaves (height 0, no work), n/4 have height 1 (at most one swap), n/8 have height 2, and so on — at most ⌈n / 2^(h+1)⌉ nodes of height h. So the total number of swaps is at most

- Σ over h of (n / 2^(h+1)) · h = n · (1/4 + 2/8 + 3/16 + 4/32 + …) = n · 1 = **n**.

The exact figure is even neater: the heights of all nodes in a complete binary tree with n nodes add up to n minus the number of 1-bits in n. With at most two comparisons per level, build-heap makes fewer than n swaps and fewer than 2n comparisons. The visualizer prints each level's height in the left margin and reports this bound at the end of every build.
`,
      },
      {
        heading: "Worked example: 12, 5, 30, 8, 42, 17, 3, 25, 9, 36",
        body: `
This array is preloaded above. n = 10, so the leaves are indices 5–9 and the loop runs i = 4, 3, 2, 1, 0:

- **i = 4 (42):** its only child is 36, which is smaller — nothing to do.
- **i = 3 (8):** children 25 and 9; 8 sinks below 25. One swap.
- **i = 2 (30):** children 17 and 3; already a heap.
- **i = 1 (5):** children 25 and 42; 5 swaps with 42, then with 36 below it. Two swaps.
- **i = 0 (12):** children 42 and 30; 12 swaps with 42, then with 36, and stops above 5. Two swaps.

The result is the max-heap \`[42, 36, 30, 25, 12, 17, 3, 8, 9, 5]\` after **5 swaps** — under the bound of 8 (the sum of all node heights, 10 minus the two 1-bits of 10) and under n = 10. The loop never even visited the five leaves.
`,
      },
      {
        heading: "Bottom-up build vs inserting one at a time",
        body: `
You can also build a heap by starting empty and inserting each key with sift-up. It is correct, but the costs are reversed: sift-up costs a node's **depth**, and most nodes are deep. In the worst case — ascending keys into a max-heap — every new key is the new maximum and climbs all the way to the root, Θ(n log n) in total. For 1,023 ascending keys that is 8,194 swaps by insertion versus 1,013 with bottom-up build-heap.

Insertion still has its place: it works online, when keys arrive one at a time, and on random input its average cost is O(n) as well. But when you have the whole array up front, the bottom-up build is the right tool — it is what Python's \`heapq.heapify\`, C++'s \`std::make_heap\` and Java's \`PriorityQueue(Collection)\` constructor use.
`,
      },
      {
        heading: "Where build-heap is used",
        body: `
- **Heap sort, phase 1:** turning the input into a max-heap is the O(n) first half of the algorithm.
- **Priority queues from a batch:** load all known jobs or edges at once instead of making n pushes.
- **Top-k selection:** heapify n items, then pop k times — O(n + k log n).
- **Merging k sorted lists:** heapify the k list heads, then repeatedly pop the smallest and push its successor.
`,
      },
      {
        heading: "Common mistakes",
        body: `
- **Looping upwards** (i from 0 to n/2 − 1) with sift-down — the subtrees are not heaps yet, so the result is not a heap.
- **Starting at n − 1.** Correct but wasteful: the first half of the iterations are leaves that do nothing. Start at \`n // 2 - 1\`.
- **Confusing the names.** In CLRS, \`MAX-HEAPIFY(A, i)\` is a single sift-down and \`BUILD-MAX-HEAP\` is the loop; in Python, \`heapify\` means the whole build. Say which one you mean in an interview.
- **Thinking O(n) build makes heap sort O(n).** The extraction phase still costs O(n log n).
`,
      },
    ],
    complexity: [
      { label: "Bottom-up build", time: "O(n)", space: "O(1)", note: "Fewer than n swaps (the sum of node heights) and at most two comparisons per level." },
      { label: "n inserts, worst case", time: "O(n log n)", space: "O(1)", note: "Ascending keys into a max-heap: every key climbs to the root." },
      { label: "n inserts, random keys", time: "O(n) average", space: "O(1)", note: "Most new keys stop after a level or two." },
      { label: "One sift-down at height h", time: "O(h)", space: "O(1)", note: "At most h swaps; O(log n) for the root." },
    ],
    code: { language: "python", source: python("max", "build") },
    faqs: [
      {
        q: "Why is build-heap O(n) and not O(n log n)?",
        a: "Sift-down costs the height of the node it starts from, and most nodes are near the bottom: half are leaves, a quarter have height 1, an eighth height 2. Summing height × count over all levels gives less than n, so the whole build makes fewer than n swaps.",
      },
      {
        q: "What is the difference between heapify and build-heap?",
        a: "It depends on the source. In CLRS, heapify (MAX-HEAPIFY) is the O(log n) sift-down of one node and build-heap is the O(n) loop that calls it for every internal node. In Python's heapq and in everyday speech, \"heapify\" usually means the whole O(n) build.",
      },
      {
        q: "Why does build-heap start at index n/2 − 1?",
        a: "Index ⌊n/2⌋ − 1 is the last node that has a child, because its left child 2i + 1 is still inside the array. Every later index is a leaf, and a single node is already a heap, so there is nothing to do there.",
      },
      {
        q: "Is building a heap by repeated insertion O(n log n)?",
        a: "In the worst case, yes: inserting ascending keys into a max-heap makes every key climb to the root, Θ(n log n) in total. On random input the average is O(n), but bottom-up build-heap guarantees O(n) on every input.",
      },
      {
        q: "Can build-heap be done in place?",
        a: "Yes. It only swaps elements within the original array and keeps a couple of index variables, so it uses O(1) extra memory — one reason heap sort needs no auxiliary array.",
      },
    ],
    related: ["/heap", "/heap/heap-sort", "/heap/priority-queue", "/sorting"],
    updated: UPDATED,
  },
];
