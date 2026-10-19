/**
 * Guided lessons (VisuAlgo e-Lecture style) for the BST and AVL pages. "Try it" buttons name
 * actions the page components register (see BSTVisualizer / AVLVisualizer).
 */
import type { Lesson } from "@/lib/lesson";

export const BST_LESSON: Lesson = {
  id: "bst",
  title: "Binary search trees",
  slides: [
    {
      title: "Binary search, as a tree",
      body: "Every key in a node's **left** subtree is smaller, every key in its **right** subtree is larger. So each comparison rules out a whole subtree — just like guessing a number with higher / lower hints.",
      tryIt: [
        { label: "Search for 45", action: "searchHit" },
        { label: "Search for 55 (missing)", action: "searchMiss" },
      ],
    },
    {
      title: "Insert",
      body: "Walk down exactly like a search until you fall off the tree. The new key becomes a **leaf** in that empty spot — no existing node moves.",
      tryIt: [
        { label: "Insert 42", action: "insert42" },
        { label: "Insert 5, 65, 85", action: "insertMany" },
      ],
    },
    {
      title: "Worked example",
      body: "Insert `50, 30, 70, 20, 40`: 50 is the root, 30 goes left, 70 goes right. 20 lands left of 30 and 40 right of 30. The insertion order alone decides the shape.",
      tryIt: [{ label: "Build 50, 30, 70, 20, 40", action: "worked" }],
    },
    {
      title: "Delete: three cases",
      body: "**Leaf:** cut it off. **One child:** the child moves up into the gap. **Two children:** the **in-order successor** (smallest key on the right) takes its place.",
      tryIt: [
        { label: "Delete a leaf (20)", action: "delLeaf" },
        { label: "Delete 80 (one child)", action: "delOne" },
        { label: "Delete 30 (two children)", action: "delTwo" },
      ],
    },
    {
      title: "Traversals",
      body: "**In-order** (left, node, right) lists a BST in sorted order. **Pre-order** visits a node before its children — handy for copying a tree. **Post-order** finishes the children first; **level-order** goes row by row with a queue.",
      tryIt: [
        { label: "Run in-order", action: "inorder" },
        { label: "Run pre-order", action: "preorder" },
        { label: "Run level-order", action: "levelorder" },
      ],
    },
    {
      title: "Cost is the height",
      body: "Each operation walks one root-to-leaf path, so it costs **O(h)**. Random keys give h ≈ log₂ n, but sorted input builds a **linked list** with h = n.",
      tryIt: [
        { label: "Insert 1…7 in order and watch it degenerate", action: "degenerate" },
        { label: "Search 70 in a sorted chain", action: "searchChain" },
      ],
    },
    {
      title: "Interview tips",
      body: "Validate a BST with **min / max bounds**, not just parent–child checks. In-order with a counter finds the k-th smallest key. Deleting the root still just uses its successor.",
      tryIt: [{ label: "Delete the root (50)", action: "delRoot" }],
    },
    {
      title: "In the real world",
      body: "Balanced BSTs power `std::map`, Java's `TreeMap` and ordered sets; databases index with their wide cousin, the B-tree. Press **Ctrl+Z** any time to undo an operation.",
      tryIt: [{ label: "Random tree", action: "random" }],
    },
  ],
};

export const AVL_LESSON: Lesson = {
  id: "avl",
  title: "AVL trees",
  slides: [
    {
      title: "Why balance?",
      body: "A plain BST fed sorted keys becomes a list, and search drops to O(n). An AVL tree checks every node after each change and **rotates** to stay short.",
      tryIt: [{ label: "Insert the same sorted keys into AVL", action: "sorted" }],
    },
    {
      title: "Height and balance factor",
      body: "A node's **height** counts the nodes on its longest path down (a leaf is 1). Its **balance factor** is h(left) − h(right). The AVL rule: every balance factor is −1, 0 or +1.",
      tryIt: [{ label: "Show heights & balance", action: "showMeta" }],
    },
    {
      title: "Single rotations",
      body: "If the heavy side is a straight line (**LL** or **RR**), one rotation fixes it. The middle key rises, the top key drops, and the middle subtree **T2** changes parent — the sorted order never changes.",
      tryIt: [
        { label: "Play the LL case", action: "LL" },
        { label: "Play the RR case", action: "RR" },
      ],
    },
    {
      title: "Double rotations",
      body: "A zig-zag (**LR** or **RL**) needs two. First rotate the child to straighten the bend, then rotate the unbalanced node — the grandchild ends up on top.",
      tryIt: [
        { label: "Play the LR case", action: "LR" },
        { label: "Play the RL case", action: "RL" },
      ],
    },
    {
      title: "Insert, step by step",
      body: "Insert like a BST, then walk back up updating heights. The lowest node outside −1…+1 gets one single or double rotation, and its subtree is as tall as before — done.",
      tryIt: [{ label: "Insert 50, 10, 45, 15, 40, 20, 35", action: "zigzag" }],
    },
    {
      title: "Delete",
      body: "Delete like a BST (leaf, one child, or successor), then retrace upward. Unlike insert, a delete may need rotations at **several** levels.",
      tryIt: [
        { label: "Play delete → rotation", action: "DEL" },
        { label: "Delete the root (50)", action: "delRoot" },
      ],
    },
    {
      title: "Cost, and why",
      body: "The height stays ≤ 1.44·log₂(n + 2), so search, insert and delete are all **O(log n)**. A rotation only relinks three pointers: O(1).",
      tryIt: [{ label: "Insert 1…15 in order", action: "sorted15" }],
    },
    {
      title: "Interview tips & real life",
      body: "Name the case by the signs of bf(z) and bf(child): same sign → single, opposite → double. Red-black trees (`std::map`, `TreeMap`) rotate less; AVL trees are shorter, so lookups are a bit faster.",
      tryIt: [{ label: "Random tree", action: "random" }],
    },
  ],
};
