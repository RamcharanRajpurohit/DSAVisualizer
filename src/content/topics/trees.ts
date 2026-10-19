import { PYTHON as BST_PY } from "@/features/bst/code/python";
import { PYTHON as BTREE_PY } from "@/features/btree/code/python";
import type { TopicContent } from "../types";

const UPDATED = "2026-10-19";

/*
 * Code for the articles is the visualizers' own Python (verified by the scratchpad harnesses),
 * stitched together so each article shows one complete, runnable module.
 */
const join = (...parts: string[]) => parts.map((p) => p.trim()).join("\n\n\n");
/** The traversal snippets end with a "# usage" hint; one at the end of the article is enough. */
const noUsage = (s: string) => s.replace(/\n+# usage:.*$/m, "");
/** AVL Node + h() + update(): the head of the AVL insert listing, before replace(). */
const AVL_NODE = BST_PY["avl-insert"].split("\ndef replace(")[0];

const BST_CODE = join(BST_PY["bst-insert"], BST_PY.search);
const TRAVERSAL_CODE = join(
  BST_PY.levelorder.split("\n\n\n")[0], // from collections import deque
  noUsage(BST_PY.preorder),
  noUsage(BST_PY.inorder),
  noUsage(BST_PY.postorder),
  BST_PY.levelorder.split("\n\n\n").slice(1).join("\n\n\n"),
) + "\n\n\n# usage: out = []; inorder(root, out)    (level_order(root) returns a list)";
const BST_DELETE_CODE = BST_PY["bst-delete"];
const AVL_CODE = join(BST_PY["avl-insert"], BST_PY.rebalance, BST_PY.rotateRight, BST_PY.rotateLeft);
const ROTATION_CODE = join(AVL_NODE, BST_PY.rotateRight, BST_PY.rotateLeft, BST_PY.rebalance);
const BTREE_CODE = `${BTREE_PY.head}${BTREE_PY.search}${BTREE_PY.insert}`;
const BTREE_INSERT_CODE = `${BTREE_PY.head}${BTREE_PY.insert}`;
const BTREE_DELETE_CODE = `${BTREE_PY.head}${BTREE_PY.delete}`;

export const TREES_TOPICS: TopicContent[] = [
  // ───────────────────────────── Binary search tree (hub) ─────────────────────────────
  {
    path: "/bst",
    name: "Binary Search Tree",
    title: "Binary Search Tree Visualizer — Insert, Search, Delete",
    h1: "Binary Search Tree Visualizer",
    description:
      "Binary search tree visualizer: insert, search and delete keys step by step, see why every operation costs O(h), and compare a plain BST with AVL and B-trees.",
    keywords: [
      "binary search tree visualizer",
      "binary search tree",
      "bst visualization",
      "bst insertion and search",
      "binary search tree example",
      "bst vs avl tree",
    ],
    question: "What is a binary search tree?",
    summary:
      "A **binary search tree (BST)** is a binary tree in which every key is larger than all keys in its node's left subtree and smaller than all keys in its right subtree. That single ordering rule lets search, insert and delete throw away a whole subtree with each comparison, so they cost **O(h)** for a tree of height h — about log₂ n when the tree is balanced, but n when keys arrive in sorted order.",
    steps: [
      "Start at the root and compare the key you want with the key in the node.",
      "Equal: you found it. Smaller: continue into the **left** subtree. Larger: continue into the **right** subtree.",
      "Each comparison rules out the other subtree completely — the whole reason a BST is fast.",
      "**Search** stops when it finds the key or steps onto an empty child, which proves the key is absent.",
      "**Insert** makes the same walk and hangs the new key as a leaf on the empty child where the search ended.",
      "**Delete** finds the node, then cuts off a leaf, lifts up a single child, or replaces a node that has two children with its in-order successor.",
    ],
    sections: [
      {
        heading: "The ordering rule, and why it works",
        body: `
For every node, **all** keys in its left subtree are smaller and **all** keys in its right subtree are larger — not just its two children. Checking only \`left.key < node.key < right.key\` is a classic bug: a tree can pass that local test everywhere and still be broken, for example when a key deep in the root's left subtree is larger than the root.

Because the rule holds at every node, a search never needs to backtrack. At a node holding 50, a target of 42 cannot be anywhere to the right, so one comparison discards the entire right subtree — half of what is left, if the tree is balanced. The same rule is why an **in-order traversal** (left, node, right) prints the keys in sorted order, which doubles as a quick validity check.
`,
      },
      {
        heading: "Worked example: building and searching a tree",
        body: `
Insert 50, 30, 70, 20, 40, 60, 80, 35, 45, 90 into an empty tree — the tree the visualizer opens with. 50 becomes the root. 30 < 50 goes left and 70 > 50 goes right; then 20 and 40 settle under 30, and 60 and 80 under 70. For 35 the walk is 35 < 50 (left), 35 > 30 (right), 35 < 40 (left) — an empty spot, so 35 becomes 40's left child. 45 lands to the right of 40 and 90 to the right of 80: ten keys, four levels.

Searching for **45** compares 50 → 30 → 40 → 45: four comparisons out of ten keys. Searching for **55** compares 50 → 70 → 60 and then finds 60's left child empty — exactly where 55 would be inserted, which proves it is not stored. Run both searches above and watch the probe walk down.
`,
      },
      {
        heading: "Why the shape matters: O(log n) or O(n)",
        body: `
Every operation follows one root-to-leaf path, so its cost is proportional to the height h. A tree with n keys can be as short as ⌈log₂(n + 1)⌉ levels or as tall as n levels, and a plain BST has no say in which one it gets — the insertion order decides.

- **Random order** is kind: the average key ends up about 2 ln n ≈ 1.39·log₂ n levels deep, so searches are O(log n) on average.
- **Sorted order** is the worst case: each new key becomes the right child of the previous one and the tree degenerates into a linked list. Insert 1 to 7 and the tree is 7 levels tall, where a balanced tree needs 3. Try the **Skewed** preset.

That is why production code rarely uses a plain BST. Self-balancing search trees — **AVL trees**, **red-black trees** and **B-trees** — repair their shape after each update and guarantee O(log n) whatever the input order.
`,
      },
      {
        heading: "BST vs AVL tree vs B-tree",
        body: `
The three trees on this site share the same search rule and differ in how hard they work to stay short:

- **Binary search tree:** no balancing at all. The simplest code; O(log n) on average but O(n) in the worst case. Good for learning and for data that arrives in random order.
- **AVL tree:** a BST that stores each node's height and keeps every balance factor in −1…+1 with rotations. Height stays below about 1.44·log₂ n, so every operation is O(log n) in the worst case.
- **B-tree:** not binary — each node holds up to m − 1 sorted keys and m children, and all leaves sit on the same level. Splits and merges keep it perfectly balanced, and its wide nodes match disk pages, which is why databases and file systems use B-trees and B+ trees.

Rule of thumb: in memory, use your language's balanced tree (Java's \`TreeMap\` and C++'s \`std::map\` are red-black trees); on disk, use a B+ tree; use a plain BST to understand the idea — everything else builds on it.
`,
      },
      {
        heading: "Common mistakes and interview tips",
        body: `
- **Validating a BST against children only.** Pass an allowed (low, high) range down the recursion, or check that the in-order traversal is strictly increasing.
- **Promising O(log n) without balancing.** The follow-up question is always "what if the keys arrive sorted?" — the answer is height n and O(n) per operation.
- **Deep recursion.** Recursive insert or search on a degenerate tree recurses n levels deep and can overflow the call stack; iterative versions use O(1) extra space.

Interview favourites built on these ideas: the kth smallest key (in-order traversal with a counter), lowest common ancestor (the first node where the two keys go different ways), floor and ceiling of a key, and building a balanced BST from a sorted array (make the middle element the root, recurse on both halves).
`,
      },
    ],
    complexity: [
      { label: "Search", time: "O(log n) avg · O(n) worst", space: "O(1)", note: "One comparison per level along a single path; h ≈ log n for random input but n for sorted input." },
      { label: "Insert", time: "O(log n) avg · O(n) worst", space: "O(1)", note: "The same walk as a search, then one new leaf is linked in." },
      { label: "Delete", time: "O(log n) avg · O(n) worst", space: "O(1)", note: "Find the node; with two children, continue down to its in-order successor." },
      { label: "Traversal", time: "O(n)", space: "O(h)", note: "Every node is visited once; the recursion stack holds one root-to-node path." },
      { label: "Build from n keys", time: "O(n log n) avg · O(n²) worst", space: "O(n)", note: "n inserts; with sorted keys the i-th insert walks i levels." },
    ],
    code: { language: "python", source: BST_CODE },
    faqs: [
      {
        q: "What is the time complexity of a binary search tree?",
        a: "Search, insert and delete all take O(h), where h is the tree's height. That is O(log n) for a balanced tree or one built from random keys, and O(n) in the worst case, such as keys inserted in sorted order.",
      },
      {
        q: "What is the difference between a binary tree and a binary search tree?",
        a: "A binary tree only limits every node to two children. A binary search tree adds the ordering rule — everything in the left subtree is smaller and everything in the right subtree larger — which is what makes fast search possible.",
      },
      {
        q: "Can a binary search tree have duplicate keys?",
        a: "The classic definition uses unique keys. To allow duplicates, store a count in each node, or always send equal keys to one side (say, right) and handle that rule consistently in search and delete.",
      },
      {
        q: "How do you check whether a binary tree is a valid BST?",
        a: "Recurse with an allowed range: a left child must be below its parent's key, a right child above it, and the bounds tighten as you go down. Equivalently, run an in-order traversal and check that each key is larger than the previous one. Both take O(n).",
      },
      {
        q: "Is a binary search tree always balanced?",
        a: "No. A plain BST never rebalances, so its shape depends entirely on the insertion order and can degrade into a chain. AVL trees, red-black trees and B-trees are search trees that rebalance themselves to guarantee O(log n) height.",
      },
      {
        q: "BST or heap — which should I use?",
        a: "A heap only keeps the minimum (or maximum) on top, which makes it ideal for priority queues. A BST keeps all keys in order, so it also supports search, predecessor and successor queries and sorted iteration.",
      },
    ],
    related: ["/bst/tree-traversals", "/bst/bst-deletion", "/avl-tree", "/btree", "/heap", "/linked-list"],
    updated: UPDATED,
  },

  // ───────────────────────────── Tree traversals ─────────────────────────────
  {
    path: "/bst/tree-traversals",
    parent: "/bst",
    name: "Tree Traversal",
    title: "Tree Traversal — Inorder, Preorder, Postorder, BFS",
    h1: "Tree Traversal Visualizer — Inorder, Preorder, Postorder, Level Order",
    description:
      "Visualize inorder, preorder, postorder and level-order tree traversal on one tree: the visit order, the call stack or queue, the code, and when to use each.",
    keywords: [
      "tree traversal",
      "inorder traversal",
      "preorder traversal",
      "postorder traversal",
      "level order traversal",
      "inorder preorder postorder",
      "binary tree traversal visualizer",
    ],
    question: "What is tree traversal?",
    summary:
      "**Tree traversal** means visiting every node of a tree exactly once in a fixed order. The three depth-first orders differ only in when a node is visited relative to its subtrees — **preorder** (node, left, right), **inorder** (left, node, right) and **postorder** (left, right, node) — while **level order** visits the tree breadth-first, one level at a time, using a queue. All four run in O(n) time.",
    steps: [
      "**Preorder:** visit the node, then traverse its left subtree, then its right subtree.",
      "**Inorder:** traverse the left subtree, visit the node, then traverse the right subtree.",
      "**Postorder:** traverse the left subtree, then the right subtree, and visit the node last.",
      "**Level order:** put the root in a queue; repeatedly take the front node, visit it and add its left and right children to the back.",
      "In the depth-first orders the call stack remembers where to return; in level order the queue holds the nodes of the next level.",
    ],
    sections: [
      {
        heading: "One tree, four orders",
        body: `
The visualizer opens on the tree built by inserting 60, 20, 70, 10, 40, 90, 30, 50, 80 into a binary search tree: 60 is the root with children 20 and 70; 10 and 40 hang under 20; 90 is 70's right child; 30 and 50 are 40's children; and 80 is 90's left child. Its four traversals:

- **Preorder:** 60, 20, 10, 40, 30, 50, 70, 90, 80
- **Inorder:** 10, 20, 30, 40, 50, 60, 70, 80, 90
- **Postorder:** 10, 30, 50, 40, 20, 80, 90, 70, 60
- **Level order:** 60, 20, 70, 10, 40, 90, 30, 50, 80

Look for the fingerprints: preorder always starts with the root, postorder always ends with it, inorder of a binary search tree comes out sorted, and level order reads the drawing row by row. Press each traversal above: blue nodes are calls still in progress (the call stack), and every visit flies into the output strip.
`,
      },
      {
        heading: "A trick for tracing traversals by hand",
        body: `
Draw a line around the tree, starting to the left of the root and hugging every node and edge counter-clockwise (an **Euler tour**). The line passes each node up to three times: on its left side, underneath it and on its right side.

- Write a node down on the **first** pass (its left side) → preorder.
- Write it down on the pass **underneath** → inorder.
- Write it down on the **last** pass (its right side) → postorder.

For level order, ignore the line and read the drawing top to bottom, left to right. This works for any binary tree, which makes it the fastest way to check an exam answer.
`,
      },
      {
        heading: "When to use each traversal",
        body: `
- **Preorder** — copying or serializing a tree (a parent is created before its children), printing folder hierarchies, prefix (Polish) notation. For a BST, inserting the preorder sequence into an empty tree rebuilds the exact same shape; this visualizer's share links rely on that.
- **Inorder** — reading a BST's keys in sorted order, validating a BST, finding the kth smallest key, and printing an expression tree in ordinary infix form.
- **Postorder** — anything where children must be finished before their parent: deleting or freeing a tree, computing heights, subtree sizes or sums, and evaluating an expression tree (its postorder is the postfix, or reverse Polish, form).
- **Level order** — anything about depth or distance from the root: printing level by level, minimum depth, the right-side view, linking nodes on the same level, and the level-by-level format LeetCode uses to write down trees.
`,
      },
      {
        heading: "Recursion, stacks and queues",
        body: `
The three depth-first traversals are three lines of recursion each. The call stack holds the path from the root to the current node, so they use **O(h)** extra space: O(log n) for a balanced tree, but O(n) for a degenerate one — deep enough to hit Python's default recursion limit of 1000. Iterative versions keep that stack explicitly: preorder pops a node, visits it and pushes its right child and then its left; inorder walks left pushing nodes, pops one, visits it and moves to its right child.

Level order is **breadth-first search** on a tree, and it needs a **queue** (first in, first out), not a stack: children are visited in the order they were discovered, so a whole level is finished before the next one starts. Its extra space is the width of the widest level — about n/2 for the bottom level of a perfect tree.

**Morris traversal** does inorder with O(1) extra space by temporarily pointing each left subtree's rightmost node back at its ancestor, then removing those threads on the way through.
`,
      },
      {
        heading: "Rebuilding a tree from its traversals",
        body: `
One traversal does not pin down a general binary tree, but the right pair does. With distinct keys, **preorder + inorder** (or postorder + inorder) gives a unique tree: the first preorder key (or the last postorder key) is the root, and its position in the inorder list splits the remaining keys into the left and the right subtree; repeat for each part.

**Preorder + postorder** is ambiguous whenever a node has a single child — nothing tells you whether that child is on the left or the right — unless the tree is full (every node has 0 or 2 children). For a **binary search tree**, preorder alone is enough, because the inorder sequence is simply the keys in sorted order.
`,
      },
      {
        heading: "Common mistakes",
        body: `
- Using a stack for level order: that produces a depth-first order, not level by level.
- Assuming postorder is preorder reversed. Reversing postorder gives node, right, left — a mirrored preorder. On the tree above, preorder is 60, 20, 10, … but reversed postorder is 60, 70, 90, ….
- Forgetting the base case \`if node is None: return\`, which crashes on the first missing child.
- Expecting sorted inorder output from any binary tree. That only holds for binary search trees.
`,
      },
    ],
    complexity: [
      { label: "Preorder / inorder / postorder", time: "O(n)", space: "O(h)", note: "Each node is entered once; the recursion stack holds one root-to-node path." },
      { label: "Level order (BFS)", time: "O(n)", space: "O(w)", note: "w is the widest level — up to about n/2 in a perfect tree." },
      { label: "Morris inorder", time: "O(n)", space: "O(1)", note: "Temporary threads replace the stack; each edge is walked a constant number of times." },
    ],
    code: { language: "python", source: TRAVERSAL_CODE },
    faqs: [
      {
        q: "What is the difference between preorder, inorder and postorder traversal?",
        a: "Only when the node itself is visited: before its subtrees (preorder), between the left and right subtree (inorder) or after both (postorder). The left subtree is always traversed before the right one.",
      },
      {
        q: "Which traversal gives sorted output?",
        a: "Inorder traversal of a binary search tree lists the keys in ascending order, because everything in a node's left subtree is smaller and everything in its right subtree larger. Traverse right, node, left for descending order.",
      },
      {
        q: "Is level order traversal the same as BFS?",
        a: "Yes. Level order is breadth-first search applied to a tree: a queue makes sure every node at depth d is visited before any node at depth d + 1. A tree has no cycles, so no visited set is needed.",
      },
      {
        q: "What is the time and space complexity of tree traversal?",
        a: "All four traversals visit each node once, so they take O(n) time. Depth-first traversals need O(h) extra space for the recursion or stack; level order needs O(w), the width of the widest level.",
      },
      {
        q: "Which traversal is used to delete a tree?",
        a: "Postorder, because both children are freed before their parent, so no pointer you still need is lost. Preorder is the natural choice for copying a tree, since each parent is created before its children.",
      },
      {
        q: "Can you rebuild a binary tree from preorder and inorder traversals?",
        a: "Yes, as long as the keys are distinct. The first preorder key is the root; its position in the inorder list splits the rest into the left and right subtree, and the same step repeats on each part.",
      },
    ],
    related: ["/bst", "/graph/breadth-first-search", "/graph/depth-first-search", "/stack-queue", "/bst/bst-deletion", "/avl-tree"],
    updated: UPDATED,
  },

  // ───────────────────────────── BST deletion ─────────────────────────────
  {
    path: "/bst/bst-deletion",
    parent: "/bst",
    name: "BST Deletion",
    title: "BST Deletion — Leaf, One Child and Two Children Cases",
    h1: "BST Deletion — All Three Cases",
    description:
      "How to delete a node from a binary search tree: the leaf, one-child and two-children cases, in-order successor or predecessor, with an animated example.",
    keywords: [
      "bst deletion",
      "delete node in binary search tree",
      "binary search tree deletion",
      "delete node with two children",
      "inorder successor",
      "bst delete example",
    ],
    question: "How does deletion work in a binary search tree?",
    summary:
      "Deleting a key from a binary search tree has three cases. A **leaf** is simply removed; a node with **one child** is replaced by that child; a node with **two children** is replaced by its **in-order successor** — the smallest key in its right subtree — which is first removed from its own spot, where it has at most one child. Every case preserves the BST ordering and costs O(h).",
    steps: [
      "Search for the key, remembering the parent of each node you pass. If you fall off the tree, the key is absent and nothing changes.",
      "**Case 1 — leaf:** set the parent's pointer to it to null.",
      "**Case 2 — one child:** point the parent straight at that child; the child's whole subtree moves up one level.",
      "**Case 3 — two children:** go right once, then left as far as possible, to find the in-order successor s.",
      "Splice s out of its old spot (its right child, if any, takes its place), then put s where the deleted node was, adopting both of its subtrees.",
      "If the deleted node was the root, whatever replaces it becomes the new root.",
    ],
    sections: [
      {
        heading: "Worked example: three deletions on one tree",
        body: `
This page opens on the tree built from 50, 30, 70, 20, 40, 60, 80, 35, 45, 90: root 50; then 30 and 70; then 20, 40, 60 and 80; and 35 and 45 under 40, 90 under 80.

- **Delete 20 (leaf).** 20 has no children, so 30's left pointer becomes null. Nothing else moves.
- **Delete 80 (one child).** 80's only child is 90, so 70's right pointer now points at 90. Every key in 90's subtree was already in 70's right subtree, so it is still larger than 70 and the order holds.
- **Delete 30 (two children).** Its successor is found by going right once (to 40) and then left as far as possible (to 35). 35 leaves its spot — 40's left pointer takes 35's right child, which is empty — and 35 moves into 30's place with 20 as its left child and 40 as its right.

Replay each case with the **Deletion cases** buttons above, or delete the root 50 and watch its successor 60 take over the top of the tree.
`,
      },
      {
        heading: "Why the in-order successor is the right replacement",
        body: `
The node being removed, z, separates two groups of keys: everything in its left subtree is smaller and everything in its right subtree is larger. Its replacement has to be larger than the whole left group and smaller than everything that remains in the right group. The **in-order successor** — the minimum of the right subtree, the very next key in sorted order — is exactly such a key. The **in-order predecessor** (the maximum of the left subtree) works just as well by symmetry.

The successor can never have a left child: that child would be smaller and would itself be the minimum. So removing the successor from its old position is always case 1 or case 2, and the two-children case never needs more than one extra step.
`,
      },
      {
        heading: "Successor or predecessor?",
        body: `
Both are correct. Thomas Hibbard's 1962 deletion algorithm, and textbooks such as CLRS, always use the successor — and that is what the visualizer animates.

Always choosing the same side has a cost, though. Over a long run of random insertions and deletions, the right subtrees keep losing their smallest keys while the left subtrees never do, and the tree drifts out of shape: experiments starting with Eppinger's in 1983 showed the average search path growing well beyond the 1.39·log₂ n of a random tree. Alternating between successor and predecessor, or picking one at random, keeps the tree closer to balanced. Self-balancing trees remove the problem altogether by repairing the shape after every delete.
`,
      },
      {
        heading: "Implementation details that trip people up",
        body: `
- **Copying keys instead of moving nodes.** The shortest code copies the successor's key into z and then deletes the successor from the right subtree. That is fine for bare integers, but if nodes carry other data, or outside code holds pointers to nodes, move the successor node itself — as the code below and CLRS's TRANSPLANT do.
- **Deleting the root.** There is no parent pointer to fix, so the replacement must become the new root. Returning the (possibly new) root from the function handles this cleanly.
- **The successor is z's right child.** When z.right has no left child, z.right itself is the successor; it keeps its own right subtree and only gains z's left subtree.
- **Missing keys.** Decide whether deleting an absent key is an error or a no-op; this code treats it as a no-op.
- **Recursive deletion** returns the new subtree root from every call (\`node.left = delete(node.left, key)\`), which removes the parent bookkeeping but uses O(h) stack space.
`,
      },
      {
        heading: "Deletion in balanced trees",
        body: `
In a plain BST a deletion never restructures anything beyond the three cases. Balanced trees reuse the same cases and then repair the shape: an **AVL tree** walks back up recomputing heights and may rotate at several levels (O(log n) rotations in the worst case), a **red-black tree** fixes colours with at most three rotations, and a **B-tree** borrows a key from a sibling or merges two nodes when one becomes too empty.
`,
      },
    ],
    complexity: [
      { label: "Find the node", time: "O(h)", space: "O(1)", note: "One root-to-node walk, tracking the parent." },
      { label: "Leaf or one child", time: "O(1) once found", space: "O(1)", note: "Only the parent's pointer changes." },
      { label: "Two children", time: "O(h)", space: "O(1)", note: "One more walk down to the successor, still on the same path." },
      { label: "Whole delete", time: "O(log n) avg · O(n) worst", space: "O(1)", note: "h is about log n for random trees and n for a degenerate chain." },
    ],
    code: { language: "python", source: BST_DELETE_CODE },
    faqs: [
      {
        q: "What are the three cases of deleting a node in a BST?",
        a: "The node is a leaf (remove it), it has one child (replace it with that child), or it has two children (replace it with its in-order successor or predecessor, which is first removed from its old position).",
      },
      {
        q: "What is the in-order successor of a node?",
        a: "The next larger key in the tree. For a node that has a right subtree, it is the leftmost node of that subtree: go right once, then left until there is no left child.",
      },
      {
        q: "Can I use the in-order predecessor instead of the successor?",
        a: "Yes. The largest key of the left subtree also sits between the two groups of keys, so the BST property survives. Some implementations alternate between the two to keep the tree better balanced.",
      },
      {
        q: "Why does the in-order successor never have a left child?",
        a: "If it had one, that left child would be smaller than the successor but still larger than the deleted key, so it — not the node we stopped at — would be the minimum of the right subtree.",
      },
      {
        q: "What is the time complexity of deleting from a BST?",
        a: "O(h): finding the node and its successor both stay on one root-to-leaf path. That is O(log n) for a balanced or random tree and O(n) for a skewed one.",
      },
      {
        q: "How do you delete the root of a binary search tree?",
        a: "Exactly like any other node — apply the case that matches its number of children — except that the replacement (its only child or its successor) becomes the new root, so the function must return or store it.",
      },
    ],
    related: ["/bst", "/bst/tree-traversals", "/avl-tree", "/avl-tree/rotations", "/btree/deletion", "/linked-list"],
    updated: UPDATED,
  },

  // ───────────────────────────── AVL tree (hub) ─────────────────────────────
  {
    path: "/avl-tree",
    name: "AVL Tree",
    title: "AVL Tree Visualizer — Insertion, Deletion, Rotations",
    h1: "AVL Tree Visualizer",
    description:
      "AVL tree visualizer: insert and delete keys, watch heights and balance factors update and LL, RR, LR, RL rotations keep every operation O(log n).",
    keywords: [
      "avl tree visualizer",
      "avl tree",
      "avl tree insertion",
      "avl tree deletion",
      "balance factor",
      "self-balancing binary search tree",
      "avl vs red-black tree",
    ],
    question: "What is an AVL tree?",
    summary:
      "An **AVL tree** is a self-balancing binary search tree in which, for every node, the heights of the left and right subtrees differ by at most 1. After each insert or delete it walks back up the path, updates heights and fixes any node whose **balance factor** leaves −1…+1 with one or two **rotations**. That keeps the height below about 1.44·log₂ n, so search, insert and delete are **O(log n)** in the worst case.",
    steps: [
      "Insert or delete the key exactly as in an ordinary binary search tree.",
      "Walk back up from the changed spot towards the root, recomputing each ancestor's height = 1 + max(height(left), height(right)).",
      "Compute its balance factor bf = height(left) − height(right).",
      "If bf is +2 or −2 the node is unbalanced: name the case — LL, RR, LR or RL — from the direction of its taller child and grandchild.",
      "Fix it with a single rotation (LL, RR) or a double rotation (LR, RL); the subtree is balanced again.",
      "After an insert one fix is enough and the walk stops; after a delete keep walking up while the subtree got shorter, because more ancestors may need rotations.",
    ],
    sections: [
      {
        heading: "Height and balance factor",
        body: `
The **height** of a node is the number of nodes on the longest path from it down to a leaf. This visualizer counts a leaf as height 1 and an empty subtree as 0; many textbooks count edges instead (0 and −1), but the differences — and so the balance factors — come out the same. The **balance factor** is height(left) − height(right), and in an AVL tree it is −1, 0 or +1 at every node. Switch on **Height & balance** to see both numbers on each node.

Storing the height in each node is what makes the check cheap: after an update only the nodes on the path back to the root can change, so the repair walk costs O(log n).
`,
      },
      {
        heading: "Worked example: inserting sorted keys",
        body: `
Insert 1, 2, 3, 4, 5, 6, 7 into a plain BST and you get a chain seven levels tall. In an AVL tree:

- Inserting **3** makes node 1 right-heavy (bf −2) along a straight line, so a **left rotation** at 1 lifts 2 to the root.
- Inserting **5** unbalances 3 the same way: left rotation at 3.
- Inserting **6** unbalances the root 2: left rotation at 2, and 4 becomes the root.
- Inserting **7** unbalances 5: left rotation at 5.

After four rotations the tree is perfect: 4 at the root, 2 and 6 below it, and 1, 3, 5, 7 as leaves — height 3 instead of 7. The **Sorted 10…70** preset replays the same thing with every retrace and rotation animated.
`,
      },
      {
        heading: "Why the height stays logarithmic",
        body: `
Picture the sparsest AVL tree of height h: a root whose subtrees are the sparsest trees of heights h − 1 and h − 2. Its node count follows N(h) = N(h − 1) + N(h − 2) + 1, a Fibonacci-style recurrence, so N(h) grows like φʰ with φ ≈ 1.618. Turned around, a tree with n nodes has height at most about **1.44·log₂(n + 2)**. A perfectly balanced tree needs log₂ n levels, so even the worst AVL tree is only about 44% taller — and every operation stays O(log n).
`,
      },
      {
        heading: "AVL vs red-black tree vs plain BST",
        body: `
- **Plain BST:** no balance information; height anywhere between log₂ n and n, depending on insertion order.
- **AVL tree:** strict balance (height ≤ about 1.44·log₂ n), so lookups touch the fewest nodes. The price is a height or balance field per node and more rebalancing work — a delete may rotate at every level.
- **Red-black tree:** looser balance (height ≤ 2·log₂(n + 1)) but cheaper updates: at most two rotations per insert and three per delete. That is why Java's \`TreeMap\`, C++'s \`std::map\` and the Linux kernel's CPU scheduler use red-black trees.
- **B-tree:** many keys per node and every leaf at the same depth — the choice for disks and databases.

Pick an AVL tree when lookups dominate (an index built once and queried often); pick a red-black tree when inserts and deletes are frequent.
`,
      },
      {
        heading: "Common mistakes",
        body: `
- **Updating heights in the wrong order after a rotation.** Recompute the node that moved down (z) before the node that moved up (y), because y's height depends on z's.
- **Choosing a double rotation when the taller child is even.** After a delete, the taller child can have balance factor 0; a single rotation is correct then.
- **Stopping too early after a delete.** An insert needs at most one single or double rotation, but a delete can need one at every level up to the root.
- **Forgetting to reconnect the rotated subtree** to its parent, or to update the root pointer when the root itself rotates.
`,
      },
    ],
    complexity: [
      { label: "Search", time: "O(log n)", space: "O(1)", note: "The ordinary BST walk on a tree of height ≤ 1.44·log₂(n + 2)." },
      { label: "Insert", time: "O(log n)", space: "O(log n)", note: "Walk down, attach a leaf, retrace up; at most one single or double rotation." },
      { label: "Delete", time: "O(log n)", space: "O(log n)", note: "Walk down (plus the successor), retrace up; a rotation may be needed at each level." },
      { label: "One rotation", time: "O(1)", space: "O(1)", note: "Three pointer changes and two height updates." },
      { label: "Build from n keys", time: "O(n log n)", space: "O(n)", note: "n inserts, each O(log n) whatever the input order." },
    ],
    code: { language: "python", source: AVL_CODE },
    faqs: [
      {
        q: "What is the balance factor in an AVL tree?",
        a: "The height of a node's left subtree minus the height of its right subtree. An AVL tree keeps it at −1, 0 or +1 for every node; a value of +2 or −2 triggers a rotation.",
      },
      {
        q: "How many rotations does AVL insertion need?",
        a: "At most one single or one double rotation. The rotated subtree gets back exactly the height it had before the insert, so no ancestor can be out of balance afterwards.",
      },
      {
        q: "How many rotations can an AVL deletion need?",
        a: "Up to O(log n) — possibly one at every level on the way back to the root, because fixing one node can make its subtree shorter and unbalance the parent.",
      },
      {
        q: "What is the maximum height of an AVL tree with n nodes?",
        a: "About 1.44·log₂(n + 2). The sparsest AVL trees are the Fibonacci trees, whose sizes grow like the Fibonacci numbers.",
      },
      {
        q: "Is an AVL tree better than a red-black tree?",
        a: "For lookups, usually yes: it is more strictly balanced, so paths are shorter. Red-black trees do less rotating on inserts and deletes, which is why most standard libraries use them for general-purpose sorted maps.",
      },
      {
        q: "Why is it called an AVL tree?",
        a: "It is named after its inventors, Georgy Adelson-Velsky and Evgenii Landis, who published it in 1962. It was the first self-balancing binary search tree.",
      },
    ],
    related: ["/avl-tree/rotations", "/bst", "/bst/bst-deletion", "/bst/tree-traversals", "/btree"],
    updated: UPDATED,
  },

  // ───────────────────────────── AVL rotations ─────────────────────────────
  {
    path: "/avl-tree/rotations",
    parent: "/avl-tree",
    name: "AVL Rotations",
    title: "AVL Tree Rotations — LL, RR, LR and RL Cases",
    h1: "AVL Rotations — LL, RR, LR, RL",
    description:
      "AVL tree rotations explained: spot the LL, RR, LR and RL cases from balance factors and fix each with a single or double rotation — animated step by step.",
    keywords: [
      "avl tree rotation",
      "ll rr lr rl rotation",
      "left rotation",
      "right rotation",
      "double rotation avl",
      "left right rotation",
    ],
    question: "What are AVL tree rotations?",
    summary:
      "An **AVL rotation** is a constant-time pointer change that lifts a child above its parent while keeping every key in the same sorted (in-order) position. When a node's balance factor reaches ±2, the straight-line **LL** and **RR** cases are fixed with one rotation — right and left respectively — and the zig-zag **LR** and **RL** cases with a **double rotation**: first at the child, then at the unbalanced node.",
    steps: [
      "Find the lowest unbalanced node z on the way back up (balance factor +2 or −2).",
      "Let y be z's taller child: bf(z) = +2 means the left side is taller (case L…), −2 the right side (case R…).",
      "Look at y: leaning the same way as z (or even, after a delete) gives **LL** or **RR**; leaning the opposite way gives **LR** or **RL**.",
      "**LL:** rotate right at z. **RR:** rotate left at z.",
      "**LR:** rotate left at y, then right at z. **RL:** rotate right at y, then left at z.",
      "Recompute the heights of the moved nodes (the lower one first) and attach the new subtree root to z's old parent.",
    ],
    sections: [
      {
        heading: "Anatomy of a single rotation",
        body: `
Take a **right rotation** at z, whose left child is y. Three subtrees hang off the pair: T1 (y's left), T2 (y's right) and T3 (z's right). In sorted order they read T1 < y < T2 < z < T3. After the rotation y is on top, z is y's right child, T1 stays under y, T3 stays under z — and **T2 changes parents**, becoming z's left child. The sorted order T1 < y < T2 < z < T3 is untouched, so the tree is still a valid BST; only the heights changed.

That is the entire operation: three pointers change (z.left, y.right and the parent's link to the subtree) and two heights are recomputed, z first because it is now below y. A **left rotation** is the mirror image. In the visualizer z is drawn red, the pivot y amber and T2 purple; T2's old link is cut before the nodes swing into place, so you can see exactly what moves.
`,
      },
      {
        heading: "The four cases, with real numbers",
        body: `
- **LL** — start from 50, 30, 70, 20, 40 and insert 10. Node 50 gets bf +2 and its left child 30 leans left, a straight line. One right rotation at 50 lifts 30 to the root with 20 and 50 as children; 40 (T2) moves from 30's right to 50's left.
- **RR** — start from 30, 20, 50, 40, 60 and insert 70. Node 30 gets bf −2 and 50 leans right. One left rotation at 30 lifts 50 to the root; 40 moves across to become 30's right child.
- **LR** — start from 50, 30, 70, 20, 40 and insert 35. Node 50 is left-heavy (+2) but its left child 30 leans right (−1): a zig-zag. A left rotation at 30 lifts 40 and turns the bend into a straight line; a right rotation at 50 then lifts 40 to the top. Result: 40 at the root, 30 (with 20 and 35) on the left, 50 (with 70) on the right.
- **RL** — start from 30, 20, 60, 50, 70 and insert 55. A right rotation at 60, then a left rotation at 30, leave 50 at the root, 30 (with 20) on the left and 60 (with 55 and 70) on the right.

This page opens on the LR example; the **Rotation demos** picker plays all four, plus a deletion that triggers a rotation.
`,
      },
      {
        heading: "How to tell which case you are in",
        body: `
Read two balance factors: the unbalanced node z and its taller child y.

- bf(z) = +2 and bf(y) ≥ 0 → **LL** → rotate right at z.
- bf(z) = −2 and bf(y) ≤ 0 → **RR** → rotate left at z.
- bf(z) = +2 and bf(y) = −1 → **LR** → rotate left at y, then right at z.
- bf(z) = −2 and bf(y) = +1 → **RL** → rotate right at y, then left at z.

The names describe the path from z to the too-tall grandchild: left then left, right then right, and so on. Memory aid: a straight line needs one rotation; a zig-zag needs two, and the first one straightens it. Be careful with naming conventions — some books label the cases by the rotation that fixes them (an LL imbalance is fixed by a "right rotation", sometimes called an R rotation), so check which one a question uses.
`,
      },
      {
        heading: "Why the zig-zag needs a double rotation",
        body: `
In the LR case the extra height sits in the **middle** subtree: the right child of z's left child. A single right rotation at z would hand that middle subtree over to z without lifting it, so the tree would simply lean the other way with balance factor −2. The first rotation, at y, moves the heavy grandchild x up into y's place and turns the zig-zag into a straight line; the second rotation, at z, lifts x to the top with y and z as its children.

So a double rotation always makes the **grandchild** the new subtree root — the middle key of the three. In the LR example, 40 sits between 30 and 50, and 40 ends up on top. Goodrich and Tamassia describe all four cases this way, as a single "trinode restructuring" of x, y and z.
`,
      },
      {
        heading: "Rotations after insertion vs after deletion",
        body: `
After an **insertion**, the first unbalanced node met on the way up is fixed with one single or double rotation, and the subtree gets back exactly its pre-insert height — so nothing above it can be unbalanced and the walk stops.

A **deletion** is different. The repaired subtree can end up one level shorter than before, which may unbalance its parent, and so on: a delete can rotate at every level, O(log n) rotations of O(1) each. Deletion also creates the case where the taller child is perfectly even (bf 0), which a single rotation handles. The **Delete** demo shows it: removing 40 from 30, 20, 40, 10, 25 leaves 30 left-heavy with an even left child 20, and one right rotation lifts 20 to the top.
`,
      },
      {
        heading: "Rotations beyond AVL trees",
        body: `
The same two primitives power most balanced trees. **Red-black trees** rotate (at most twice per insert, three times per delete) alongside recolouring; **splay trees** rotate each accessed key up to the root; **treaps** rotate to restore heap order on random priorities. And because a rotation keeps the in-order sequence intact, any per-node summary that can be recomputed from the two children — height, subtree size, sum, maximum — survives a rotation with an O(1) update, which is what order-statistic and interval trees rely on.
`,
      },
    ],
    complexity: [
      { label: "Single rotation", time: "O(1)", space: "O(1)", note: "Three pointer changes and two height updates." },
      { label: "Double rotation", time: "O(1)", space: "O(1)", note: "Two single rotations." },
      { label: "Rotations per insert", time: "O(1)", space: "O(1)", note: "At most one single or double rotation; the subtree regains its old height." },
      { label: "Rotations per delete", time: "O(log n)", space: "O(1)", note: "Up to one per level, because a fix can shorten the subtree." },
      { label: "Retrace (find z)", time: "O(log n)", space: "O(log n)", note: "Recompute height and balance factor at each ancestor on the path." },
    ],
    code: { language: "python", source: ROTATION_CODE },
    faqs: [
      {
        q: "What is the difference between LL and LR rotation?",
        a: "LL is a straight-line imbalance — the left child of a left child is too tall — fixed by one right rotation. LR is a zig-zag — the right child of a left child is too tall — fixed by a left rotation at the child followed by a right rotation at the unbalanced node.",
      },
      {
        q: "Does a rotation break the binary search tree property?",
        a: "No. A rotation only changes which node is the parent of which; the in-order sequence of keys stays exactly the same, so the tree remains a valid BST.",
      },
      {
        q: "How do I know whether to use a single or a double rotation?",
        a: "Compare the balance factors of the unbalanced node and its taller child. Same sign, or a child with balance 0, means a single rotation; opposite signs mean a double rotation.",
      },
      {
        q: "What is the time complexity of an AVL rotation?",
        a: "O(1). A rotation changes three pointers and recomputes two heights, no matter how large the subtrees involved are.",
      },
      {
        q: "Why is it called a left rotation if the node moves down?",
        a: "The name describes how the link turns: in a left rotation the right child moves up and to the left, and its old parent moves down to the left. A right rotation is the mirror image.",
      },
      {
        q: "Which node becomes the root after a double rotation?",
        a: "The grandchild — the middle key of the three nodes involved. Inserting 35 into the tree 50, 30, 70, 20, 40 makes 40, which lies between 30 and 50, the new root.",
      },
    ],
    related: ["/avl-tree", "/bst", "/bst/bst-deletion", "/bst/tree-traversals", "/btree/insertion"],
    updated: UPDATED,
  },

  // ───────────────────────────── B-tree (hub) ─────────────────────────────
  {
    path: "/btree",
    name: "B-Tree",
    title: "B-Tree Visualizer — Insertion, Deletion and Search",
    h1: "B-Tree Visualizer",
    description:
      "B-tree visualizer: insert, search and delete keys in a B-tree of order 3 to 7, watch nodes split, borrow and merge, and see why databases are built on B-trees.",
    keywords: [
      "b-tree visualizer",
      "b-tree",
      "b tree data structure",
      "b-tree order",
      "b-tree vs binary search tree",
      "b-tree database index",
      "b+ tree",
    ],
    question: "What is a B-tree?",
    summary:
      "A **B-tree** is a self-balancing search tree whose nodes hold many sorted keys and have one more child than they have keys. In a B-tree of order m, every node holds at most **m − 1 keys**, every node except the root at least **⌈m/2⌉ − 1**, and all leaves sit on the same level. Wide nodes keep the tree shallow, so search, insert and delete take **O(log n)** time while reading only a handful of nodes — ideal for disks, databases and file systems.",
    steps: [
      "**Search:** in each node, find the first key ≥ the target. Equal means found; otherwise follow the child pointer just left of that key. Reaching a leaf without it means the key is absent.",
      "**Insert:** search down to the leaf where the key belongs and add it in sorted position.",
      "If the leaf now has m keys, **split** it: the middle key moves up into the parent and the two halves become siblings.",
      "A split can overflow the parent and repeat upwards; splitting the root creates a new root — the only way a B-tree grows taller.",
      "**Delete:** remove the key from its leaf, or replace an internal key with its predecessor or successor from a leaf.",
      "If a node drops below the minimum, **borrow** a key from a sibling through the parent or **merge** with a sibling; merges can shrink the tree at the root.",
    ],
    sections: [
      {
        heading: "The rules of an order-m B-tree",
        body: `
- Every node holds at most **m − 1** keys and has at most **m** children.
- Every node except the root holds at least **⌈m/2⌉ − 1** keys (so an internal node has at least ⌈m/2⌉ children). The root may hold a single key.
- Keys inside a node are sorted, and an internal node with k keys has exactly k + 1 children: child i holds the keys that fall between key i − 1 and key i.
- All leaves are on the same level, so the tree is perfectly height-balanced at all times.

With m = 3 every internal node has 2 or 3 children — a **2-3 tree**; with m = 4 it has 2 to 4 — a **2-3-4 tree**. Beware the second convention: CLRS describes B-trees by their **minimum degree t**, with t − 1 to 2t − 1 keys per node, so minimum degree t means order 2t. The visualizer lets you switch the order between 3 and 7 and rebuilds the same keys.
`,
      },
      {
        heading: "Why B-trees exist: the cost of a page read",
        body: `
Disks and SSDs read data in **pages** of a few kilobytes: fetching one byte costs as much as fetching the whole page, and a random page read is orders of magnitude slower than comparing keys in memory. A binary search tree over a billion keys is about 30 levels deep, so a lookup could mean 30 page reads.

A B-tree packs hundreds of keys into each node — one node per page. With a fan-out of a few hundred, a billion keys fit in about **four levels**, and the top levels usually stay cached in memory, so a lookup costs one or two actual reads. That is why B-trees and their variant, the **B+ tree**, are the standard index of relational databases (PostgreSQL, MySQL's InnoDB, SQLite, Oracle, SQL Server) and of file systems such as NTFS, HFS+, APFS, Btrfs and XFS.
`,
      },
      {
        heading: "Worked example: search and a split",
        body: `
The page opens on an order-3 tree (at most 2 keys per node) built by inserting 40, 20, 60, 10, 30, 50, 70, 5, 15, 25, 35, 45, 55, 65, 75: fifteen keys, four levels, every node holding a single key.

Searching for **55** reads [40] → [60] → [50] → [55] — four nodes, one per level. Now insert **36** and then **37**. 36 joins the leaf [35], which has room for a second key: [35, 36]. 37 makes it [35, 36, 37] — one key too many — so the leaf splits: its median 36 moves up into the parent [30], which becomes [30, 36], and the leaf becomes [35] and [37]. The Learn panel's **Insert and split** step replays exactly this; try order 5 afterwards to see the same keys fit in fewer, wider nodes.
`,
      },
      {
        heading: "B-tree vs binary search tree vs AVL tree",
        body: `
- **Keys per node:** a BST or AVL node holds one key and two children; a B-tree node holds up to m − 1 keys and m children.
- **Balance:** a plain BST can degenerate to height n; an AVL tree keeps its height below about 1.44·log₂ n with rotations; a B-tree keeps every leaf at exactly the same depth by splitting and merging, with about log⌈m/2⌉ n levels.
- **Work per node:** a B-tree does more comparisons inside each node (a linear or binary search over its keys) but visits far fewer nodes — the right trade when visiting a node means a disk read, and still competitive in memory thanks to CPU caches.
- **Growth:** BSTs and AVL trees grow at the leaves; a B-tree grows at the **root**, which is exactly why its leaves always stay level.
`,
      },
      {
        heading: "B-tree vs B+ tree",
        body: `
In a classic B-tree, keys (and their records) live in internal nodes as well as leaves, and each key appears once. A **B+ tree** keeps all records in the leaves, stores only copies of keys in the internal nodes for routing, and links the leaves into a list. Internal nodes therefore hold more keys — a higher fan-out and a shallower tree — and a range scan just walks along the leaf chain. That is why nearly every database index is really a B+ tree. The ideas animated here — split on overflow, borrow or merge on underflow — carry over unchanged.
`,
      },
    ],
    complexity: [
      { label: "Search", time: "O(log n)", space: "O(1)", note: "One node per level; at most log⌈m/2⌉((n + 1)/2) + 1 levels, plus a search inside each node." },
      { label: "Insert", time: "O(log n)", space: "O(log n)", note: "Walk down to a leaf, then at most one split per level on the way back up." },
      { label: "Delete", time: "O(log n)", space: "O(log n)", note: "Walk down, then at most one borrow or merge per level." },
      { label: "Disk reads per operation", time: "O(logₘ n)", space: "—", note: "What matters on disk: with m in the hundreds, three or four page reads." },
      { label: "Storage", time: "—", space: "O(n)", note: "Every non-root node is at least about half full." },
    ],
    code: { language: "python", source: BTREE_CODE },
    faqs: [
      {
        q: "What is the order of a B-tree?",
        a: "The order m is the maximum number of children a node may have, so a node holds at most m − 1 keys, and every non-root node at least ⌈m/2⌉ − 1. Some books use the minimum degree t instead, with t − 1 to 2t − 1 keys per node.",
      },
      {
        q: "Why do databases use B-trees instead of binary search trees?",
        a: "Data on disk is read in whole pages. A B-tree node fills a page with hundreds of keys, so a lookup among billions of rows reads only three or four pages, while a binary tree would need about log₂ n reads.",
      },
      {
        q: "What is the difference between a B-tree and a B+ tree?",
        a: "A B-tree stores keys and data in all nodes. A B+ tree keeps the data only in the leaves, uses internal nodes purely for routing and links the leaves together, which gives a higher fan-out and fast range scans.",
      },
      {
        q: "Is a B-tree a binary tree?",
        a: "No — a B-tree node can have many children, and the B does not stand for binary. Its inventors, Rudolf Bayer and Edward McCreight at Boeing Research Labs (1970), never settled what it stands for; Boeing, balanced, broad and Bayer have all been suggested.",
      },
      {
        q: "How does a B-tree stay balanced?",
        a: "It only grows or shrinks at the root. A full node splits and pushes its middle key up, and a root split creates a new root above it; deletions borrow or merge, and an empty root hands over to its only child. Every leaf therefore stays at the same depth.",
      },
      {
        q: "What is the height of a B-tree?",
        a: "With n keys and minimum degree t = ⌈m/2⌉, the height counted in edges is at most log_t((n + 1)/2). Even for billions of keys, a large order keeps the tree only a few levels deep.",
      },
    ],
    related: ["/btree/insertion", "/btree/deletion", "/bst", "/avl-tree", "/avl-tree/rotations"],
    updated: UPDATED,
  },

  // ───────────────────────────── B-tree insertion ─────────────────────────────
  {
    path: "/btree/insertion",
    parent: "/btree",
    name: "B-Tree Insertion",
    title: "B-Tree Insertion — Node Splitting Step by Step",
    h1: "B-Tree Insertion & Splitting",
    description:
      "B-tree insertion step by step: find the leaf, insert in sorted order, split a full node around its median and push it up — even to a new root. Animated.",
    keywords: [
      "b-tree insertion",
      "b tree insertion example",
      "b-tree split",
      "b-tree node splitting",
      "insert into b tree",
      "b-tree insertion order 3",
    ],
    question: "How does insertion work in a B-tree?",
    summary:
      "To insert a key into a B-tree, search down to the leaf where it belongs and add it in sorted order. If the leaf now holds **m keys** — one more than order m allows — it **splits**: the median key moves up into the parent and the keys on either side become two separate nodes. If that overflows the parent, the split repeats upwards; splitting the root creates a new root, the only way a B-tree gets taller.",
    steps: [
      "If the tree is empty, the key becomes a root that is also a leaf.",
      "Walk down from the root: in each node, follow the child between the two keys that surround the new key. If the key is already there, stop.",
      "Insert the key into the leaf, keeping its keys sorted.",
      "While a node has m keys: take its median, move the keys after the median (and their children) into a new right sibling, and keep the keys before it.",
      "Insert the median into the parent, with a pointer to the new right sibling just after it, and check the parent next.",
      "If the node that split was the root, create a new root holding just the median, with the two halves as its children.",
    ],
    sections: [
      {
        heading: "Worked example: three inserts, three outcomes",
        body: `
This page opens on an order-3 tree (at most 2 keys per node): root [40, 70]; below it [20], [55] and [85, 95]; and the leaves [10], [30], [50], [60, 65], [80], [90], [97, 99].

- **Insert 25 — no split.** 25 < 40 leads to [20], and 25 > 20 to the leaf [30]. The leaf has room, so it becomes [25, 30]. Most inserts end exactly like this.
- **Insert 62 — one split.** The walk goes 40 < 62 < 70 into [55], then right into [60, 65]. The leaf becomes [60, 62, 65] — one key too many. Its median 62 moves up into [55], which becomes [55, 62], and the leaf splits into [60] and [65].
- **Insert 98 — splits all the way up.** [97, 99] becomes [97, 98, 99]: 98 moves up into [85, 95], which becomes [85, 95, 98] and splits as well, sending 95 up into the root. The root [40, 70, 95] overflows too, so it splits and 70 becomes a brand-new root with [40] and [95] below it. The tree grew from three levels to four — and every leaf is still on the same level.

Run each case with the **Insert cases** buttons above; step mode pauses after every phase.
`,
      },
      {
        heading: "Why the median moves up",
        body: `
Splitting around the median gives two halves of (almost) equal size, each with at least ⌈m/2⌉ − 1 keys — exactly the minimum a non-root node needs, so both new nodes are legal. The median itself is larger than everything in the left half and smaller than everything in the right half, so in the parent it becomes the separator between the two new children and the search rule keeps working. For odd m the halves are equal; for even m one half gets an extra key — this visualizer keeps it on the left.
`,
      },
      {
        heading: "Bottom-up vs top-down splitting",
        body: `
The algorithm animated here is **bottom-up**: insert into the leaf first, then split on the way back up for as long as nodes overflow. It remembers the path (or uses parent pointers) and only ever splits when it has to.

CLRS presents a **top-down, single-pass** version instead: on the way down, any node that is already **full** (2t − 1 keys) is split before the search enters it, so there is always room for a key moving up and the algorithm never walks back. That suits concurrency and disk writes, but it sometimes splits nodes that would never have overflowed, and it relies on the maximum key count being odd. Both versions produce valid B-trees, though not always the same shape.
`,
      },
      {
        heading: "Inserting sorted keys",
        body: `
Sorted input is the worst case for a plain binary search tree, but a B-tree stays perfectly balanced: every new key lands in the rightmost leaf, which keeps splitting and pushing keys up the right edge. The price is space — each split leaves its left half at the minimum and never touches it again, so sorted inserts produce nodes that are only about half full.

Databases special-case this append pattern. When PostgreSQL splits the rightmost page of a level it leaves the left page nearly full instead of half full, and InnoDB fills pages about 15/16 full when keys arrive in order. Load the **Sorted** example (5, 10 … 80) to watch the right edge grow.
`,
      },
      {
        heading: "Common mistakes",
        body: `
- **Splitting too early.** A node may legitimately hold m − 1 keys; it splits only when an insert would give it m (or, top-down, before entering a node that is already full).
- **Forgetting the children.** When an internal node splits, the right half takes the children to the right of the median: k keys always come with k + 1 children.
- **Inserting into an internal node.** New keys always go into a leaf; keys reach internal nodes only by moving up during a split.
- **Mixing up order and minimum degree.** "Order 4" (at most 3 keys) and "minimum degree 2" (at most 3 keys) describe the same 2-3-4 tree, while "minimum degree 4" allows 7 keys per node.
`,
      },
    ],
    complexity: [
      { label: "Find the leaf", time: "O(log n)", space: "O(log n)", note: "One node per level, remembering the path for the splits." },
      { label: "Insert into the leaf", time: "O(m)", space: "O(1)", note: "Shift the larger keys one slot to the right." },
      { label: "One split", time: "O(m)", space: "O(m)", note: "Move about half of the keys (and children) to a new node." },
      { label: "Splits per insert", time: "≤ h, amortized O(1)", space: "—", note: "A cascade can reach the root, but over a run of inserts the average is below one split each." },
      { label: "Whole insert", time: "O(log n)", space: "O(log n)", note: "In disk terms O(logₘ n) page reads plus at most one write per level." },
    ],
    code: { language: "python", source: BTREE_INSERT_CODE },
    faqs: [
      {
        q: "When does a B-tree node split?",
        a: "When an insert would give it m keys, one more than the maximum of m − 1 for order m. The median key moves up into the parent and the remaining keys form two nodes.",
      },
      {
        q: "Which key moves up when a B-tree node splits?",
        a: "The median (middle) key. It becomes the separator in the parent between the two new nodes; with an even number of keys an implementation picks one of the two middle keys and sticks to it.",
      },
      {
        q: "How does a B-tree increase its height?",
        a: "Only when the root splits: the root's median becomes a new root with the two halves as its children. Because growth happens at the top, all leaves stay at the same depth.",
      },
      {
        q: "What is the time complexity of B-tree insertion?",
        a: "O(log n). The walk down visits one node per level and the splits on the way back up are at most one per level; on disk that is O(logₘ n) page reads and writes.",
      },
      {
        q: "Can one insertion cause several splits?",
        a: "Yes — up to one per level, from the leaf to the root, as inserting 98 on this page shows. Such cascades are rare: when you only insert, the average number of splits per insertion is less than one.",
      },
      {
        q: "Why does CLRS split nodes on the way down?",
        a: "CLRS's single-pass insert splits every full node it is about to enter, so a key moving up always finds room and the algorithm never has to walk back up. Bottom-up insertion splits only when a node actually overflows; both give valid B-trees.",
      },
    ],
    related: ["/btree", "/btree/deletion", "/bst", "/avl-tree", "/avl-tree/rotations"],
    updated: UPDATED,
  },

  // ───────────────────────────── B-tree deletion ─────────────────────────────
  {
    path: "/btree/deletion",
    parent: "/btree",
    name: "B-Tree Deletion",
    title: "B-Tree Deletion — Borrow and Merge Step by Step",
    h1: "B-Tree Deletion — Borrow & Merge",
    description:
      "B-tree deletion step by step: remove from a leaf or swap in the predecessor, then fix underflow by borrowing from a sibling or merging nodes. Animated.",
    keywords: [
      "b-tree deletion",
      "b tree deletion example",
      "b-tree borrow",
      "b-tree merge",
      "b-tree underflow",
      "delete from b tree",
    ],
    question: "How does deletion work in a B-tree?",
    summary:
      "To delete a key from a B-tree, remove it from its leaf — or, if it sits in an internal node, replace it with its **predecessor** or **successor** from a leaf. If a node is left with fewer than **⌈m/2⌉ − 1** keys (an **underflow**), repair it: **borrow** a key from a sibling with one to spare, rotating it through the parent, or **merge** with a sibling and the separating key. Merges can cascade upwards, and when the root loses its last key the tree gets one level shorter.",
    steps: [
      "Search for the key, remembering the path. If it is not in the tree, stop.",
      "**Key in a leaf:** remove it.",
      "**Key in an internal node:** replace it with its predecessor (largest key of the left subtree) or successor (smallest key of the right subtree). That key comes from a leaf, so the actual removal happens in a leaf.",
      "If the node still has at least the minimum number of keys, you are done.",
      "**Underflow:** if an adjacent sibling has more than the minimum, borrow — the parent's separator moves down into the node and the sibling's nearest key moves up to replace it.",
      "Otherwise **merge** the node, the separator and a sibling into one node. The parent lost a key, so check it next; if the root ends up empty, its only child becomes the new root.",
    ],
    sections: [
      {
        heading: "Worked example: borrow, merge and an internal key",
        body: `
This page opens on an order-3 tree, where every non-root node needs at least 1 key: root [40]; below it [20] and [60, 80]; and the leaves [10], [30, 35], [50], [70] and [90].

- **Delete 10 — borrow.** The leaf [10] becomes empty. Its right sibling [30, 35] has a key to spare, so the parent's separator 20 moves down into the empty leaf and the sibling's smallest key, 30, moves up to replace it: [30] now sits above [20] and [35]. A borrow is a small rotation through the parent; the parent keeps its key count, so a borrow never cascades.
- **Delete 70 — merge.** The leaf [70] becomes empty and both of its siblings, [50] and [90], are at the minimum. So it merges with its left sibling, and the separator 60 comes down between them: [50, 60]. The parent shrinks from [60, 80] to [80], which is still legal, so the repair stops there.
- **Delete 40 — an internal key.** 40 is in the root, so it cannot just disappear — its children need a separator. Its predecessor 35, the largest key of the left subtree, sits in [30, 35], which can spare it, so 35 moves up into the root and no repair is needed.

Each case is one click under **Delete cases** above.
`,
      },
      {
        heading: "Borrow or merge: how to decide",
        body: `
Look at the immediate siblings — the nodes next to the underflowing one under the same parent.

- If a sibling has **more than the minimum**, **borrow** from it (also called rotation or redistribution). For internal nodes the sibling's nearest child pointer moves across together with the key, so every node keeps one more child than keys.
- If every adjacent sibling is **at the minimum**, **merge** with one of them. The node's keys, the parent's separator and the sibling's keys always fit into one node: (⌈m/2⌉ − 2) + 1 + (⌈m/2⌉ − 1) ≤ m − 1.

Borrowing is preferred because it is local: the parent keeps its number of keys. A merge removes a key from the parent, which may then underflow in turn — that is how repairs climb towards the root, and how a B-tree loses height when the root's last key is pulled down into a merge.
`,
      },
      {
        heading: "Predecessor or successor for internal keys?",
        body: `
Either works: both are the keys right next to the deleted one in sorted order, and both always live in leaves. Choosing the side whose leaf has a spare key avoids an underflow altogether, which is what the visualizer's default **Smart** rule does (predecessor first, then successor). The **Pred** and **Succ** options force one side, so you can compare the repairs each choice causes on the same tree — delete 20 above with each rule and the outcomes differ.
`,
      },
      {
        heading: "Top-down deletion (CLRS) vs bottom-up repair",
        body: `
The visualizer deletes first and repairs on the way back up, like its insert. CLRS gives a **single-pass, top-down** algorithm instead: before it descends into a child that holds only the minimum t − 1 keys, it tops that child up — borrowing from a sibling or merging with one — so whatever happens below, the child can afford to lose a key and the algorithm never has to walk back up.

Both approaches use the same two moves, borrow and merge, and both cost O(log n); they just apply them at different moments, so the final shapes can differ. Exam answers are usually expected to follow the convention of the course textbook.
`,
      },
      {
        heading: "Common mistakes",
        body: `
- **Deleting an internal key without a replacement.** The node would end up with one key too few for its children, and two subtrees would lose their separator.
- **Borrowing from a cousin.** Only immediate siblings under the same parent share a separator key, so only they can lend.
- **Dropping child pointers.** When internal nodes borrow or merge, child pointers must move with the keys.
- **Not shrinking the tree.** When a merge empties the root, the merged child must become the new root — otherwise an empty node is left on top.
- **Applying the minimum to the root.** The root may hold a single key, and a leaf root may even become empty.
`,
      },
    ],
    complexity: [
      { label: "Find the key", time: "O(log n)", space: "O(log n)", note: "One node per level, remembering the path for the repairs." },
      { label: "Replace an internal key", time: "O(log n)", space: "O(1)", note: "Walk down to the leaf that holds the predecessor or successor." },
      { label: "Borrow", time: "O(m)", space: "O(1)", note: "Shift keys in three nodes; never cascades." },
      { label: "Merge", time: "O(m)", space: "O(1)", note: "Join two nodes and the separator; may repeat once per level." },
      { label: "Whole delete", time: "O(log n)", space: "O(log n)", note: "At most one borrow or merge per level on the way back up." },
    ],
    code: { language: "python", source: BTREE_DELETE_CODE },
    faqs: [
      {
        q: "What is underflow in a B-tree?",
        a: "A non-root node has underflowed when it holds fewer than the minimum ⌈m/2⌉ − 1 keys (t − 1 in the minimum-degree convention). Deletion repairs it by borrowing from a sibling or merging with one.",
      },
      {
        q: "When do you merge nodes in B-tree deletion?",
        a: "When the underflowing node's adjacent siblings are all at the minimum, so none can lend a key. The node, one sibling and the separator key from the parent combine into a single node.",
      },
      {
        q: "What does borrowing from a sibling mean in a B-tree?",
        a: "A sibling with a spare key lends it through the parent: the parent's separator moves down into the underflowing node and the sibling's closest key moves up to become the new separator.",
      },
      {
        q: "How do you delete a key from an internal node of a B-tree?",
        a: "Replace it with its in-order predecessor or successor, which is always in a leaf, then remove that key from the leaf and repair any underflow there.",
      },
      {
        q: "How does a B-tree's height decrease?",
        a: "Only at the root: when a merge pulls the root's last key down, the root becomes empty and its single child takes over as the new root. All leaves move up together, so they stay on one level.",
      },
      {
        q: "What is the time complexity of B-tree deletion?",
        a: "O(log n). The search visits one node per level, and the repairs perform at most one borrow or merge per level on the way back up.",
      },
    ],
    related: ["/btree", "/btree/insertion", "/bst/bst-deletion", "/avl-tree", "/bst"],
    updated: UPDATED,
  },
];
