/**
 * Pure B-tree data model (no rendering, no React, no `@/` imports so it can run under tsx).
 *
 * Keys are objects with a stable id, so the renderer can follow one key as it travels
 * (median rising on a split, separator dropping on a merge, rotation through the parent
 * on a borrow). Every structural change is a small named primitive; the animated engine
 * and the silent insert/delete below compose exactly the same primitives, so the fuzz test
 * of the silent versions also covers the data side of the animations.
 *
 * order m:  max m − 1 keys per node,  min ⌈m/2⌉ − 1 keys per non-root node.
 */

export interface BKey {
  readonly id: string;
  /** NaN for a ghost (an empty slot shown while a key is being replaced). */
  readonly v: number;
  readonly ghost?: boolean;
}

export interface BNode {
  readonly id: string;
  leaf: boolean;
  keys: BKey[];
  children: BNode[];
}

/** One step of a root-to-node walk: we went from `node` into `node.children[idx]`. */
export interface PathStep {
  node: BNode;
  idx: number;
}

export interface Located {
  path: PathStep[];
  node: BNode;
  idx: number;
  found: boolean;
}

export type ReplaceSide = "predecessor" | "successor";
export type ReplaceStrategy = ReplaceSide | "auto";
export type FixKind = "borrow-left" | "borrow-right" | "merge-left" | "merge-right";

export interface TreeStats {
  order: number;
  maxKeys: number;
  minKeys: number;
  /** Levels (0 for an empty tree). */
  height: number;
  nodes: number;
  keys: number;
  leaves: number;
  /** Share of key slots in use, 0..1. */
  fill: number;
}

/** The defining B-tree properties, evaluated on the live (possibly mid-operation) tree. */
export interface TreeProps {
  sorted: boolean;
  maxOk: boolean;
  minOk: boolean;
  balanced: boolean;
}

export const limitsFor = (order: number) => ({ maxKeys: order - 1, minKeys: Math.ceil(order / 2) - 1 });

export const realKeys = (keys: readonly BKey[]) => keys.filter((k) => !k.ghost);
export const fmtKeys = (keys: readonly BKey[]) => `[${realKeys(keys).map((k) => k.v).join(", ")}]`;
export const describeNode = (node: BNode) => (node.keys.length ? fmtKeys(node.keys) : "an empty node");

export class BTree {
  order = 3;
  maxKeys = 2;
  minKeys = 1;
  root: BNode;
  private uid = 0;

  constructor(order = 3) {
    this.root = this.newNode(true);
    this.reset(order);
  }

  // ─────────────── construction ───────────────

  reset(order = this.order) {
    this.order = order;
    ({ maxKeys: this.maxKeys, minKeys: this.minKeys } = limitsFor(order));
    this.root = this.newNode(true);
  }

  newNode(leaf: boolean, id?: string): BNode {
    return { id: id ?? `n${++this.uid}`, leaf, keys: [], children: [] };
  }

  newKey(v: number): BKey {
    return { id: `k${++this.uid}`, v };
  }

  /**
   * Replace the whole tree with the exact structure `shape` (levels → nodes → key values; level d+1
   * lists the children of level d left to right). With `reuse`, key objects and node ids of the
   * current tree are kept for equal values, so the renderer glides them instead of re-creating them.
   * The caller validates the shape (see shape.ts).
   */
  loadShape(order: number, shape: readonly (readonly (readonly number[])[])[], reuse = true) {
    const oldKeys = new Map<number, BKey>(), oldNode = new Map<number, string>();
    if (reuse && !this.isEmpty()) {
      const walk = (n: BNode) => {
        for (const k of realKeys(n.keys)) {
          oldKeys.set(k.v, k);
          oldNode.set(k.v, n.id);
        }
        if (!n.leaf) n.children.forEach(walk);
      };
      walk(this.root);
    }
    this.reset(order);
    if (!shape.length) return;
    const used = new Set<string>();
    const levels = shape.map((level, d) =>
      level.map((vals) => {
        const id = vals.map((v) => oldNode.get(v)).find((x): x is string => !!x && !used.has(x));
        if (id) used.add(id);
        const node = this.newNode(d === shape.length - 1, id);
        node.keys = vals.map((v) => oldKeys.get(v) ?? this.newKey(v));
        return node;
      }));
    for (let d = 0; d + 1 < levels.length; d++) {
      let c = 0;
      for (const p of levels[d]) {
        p.children = levels[d + 1].slice(c, c + p.keys.length + 1);
        c += p.keys.length + 1;
      }
    }
    this.root = levels[0][0];
  }

