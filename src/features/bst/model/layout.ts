import type { TreeNode } from "./types";

export interface LayoutSpec {
  /** Horizontal gap between consecutive keys (in-order columns). */
  col: number;
  /** Vertical gap between levels. */
  level: number;
  /** Node radius. */
  r: number;
}

export interface PlacedNode {
  node: TreeNode;
  x: number;
  y: number;
  depth: number;
}

export interface TreeLayout {
  nodes: Map<string, PlacedNode>;
  width: number;
  height: number;
}

/**
 * In-order layout: the i-th smallest key sits in column i, depth sets the row. Keys therefore
 * keep their left-to-right order through every rotation — only the rows change — which is
 * exactly the invariant the animations want to show. Centred on x = 0, root at y = 0.
 */
export function layoutTree(root: TreeNode | null, { col, level, r }: LayoutSpec): TreeLayout {
  const nodes = new Map<string, PlacedNode>();
  let i = 0;
  let depth = 0;
  const walk = (n: TreeNode | null, d: number) => {
    if (!n) return;
    walk(n.left, d + 1);
    nodes.set(n.id, { node: n, x: i++ * col, y: d * level, depth: d });
    depth = Math.max(depth, d);
    walk(n.right, d + 1);
  };
  walk(root, 0);
  const span = Math.max(0, (i - 1) * col);
  nodes.forEach((p) => { p.x -= span / 2; });
  return {
    nodes,
    width: i ? span + 4 * r : 0,
    height: i ? depth * level + 2 * r + 24 : 0,
  };
}
