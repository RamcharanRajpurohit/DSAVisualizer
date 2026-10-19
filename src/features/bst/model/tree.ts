/**
 * Pure binary-search-tree / AVL helpers. No React, no Konva, relative imports only, so the
 * fuzz test can run this file directly with `tsx`.
 *
 * The animated engines (engine/BSTEngine.ts, engine/AVLEngine.ts) perform their data changes
 * through the same primitives exported here (replaceChild, rotate, classify, successorOf,
 * promoteSuccessor, update). `insertKey` / `deleteKey` / `retraceSilent` replay exactly the
 * engines' sequence of data steps without animation, which is what the fuzz test checks.
 */
import type { NodeFactory, RotationCase, Side, TraversalKind, TreeNode, TreeStats } from "./types";

export const hOf = (n: TreeNode | null): number => (n ? n.h : 0);

/** Recompute a node's stored height and balance factor from its children's stored heights. */
export function update(n: TreeNode): void {
  const hl = hOf(n.left);
  const hr = hOf(n.right);
  n.h = 1 + Math.max(hl, hr);
  n.bf = hl - hr;
}

/** "+2", "0", "−1" — with a real minus sign so it reads well in badges. */
export const fmtBf = (bf: number): string => (bf > 0 ? `+${bf}` : bf < 0 ? `−${-bf}` : "0");

export function nodeFactory(prefix = "n"): NodeFactory {
  let uid = 0;
  return (key) => ({ id: `${prefix}${++uid}`, key, left: null, right: null, h: 1, bf: 0 });
}

export const other = (side: Side): Side => (side === "left" ? "right" : "left");

/**
 * Put `neu` where `old` hangs under `parent` (or make it the root when parent is null).
 * Returns the (possibly new) root.
 */
export function replaceChild(root: TreeNode | null, parent: TreeNode | null, old: TreeNode, neu: TreeNode | null): TreeNode | null {
  if (!parent) return neu;
  if (parent.left === old) parent.left = neu;
  else if (parent.right === old) parent.right = neu;
  return root;
}

// ───────────────────────────── walks ─────────────────────────────

/** Every node of the subtree in pre-order. */
export function collect(n: TreeNode | null): TreeNode[] {
  const out: TreeNode[] = [];
  const walk = (m: TreeNode | null) => {
    if (!m) return;
    out.push(m);
    walk(m.left);
    walk(m.right);
  };
  walk(n);
  return out;
}

export function traversalOrder(root: TreeNode | null, kind: TraversalKind): TreeNode[] {
  const out: TreeNode[] = [];
  if (!root) return out;
  if (kind === "levelorder") {
    const q: TreeNode[] = [root];
    while (q.length) {
      const n = q.shift()!;
      out.push(n);
      if (n.left) q.push(n.left);
      if (n.right) q.push(n.right);
    }
    return out;
  }
  const rec = (n: TreeNode | null) => {
    if (!n) return;
    if (kind === "preorder") out.push(n);
    rec(n.left);
    if (kind === "inorder") out.push(n);
    rec(n.right);
    if (kind === "postorder") out.push(n);
  };
  rec(root);
  return out;
}

export const keysInOrder = (root: TreeNode | null): number[] => traversalOrder(root, "inorder").map((n) => n.key);

export const size = (root: TreeNode | null): number => collect(root).length;

/** Height recomputed from scratch (ignores stored h). */
export function trueHeight(n: TreeNode | null): number {
  return n ? 1 + Math.max(trueHeight(n.left), trueHeight(n.right)) : 0;
}

export function minNode(n: TreeNode | null): TreeNode | null {
  while (n?.left) n = n.left;
  return n;
}

export function maxNode(n: TreeNode | null): TreeNode | null {
  while (n?.right) n = n.right;
  return n;
}

/** BST search. `path` holds the nodes compared before reaching `node` (root first). */
export function findPath(root: TreeNode | null, key: number): { path: TreeNode[]; node: TreeNode | null } {
  const path: TreeNode[] = [];
  let n = root;
  while (n && n.key !== key) {
    path.push(n);
    n = key < n.key ? n.left : n.right;
  }
  return { path, node: n };
}