  ghostKey(): BKey {
    return { id: `g${++this.uid}`, v: Number.NaN, ghost: true };
  }

  // ─────────────── queries ───────────────

  isEmpty() {
    return this.root.leaf && this.root.keys.length === 0;
  }

  /** Number of keys in `node` that are smaller than v = the child to follow / the insert position. */
  static rank(node: BNode, v: number) {
    let i = 0;
    while (i < node.keys.length && v > node.keys[i].v) i++;
    return i;
  }

  locate(v: number): Located {
    const path: PathStep[] = [];
    let node = this.root;
    for (;;) {
      const i = BTree.rank(node, v);
      if (i < node.keys.length && node.keys[i].v === v) return { path, node, idx: i, found: true };
      if (node.leaf) return { path, node, idx: i, found: false };
      path.push({ node, idx: i });
      node = node.children[i];
    }
  }

  has(v: number) {
    return !this.isEmpty() && this.locate(v).found;
  }

  /** In-order traversal (sorted when the tree is valid). */
  inorder(): number[] {
    const out: number[] = [];
    const walk = (n: BNode) => {
      n.keys.forEach((k, i) => {
        if (!n.leaf && n.children[i]) walk(n.children[i]);
        if (!k.ghost) out.push(k.v);
      });
      if (!n.leaf && n.children[n.keys.length]) walk(n.children[n.keys.length]);
    };
    walk(this.root);
    return out;
  }

  /** Keys level by level (root first). Rebuilding from this order gives a similar shape. */
  levelOrderKeys(): BKey[] {
    const out: BKey[] = [];
    let level = [this.root];
    while (level.length) {
      const next: BNode[] = [];
      for (const n of level) {
        out.push(...realKeys(n.keys));
        if (!n.leaf) next.push(...n.children);
      }
      level = next;
    }
    return out;
  }

  stats(): TreeStats {
    let nodes = 0, keys = 0, leaves = 0, height = 0;
    if (!this.isEmpty()) {
      const walk = (n: BNode, d: number) => {
        nodes++;
        keys += realKeys(n.keys).length;
        height = Math.max(height, d + 1);
        if (n.leaf) leaves++;
        else n.children.forEach((c) => walk(c, d + 1));
      };
      walk(this.root, 0);
    }
    return {
      order: this.order, maxKeys: this.maxKeys, minKeys: this.minKeys,
      height, nodes, keys, leaves, fill: nodes ? keys / (nodes * this.maxKeys) : 0,
    };
  }

  /** Live property check — mid-operation it shows the overflow / underflow being fixed. */
  props(): TreeProps {
    const vals = this.inorder();
    let maxOk = true, minOk = true;
    const depths = new Set<number>();
    const walk = (n: BNode, d: number) => {
      const c = realKeys(n.keys).length;
      if (c > this.maxKeys) maxOk = false;
      if (n !== this.root && c < this.minKeys) minOk = false;
      if (n.leaf) depths.add(d);
      else n.children.forEach((ch) => walk(ch, d + 1));
    };
    walk(this.root, 0);
    return { sorted: vals.every((v, i) => i === 0 || vals[i - 1] < v), maxOk, minOk, balanced: depths.size <= 1 };
  }

  /** Strict invariant check for tests. Returns a list of problems (empty = valid B-tree). */
  check(): string[] {
    const errs: string[] = [];
    const ids = new Set<string>();
    let leafDepth = -1;
    const walk = (n: BNode, d: number, lo: number, hi: number) => {
      if (ids.has(n.id)) errs.push(`node ${n.id} appears twice`);
      ids.add(n.id);
      const label = `${n.id}${fmtKeys(n.keys)}`;
      const isRoot = n === this.root;
      if (n.keys.some((k) => k.ghost)) errs.push(`${label} contains a ghost key`);
      if (n.keys.length > this.maxKeys) errs.push(`${label} has ${n.keys.length} > ${this.maxKeys} keys`);
      if (!isRoot && n.keys.length < this.minKeys) errs.push(`${label} has ${n.keys.length} < ${this.minKeys} keys`);
      if (isRoot && !n.leaf && n.keys.length === 0) errs.push(`internal root ${label} has no keys`);
      n.keys.forEach((k, i) => {
        if (ids.has(k.id)) errs.push(`key ${k.id} appears twice`);
        ids.add(k.id);
        if (!(k.v > lo && k.v < hi)) errs.push(`${label}: key ${k.v} outside (${lo}, ${hi})`);
        if (i > 0 && !(n.keys[i - 1].v < k.v)) errs.push(`${label} keys not strictly increasing`);
      });
      if (n.leaf) {
        if (n.children.length) errs.push(`leaf ${label} has children`);
        if (leafDepth === -1) leafDepth = d;
        else if (leafDepth !== d) errs.push(`leaf ${label} at depth ${d}, expected ${leafDepth}`);
        return;
      }
      if (n.children.length !== n.keys.length + 1) {
        errs.push(`${label} has ${n.children.length} children for ${n.keys.length} keys`);
        return;
      }
      n.children.forEach((c, i) =>
        walk(c, d + 1, i === 0 ? lo : n.keys[i - 1].v, i === n.keys.length ? hi : n.keys[i].v));
    };
    walk(this.root, 0, -Infinity, Infinity);
    return errs;
  }

