/**
 * Exact structural snapshots of a B-tree (pure, no `@/` imports so tests run under tsx).
 *
 * A B-tree's shape depends on its insertion/deletion history, so a list of keys is not enough
 * to reproduce it. Listing the key groups level by level is: level d+1 holds exactly
 * Σ(keys + 1) nodes of level d, in left-to-right order, so the child pointers are implied.
 *
 *   shape  [[[40]], [[20], [60]], [[10], [30], [50], [70]]]
 *   text   "40-20_60-10_30_50_70"     keys "." · nodes "_" · levels "-"   (URL-safe, no escaping)
 *
 * An empty tree is `[]` / "empty".
 */
import { BTree, realKeys, type BNode } from "./btree";

/** levels → nodes → keys. */
export type TreeShape = number[][][];

export interface Snapshot {
  order: number;
  shape: TreeShape;
}

export const EMPTY_TEXT = "empty";

export function shapeOf(tree: BTree): TreeShape {
  if (tree.isEmpty()) return [];
  const out: TreeShape = [];
  let level: BNode[] = [tree.root];
  while (level.length) {
    out.push(level.map((n) => realKeys(n.keys).map((k) => k.v)));
    level = level.flatMap((n) => (n.leaf ? [] : n.children));
  }
  return out;
}

export const snapshotOf = (tree: BTree): Snapshot => ({ order: tree.order, shape: shapeOf(tree) });

export const encodeShape = (shape: TreeShape) =>
  shape.length ? shape.map((lvl) => lvl.map((node) => node.join(".")).join("_")).join("-") : EMPTY_TEXT;

/** Identity of a snapshot (order + exact structure). */
export const snapshotKey = (s: Snapshot) => `${s.order}|${encodeShape(s.shape)}`;
export const sameSnapshot = (a: Snapshot, b: Snapshot) => snapshotKey(a) === snapshotKey(b);

export const keyCount = (shape: TreeShape) => shape.reduce((a, lvl) => a + lvl.reduce((b, n) => b + n.length, 0), 0);

/**
 * Parse the text form. Only checks the syntax and that the levels fit together
 * (level d+1 has Σ(keys+1) nodes of level d); `validSnapshot` checks the B-tree rules.
 */
export function decodeShape(text: string | null | undefined, { maxKeys = 120, maxValue = 999 } = {}): TreeShape | null {
  if (text == null) return null;
  const t = text.trim();
  if (t === EMPTY_TEXT) return [];
  if (!/^[0-9._-]+$/.test(t) || t.length > 2000) return null;
  const shape: TreeShape = [];
  let total = 0;
  for (const lvlText of t.split("-")) {
    const level: number[][] = [];
    for (const nodeText of lvlText.split("_")) {
      const node: number[] = [];
      for (const tok of nodeText.split(".")) {
        if (!/^\d{1,4}$/.test(tok)) return null;
        const v = Number(tok);
        if (v > maxValue) return null;
        node.push(v);
      }
      total += node.length;
      if (total > maxKeys) return null;
      level.push(node);
    }
    shape.push(level);
  }
  if (shape[0].length !== 1) return null;
  for (let d = 1; d < shape.length; d++) {
    const expected = shape[d - 1].reduce((a, n) => a + n.length + 1, 0);
    if (shape[d].length !== expected) return null;
  }
  return shape;
}

/** Problems that stop `shape` from being a valid order-`order` B-tree (empty = valid). */
export function shapeProblems(order: number, shape: TreeShape): string[] {
  if (!Number.isInteger(order) || order < 3) return [`order ${order} is not supported`];
  if (!shape.length) return [];
  if (shape[0].length !== 1) return ["the first level must hold exactly one node (the root)"];
  for (let d = 1; d < shape.length; d++) {
    const expected = shape[d - 1].reduce((a, n) => a + n.length + 1, 0);
    if (shape[d].length !== expected) return [`level ${d + 1} has ${shape[d].length} nodes, expected ${expected}`];
  }
  if (shape.some((lvl) => lvl.some((n) => n.length === 0))) return ["a node has no keys"];
  const t = new BTree(order);
  t.loadShape(order, shape, false);
  return t.check();
}

export const validSnapshot = (s: Snapshot) => shapeProblems(s.order, s.shape).length === 0;

/** A fresh tree with exactly this structure (throws on an invalid shape — validate first). */
export function treeFrom(s: Snapshot): BTree {
  const t = new BTree(s.order);
  t.loadShape(s.order, s.shape, false);
  return t;
}
