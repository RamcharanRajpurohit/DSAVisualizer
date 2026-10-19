/**
 * Plain-text descriptions of a tree for AI agents (WebMCP tool results). Pure: no React, no DOM.
 */
import { preorderKeys } from "./share";
import { computeStats, findPath, successorOf } from "./tree";
import type { TreeNode } from "./types";

/** Keys grouped by depth, root first. */
export function levelKeys(root: TreeNode | null): number[][] {
  const out: number[][] = [];
  let level = root ? [root] : [];
  while (level.length) {
    out.push(level.map((n) => n.key));
    level = level.flatMap((n) => [n.left, n.right].filter((c): c is TreeNode => !!c));
  }
  return out;
}

/** Size, height, level order and the pre-order list that rebuilds the exact shape. */
export function treeSummary(root: TreeNode | null, avl: boolean): string {
  if (!root) return "The tree is now empty.";
  const s = computeStats(root);
  const levels = levelKeys(root).map((l, i) => `L${i}: ${l.join(" ")}`).join(" | ");
  const shape = avl ? "every balance factor within −1..+1" : s.balanced ? "height-balanced" : "not height-balanced";
  return [
    `${s.size} nodes, height ${s.height} (levels; a single node has height 1), root ${root.key}, ${shape}.`,
    `Level order: ${levels}`,
    `Pre-order (re-inserting in this order rebuilds the exact shape): ${preorderKeys(root).join(", ")}`,
  ].join("\n");
}

/** Which of the three deletion cases removing `key` falls into (before any AVL rebalancing). */
export function deleteCase(root: TreeNode | null, key: number): string | null {
  const { node: z } = findPath(root, key);
  if (!z) return null;
  if (z.left && z.right) {
    const { s } = successorOf(z);
    return `two children: ${key} is replaced by its in-order successor ${s.key} (the smallest key in its right subtree)`;
  }
  const child = z.left ?? z.right;
  return child ? `one child: ${child.key} and its subtree move up into ${key}'s place` : `a leaf: ${key} is simply unlinked`;
}

/** Comparison path of a search, e.g. "50 → 30 → 40". */
export function searchPath(root: TreeNode | null, key: number): { found: boolean; path: number[] } {
  const { path, node } = findPath(root, key);
  return { found: !!node, path: [...path.map((n) => n.key), ...(node ? [node.key] : [])] };
}