  // ─────────────── insert primitives ───────────────

  insertAt(node: BNode, idx: number, key: BKey) {
    node.keys.splice(idx, 0, key);
  }

  /**
   * Split an overflowing node around its median: keys after the median move to `right`,
   * the median moves into the parent (or into a new root when `node` is the root).
   */
  splitData(node: BNode, parent: BNode | null, idx: number, right: BNode = this.newNode(node.leaf)) {
    const mid = Math.floor(node.keys.length / 2);
    const med = node.keys[mid];
    right.keys = node.keys.slice(mid + 1);
    if (!node.leaf) {
      right.children = node.children.slice(mid + 1);
      node.children = node.children.slice(0, mid + 1);
    }
    node.keys = node.keys.slice(0, mid);
    let newRoot: BNode | null = null;
    if (parent) {
      parent.keys.splice(idx, 0, med);
      parent.children.splice(idx + 1, 0, right);
    } else {
      newRoot = this.newNode(false);
      newRoot.keys = [med];
      newRoot.children = [node, right];
      this.root = newRoot;
    }
    return { med, right, newRoot };
  }

  /** Silent bottom-up insert of an existing key object. Returns false for a duplicate. */
  insertKey(key: BKey): boolean {
    if (this.isEmpty()) {
      this.root.keys.push(key);
      return true;
    }
    const { path, node, idx, found } = this.locate(key.v);
    if (found) return false;
    this.insertAt(node, idx, key);
    let cur = node;
    for (let d = path.length; cur.keys.length > this.maxKeys; d--) {
      const up = d > 0 ? path[d - 1] : null;
      this.splitData(cur, up ? up.node : null, up ? up.idx : 0);
      if (!up) break;
      cur = up.node;
    }
    return true;
  }

  insert(v: number): boolean {
    return this.has(v) ? false : this.insertKey(this.newKey(v));
  }

  // ─────────────── delete primitives ───────────────

  removeAt(node: BNode, idx: number): BKey {
    return node.keys.splice(idx, 1)[0];
  }

  /** Walk from an internal key to the leaf holding its predecessor (rightmost path) or successor (leftmost path). */
  replacementPath(node: BNode, idx: number, side: ReplaceSide): { steps: PathStep[]; leaf: BNode; key: BKey } {
    const first = side === "predecessor" ? idx : idx + 1;
    const steps: PathStep[] = [{ node, idx: first }];
    let cur = node.children[first];
    while (!cur.leaf) {
      const j = side === "predecessor" ? cur.children.length - 1 : 0;
      steps.push({ node: cur, idx: j });
      cur = cur.children[j];
    }
    const key = side === "predecessor" ? cur.keys[cur.keys.length - 1] : cur.keys[0];
    return { steps, leaf: cur, key };
  }

  /**
   * Which neighbour replaces an internal key. "auto" prefers the side whose leaf can spare a key
   * (so no rebalancing follows); if neither can, it falls back to the predecessor.
   */
  chooseReplacement(node: BNode, idx: number, strategy: ReplaceStrategy): { side: ReplaceSide; reason: "fixed" | "spare" | "neither" } {
    if (strategy !== "auto") return { side: strategy, reason: "fixed" };
    if (this.replacementPath(node, idx, "predecessor").leaf.keys.length > this.minKeys) return { side: "predecessor", reason: "spare" };
    if (this.replacementPath(node, idx, "successor").leaf.keys.length > this.minKeys) return { side: "successor", reason: "spare" };
    return { side: "predecessor", reason: "neither" };
  }

  /** Phase 1 of an internal delete: the key leaves, a ghost keeps its slot. */
  vacate(node: BNode, idx: number): BKey {
    const old = node.keys[idx];
    node.keys[idx] = this.ghostKey();
    return old;
  }

