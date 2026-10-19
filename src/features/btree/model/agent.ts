/**
 * Plain-text answers about a B-tree for AI agents (WebMCP tools). Pure: no `@/` imports, so the
 * fuzz script can check it against the model under tsx.
 *
 * Mutating helpers change the tree they are given — pass a copy (`treeFrom(engine.snapshot())`).
 */
import { realKeys, type BTree, type BKey, type BNode, type FixKind, type ReplaceSide, type ReplaceStrategy } from "./btree";
import { shapeOf } from "./shape";

const fmt = (keys: readonly number[]) => `[${keys.join(", ")}]`;
const values = (n: BNode) => realKeys(n.keys).map((k) => k.v);

/** Order, limits, size, height and every node level by level. */
export function btreeSummary(t: BTree): string {
  const s = t.stats();
  const rules = `order ${t.order}: at most ${t.maxKeys} keys (${t.order} children) per node, at least ${t.minKeys} in every non-root node`;
  if (!s.keys) return `The B-tree is empty (${rules}).`;
  const levels = shapeOf(t).map((lvl, i) => `L${i}: ${lvl.map(fmt).join(" ")}`).join(" | ");
  return [
    `${s.keys} keys in ${s.nodes} nodes, height ${s.height} (levels), ${Math.round(s.fill * 100)}% of key slots used (${rules}).`,
    `Levels: ${levels}`,
  ].join("\n");
}

export interface InsertReport {
  inserted: boolean;
  /** Nodes that split (a root split counts once). */
  splits: number;
  /** The root split, so the tree grew one level. */
  grew: boolean;
}

/** Insert v exactly as the engine does and report the splits (each split adds one node, a root split one more). */
export function explainInsert(t: BTree, v: number): InsertReport {
  const before = t.stats();
  const inserted = t.insert(v);
  const after = t.stats();
  if (!inserted || before.keys === 0) return { inserted, splits: 0, grew: false };
  const grew = after.height > before.height;
  return { inserted, splits: after.nodes - before.nodes - (grew ? 1 : 0), grew };
}

export interface DeleteReport {
  found: boolean;
  /** The key sat in a leaf (otherwise it was replaced by its predecessor / successor). */
  leaf: boolean;
  replacement?: { side: ReplaceSide; key: number };
  /** Underflow repairs, bottom-up. */
  fixes: FixKind[];
  /** The root ran out of keys and the tree lost a level. */
  shrank: boolean;
}

/** Delete v with the same decisions as BTree.delete / the engine, recording each repair. */
export function explainDelete(t: BTree, v: number, strategy: ReplaceStrategy): DeleteReport {
  const none: DeleteReport = { found: false, leaf: false, fixes: [], shrank: false };
  if (t.isEmpty()) return none;
  const { path, node, idx, found } = t.locate(v);
  if (!found) return none;
  const p = path.slice();
  let replacement: DeleteReport["replacement"];
  if (node.leaf) {
    t.removeAt(node, idx);
  } else {
    const { side } = t.chooseReplacement(node, idx, strategy);
    const { steps, leaf, key } = t.replacementPath(node, idx, side);
    replacement = { side, key: key.v };
    p.push(...steps);
    t.vacate(node, idx);
    t.promote(node, idx, leaf, side);
  }
  const fixes: FixKind[] = [];
  for (let d = p.length - 1; d >= 0; d--) {
    const { node: parent, idx: i } = p[d];
    if (parent.children[i].keys.length >= t.minKeys) break;
    fixes.push(t.fixUnderflow(parent, i));
  }
  const shrank = t.needsCollapse();
  if (shrank) t.collapseRoot();
  return { found: true, leaf: node.leaf, replacement, fixes, shrank };
}

/** The nodes a search for v reads, root first. */
export function searchTrail(t: BTree, v: number): { found: boolean; nodes: number[][] } {
  if (t.isEmpty()) return { found: false, nodes: [] };
  const r = t.locate(v);
  return { found: r.found, nodes: [...r.path.map((s) => values(s.node)), values(r.node)] };
}

export type BTreeTraversal = "inorder" | "levelorder";

/** Keys in visit order, each with the node that holds it. */
export function traversalVisits(t: BTree, kind: BTreeTraversal): { key: BKey; node: BNode }[] {
  const out: { key: BKey; node: BNode }[] = [];
  if (t.isEmpty()) return out;
  if (kind === "levelorder") {
    let level: BNode[] = [t.root];
    while (level.length) {
      for (const n of level) for (const key of realKeys(n.keys)) out.push({ key, node: n });
      level = level.flatMap((n) => (n.leaf ? [] : n.children));
    }
    return out;
  }
  const walk = (n: BNode) => {
    n.keys.forEach((key, i) => {
      if (!n.leaf) walk(n.children[i]);
      if (!key.ghost) out.push({ key, node: n });
    });
    if (!n.leaf) walk(n.children[n.keys.length]);
  };
  walk(t.root);
  return out;
}

export const FIX_TEXT: Record<FixKind, string> = {
  "borrow-left": "borrowed a key from the left sibling (rotated through the parent)",
  "borrow-right": "borrowed a key from the right sibling (rotated through the parent)",
  "merge-left": "merged with the left sibling and their separator",
  "merge-right": "merged with the right sibling and their separator",
};
