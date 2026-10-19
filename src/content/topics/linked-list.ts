import { LANGS } from "@/features/linked-list/code";
import { ctxOf, indent } from "@/features/linked-list/code/shared";
import type { ImplOp, ListKind } from "@/features/linked-list/engine/types";
import type { TopicContent } from "../types";

const UPDATED = "2026-10-19";

/**
 * Python for the article, assembled from the same generator that feeds the visualizer's code tab
 * (and is verified by the scratchpad harness), so the article and the page never disagree.
 */
function pythonList(kind: ListKind, tailPtr: boolean, ops: readonly Exclude<ImplOp, "struct">[]): string {
  const py = LANGS.python;
  const c = ctxOf(kind, tailPtr);
  const methods = ops.map((op) => indent(py.method(op, c) ?? "", py.memberIndent));
  return [py.node(c), "", "", py.listOpen(c), "", methods.join("\n\n")].join("\n");
}

export const LINKED_LIST_TOPICS: TopicContent[] = [
  // ───────────────────────────── hub ─────────────────────────────
  {
    path: "/linked-list",
    name: "Linked List",
    title: "Linked List Visualizer — Singly, Doubly, Circular",
    h1: "Linked List Visualizer",
    description:
      "Interactive linked list visualizer: watch every pointer change as you insert, delete, search and reverse singly, doubly and circular lists, with code and costs.",
    keywords: [
      "linked list visualizer",
      "linked list",
      "singly linked list",
      "linked list operations",
      "linked list vs array",
      "linked list insertion and deletion",
    ],
    question: "What is a linked list?",
    summary:
      "A **linked list** is a linear data structure made of **nodes**, where each node stores a value and a pointer to the next node, so the elements can sit anywhere in memory. Inserting or deleting next to a node you already hold is O(1) pointer surgery, but reaching the i-th element is O(n), because the only way in is to follow the pointers from the `head`.",
    steps: [
      "Each node holds `data` and a `next` pointer. The list itself only stores `head`, the address of the first node (plus `tail` if it keeps one).",
      "The last node's `next` is NULL, which marks the end. An empty list is simply `head = NULL`.",
      "**Traverse:** start with `curr = head` and repeat `curr = curr.next` until `curr` is NULL. Search, length and printing all work this way.",
      "**Insert after a node:** allocate the new node, set `new.next = curr.next` first, then `curr.next = new`. Inserting at the head is the same move with `head` in place of `curr.next`.",
      "**Delete after a node:** set `prev.next = prev.next.next` and free the unlinked node. Deleting the head just moves `head` one node forward.",
    ],
    sections: [
      {
        heading: "Linked list vs array",
        body: `
An array keeps its elements in one contiguous block, so element \`i\` lives at \`base + i × size\`: O(1) access. A linked list gives that up — its nodes are allocated one at a time wherever memory is free, tied together only by \`next\` pointers — and gets cheap structural change in return. Once you stand on the right node, inserting or deleting rewires two pointers and moves nothing else, and the list never needs resizing.

- **Access by index:** array O(1), linked list O(n).
- **Insert or delete at the front:** array O(n) (everything shifts), linked list O(1).
- **Insert or delete in the middle:** both need O(n) to reach the spot; after that the list is O(1) and the array O(n).
- **Memory and speed:** every node also stores one or two pointers (8 bytes each on a 64-bit machine), and scanning scattered nodes misses the CPU cache — so lists are often slower in practice even when the big-O matches.
`,
      },
      {
        heading: "Singly, doubly and circular linked lists",
        body: `
The three classic variants differ only in which pointers each node carries, but that decides which operations are cheap.

- **Singly linked list** — \`[data | next]\`. The lightest, and forward-only. Deleting a node needs its predecessor, so deleting the tail is O(n) even with a \`tail\` pointer.
- **Doubly linked list** — \`[prev | data | next]\`. One more pointer per node buys backward traversal and O(1) deletion of any node you hold, including the tail; inserts write four pointers instead of two.
- **Circular linked list** — the last node points back to the head. A pointer to the last node reaches both ends in O(1), which suits round-robin scheduling; loops stop when they return to the head.

Use singly for a stack, or a queue with a tail pointer; doubly when you remove arbitrary nodes or walk both ways (an LRU cache); circular when the data really is a ring. The List type switch above converts the list on screen so you can compare them.
`,
      },
      {
        heading: "Worked example: insert 99 at index 2",
        body: `
Take the list the visualizer opens with: \`12 → 7 → 33 → 5 → 21 → 48 → NULL\`. To put 99 at index 2 you need the node **before** that position — index 1, value 7 — so walk one step from the head: \`curr = head\` (12), then \`curr = curr.next\` (7).

Now two pointer writes, in this order:

- \`new.next = curr.next\` — 99 now points at 33. Nothing in the list has changed yet; 99 is just aiming at the right place.
- \`curr.next = new\` — 7 now points at 99, and the list reads \`12 → 7 → 99 → 33 → 5 → 21 → 48\`.

The order is the whole trick. Do the second write first and \`7.next\` is overwritten before anyone saved the address of 33: the nodes 33, 5, 21 and 48 become unreachable — a memory leak in C, silently lost data everywhere else. The **Wrong order** button in the visualizer plays exactly that mistake so you can watch the rest of the list fall away.
`,
      },
      {
        heading: "Common linked list mistakes",
        body: `
- **Losing the rest of the list** by overwriting a \`next\` pointer before saving it.
- **Dereferencing NULL** — reading \`curr.next.data\` on the last node, or running any operation on an empty list.
- **Forgetting the head or tail pointer** when the node you insert or delete sits at either end. Test with 0, 1 and 2 nodes.
- **Off-by-one walks** — to insert at index i, stop on node i − 1, not on node i.

A **dummy (sentinel) node** in front of the real head gives every real node a predecessor, so insert and delete need no \`if index == 0\` branch.
`,
      },
      {
        heading: "Where linked lists are used",
        body: `
Linked lists rarely beat a dynamic array for plain storage, but they shine when elements must be spliced in and out without moving anything else:

- **LRU caches** pair a hash map with a doubly linked list, so "move to front" and "evict the oldest" are both O(1).
- **Stacks and queues** — a singly linked list with head (and tail) pointers gives O(1) push, pop and enqueue with no resizing.
- **Graph adjacency lists**, hash-table buckets with separate chaining, and the free lists inside memory allocators.
- **Operating-system kernels** — Linux links processes, timers and devices with an intrusive circular doubly linked list (\`list_head\`).
- **Standard libraries** — Java's \`LinkedList\` and C++'s \`std::list\` are doubly linked; Python's \`collections.deque\` is a doubly linked list of fixed-size blocks.
`,
      },
      {
        heading: "Linked lists in coding interviews",
        body: `
Most interview problems combine four moves, each animated on this site: **reverse in place** with three pointers; **slow and fast pointers** to find the middle or detect a cycle (Floyd's tortoise and hare); a **dummy head** to merge sorted lists or delete without special cases; and **gap pointers** to remove the k-th node from the end.

Interviewers mostly check the empty list, the one-node list, and the head and tail. Narrate each pointer write in order, exactly as the status line above does.
`,
      },
    ],
    complexity: [
      { label: "Access by index", time: "O(n)", space: "O(1)", note: "Follow `next` i times from the head; there is no address arithmetic." },
      { label: "Search by value", time: "O(n)", space: "O(1)", note: "Linear scan; the best case, a match at the head, is O(1)." },
      { label: "Insert at head", time: "O(1)", space: "O(1)", note: "Two pointer writes: `new.next = head`, then `head = new`." },
      { label: "Insert at tail", time: "O(1) / O(n)", space: "O(1)", note: "O(1) with a `tail` pointer; without one you walk to the last node." },
      { label: "Insert or delete after a known node", time: "O(1)", space: "O(1)", note: "Only the neighbouring pointers change; nothing is shifted." },
      { label: "Delete tail (singly)", time: "O(n)", space: "O(1)", note: "The new tail is the second-to-last node, which only a walk finds. Doubly linked: O(1)." },
      { label: "Storage", time: "—", space: "O(n)", note: "One node per element, each with one (singly) or two (doubly) pointers." },
    ],
    code: {
      language: "python",
      source: pythonList("singly", false, ["insertHead", "insertTail", "search", "deleteHead", "deleteValue"]),
    },
    faqs: [
      {
        q: "Is a linked list faster than an array?",
        a: "Only for some operations. Inserting or deleting at the front, or next to a node you already hold, is O(1) in a list and O(n) in an array. But indexing is O(n) instead of O(1), and scanning a list is usually slower in practice because its nodes are scattered in memory and miss the CPU cache.",
      },
      {
        q: "Why is accessing an element of a linked list O(n)?",
        a: "Nodes are not stored next to each other, so there is no formula for the address of element i. The only way to reach it is to start at the head and follow `next` i times.",
      },
      {
        q: "What is the difference between a singly and a doubly linked list?",
        a: "A singly linked node has one pointer, `next`, and can only be walked forward. A doubly linked node also has `prev`, so you can walk backwards and delete any node or the tail in O(1), at the cost of one extra pointer per node.",
      },
      {
        q: "Does Python have a built-in linked list?",
        a: "Not as a general list type: Python's `list` is a dynamic array. `collections.deque` is implemented as a doubly linked list of fixed-size blocks and gives O(1) appends and pops at both ends; for a textbook linked list you write a small `Node` class like the one above.",
      },
      {
        q: "When should I use a linked list instead of an array?",
        a: "When you insert and delete far more often than you index — especially at the ends or at nodes you already hold — and when elements must keep a stable address while others come and go, as in LRU caches, free lists and kernel data structures.",
      },
      {
        q: "What is a dummy (sentinel) node in a linked list?",
        a: "A placeholder node in front of the real head that holds no data. Because every real node then has a predecessor, insert and delete need no special case for index 0, which removes a whole class of edge-case bugs.",
      },
    ],
    related: [
      "/linked-list/doubly-linked-list",
      "/linked-list/circular-linked-list",
      "/linked-list/reverse-linked-list",
      "/linked-list/floyd-cycle-detection",
      "/stack-queue",
    ],
    updated: UPDATED,
  },

  // ───────────────────────────── doubly linked list ─────────────────────────────
  {
    path: "/linked-list/doubly-linked-list",
    parent: "/linked-list",
    name: "Doubly Linked List",
    title: "Doubly Linked List Visualizer — Insert & Delete",
    h1: "Doubly Linked List Visualizer",
    description:
      "Doubly linked list visualizer: see prev and next pointers rewired as you insert, delete and reverse, learn why tail delete is O(1), with Python code and FAQs.",
    keywords: [
      "doubly linked list",
      "doubly linked list visualizer",
      "doubly linked list insertion",
      "doubly linked list deletion",
      "singly vs doubly linked list",
      "doubly linked list python",
    ],
    question: "What is a doubly linked list?",
    summary:
      "A **doubly linked list** is a linked list in which every node stores two pointers: `next` to the following node and `prev` to the previous one, so the list can be walked in both directions. The extra pointer makes deleting any node you hold — including the tail — an O(1) operation, at the cost of more memory per node and four pointer writes per insertion instead of two.",
    steps: [
      "If the index is 0, insert at the head: `new.next = head`, `head.prev = new`, `head = new`.",
      "Otherwise walk `curr` from the head to the node at index `i − 1`.",
      "Point the new node at its neighbours first: `new.next = curr.next` and `new.prev = curr`.",
      "If a node follows `curr`, repoint its back link: `curr.next.prev = new`.",
      "Link it in from the front last: `curr.next = new`. If `curr` was the tail, the new node becomes the tail.",
    ],
    sections: [
      {
        heading: "Why add a prev pointer?",
        body: `
In a singly linked list every operation that changes the list needs the node **before** the one you care about. Deleting node X means rewriting its predecessor's \`next\`, and X has no idea who that is — so you walk from the head to find it. The same problem makes "delete the tail" O(n) even when you keep a \`tail\` pointer: after removing the last node you need the new last node, and only a walk can find it.

A \`prev\` pointer removes that walk. Given any node, its predecessor is one field away, so unlinking it takes a constant number of pointer writes. That is why doubly linked lists sit underneath LRU caches, deques and most general-purpose list types in standard libraries.
`,
      },
      {
        heading: "Worked example: insert 99 at index 2",
        body: `
This page opens with \`12 ⇄ 7 ⇄ 33 ⇄ 5 ⇄ 21 ⇄ 48\`, with head and tail pointers, and this exact insert ready to play. Index 2 means the new node goes between 7 (index 1) and 33, so \`curr\` stops on 7 after one step. Then four writes:

- \`new.next = curr.next\` → 99 points forward to 33.
- \`new.prev = curr\` → 99 points back to 7.
- \`curr.next.prev = new\` → 33's back pointer now aims at 99.
- \`curr.next = new\` → 7's forward pointer now aims at 99.

The result is \`12 ⇄ 7 ⇄ 99 ⇄ 33 ⇄ 5 ⇄ 21 ⇄ 48\`. The first two writes only touch the new node, so they are always safe. The order of the last two matters: set \`curr.next = new\` first and the expression \`curr.next.prev\` then refers to 99 itself, so 33 keeps pointing back at 7 — a list that reads correctly forwards and wrongly backwards. It is the most common doubly-linked-list bug, and it hides until someone walks the list in reverse.
`,
      },
      {
        heading: "Deleting a node in O(1)",
        body: `
To remove node \`x\`, connect its two neighbours to each other and drop it:

- \`x.prev.next = x.next\` (or \`head = x.next\` if \`x\` was the head)
- \`x.next.prev = x.prev\` (or \`tail = x.prev\` if \`x\` was the tail)

No search for the predecessor is needed, so deletion is O(1) once you hold the node. Deleting the tail shows the difference best: \`tail = tail.prev\`, then \`tail.next = NULL\` — two writes, where a singly linked list must walk n − 1 nodes. Deleting by index or by value is still O(n), but only because of the search; the unlinking itself is constant time.
`,
      },
      {
        heading: "Singly vs doubly linked list",
        body: `
- **Memory:** a doubly linked node carries one extra pointer — 8 more bytes per node on a 64-bit machine, before allocator overhead.
- **Traversal:** singly is forward-only; doubly walks both ways, so iterating from the tail or stepping back from a cursor is free.
- **Insert:** 2 pointer writes vs 4, and more links to keep consistent.
- **Delete a node you hold, or the tail:** O(n) vs O(1).
- **Reverse:** O(n) for both; in a doubly linked list each node simply swaps its \`next\` and \`prev\`.

If you only push and pop at the front, or append at the back, a singly linked list does the job with less memory. As soon as you remove nodes from the middle or need the previous element, the second pointer pays for itself.
`,
      },
      {
        heading: "Where doubly linked lists are used",
        body: `
- **LRU caches:** a hash map finds the node for a key in O(1), and the doubly linked list keeps entries in recency order, so moving an entry to the front and evicting from the back are both O(1). It is a classic design interview question.
- **Standard libraries:** Java's \`LinkedList\` and C++'s \`std::list\` are doubly linked, and Java's \`LinkedHashMap\` threads a doubly linked list through its entries to remember insertion or access order.
- **Deques:** a double-ended queue needs O(1) work at both ends, which a doubly linked list provides directly.
- **Operating systems:** the Linux kernel's \`list_head\` is a circular doubly linked list embedded inside the structures it links.
`,
      },
      {
        heading: "Common mistakes",
        body: `
- Updating \`curr.next\` before \`curr.next.prev\` during an insert (see the worked example).
- Forgetting the \`prev\` side altogether — the list still prints correctly forwards, so the bug stays hidden until someone walks backwards.
- Mishandling the ends: inserting at index 0 must update \`head\` and the old head's \`prev\`; inserting after the tail must update \`tail\` and must not touch \`curr.next.prev\`, because \`curr.next\` is NULL.
- Leaving the new head's \`prev\` or the new tail's \`next\` pointing at a node that was just deleted.
`,
      },
    ],
    complexity: [
      { label: "Insert at head", time: "O(1)", space: "O(1)", note: "Link the new node in front and move `head`; also sets `tail` if the list was empty." },
      { label: "Insert at tail", time: "O(1)", space: "O(1)", note: "With a tail pointer: `tail.next = new`, `new.prev = tail`, `tail = new`." },
      { label: "Insert at index", time: "O(n)", space: "O(1)", note: "Walking to index i − 1 is O(n); the four pointer writes are O(1)." },
      { label: "Delete a node you hold", time: "O(1)", space: "O(1)", note: "Its predecessor is `x.prev`, so no search is needed." },
      { label: "Delete tail", time: "O(1)", space: "O(1)", note: "`tail = tail.prev; tail.next = NULL` — O(n) in a singly linked list." },
      { label: "Search", time: "O(n)", space: "O(1)", note: "Still a linear scan, from either end." },
      { label: "Storage", time: "—", space: "O(n)", note: "Two pointers per node instead of one." },
    ],
    code: {
      language: "python",
      source: pythonList("doubly", true, ["insertHead", "insertAt", "deleteHead", "deleteTail", "deleteAt"]),
    },
    faqs: [
      {
        q: "What is the difference between a singly and a doubly linked list?",
        a: "A singly linked node points only to the next node; a doubly linked node also points to the previous one. That lets a doubly linked list be walked in both directions and delete any node or the tail in O(1), but every node needs one more pointer.",
      },
      {
        q: "Why is deleting the tail O(1) in a doubly linked list?",
        a: "Because the new tail is simply `tail.prev`. In a singly linked list the second-to-last node can only be found by walking from the head, so the same operation is O(n) even with a tail pointer.",
      },
      {
        q: "How many pointers change when inserting into a doubly linked list?",
        a: "Four when inserting between two nodes: the new node's `next` and `prev`, the following node's `prev` and the preceding node's `next`. At either end one neighbour is missing, and `head` or `tail` is updated instead.",
      },
      {
        q: "Is Java's LinkedList singly or doubly linked?",
        a: "Doubly linked. `java.util.LinkedList` keeps references to the first and last nodes and each node has `prev` and `next`, which is why it also implements `Deque`. C++'s `std::list` is doubly linked too, while `std::forward_list` is the singly linked version.",
      },
      {
        q: "Why do LRU caches use a doubly linked list?",
        a: "An LRU cache must move a just-used entry to the front and evict the least recently used entry from the back, both in O(1). With a hash map pointing at list nodes, a doubly linked list can unlink any node instantly because each node knows its predecessor.",
      },
    ],
    related: ["/linked-list", "/linked-list/circular-linked-list", "/linked-list/reverse-linked-list", "/stack-queue/deque"],
    updated: UPDATED,
  },

  // ───────────────────────────── circular linked list ─────────────────────────────
  {
    path: "/linked-list/circular-linked-list",
    parent: "/linked-list",
    name: "Circular Linked List",
    title: "Circular Linked List Visualizer — Step by Step",
    h1: "Circular Linked List Visualizer",
    description:
      "Circular linked list visualizer: the last node points back to the head. See O(1) insert at both ends with a tail pointer, safe traversal and real-world uses.",
    keywords: [
      "circular linked list",
      "circular linked list visualizer",
      "circular linked list insertion",
      "circular singly linked list",
      "traverse circular linked list",
      "round robin linked list",
    ],
    question: "What is a circular linked list?",
    summary:
      "A **circular linked list** is a linked list whose last node points back to the first node instead of to NULL, so the nodes form a ring with no end. With a single pointer to the last node you reach both ends in O(1) — the head is just `last.next` — which makes it a natural fit for round-robin scheduling, turn-taking and anything else that cycles through items forever.",
    steps: [
      "Allocate the new node. If the list is empty, point the node at itself (`new.next = new`) and make it both `head` and `tail` — a ring of one.",
      "Otherwise aim the new node at the current head: `new.next = head`.",
      "Close the ring through it: `tail.next = new`.",
      "**Insert at head:** move `head = new`. **Insert at tail:** move `tail = new` instead — that one assignment is the only difference.",
      "To traverse, start at `head`, visit, follow `next` — and stop when you arrive back at `head`, not at NULL.",
    ],
    sections: [
      {
        heading: "How a circular list differs from a singly linked list",
        body: `
The node is the same \`[data | next]\` as in a singly linked list; only the invariant changes: the last node's \`next\` is **the head**, not NULL. That has three consequences.

- **There is no NULL to stop at.** A loop written as \`while curr is not None\` never ends. Traversal becomes "start at the head and stop when you are back at the head", which is naturally a do-while loop, because the start and the stop condition are the same node.
- **Every node has a successor.** There is no "last node has no next" special case, and rotating the whole ring by one is O(1): \`head = head.next\`, \`tail = tail.next\`.
- **The ends must stay connected.** Any operation that changes the head — insert at head, delete head — must also update \`last.next\`, or the ring breaks.
`,
      },
      {
        heading: "Why keep a pointer to the last node",
        body: `
If the list keeps only \`head\`, inserting at the head is surprisingly O(n): the new head must be pointed at by the last node, and finding the last node means walking the entire ring. Keep a pointer to the **last** node instead and both ends are one step away — the tail is \`last\` and the head is \`last.next\`. Many textbooks store only \`last\` for exactly this reason. The visualizer keeps \`head\` and \`tail\` side by side so you can see both; switch the tail pointer off and insert at head falls back to an O(n) walk.

Deleting the tail is still O(n) in a circular **singly** linked list, for the same reason as in an ordinary singly linked list: the new tail is the node before the old one, and only a walk finds it. A circular **doubly** linked list removes that cost too.
`,
      },
      {
        heading: "Worked example: insert 99 at the head",
        body: `
This page opens with the ring \`12 → 7 → 33 → 5 → 21 → 48 → (back to 12)\`, with \`head\` on 12 and \`tail\` on 48, and this insert ready to play:

- \`new.next = head\` — 99 points at 12.
- \`tail.next = new\` — 48 now points at 99 instead of 12, so the ring runs through the new node.
- \`head = new\` — the ring reads \`99 → 12 → 7 → 33 → 5 → 21 → 48 → (back to 99)\`.

Three pointer writes and no walking: O(1). Had we inserted at the tail instead, the first two writes would be identical and the last line would be \`tail = new\`, giving \`12 → … → 48 → 99 → (back to 12)\`. In a ring, "head" and "tail" are just two neighbouring positions you have chosen to name.
`,
      },
      {
        heading: "Traversing, searching and deleting safely",
        body: `
Search starts at \`head\` and checks one node per step. Written as a do-while loop, it visits every node exactly once and stops as soon as \`curr\` returns to \`head\`, so an unsuccessful search costs exactly n comparisons, just like in a NULL-terminated list.

Deletion has two ring-specific edge cases. Deleting the head must also repoint \`last.next\` at the new head. Deleting the **only** node — the one whose \`next\` is itself — must set both \`head\` and \`tail\` to NULL; otherwise you are left holding a pointer to freed memory. The Delete buttons in the visualizer animate both cases.
`,
      },
      {
        heading: "Where circular linked lists are used",
        body: `
- **Round-robin scheduling:** a CPU scheduler or load balancer serves the item at the head, then advances one step; in a ring nobody is ever "at the end".
- **Turn order** in multiplayer games, and the classic **Josephus problem**, where people stand in a circle and every k-th one is removed.
- **Repeating playlists and slideshows** that wrap from the last item back to the first.
- **Kernel lists:** the Linux \`list_head\` is a circular doubly linked list with a sentinel node, so an empty list is a node that points at itself.

A fixed-size **ring buffer** applies the same idea to an array with two wrapping indices instead of pointers — see the circular queue on the stack and queue page.
`,
      },
      {
        heading: "Common mistakes",
        body: `
- Writing \`while curr is not None\` and looping forever.
- Forgetting \`last.next = new_head\` when inserting or deleting at the head.
- Not handling the one-node ring, whose \`next\` points at itself.
- Assuming a list is circular without checking. If you only suspect a loop, detect it with Floyd's tortoise-and-hare algorithm — on a fully circular list, the cycle it finds starts at the head.
`,
      },
    ],
    complexity: [
      { label: "Insert at head", time: "O(1)", space: "O(1)", note: "Needs the last node to close the ring; without a `tail`/`last` pointer that is an O(n) walk." },
      { label: "Insert at tail", time: "O(1)", space: "O(1)", note: "`new.next = head; tail.next = new; tail = new`." },
      { label: "Delete head", time: "O(1)", space: "O(1)", note: "Move `head` and repoint `tail.next`; O(n) without a tail pointer." },
      { label: "Delete tail", time: "O(n)", space: "O(1)", note: "The new tail is the old tail's predecessor, found only by walking (O(1) if doubly linked)." },
      { label: "Search / traverse", time: "O(n)", space: "O(1)", note: "Visit each node once and stop when you are back at `head`." },
      { label: "Rotate by one", time: "O(1)", space: "O(1)", note: "`head = head.next; tail = tail.next` — nothing else moves." },
    ],
    code: {
      language: "python",
      source: pythonList("circular", true, ["insertHead", "insertTail", "deleteHead", "search"]),
    },
    faqs: [
      {
        q: "How do you know when to stop traversing a circular linked list?",
        a: "Stop when the pointer comes back to the node you started from (usually `head`), not when it reaches NULL — there is no NULL. A do-while loop expresses this naturally, because the first node must be visited before the stop test runs.",
      },
      {
        q: "What is the advantage of a circular linked list?",
        a: "Every node has a successor, so you can start anywhere and still reach every node, rotate the list in O(1), and — with a pointer to the last node — insert at both the head and the tail in O(1).",
      },
      {
        q: "Can a circular linked list be doubly linked?",
        a: "Yes. In a circular doubly linked list the head's `prev` is the tail and the tail's `next` is the head, which makes insertion and deletion at both ends O(1). The Linux kernel's `list_head` is this kind of list.",
      },
      {
        q: "How do you check whether a linked list is circular?",
        a: "Walk from the head: if you return to the head before reaching NULL, the list is circular. To detect any loop, even one that does not pass through the head, use Floyd's cycle detection with slow and fast pointers.",
      },
      {
        q: "What is the Josephus problem?",
        a: "n people stand in a circle and every k-th person is eliminated until one remains. A circular linked list simulates it directly — advance k − 1 steps, unlink the next node, repeat — in O(n·k) time; a recurrence finds the survivor in O(n).",
      },
    ],
    related: ["/linked-list", "/linked-list/doubly-linked-list", "/linked-list/floyd-cycle-detection", "/stack-queue/circular-queue"],
    updated: UPDATED,
  },

  // ───────────────────────────── reverse a linked list ─────────────────────────────
  {
    path: "/linked-list/reverse-linked-list",
    parent: "/linked-list",
    name: "Reverse a Linked List",
    title: "Reverse a Linked List — Step by Step Visualizer",
    h1: "Reverse a Linked List — Step by Step",
    description:
      "Reverse a linked list in place with three pointers. Watch every arrow flip step by step and compare iterative vs recursive code — O(n) time, O(1) space.",
    keywords: [
      "reverse a linked list",
      "reverse linked list",
      "reverse linked list iterative",
      "reverse linked list recursive",
      "leetcode 206 reverse linked list",
      "reverse doubly linked list",
    ],
    question: "How do you reverse a linked list?",
    summary:
      "To reverse a singly linked list in place, walk it once with three pointers — `prev`, `curr` and `next` — and flip each node's `next` pointer to point at the node before it; when `curr` runs off the end, `prev` is the new head. It takes O(n) time and O(1) extra space and is one of the most frequently asked linked-list interview questions (LeetCode 206).",
    steps: [
      "Start with `prev = NULL` (the reversed part is empty) and `curr = head`.",
      "Save the rest of the list: `next = curr.next`. Without this bookmark the next write would lose it.",
      "Flip the arrow: `curr.next = prev`.",
      "Advance both pointers one node: `prev = curr`, then `curr = next`.",
      "Repeat steps 2–4 until `curr` is NULL, then set `head = prev` — the old last node.",
    ],
    sections: [
      {
        heading: "The intuition: move one node at a time",
        body: `
At every moment the list is split into two chains. \`prev\` is the head of the part that is already reversed; \`curr\` is the head of the part that is not. Each iteration takes the first node of the unreversed part and pushes it onto the front of the reversed part — exactly like popping from one stack and pushing onto another. When the unreversed part is empty, the reversed part is the whole list.

Three pointers are needed because flipping \`curr.next\` destroys the only link to the rest of the list. \`next\` is a bookmark taken just before that write.
`,
      },
      {
        heading: "Worked example: 12 → 7 → 33 → 5",
        body: `
Trace the loop on a four-node list:

- **Start:** prev = NULL, curr = 12. Reversed: (empty). Remaining: 12 → 7 → 33 → 5.
- **Iteration 1:** next = 7; 12.next = NULL; prev = 12, curr = 7. Reversed: 12. Remaining: 7 → 33 → 5.
- **Iteration 2:** next = 33; 7.next = 12; prev = 7, curr = 33. Reversed: 7 → 12. Remaining: 33 → 5.
- **Iteration 3:** next = 5; 33.next = 7; prev = 33, curr = 5. Reversed: 33 → 7 → 12. Remaining: 5.
- **Iteration 4:** next = NULL; 5.next = 33; prev = 5, curr = NULL. Reversed: 5 → 33 → 7 → 12.
- **Finish:** head = prev = 5.

Four nodes, four iterations, one pointer write per node. The visualizer above has the same loop ready to play on its six-node list, \`12 → 7 → 33 → 5 → 21 → 48\`, and labels each pointer as it moves.
`,
      },
      {
        heading: "The recursive version",
        body: `
Recursion reverses the rest of the list first and then hooks the current node onto its end:

- \`if head is None or head.next is None: return head\`
- \`new_head = reverse(head.next)\` — everything after \`head\` is now reversed, and \`head.next\` is its last node.
- \`head.next.next = head\` — that last node points back at \`head\`.
- \`head.next = None\` — \`head\` becomes the new end.
- \`return new_head\`

It is elegant and still O(n) time, but it uses O(n) stack space — one frame per node — so a long list can overflow the call stack (Python's default recursion limit is about 1,000 frames). The iterative version is the safer answer in production and in interviews; mention the recursive one to show you know both.
`,
      },
      {
        heading: "Reversing doubly and circular lists",
        body: `
In a **doubly linked list** each node has both pointers, so reversing means swapping them: as each node is visited, \`curr.next = prev\` and \`curr.prev = next\`. Afterwards \`head\` and \`tail\` swap roles. If you only need to read the list backwards, you can skip the work entirely and walk it from the tail.

In a **circular list** there is no NULL to start \`prev\` at. Start \`prev\` on the last node, so that when the head's arrow flips it points at the old tail and closes the reversed ring, and loop until \`curr\` comes back around to the head. Switch the list type in the visualizer to watch both variants.
`,
      },
      {
        heading: "Common mistakes",
        body: `
- **Overwriting the link before saving it.** Writing \`curr.next = prev\` before \`next = curr.next\` loses the rest of the list after the first iteration.
- **Returning the old head.** After the loop the old head is the last node; the new head is \`prev\`.
- **Forgetting the tail pointer**, if the list keeps one: the old head becomes the new tail.
- **Not cutting the old link in the recursive version.** Without \`head.next = None\` the first two nodes end up pointing at each other — a two-node cycle.
- **Skipping the edge cases:** an empty list and a one-node list must come back unchanged.
`,
      },
      {
        heading: "Interview variations",
        body: `
Once the three-pointer loop is second nature, several harder problems reduce to it:

- **Reverse between positions m and n** (LeetCode 92): walk to node m − 1, reverse the next n − m + 1 nodes, and reconnect both ends.
- **Reverse in groups of k** (LeetCode 25): repeat that sub-list reversal for each block of k nodes.
- **Palindrome linked list** (LeetCode 234): find the middle with slow and fast pointers, reverse the second half and compare the halves — O(n) time, O(1) space.
- **Add two numbers stored most-significant digit first:** reverse both lists, add digit by digit with a carry, and reverse the result.
`,
      },
    ],
    complexity: [
      { label: "Iterative (three pointers)", time: "O(n)", space: "O(1)", note: "Each node is visited once and gets exactly one pointer write." },
      { label: "Recursive", time: "O(n)", space: "O(n)", note: "One stack frame per node until the base case." },
      { label: "Doubly linked (swap next/prev)", time: "O(n)", space: "O(1)", note: "Two writes per node instead of one." },
      { label: "Using an explicit stack", time: "O(n)", space: "O(n)", note: "Push every node, then pop to relink — simple but wastes memory." },
    ],
    code: { language: "python", source: pythonList("singly", false, ["reverse"]) },
    faqs: [
      {
        q: "What is the time and space complexity of reversing a linked list?",
        a: "The iterative three-pointer method is O(n) time and O(1) extra space: every node is visited once and only three pointers are kept. The recursive method is also O(n) time but uses O(n) space for the call stack.",
      },
      {
        q: "Why do we need three pointers to reverse a linked list?",
        a: "`curr` is the node being flipped, `prev` is where its arrow should now point, and `next` saves the rest of the list before `curr.next` is overwritten. Drop any one of them and you either lose the remaining nodes or have nothing to point at.",
      },
      {
        q: "How do you reverse a linked list recursively?",
        a: "Reverse everything after the head, then make the old second node point back at the head (`head.next.next = head`) and set `head.next = None`. Return the head of the reversed rest, which is the old last node.",
      },
      {
        q: "How do you reverse a doubly linked list?",
        a: "Walk the list and swap each node's `next` and `prev` pointers, then swap `head` and `tail`. Like the singly linked version it takes O(n) time and O(1) extra space.",
      },
      {
        q: "Can you reverse a linked list without extra space?",
        a: "Yes. The iterative method reverses the list in place with three pointer variables — O(1) extra memory. No new nodes are created and no values are copied.",
      },
    ],
    related: ["/linked-list", "/linked-list/floyd-cycle-detection", "/linked-list/doubly-linked-list", "/stack-queue/stack"],
    updated: UPDATED,
  },

  // ───────────────────────────── Floyd's cycle detection ─────────────────────────────
  {
    path: "/linked-list/floyd-cycle-detection",
    parent: "/linked-list",
    name: "Floyd's Cycle Detection",
    title: "Floyd's Cycle Detection — Tortoise and Hare Visualizer",
    h1: "Floyd's Cycle Detection Visualizer",
    description:
      "Floyd's cycle detection (tortoise and hare) finds a loop in a linked list with two pointers and the node where it starts. Step through both phases to see why.",
    keywords: [
      "floyd's cycle detection",
      "tortoise and hare algorithm",
      "detect cycle in linked list",
      "linked list cycle ii",
      "find start of cycle in linked list",
      "fast and slow pointers",
    ],
    question: "What is Floyd's cycle detection algorithm?",
    summary:
      "**Floyd's cycle detection** — the tortoise and hare algorithm — tells whether a linked list loops back on itself by moving two pointers through it: `slow` one node per step and `fast` two. If `fast` reaches NULL there is no cycle; if the two ever meet there is one, and restarting one pointer at the head and moving both one step at a time makes them meet again exactly where the cycle begins. It runs in O(n) time with O(1) extra memory.",
    steps: [
      "Put both pointers on the head: `slow = fast = head`.",
      "**Phase 1:** while `fast` and `fast.next` are not NULL, move `slow` one node and `fast` two nodes.",
      "If `fast` runs off the end, the list is NULL-terminated — there is no cycle.",
      "If `slow == fast` (the same node, not just the same value), a cycle exists.",
      "**Phase 2:** move `slow` back to the head and advance both pointers one node at a time; the node where they meet is the start of the cycle.",
    ],
    sections: [
      {
        heading: "Why the hare always catches the tortoise",
        body: `
If there is no cycle, \`fast\` reaches the end first — after about n/2 steps — and the algorithm stops. If there is a cycle, both pointers eventually enter it and can never leave. From then on, look at the distance from \`slow\` forward to \`fast\` around the loop: every step \`fast\` gains one node, so the gap shrinks by exactly one. A gap that shrinks by one per step cannot jump over zero, so the pointers must land on the same node, and they do so within one lap — before \`slow\` has gone once around the cycle. That bound is what makes phase 1 O(n).
`,
      },
      {
        heading: "Why phase 2 finds the start of the cycle",
        body: `
Let **μ** be the number of steps from the head to the first node of the cycle, **λ** the cycle's length, and suppose the pointers meet **k** steps past the cycle's start. At the meeting, \`slow\` has walked μ + k nodes and \`fast\` twice as many, 2(μ + k). The extra distance \`fast\` covered is a whole number of laps: 2(μ + k) − (μ + k) = μ + k = m·λ for some whole number m.

Rearranged, μ = m·λ − k. So a pointer standing at the meeting point that walks μ more steps has travelled k + μ = m·λ from the start of the cycle — whole laps — and lands **exactly on the cycle's start**. A second pointer walking μ steps from the head lands there too. Neither knows μ, and neither needs to: move both one step at a time and the first node they share is the answer.
`,
      },
      {
        heading: "Worked example",
        body: `
This page opens with \`12 → 7 → 33 → 5 → 21 → 48\` and the last node pointing back at index 2 (value 33), so μ = 2 and the cycle 33 → 5 → 21 → 48 has length λ = 4.

- **Phase 1, step 1:** slow = 7, fast = 33.
- **Step 2:** slow = 33, fast = 21.
- **Step 3:** slow = 5, fast = 33 (21 → 48 → back to 33).
- **Step 4:** slow = 21, fast = 21 — they meet, so there is a cycle. The meeting point is k = 2 steps past 33, and μ + k = 4 = 1·λ, as the proof predicts.
- **Phase 2:** slow restarts at 12 while fast stays on 21. After one step slow = 7 and fast = 48; after two, both are on 33.

They meet on 33 after μ = 2 steps: the cycle starts at index 2, and walking once around from 33 back to 33 gives its length, 4. Press play to watch both phases; the demo removes the extra link again when it finishes.
`,
      },
      {
        heading: "Cycle length and removing the cycle",
        body: `
Once you have a meeting point inside the loop, two more facts are cheap to get:

- **Cycle length λ:** keep one pointer fixed and walk the other until it comes back — λ steps.
- **Remove the cycle:** after phase 2 gives the start node, walk around the loop to the node whose \`next\` is the start and set that \`next\` to NULL. The list is an ordinary NULL-terminated list again.

Both add only O(λ) work and still use O(1) memory.
`,
      },
      {
        heading: "Alternatives: a hash set or Brent's algorithm",
        body: `
The obvious approach is to remember every node you visit in a hash set and stop when you see one twice. It is just as fast — O(n) — and finds the start of the cycle immediately, but it needs O(n) extra memory. Floyd's algorithm trades that memory for a second pass.

**Brent's algorithm** refines the idea: it moves one pointer and periodically teleports the other to it at power-of-two intervals, still with O(1) memory and usually fewer steps. Both algorithms work on any sequence produced by repeatedly applying a function, x → f(x), which is why the same idea appears in Pollard's rho factoring, in the analysis of pseudo-random number generators, and in the interview problem "find the duplicate number" (LeetCode 287), where array values act as \`next\` pointers.
`,
      },
      {
        heading: "Common mistakes",
        body: `
- **Double-stepping without a NULL check.** Reading \`fast.next.next\` when \`fast.next\` is NULL crashes on an even-length list; test \`fast\` and \`fast.next\` before every double step.
- **Comparing values instead of nodes.** Two different nodes may hold the same number; compare identity (\`is\` in Python, pointer equality in C).
- **Starting the pointers on different nodes**, for example \`fast = head.next\`. Detection still works, but the phase-2 arithmetic no longer lines up and the reported start node is wrong.
- **Forgetting the empty list**, or a one-node list without a self-loop.
`,
      },
    ],
    complexity: [
      { label: "Detect a cycle (phase 1)", time: "O(n)", space: "O(1)", note: "At most μ + λ steps: reach the cycle, then the gap closes within one lap." },
      { label: "Find the cycle start (phase 2)", time: "O(n)", space: "O(1)", note: "Exactly μ more steps, where μ is the distance from the head to the cycle." },
      { label: "Cycle length", time: "O(λ)", space: "O(1)", note: "Walk once around the loop from the meeting point." },
      { label: "Hash-set method", time: "O(n)", space: "O(n)", note: "Simple, but stores every visited node." },
    ],
    code: { language: "python", source: pythonList("singly", false, ["cycle"]) },
    faqs: [
      {
        q: "Why does the fast pointer move two steps instead of three?",
        a: "Any speed difference detects a cycle, but with speeds 1 and 2 the gap closes by exactly one node per step, so the pointers cannot skip past each other and meet within one lap. Speed 2 is also what makes the phase-2 trick land exactly on the start of the cycle.",
      },
      {
        q: "What is the time complexity of Floyd's cycle detection?",
        a: "O(n) time and O(1) space. Phase 1 takes at most μ + λ steps (the part before the loop plus one lap), phase 2 exactly μ steps, and only two pointers are stored.",
      },
      {
        q: "How do you find where a cycle begins in a linked list?",
        a: "After slow and fast meet, move one pointer back to the head and advance both one node at a time. They meet again at the first node of the cycle, because the head-to-cycle distance equals the meeting-point-to-cycle-start distance, modulo the cycle length.",
      },
      {
        q: "Is Floyd's algorithm the same as the tortoise and hare algorithm?",
        a: "Yes. \"Tortoise and hare\" is the nickname for Floyd's cycle-finding algorithm: the slow pointer is the tortoise and the fast pointer is the hare. The same two-speed idea also finds the middle of a list in one pass.",
      },
      {
        q: "Can Floyd's algorithm detect a cycle in a graph?",
        a: "Only when every node has exactly one successor, as in a linked list or a function x → f(x). For general directed graphs, use depth-first search and look for a back edge to a node that is still on the recursion stack.",
      },
    ],
    related: ["/linked-list", "/linked-list/reverse-linked-list", "/linked-list/circular-linked-list", "/graph/depth-first-search"],
    updated: UPDATED,
  },
];
