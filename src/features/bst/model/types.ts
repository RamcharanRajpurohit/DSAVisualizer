/**
 * Pure data types shared by the BST / AVL model, engines and UI.
 * (No React, no Konva — keep this folder runnable with plain `tsx`.)
 */

export interface TreeNode {
  /** Stable identity: the Konva view of a node follows its id, so nodes glide instead of being redrawn. */
  readonly id: string;
  key: number;
  left: TreeNode | null;
  right: TreeNode | null;
  /** Stored height (leaf = 1, empty = 0). Refreshed by `update()`; may be stale mid-operation on purpose. */
  h: number;
  /** Stored balance factor h(left) − h(right). */
  bf: number;
}

export type Side = "left" | "right";

export type TraversalKind = "preorder" | "inorder" | "postorder" | "levelorder";

/** The four AVL imbalance shapes. */
export type RotationCase = "LL" | "RR" | "LR" | "RL";

export type NodeFactory = (key: number) => TreeNode;

export interface TreeStats {
  size: number;
  height: number;
  min: number | null;
  max: number | null;
  /** Height-balanced: every node has |bf| ≤ 1. */
  balanced: boolean;
  /** Smallest height any binary tree with this many nodes can have: ⌈log₂(n + 1)⌉. */
  minHeight: number;
  /** Animated rotations performed since the tree was (re)built (AVL only). */
  rotations: number;
}
