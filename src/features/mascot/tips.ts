/** Things Bit says when clicked — short, true and useful. Keyed by route. */
export const TIPS: Record<string, readonly string[]> = {
  "/": [
    "Every page has **Learn** mode — it walks you through the idea with try-it buttons.",
    "Press **Ctrl K** to jump to any visualizer.",
    "Press **?** on any visualizer to see the keyboard shortcuts.",
  ],
  "/sorting": [
    "Merge sort always does about **n log n** work — even on sorted input.",
    "Insertion sort is the fastest simple sort on **nearly sorted** data.",
    "Quick sort with a last-element pivot on sorted input hits its **O(n²)** worst case. Try median-of-three!",
    "Counting sort never compares two elements — it counts them.",
    "Try **Compare** mode to race the algorithms against each other.",
  ],
  "/stack-queue": [
    "A stack is just an array plus one index: `top`.",
    "Circular queues reuse freed slots with `% capacity`.",
    "Your browser's back button is a stack; a printer queue is a queue.",
    "Shunting-yard turns `3 + 4 * 2` into `3 4 2 * +` with one stack.",
  ],
  "/linked-list": [
    "When inserting, set `new.next` **before** you redirect the previous node — or the rest of the list is lost.",
    "Slow/fast pointers find the middle in one pass.",
    "Floyd's tortoise and hare detects a cycle with O(1) extra memory.",
    "A doubly linked list costs one extra pointer per node but lets you walk backwards.",
  ],
  "/heap": [
    "In an array heap, the parent of `i` is `⌊(i − 1) / 2⌋` — no pointers needed.",
    "Building a heap bottom-up is **O(n)**, not O(n log n).",
    "A heap is only *partially* ordered: siblings can be in any order.",
    "Dijkstra's algorithm runs on a min-heap priority queue.",
  ],
  "/bst": [
    "In-order traversal of a BST prints the keys in sorted order.",
    "Insert keys in sorted order and a BST degrades into a linked list.",
    "Deleting a node with two children? Swap in its in-order successor.",
  ],
  "/avl-tree": [
    "AVL trees keep every balance factor in −1…+1, so height stays O(log n).",
    "LR and RL cases need **two** rotations; LL and RR need one.",
    "A rotation only rewires three pointers — it's O(1).",
  ],
  "/btree": [
    "Databases and file systems use B-trees because one node fits one disk page.",
    "All B-tree leaves are always at the same depth.",
    "A split pushes the median key **up**; a merge pulls a separator **down**.",
  ],
  "/graph": [
    "BFS finds shortest paths when every edge has the same weight.",
    "Dijkstra breaks with negative edges — Bellman-Ford doesn't.",
    "Kruskal sorts edges; Prim grows one tree from a start node.",
    "Topological sort only exists for graphs without cycles (DAGs).",
  ],
};

export const CHEERS = ["Nailed it! 🎉", "Done — beautiful.", "That's how it's done ✨", "Sorted it out! 😄", "Woohoo!"];
export const QUIZ_RIGHT = ["Correct! Big brain move 🧠", "Nailed it! 🎉", "Yes! You're on fire 🔥"];
export const QUIZ_WRONG = ["Almost! Read the explanation 👇", "So close — check why below.", "Not quite. You've got the next one!"];

export const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];