// ───────────────────────────── rotations ─────────────────────────────

/**
 * Rotate the subtree rooted at z. "right": the left child y rises, z drops to y's right and y's
 * old right subtree (T2) becomes z's left. Mirror for "left". Updates z, then y. Returns y.
 */
export function rotate(z: TreeNode, dir: Side): TreeNode {
  if (dir === "right") {
    const y = z.left!;
    z.left = y.right;
    y.right = z;
    update(z);
    update(y);
    return y;
  }
  const y = z.right!;
  z.right = y.left;
  y.left = z;
  update(z);
  update(y);
  return y;
}

export interface CaseInfo {
  kase: RotationCase;
  leftHeavy: boolean;
  /** The heavy path bends (LR / RL) → needs two rotations. */
  zigzag: boolean;
  /** The heavy child (the pivot of the final rotation for LL / RR). */
  y: TreeNode;
  /** The grandchild on the heavy path (may be null after deletions). */
  x: TreeNode | null;
}

/** Name the imbalance at z (|z.bf| must be > 1 with fresh stored heights). */
export function classify(z: TreeNode): CaseInfo {
  const leftHeavy = z.bf > 1;
  const y = (leftHeavy ? z.left : z.right)!;
  const zigzag = leftHeavy ? y.bf < 0 : y.bf > 0;
  const kase: RotationCase = leftHeavy ? (zigzag ? "LR" : "LL") : zigzag ? "RL" : "RR";
  const x = zigzag ? (leftHeavy ? y.right : y.left) : leftHeavy ? y.left : y.right;
  return { kase, leftHeavy, zigzag, y, x };
}

/** Rebalance z in place (one or two rotations). Returns the new subtree root and how many rotations ran. */
export function rebalance(z: TreeNode): { top: TreeNode; rotations: number } {
  const c = classify(z);
  let rotations = 0;
  if (c.zigzag) {
    const mid = rotate(c.y, c.leftHeavy ? "left" : "right");
    if (c.leftHeavy) z.left = mid;
    else z.right = mid;
    rotations++;
  }
  const top = rotate(z, c.leftHeavy ? "right" : "left");
  return { top, rotations: rotations + 1 };
}

// ───────────────────────────── deletion helpers ─────────────────────────────

/**
 * In-order successor of a node with two children: right once, then left as far as possible.
 * `below` lists the nodes between z and the successor (z.right … successor's parent); empty when
 * the successor is z.right itself.
 */
export function successorOf(z: TreeNode): { s: TreeNode; below: TreeNode[] } {
  const below: TreeNode[] = [];
  let s = z.right!;
  while (s.left) {
    below.push(s);
    s = s.left;
  }
  return { s, below };
}

/**
 * Splice the successor s out of its spot and let it take over z's two subtrees. The caller then
 * hangs s under z's parent with replaceChild. s inherits z's stored height/bf so a retrace that
 * starts below it compares against z's old height.
 */
export function promoteSuccessor(z: TreeNode, s: TreeNode, below: readonly TreeNode[]): void {
  const sParent = below.length ? below[below.length - 1] : z;
  if (sParent !== z) {
    sParent.left = s.right;
    s.right = z.right;
  }
  s.left = z.left;
  s.h = z.h;
  s.bf = z.bf;
}

// ───────────────────────────── silent builders ─────────────────────────────

/** Plain BST insert (recursive), keeping stored heights fresh. Duplicates are ignored. */
export function bstInsertSilent(root: TreeNode | null, key: number, make: NodeFactory): TreeNode {
  const ins = (n: TreeNode | null): TreeNode => {
    if (!n) return make(key);
    if (key < n.key) n.left = ins(n.left);
    else if (key > n.key) n.right = ins(n.right);
    else return n;
    update(n);
    return n;
  };
  return ins(root);
}

/** AVL insert (recursive textbook version), rebalancing on the way back up. */
export function avlInsertSilent(root: TreeNode | null, key: number, make: NodeFactory): TreeNode {
  const ins = (n: TreeNode | null): TreeNode => {
    if (!n) return make(key);
    if (key < n.key) n.left = ins(n.left);
    else if (key > n.key) n.right = ins(n.right);
    else return n;
    update(n);
    return Math.abs(n.bf) > 1 ? rebalance(n).top : n;
  };
  return ins(root);
}