  /** Phase 2 of an internal delete: the predecessor / successor leaves its leaf and fills the slot. */
  promote(node: BNode, idx: number, leaf: BNode, side: ReplaceSide): BKey {
    const key = side === "predecessor" ? leaf.keys.pop()! : leaf.keys.shift()!;
    node.keys[idx] = key;
    return key;
  }

  /** How to repair the underflowing child `parent.children[i]`. */
  chooseFix(parent: BNode, i: number): FixKind {
    const left = i > 0 ? parent.children[i - 1] : null;
    const right = i < parent.children.length - 1 ? parent.children[i + 1] : null;
    if (left && left.keys.length > this.minKeys) return "borrow-left";
    if (right && right.keys.length > this.minKeys) return "borrow-right";
    return left ? "merge-left" : "merge-right";
  }

  /** Borrow-left, phase 1: the separator drops to the front of the child (with the sibling's last subtree). */
  borrowLeftDown(parent: BNode, i: number) {
    const child = parent.children[i], sib = parent.children[i - 1];
    const sep = parent.keys[i - 1];
    parent.keys[i - 1] = this.ghostKey();
    child.keys.unshift(sep);
    if (!child.leaf) child.children.unshift(sib.children.pop()!);
    return sep;
  }

  /** Borrow-left, phase 2: the sibling's largest key rises into the separator slot. */
  borrowLeftUp(parent: BNode, i: number) {
    const sib = parent.children[i - 1];
    const donor = sib.keys.pop()!;
    parent.keys[i - 1] = donor;
    return donor;
  }

  /** Borrow-right, phase 1: the separator drops onto the end of the child. */
  borrowRightDown(parent: BNode, i: number) {
    const child = parent.children[i];
    const sep = parent.keys[i];
    parent.keys[i] = this.ghostKey();
    child.keys.push(sep);
    return sep;
  }

  /** Borrow-right, phase 2: the sibling's smallest key rises (its first subtree moves across). */
  borrowRightUp(parent: BNode, i: number) {
    const child = parent.children[i], sib = parent.children[i + 1];
    const donor = sib.keys.shift()!;
    parent.keys[i] = donor;
    if (!child.leaf) child.children.push(sib.children.shift()!);
    return donor;
  }

  /** Merge children i and i+1 of `parent` together with their separator into child i. */
  mergeData(parent: BNode, i: number) {
    const L = parent.children[i], R = parent.children[i + 1], sep = parent.keys[i];
    L.keys.push(sep, ...R.keys);
    if (!L.leaf) L.children.push(...R.children);
    parent.keys.splice(i, 1);
    parent.children.splice(i + 1, 1);
  }

  /** An internal root with no keys hands the root role to its only child. */
  needsCollapse() {
    return !this.root.leaf && this.root.keys.length === 0;
  }

  collapseRoot() {
    this.root = this.root.children[0];
  }

  /** Silent version of the engine's underflow repair (same decisions, same primitives). */
  fixUnderflow(parent: BNode, i: number): FixKind {
    const kind = this.chooseFix(parent, i);
    if (kind === "borrow-left") { this.borrowLeftDown(parent, i); this.borrowLeftUp(parent, i); }
    else if (kind === "borrow-right") { this.borrowRightDown(parent, i); this.borrowRightUp(parent, i); }
    else if (kind === "merge-left") this.mergeData(parent, i - 1);
    else this.mergeData(parent, i);
    return kind;
  }

  /** Walk the recorded path bottom-up, repairing underflows until a level is fine. */
  rebalance(path: readonly PathStep[]) {
    for (let d = path.length - 1; d >= 0; d--) {
      const { node: parent, idx } = path[d];
      if (parent.children[idx].keys.length >= this.minKeys) break;
      this.fixUnderflow(parent, idx);
    }
  }

  /** Silent delete with bottom-up rebalancing. Returns false when v is absent. */
  delete(v: number, strategy: ReplaceStrategy = "auto"): boolean {
    if (this.isEmpty()) return false;
    const { path, node, idx, found } = this.locate(v);
    if (!found) return false;
    const p = path.slice();
    if (node.leaf) {
      this.removeAt(node, idx);
    } else {
      const { side } = this.chooseReplacement(node, idx, strategy);
      const { steps, leaf } = this.replacementPath(node, idx, side);
      p.push(...steps);
      this.vacate(node, idx);
      this.promote(node, idx, leaf, side);
    }
    this.rebalance(p);
    if (this.needsCollapse()) this.collapseRoot();
    return true;
  }
}
