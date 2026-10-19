import type { Lesson } from "@/lib/lesson";
import type { ListKind } from "./engine/types";

/** Try-it action ids (handled by LinkedListVisualizer). */
export type LessonAction =
  | "build" | "search" | "searchMiss" | "insertAt" | "bug" | "tailNoTail" | "tailWithTail" | "reverse" | "middle" | "cycle"
  | "merge" | "toSingly" | "toDoubly" | "toCircular" | "deleteTailO1" | "deleteValue" | "headNoTail" | "headWithTail" | "deleteHead";

const tryIt = (label: string, action: LessonAction) => ({ label, action });

const SINGLY: Lesson = {
  id: "linked-list",
  title: "Linked lists",
  slides: [
    {
      title: "Nodes and pointers",
      body: "A linked list is a chain of **nodes**: each holds a value and the address of the `next` node.\n`head` points at the first node; the last one points at **NULL**.\nUnlike an array, the nodes can live anywhere in memory.",
      tryIt: [tryIt("Build a list", "build")],
    },
    {
      title: "No indexing — walk",
      body: "To reach index k you follow `next` k times, so access and search are **O(n)**.\nThere is no jumping to the middle.",
      tryIt: [tryIt("Search for a value", "search")],
    },
    {
      title: "Insert: order matters",
      body: "First `new.next = curr.next`, then `curr.next = new`.\nSwap the two lines and the rest of the list is lost.",
      tryIt: [tryIt("Insert at index 2", "insertAt"), tryIt("Insert in the wrong order", "bug")],
    },
    {
      title: "Head is cheap, tail isn't",
      body: "Insert or delete at the head is **O(1)**.\nReaching the tail needs an O(n) walk — unless you keep a **tail pointer**.",
      tryIt: [tryIt("Insert at tail", "tailNoTail"), tryIt("Same with a tail pointer", "tailWithTail")],
    },
    {
      title: "Reverse in place",
      body: "Walk once with `prev`, `curr` and `next`, flipping one arrow per node.\n**O(n)** time, **O(1)** extra space.",
      tryIt: [tryIt("Reverse this list", "reverse")],
    },
    {
      title: "Slow & fast pointers",
      body: "`fast` moves two nodes per step, `slow` moves one.\nWhen fast reaches the end, slow is at the **middle**; if they ever meet, there is a **cycle** (Floyd).",
      tryIt: [tryIt("Find the middle", "middle"), tryIt("Detect a cycle", "cycle")],
    },
    {
      title: "Pitfalls & interview tips",
      body: "Check for NULL before touching `curr.next`, and keep `tail` in sync.\nA **dummy node** removes head special cases.\nDraw the arrows before you write code.",
      tryIt: [tryIt("Merge two sorted lists", "merge")],
    },
    {
      title: "Where it's used",
      body: "Hash-table buckets, LRU caches, undo history and memory allocators' free lists.\nDoubly and circular lists have their own lessons.",
      tryIt: [tryIt("Switch to doubly", "toDoubly"), tryIt("Switch to circular", "toCircular")],
    },
  ],
};

const DOUBLY: Lesson = {
  id: "linked-list.doubly",
  title: "Doubly linked lists",
  slides: [
    {
      title: "Two-way links",
      body: "Each node also stores `prev`, so you can walk backwards.\nThe price: one more pointer (8 bytes) per node.",
      tryIt: [tryIt("Search for a value", "search")],
    },
    {
      title: "Both ends are O(1)",
      body: "The list keeps `head` **and** `tail`, so the end is one jump away: `new.prev = tail`, `tail.next = new`, `tail = new`.\nDelete tail steps back with `tail.prev` — no walk either way.",
      tryIt: [tryIt("Insert at tail", "tailWithTail"), tryIt("Delete tail", "deleteTailO1")],
    },
    {
      title: "Insert: four writes",
      body: "Set `new.next` and `new.prev`, then `curr.next.prev`, and `curr.next` last.\nMiss one and the two directions disagree.",
      tryIt: [tryIt("Insert at index 2", "insertAt")],
    },
    {
      title: "Delete without walking back",
      body: "A node knows its predecessor, so it unlinks itself: `curr.prev.next = curr.next`.\nOnly finding the node costs O(n); the unlink is **O(1)**.",
      tryIt: [tryIt("Delete a value", "deleteValue")],
    },
    {
      title: "Reverse by swapping",
      body: "Reversing swaps each node's `next` and `prev`.\nStill one pass and O(1) space.",
      tryIt: [tryIt("Reverse this list", "reverse")],
    },
    {
      title: "Where it's used",
      body: "LRU caches (hash map + doubly list), browser back/forward, text editors.\nC++ `std::list` and Java's `LinkedList` are doubly linked.",
      tryIt: [tryIt("Back to singly", "toSingly")],
    },
  ],
};

const CIRCULAR: Lesson = {
  id: "linked-list.circular",
  title: "Circular linked lists",
  slides: [
    {
      title: "A ring with no end",
      body: "The last node points back at `head` instead of NULL.\nLoops stop when they come back to `head`.",
      tryIt: [tryIt("Search for a missing value", "searchMiss")],
    },
    {
      title: "Why keep a tail pointer",
      body: "Inserting at the head also re-points the last node.\nWithout a tail pointer that is an O(n) walk; with one it is **O(1)**.",
      tryIt: [tryIt("Insert at head", "headNoTail"), tryIt("With a tail pointer", "headWithTail")],
    },
    {
      title: "Deleting the head",
      body: "Move `head` forward, then point the last node at the new head.\nA one-node ring points at itself.",
      tryIt: [tryIt("Delete head", "deleteHead")],
    },
    {
      title: "One big cycle",
      body: "Floyd's slow and fast pointers always meet on a ring.\nThe cycle starts at `head`.",
      tryIt: [tryIt("Detect the cycle", "cycle")],
    },
    {
      title: "Where it's used",
      body: "Round-robin scheduling, turn order in games, playlists on repeat.\nPitfall: `while curr != NULL` never ends.",
      tryIt: [tryIt("Reverse the ring", "reverse"), tryIt("Back to singly", "toSingly")],
    },
  ],
};

export const LESSONS: Record<ListKind, Lesson> = { singly: SINGLY, doubly: DOUBLY, circular: CIRCULAR };