/**
 * Walk back up `chain` (root first, lowest changed node last) refreshing heights. With `avl`,
 * rotate any node whose |bf| > 1 and stop as soon as a subtree's height is unchanged — the same
 * loop the AVL engine animates.
 */
export function retraceSilent(root: TreeNode | null, chain: readonly TreeNode[], avl: boolean): { root: TreeNode | null; rotations: number } {
  let rotations = 0;
  for (let i = chain.length - 1; i >= 0; i--) {
    const n = chain[i];
    const parent = i > 0 ? chain[i - 1] : null;
    const oldH = n.h;
    update(n);
    if (!avl) continue;
    let top = n;
    if (Math.abs(n.bf) > 1) {
      const r = rebalance(n);
      top = r.top;
      rotations += r.rotations;
      root = replaceChild(root, parent, n, top);
    }
    if (top.h === oldH) break;
  }
  return { root, rotations };
}

/** Iterative insert exactly as the engine animates it: walk down, attach a leaf, retrace. */
export function insertKey(root: TreeNode | null, key: number, make: NodeFactory, avl: boolean) {
  if (!root) return { root: make(key), inserted: true, rotations: 0 };
  const { path, node } = findPath(root, key);
  if (node) return { root, inserted: false, rotations: 0 };
  const parent = path[path.length - 1];
  const leaf = make(key);
  if (key < parent.key) parent.left = leaf;
  else parent.right = leaf;
  const r = retraceSilent(root, path, avl);
  return { root: r.root, inserted: true, rotations: r.rotations };
}

/** Delete exactly as the engine animates it: leaf / one child / two children via the successor, then retrace. */
export function deleteKey(root: TreeNode | null, key: number, avl: boolean) {
  const { path, node: z } = findPath(root, key);
  if (!z) return { root, deleted: false, rotations: 0 };
  const parent = path[path.length - 1] ?? null;
  let chain: TreeNode[];
  if (z.left && z.right) {
    const { s, below } = successorOf(z);
    promoteSuccessor(z, s, below);
    root = replaceChild(root, parent, z, s);
    chain = [...path, s, ...below];
  } else {
    root = replaceChild(root, parent, z, z.left ?? z.right);
    chain = path;
  }
  const r = retraceSilent(root, chain, avl);
  return { root: r.root, deleted: true, rotations: r.rotations };
}

// ───────────────────────────── checks & stats ─────────────────────────────

export function isBST(root: TreeNode | null): boolean {
  const keys = keysInOrder(root);
  return keys.every((k, i) => i === 0 || keys[i - 1] < k);
}

/** Every stored h / bf matches a from-scratch computation. */
export function heightsConsistent(root: TreeNode | null): boolean {
  let ok = true;
  const walk = (n: TreeNode | null): number => {
    if (!n) return 0;
    const hl = walk(n.left);
    const hr = walk(n.right);
    if (n.h !== 1 + Math.max(hl, hr) || n.bf !== hl - hr) ok = false;
    return 1 + Math.max(hl, hr);
  };
  walk(root);
  return ok;
}

/** Height-balanced (computed from scratch, independent of stored values). */
export function isHeightBalanced(root: TreeNode | null): boolean {
  let ok = true;
  const walk = (n: TreeNode | null): number => {
    if (!n) return 0;
    const hl = walk(n.left);
    const hr = walk(n.right);
    if (Math.abs(hl - hr) > 1) ok = false;
    return 1 + Math.max(hl, hr);
  };
  walk(root);
  return ok;
}

export const minPossibleHeight = (n: number): number => (n <= 0 ? 0 : Math.ceil(Math.log2(n + 1)));

export function computeStats(root: TreeNode | null, rotations = 0): TreeStats {
  const n = size(root);
  return {
    size: n,
    height: trueHeight(root),
    min: minNode(root)?.key ?? null,
    max: maxNode(root)?.key ?? null,
    balanced: isHeightBalanced(root),
    minHeight: minPossibleHeight(n),
    rotations,
  };
}
