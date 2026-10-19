/**
 * Share links (VisuAlgo-style URLs) for the BST / AVL pages. Pure: no React, no DOM.
 *
 *   ?tree=50,30,20,40,70   the tree's PRE-ORDER keys. Plain BST inserts in this order rebuild the
 *                          exact shape (the root comes first, then its left subtree, …), so the
 *                          AVL page rebuilds it WITHOUT rebalancing and only checks it is balanced.
 *   ?tree=empty            an empty tree
 *   &meta=1|0              show height & balance-factor badges
 *   &speed=2               animation speed (one of the speed buttons)
 *   &step=1                step mode on
 */
import { bstInsertSilent, isHeightBalanced, nodeFactory, traversalOrder } from "./tree";
import type { NodeFactory, TreeNode } from "./types";

export const preorderKeys = (root: TreeNode | null): number[] => traversalOrder(root, "preorder").map((n) => n.key);

/** Plain-BST build: inserting a pre-order list in order reproduces the exact shape it came from. */
export function buildExact(keys: readonly number[], make: NodeFactory = nodeFactory()): TreeNode | null {
  let root: TreeNode | null = null;
  for (const k of keys) root = bstInsertSilent(root, k, make);
  return root;
}

export interface ShareState {
  keys: readonly number[];
  meta: boolean;
  speed: number;
  step: boolean;
}

export type ShareQuery = Record<string, string | number | undefined>;

export function encodeShare(s: ShareState): ShareQuery {
  return {
    tree: s.keys.length ? s.keys.join(",") : "empty",
    meta: s.meta ? 1 : 0,
    speed: s.speed === 1 ? undefined : s.speed,
    step: s.step ? 1 : undefined,
  };
}

export interface DecodedTree {
  keys: number[];
  /** true: rebuild with plain inserts (exact shape). false: the shared shape was not a valid AVL
   *  tree, so the keys are inserted with rebalancing instead. */
  exact: boolean;
}

export interface DecodedShare {
  /** null → no (valid) tree in the link: keep the page's default example. */
  tree: DecodedTree | null;
  meta: boolean | null;
  speed: number | null;
  step: boolean | null;
}

export interface DecodeOptions {
  avl: boolean;
  speeds: readonly number[];
  min: number;
  max: number;
  /** Most keys a link may carry. */
  limit?: number;
}

interface ParamSource {
  get(name: string): string | null;
}

const flag = (v: string | null): boolean | null => (v === "1" ? true : v === "0" ? false : null);

/** Validate everything; anything malformed is ignored (the page falls back to its defaults). */
export function decodeShare(params: ParamSource, o: DecodeOptions): DecodedShare {
  const speedRaw = params.get("speed");
  const speed = speedRaw !== null && o.speeds.includes(Number(speedRaw)) ? Number(speedRaw) : null;
  return { tree: decodeTree(params.get("tree"), o), meta: flag(params.get("meta")), speed, step: flag(params.get("step")) };
}

function decodeTree(raw: string | null, o: DecodeOptions): DecodedTree | null {
  if (raw === null) return null;
  const text = raw.trim();
  if (text === "empty") return { keys: [], exact: true };
  const parts = text.split(",").map((x) => x.trim());
  if (!parts.length || parts.length > (o.limit ?? 255)) return null;
  if (!parts.every((x) => /^\d{1,6}$/.test(x))) return null;
  const keys = parts.map(Number);
  if (keys.some((k) => k < o.min || k > o.max)) return null;
  if (new Set(keys).size !== keys.length) return null; // keys in a search tree are unique
  if (!o.avl) return { keys, exact: true };
  return { keys, exact: isHeightBalanced(buildExact(keys)) };
}
