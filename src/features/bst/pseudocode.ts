/**
 * Pseudocode listings + the line numbers the engines highlight.
 *
 * The AVL insert / delete listings start with exactly the BST lines (same numbering) and then
 * append the retrace loop, so the shared walk-down code in BSTEngine can use one set of line
 * numbers for both trees.
 */
import type { TraversalKind } from "./model/types";

export type CodeId =
  | "bst-insert"
  | "avl-insert"
  | "search"
  | "bst-delete"
  | "avl-delete"
  | TraversalKind
  | "rebalance"
  | "rotateLeft"
  | "rotateRight";

const INSERT = [
  "insert(root, key):",
  "  if root = null: root ← Node(key)",
  "  cur ← root",
  "  while cur ≠ null:",
  "    if key = cur.key: return  // dup",
  "    parent ← cur",
  "    if key < cur.key: cur ← cur.left",
  "    else: cur ← cur.right",
  "  if key < parent.key:",
  "    parent.left ← Node(key)",
  "  else: parent.right ← Node(key)",
];

const RETRACE = (from: string) => [
  `  for n ← ${from} … root:`,
  "    hL, hR ← h(n.left), h(n.right)",
  "    n.height ← 1 + max(hL, hR)",
  "    n.bf ← hL − hR",
  "    if |n.bf| > 1: n ← rebalance(n)",
  "    if height unchanged: break",
];

const DELETE = [
  "delete(root, key):",
  "  z ← search(root, key)",
  "  if z = null: return       // absent",
  "  if z has no children:     // case 1",
  "    unlink z from its parent",
  "  else if z has one child:  // case 2",
  "    child ← z's only child",
  "    put child in z's place",
  "  else:                     // case 3",
  "    s ← z.right",
  "    while s.left ≠ null: s ← s.left",
  "    if s ≠ z.right:",
  "      put s.right in s's place",
  "      s.right ← z.right",
  "    s.left ← z.left",
  "    put s in z's place",
];

const rec = (name: string, order: ("left" | "visit" | "right")[]) => [
  `${name}(node):`,
  "  if node = null: return",
  ...order.map((o) => (o === "visit" ? "  visit(node)       // output key" : `  ${name}(node.${o})`)),
];

export const CODE: Record<CodeId, { title: string; lines: readonly string[] }> = {
  "bst-insert": { title: "BST insert", lines: INSERT },
  "avl-insert": { title: "AVL insert", lines: [...INSERT, ...RETRACE("parent")] },
  search: {
    title: "Search",
    lines: [
      "search(root, key):",
      "  cur ← root",
      "  while cur ≠ null:",
      "    if key = cur.key: return cur",
      "    if key < cur.key: cur ← cur.left",
      "    else: cur ← cur.right",
      "  return null       // fell off",
    ],
  },
  "bst-delete": { title: "BST delete", lines: DELETE },
  "avl-delete": { title: "AVL delete", lines: [...DELETE, ...RETRACE("lowest changed")] },
  preorder: { title: "Pre-order traversal", lines: rec("preorder", ["visit", "left", "right"]) },
  inorder: { title: "In-order traversal", lines: rec("inorder", ["left", "visit", "right"]) },
  postorder: { title: "Post-order traversal", lines: rec("postorder", ["left", "right", "visit"]) },
  levelorder: {
    title: "Level-order traversal",
    lines: [
      "levelOrder(root):",
      "  q ← queue containing root",
      "  while q is not empty:",
      "    node ← q.dequeue()",
      "    visit(node)    // output key",
      "    if node.left: q.enqueue(node.left)",
      "    if node.right: q.enqueue(node.right)",
    ],
  },
  rebalance: {
    title: "rebalance(z)",
    lines: [
      "rebalance(z):",
      "  if bf(z) > 1:          // left-heavy",
      "    if bf(z.left) < 0:   // LR zig-zag",
      "      z.left ← rotateLeft(z.left)",
      "    return rotateRight(z)  // LL",
      "  if bf(z) < −1:         // right-heavy",
      "    if bf(z.right) > 0:  // RL zig-zag",
      "      z.right ← rotateRight(z.right)",
      "    return rotateLeft(z)   // RR",
      "  return z               // balanced",
    ],
  },
  rotateRight: {
    title: "rotateRight(z)",
    lines: [
      "rotateRight(z):",
      "  y ← z.left         // pivot",
      "  T2 ← y.right       // moves over",
      "  y.right ← z        // z goes down",
      "  z.left ← T2",
      "  update(z); update(y)  // z first",
      "  return y           // new subtree root",
    ],
  },
  rotateLeft: {
    title: "rotateLeft(z)",
    lines: [
      "rotateLeft(z):",
      "  y ← z.right        // pivot",
      "  T2 ← y.left        // moves over",
      "  y.left ← z         // z goes down",
      "  z.right ← T2",
      "  update(z); update(y)  // z first",
      "  return y           // new subtree root",
    ],
  },
};

/** Line numbers (1-based) used by the engines. */
export const LN = {
  insert: { head: 1, empty: 2, start: 3, loop: 4, dup: 5, parent: 6, left: 7, right: 8, attachLeft: [9, 10], attachRight: [9, 11] },
  search: { head: 1, start: 2, loop: 3, found: 4, left: 5, right: 6, missing: 7 },
  delete: {
    head: 1, search: 2, missing: 3, leaf: 4, unlinkLeaf: 5, one: 6, child: 7, replaceChild: 8, two: 9,
    succStart: 10, succLoop: 11, notDirect: 12, spliceS: 13, sRight: 14, sLeft: 15, replaceZ: 16,
  },
  /** Retrace block appended to the AVL listings: insert lines 12–17, delete lines 17–22. */
  retrace: {
    insert: { loop: 12, heights: 13, height: 14, bf: 15, rebalance: 16, stop: 17 },
    delete: { loop: 17, heights: 18, height: 19, bf: 20, rebalance: 21, stop: 22 },
  },
  /** Recursive traversals: [left call, visit, right call] line per kind. */
  traversal: {
    preorder: { check: 2, visit: 3, left: 4, right: 5 },
    inorder: { check: 2, left: 3, visit: 4, right: 5 },
    postorder: { check: 2, left: 3, right: 4, visit: 5 },
  },
  level: { init: 2, loop: 3, dequeue: 4, visit: 5, left: 6, right: 7 },
  rebalance: { head: 1, leftHeavy: 2, lr: 3, lrRotate: 4, ll: 5, rightHeavy: 6, rl: 7, rlRotate: 8, rr: 9, ok: 10 },
  rotate: { head: 1, pivot: 2, t2: 3, link: 4, hang: 5, update: 6, ret: 7 },
} as const;

export type RetraceLines = Record<keyof (typeof LN.retrace)["insert"], number>;
