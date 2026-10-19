/*
 * BSTEngine — the animated binary-search-tree operations, and the parent class of AVLEngine.
 *
 * Built on TreeScene (Konva stage, views, morph, styles), it owns everything a search tree needs
 * regardless of how it balances:
 *   • the animated walk down the tree (descend) shared by insert / search / delete
 *   • insert / delete (leaf, one child, two children via the successor) / search / traversals,
 *     each reporting status, pseudocode lines and variables at every phase
 *   • height + balance-factor bookkeeping so children can display and use it
 *
 * Subclasses customise behaviour through Template-Method seams:
 *   • insertSilent(v)          build without animation (BST: plain insert; AVL: rebalancing insert)
 *   • afterInsert(path, node)  after a leaf is attached (BST: refresh heights; AVL: retrace + rotate)
 *   • afterDelete(chain, key)  after a node is unlinked (BST: refresh heights; AVL: retrace + rotate)
 *   • insertCodeId / deleteCodeId / treeName / shapeNote  — labels and pseudocode listings
 */
import { plural } from "@/lib/utils";
import { TreeHistory, type HistoryInfo, type TreeSnapshot } from "../model/history";
import { buildExact, preorderKeys } from "../model/share";
import {
  bstInsertSilent, cloneTree, collect, hOf, keysInOrder, minPossibleHeight, promoteSuccessor, replaceChild, size, update,
} from "../model/tree";
import type { NodeFactory, Side, TraversalKind, TreeNode } from "../model/types";
import { LN, type CodeId } from "../pseudocode";
import { backOut } from "./anim";
import { HOLE_STROKE } from "./theme";
import { TreeScene, type NodeView } from "./TreeScene";
import type { EngineOptions, StatusInfo, Vars } from "./types";

export type { KonvaLib, NodeView } from "./TreeScene";

export interface DescendLines {
  arrive: number | readonly number[];
  equal: number | readonly number[];
  left: number | readonly number[];
  right: number | readonly number[];
}

export interface DescendResult {
  path: TreeNode[];
  node: TreeNode | null;
  found: boolean;
}

export const TRAVERSAL_NAME: Record<TraversalKind, string> = {
  preorder: "Pre-order",
  inorder: "In-order",
  postorder: "Post-order",
  levelorder: "Level-order",
};

const TRAVERSAL_HOW: Record<TraversalKind, string> = {
  preorder: "**node → left subtree → right subtree.** A node is output the moment it is reached — handy for copying or serialising a tree.",
  inorder: "**left subtree → node → right subtree.** On a BST this lists the keys in sorted order.",
  postorder: "**left subtree → right subtree → node.** Children are always finished before their parent — used to free or evaluate a tree.",
  levelorder: "Visit **level by level** from the top, left to right, using a **queue** (a breadth-first search).",
};

const RECURSION_ORDER: Record<Exclude<TraversalKind, "levelorder">, readonly ("left" | "visit" | "right")[]> = {
  preorder: ["visit", "left", "right"],
  inorder: ["left", "visit", "right"],
  postorder: ["left", "right", "visit"],
};

export type ScenarioStep =
  | { op: "insert" | "delete" | "search"; values: readonly number[] }
  | { op: "traverse"; kind: TraversalKind };

/** A scripted example (lesson "Try it" buttons, AVL demos): optionally load a tree, then animate steps. */
export interface Scenario {
  title: string;
  /** Status shown while the starting tree is on screen. */
  intro?: string;
  /** Starting tree (inserted with this tree's own rules); omit to use the tree on screen. */
  base?: readonly number[];
  steps: readonly ScenarioStep[];
}

export interface StartOptions {
  initial: readonly number[];
  /** Rebuild the exact shape with plain BST inserts (a shared pre-order list) instead of this tree's own insert. */
  exact?: boolean;
  /** Undo-history label of the opening state. */
  label?: string;
  ready?: EngineOptions["ready"];
}

export class BSTEngine extends TreeScene {
  private readonly history = new TreeHistory(100);

  /**
   * Show the opening tree. Called by the host right after construction (not from the constructor,
   * so subclass overrides such as AVLEngine.insertSilent are fully set up).
   */
  start(opts: StartOptions): void {
    if (this.busy) return;
    // Built silently and placed instantly: the page opens with a tree already on screen.
    this.reset();
    this.rebuild(opts.initial, opts.exact ?? false);
    this.rotations = 0;
    void this.morph(0);
    const ready = opts.ready;
    this.status(ready?.title ?? `Built a tree from ${plural(opts.initial.length, "key")}`, ready?.detail ?? this.shapeNote(), ready?.tone ?? "info");
    this.history.reset(this.snapshot(opts.label ?? "Opening tree"));
    this.emitHistory();
  }

  // ───────────────────────────── overridable labels / seams ─────────────────────────────

  protected treeName(): string { return "binary search tree"; }
  protected insertCodeId(): CodeId { return "bst-insert"; }
  protected deleteCodeId(): CodeId { return "bst-delete"; }

  /** Plain BST insert used for silent (non-animated) building. AVLEngine rebalances here. */
  protected insertSilent(v: number, make: NodeFactory = this.make): void {
    this.root = bstInsertSilent(this.root, v, make);
  }

  /** One line about the tree's shape after an operation. */
  protected shapeNote(): string {
    const n = size(this.root);
    if (!n) return "The tree is now empty.";
    const h = hOf(this.root);
    const best = minPossibleHeight(n);
    let s = `Height **${h}** for ${plural(n, "node")}`;
    if (h > best + 1) s += h === n && n > 2 ? " — a **linked list**, so search is O(n)." : ` — the best possible is ${best}.`;
    else s += ".";
    return s;
  }

  /** Called after a new leaf is attached under path[path.length - 1]. */
  protected async afterInsert(path: TreeNode[], n: TreeNode): Promise<void> {
    for (let i = path.length - 1; i >= 0; i--) update(path[i]);
    await this.refreshMeta([...path, n]);
    this.status(`✓ Inserted ${n.key}`, this.shapeNote(), "ok");
  }

  /** Called after a node was unlinked; chain = root … lowest node whose subtree changed. */
  protected async afterDelete(chain: TreeNode[], key: number): Promise<void> {
    for (let i = chain.length - 1; i >= 0; i--) update(chain[i]);
    await this.refreshMeta(chain);
    this.status(`✓ Deleted ${key}`, this.shapeNote(), "ok");
  }

  // ───────────────────────────── public API ─────────────────────────────

  keys(): number[] { return keysInOrder(this.root); }

  /** The last completed state (stable even mid-animation) as a fresh tree, for quizzes. */
  stableTree(): TreeNode | null {
    const cur = this.history.current;
    return cur ? buildExact(cur.keys) : cloneTree(this.root);
  }

  /** Pre-order keys of the last completed state — a share link rebuilds this exact shape. */
  shareKeys(): readonly number[] {
    return this.history.current?.keys ?? preorderKeys(this.root);
  }

  /** Undo / redo availability right now (the React mirror may lag one render behind). */
  historyInfo(): HistoryInfo {
    return this.history.info();
  }

  insert(values: readonly number[]): Promise<boolean> {
    return this.run(values.length > 1 ? `Insert ${values.length} keys` : `Insert ${values[0]}`, () => this.opSteps("insert", values), true);
  }

  search(values: readonly number[]): Promise<boolean> {
    return this.run(values.length > 1 ? `Search ${values.length} keys` : `Search ${values[0]}`, () => this.opSteps("search", values));
  }

  remove(values: readonly number[]): Promise<boolean> {
    return this.run(values.length > 1 ? `Delete ${values.length} keys` : `Delete ${values[0]}`, () => this.opSteps("delete", values), true);
  }

  traverse(kind: TraversalKind): Promise<boolean> {
    return this.run(`${TRAVERSAL_NAME[kind]} traversal`, () => this.traverseSteps(kind));
  }

  /** Replace the tree with `values` built silently, then glide it into place. */
  preload(values: readonly number[], done?: StatusInfo): Promise<boolean> {
    return this.run(done?.title ?? "Build tree", async () => {
      this.rebuild(values, false);
      this.rotations = 0;
      this.status(done?.title ?? `Built a tree from ${plural(values.length, "key")}`, done?.detail ?? this.shapeNote(), done?.tone ?? "ok");
      await this.morph(0.9);
    }, true);
  }

  /** Insert `values` one by one with full animation, starting from an empty tree. */
  playSequence(values: readonly number[]): Promise<boolean> {
    return this.scenario({ title: `Insert ${values.length} keys`, base: [], steps: [{ op: "insert", values }] });
  }

  /** Load a starting tree (keeping the views of keys that stay), then animate the steps. */
  scenario(sc: Scenario): Promise<boolean> {
    const mutates = !!sc.base || sc.steps.some((s) => s.op === "insert" || s.op === "delete");
    return this.run(sc.title, async () => {
      if (sc.base) {
        this.rebuild(sc.base, false);
        this.rotations = 0;
        this.vars(undefined);
        if (sc.intro) this.status(sc.title, sc.intro, "merge");
        await this.morph(0.8);
        if (sc.base.length) await this.beat(sc.intro ? 1.4 : 0.4);
      }
      for (let i = 0; i < sc.steps.length; i++) {
        const st = sc.steps[i];
        if (i > 0) await this.resetStyles(0.2);
        if (st.op === "traverse") await this.traverseSteps(st.kind);
        else await this.opSteps(st.op, st.values);
      }
    }, mutates);
  }

  clear(): boolean {
    if (this.busy) return false;
    this.reset();
    this.rotations = 0;
    this.emitStats();
    this.cb.traversal(null);
    this.cb.vars(undefined);
    this.status("Tree cleared", `Empty ${this.treeName()} — insert a key or pick a preset.`);
    this.record("Clear");
    return true;
  }

  // ───────────────────────────── undo / redo ─────────────────────────────

  /** Revert the last whole operation (instant rebuild + a short glide). False when busy or nothing to undo. */
  undo(): boolean {
    if (this.busy) return false;
    const label = this.history.info().undoLabel;
    const s = this.history.undo();
    if (!s) return false;
    this.restore(s, `Undo · ${label}`);
    return true;
  }

  redo(): boolean {
    if (this.busy) return false;
    const s = this.history.redo();
    if (!s) return false;
    this.restore(s, `Redo · ${s.label}`);
    return true;
  }

  private restore(s: TreeSnapshot, title: string) {
    this.clearOverlays();
    this.rebuild(s.keys, true);
    this.rotations = s.rotations;
    void this.resetStyles(0);
    // ~0.35 s of real time whatever the speed setting.
    void this.morph(0.35 * this.director.rate);
    this.cb.traversal(null);
    this.vars(undefined);
    this.subCode(null);
    this.status(title, this.shapeNote(), "info");
    this.emitHistory();
  }

  protected override onRunEnd(label: string, mutated: boolean): void {
    if (mutated) this.record(label);
  }

  private record(label: string) {
    this.history.push(this.snapshot(label));
    this.emitHistory();
  }

  private snapshot(label: string): TreeSnapshot {
    return { keys: preorderKeys(this.root), rotations: this.rotations, label };
  }

  private emitHistory() {
    if (!this.destroyed) this.cb.history(this.history.info());
  }

  /**
   * Rebuild the tree from `keys` — `exact`: plain BST inserts of a pre-order list (exact shape);
   * otherwise this tree's own silent insert. Nodes whose key survives are reused, so their views
   * glide to the new layout instead of being redrawn.
   */
  protected rebuild(keys: readonly number[], exact: boolean): void {
    const old = new Map(collect(this.root).map((n) => [n.key, n] as const));
    const make: NodeFactory = (key) => {
      const n = old.get(key);
      if (!n) return this.make(key);
      old.delete(key);
      n.left = null;
      n.right = null;
      n.h = 1;
      n.bf = 0;
      return n;
    };
    this.root = null;
    for (const k of keys) {
      if (exact) this.root = bstInsertSilent(this.root, k, make);
      else this.insertSilent(k, make);
    }
    collect(this.root).forEach((n) => this.paintMeta(n));
  }

  /** Animate one operation for each value in turn. */
  protected async opSteps(op: "insert" | "delete" | "search", values: readonly number[]): Promise<void> {
    const many = values.length > 1;
    const Op = op === "insert" ? "Insert" : op === "delete" ? "Delete" : "Search";
    let changed = 0;
    for (let i = 0; i < values.length; i++) {
      if (many) this.director.setOp(`${Op} ${values[i]} · ${i + 1}/${values.length}`);
      const v = values[i];
      const ok = op === "insert" ? await this.insertSteps(v) : op === "delete" ? await this.deleteSteps(v) : await this.searchSteps(v);
      if (ok) changed++;
      if (i < values.length - 1) await this.resetStyles(0.2);
    }
    if (!many || op === "search") return;
    const skipped = values.length - changed;
    if (op === "insert") {
      this.status(`✓ Inserted ${plural(changed, "key")}`, this.shapeNote() + (skipped ? ` ${plural(skipped, "duplicate")} skipped.` : ""), "ok");
    } else this.status(`✓ Deleted ${plural(changed, "key")}`, this.shapeNote(), "ok");
  }

  // ───────────────────────────── walking down the tree ─────────────────────────────

  protected async descend(key: number, probe: NodeView, title: string, codeId: CodeId, lines: DescendLines, base: Vars): Promise<DescendResult> {
    const path: TreeNode[] = [];
    const R = this.G.r;
    const lift = this.G.lift;
    let node = this.root;
    while (node) {
      const g = this.pos(node);
      probe.group.moveToTop();
      this.code(codeId, lines.arrive);
      this.vars({ ...base, cur: node.key, depth: path.length, comparisons: path.length + 1 });
      await this.tween(probe.group, { x: g.x, y: g.y - lift }, 0.4);
      await this.nodeStyle(node, "compare", 0.2);

      if (key === node.key) {
        this.code(codeId, lines.equal);
        const lbl = this.label(`found ${key}`, g.x + R + 6, g.y - lift, "ok", "left");
        await this.nodeStyle(node, "success");
        await this.beat(0.5);
        this.dropLabel(lbl);
        return { path, node, found: true };
      }

      const goLeft = key < node.key;
      const dir: Side = goLeft ? "left" : "right";
      const next = node[dir];
      const cmp = `${key} ${goLeft ? "<" : ">"} ${node.key}`;
      this.code(codeId, goLeft ? lines.left : lines.right);
      this.status(title,
        `At **${node.key}**: \`${cmp}\`, so go **${dir}**` +
        (next ? ` to ${next.key}. The whole ${goLeft ? "right" : "left"} subtree of ${node.key} is ruled out.` : " — that spot is **empty**."));
      const lbl = this.label(`${cmp} → ${dir}`, g.x + R + 6, g.y - lift, "info", "left");
      if (next) await this.edgeStyle(node, next, "active");
      await this.beat(0.55);
      this.dropLabel(lbl);
      void this.nodeStyle(node, "base");
      path.push(node);
      node = next;
    }
    return { path, node: null, found: false };
  }

  // ───────────────────────────── INSERT ─────────────────────────────

  /** Animated insert of one key. Returns false when the key was already present. */
  protected async insertSteps(v: number): Promise<boolean> {
    const C = this.insertCodeId();
    const L = LN.insert;
    const title = `Insert ${v}`;
    this.code(C, L.head);
    this.vars({ key: v });
    const n = this.make(v);
    const start = this.rootPos();
    const view = this.makeNodeView(n, start.x, start.y - 80);
    view.meta?.root.visible(false);
    view.group.setAttrs({ scaleX: 0.01, scaleY: 0.01 });
    view.group.moveToTop();
    this.floating.add(n.id);
    void this.styleView(view, "moving", 0);
    await this.tween(view.group, { y: start.y - this.G.lift, scaleX: 1, scaleY: 1 }, 0.4, backOut);

    if (!this.root) {
      this.code(C, L.empty);
      this.status(title, `The tree is empty, so **${v}** becomes the root. A single node has height 1 and balance 0.`);
      this.root = n;
      this.floating.delete(n.id);
      view.meta?.root.visible(this.showMeta);
      await this.morph(0.6);
      await this.nodeStyle(n, "success");
      this.status(`✓ Inserted ${v}`, "The root is the only node.", "ok");
      await this.beat(0.4);
      return true;
    }

    this.code(C, L.start);
    this.status(title, "Walk down from the root like a search: smaller keys go **left**, larger keys go **right**, until we fall off the tree.");
    const { path, found } = await this.descend(v, view, title, C, { arrive: [L.loop, L.dup], equal: L.dup, left: [L.parent, L.left], right: [L.parent, L.right] }, { key: v });

    if (found) {
      this.status(`${v} is already in the tree`, "Keys in a search tree are unique, so nothing is inserted.", "danger");
      void this.styleView(view, "danger");
      await this.shake(view.group);
      await this.tween(view.group, { opacity: 0, scaleX: 0.01, scaleY: 0.01 }, 0.35);
      view.group.destroy();
      this.nodeViews.delete(n.id);
      this.floating.delete(n.id);
      return false;
    }

    const parent = path[path.length - 1];
    const side: Side = v < parent.key ? "left" : "right";
    this.code(C, side === "left" ? L.attachLeft : L.attachRight);
    this.vars({ key: v, parent: parent.key, side, depth: path.length });
    this.status(`Attach ${v}`,
      `${parent.key}'s ${side} slot is empty, so **${v}** becomes its ${side} child. A new node is always a **leaf**: height 1, balance 0.`);
    parent[side] = n;
    this.floating.delete(n.id);
    view.meta?.root.visible(this.showMeta);
    await this.morph(0.65);
    await this.nodeStyle(n, "success");
    await this.wait(0.3);
    void this.nodeStyle(n, "base");

    // Template-Method seam: BST refreshes heights; AVL retraces and rotates.
    await this.afterInsert(path, n);
    await this.wait(0.4);
    return true;
  }

  // ───────────────────────────── DELETE ─────────────────────────────

  /** Animated delete of one key. Returns false when the key was not found. */
  protected async deleteSteps(v: number): Promise<boolean> {
    const C = this.deleteCodeId();
    const L = LN.delete;
    const title = `Delete ${v}`;
    this.code(C, L.head);
    this.vars({ key: v });
    if (!this.root) {
      this.code(C, L.missing);
      this.status(title, "The tree is empty — there is nothing to delete.", "danger");
      return false;
    }
    this.code(C, L.search);
    this.status(title, `First find **${v}** with a normal BST search.`);
    const probe = await this.probe(v, "danger");
    const { path, node: z } = await this.descend(v, probe, title, C, { arrive: L.search, equal: L.search, left: L.search, right: L.search }, { key: v });

    if (!z) {
      this.code(C, L.missing);
      void this.styleView(probe, "danger");
      await this.shake(probe.group);
      this.status(`✗ ${v} not found`, "The search fell off the tree, so there is nothing to delete.", "danger");
      await this.tween(probe.group, { opacity: 0 }, 0.4);
      probe.group.destroy();
      await this.wait(0.4);
      return false;
    }

    const zv = this.view(z);
    await this.tween(probe.group, { x: zv?.group.x() ?? 0, y: zv?.group.y() ?? 0, opacity: 0 }, 0.35);
    probe.group.destroy();
    await this.nodeStyle(z, "danger");
    await this.pulse(zv);

    const parent = path[path.length - 1] ?? null;
    let chain: TreeNode[];
    if (z.left && z.right) {
      chain = await this.deleteTwoChildren(z, path);
    } else {
      const child = z.left ?? z.right;
      if (child) {
        this.code(C, [L.one, L.child]);
        this.vars({ key: v, case: "one child", child: child.key, parent: parent?.key ?? "—" });
        this.status(`${v} has one child`,
          `**Case 2.** Its only child **${child.key}** (with its subtree) moves up into the gap` +
          (parent ? ` — every key there is already on the correct side of ${parent.key}.` : " and becomes the new root."), "danger");
        await this.subtreeStyle(child, "left");
      } else {
        this.code(C, L.leaf);
        this.vars({ key: v, case: "leaf", parent: parent?.key ?? "—" });
        this.status(`${v} is a leaf`, "**Case 1.** A leaf has no children, so it can simply be cut off.", "danger");
      }
      await this.beat(0.6);
      this.code(C, child ? L.replaceChild : L.unlinkLeaf);
      await this.tween(zv?.group, { scaleX: 0.01, scaleY: 0.01, opacity: 0 }, 0.4);
      this.root = replaceChild(this.root, parent, z, child);
      await this.morph(0.75);
      chain = path;
    }

    await this.resetStyles(0.25);
    // Template-Method seam: BST refreshes heights; AVL retraces and rotates.
    await this.afterDelete(chain, v);
    await this.wait(0.4);
    return true;
  }

  protected async deleteTwoChildren(z: TreeNode, path: TreeNode[]): Promise<TreeNode[]> {
    const C = this.deleteCodeId();
    const L = LN.delete;
    this.code(C, L.two);
    this.vars({ key: z.key, case: "two children" });
    this.status(`${z.key} has two children`,
      "**Case 3.** Replace it with its **in-order successor**, the smallest key in its right subtree — that keeps the left side smaller and the right side larger.", "warn");
    await this.beat(0.8);

    const below: TreeNode[] = []; // nodes between z and the successor
    let s = z.right!;
    this.code(C, L.succStart);
    this.vars({ key: z.key, case: "two children", s: s.key });
    await this.edgeStyle(z, s, "active");
    let lbl = this.nodeLabel(s, "right once", "info");
    await this.nodeStyle(s, "compare", 0.2);
    await this.beat(0.45);
    this.dropLabel(lbl);
    while (s.left) {
      this.code(C, L.succLoop);
      lbl = this.nodeLabel(s, "then left", "info");
      await this.edgeStyle(s, s.left, "active");
      await this.beat(0.4);
      this.dropLabel(lbl);
      below.push(s);
      s = s.left;
      this.vars({ key: z.key, case: "two children", s: s.key });
      await this.nodeStyle(s, "compare", 0.2);
    }

    // 1 — successor found
    const sv = this.view(s);
    await this.nodeStyle(s, "moving");
    await this.pulse(sv);
    lbl = this.nodeLabel(s, `successor ${s.key}`, "warn");
    this.status("Step 1 · Found the successor",
      `**${s.key}** is the smallest key larger than ${z.key}: it has no left child` +
      (below.length && s.right ? `, and its right child ${s.right.key} will slide up into its old spot.` : ", so it is easy to lift out."), "warn");
    await this.beat(0.8);
    this.dropLabel(lbl);

    // 2 — hollow out z
    const zv = this.view(z);
    this.status("Step 2 · Remove the key", `${z.key} is removed, leaving a hole that still holds its two subtrees together.`, "danger");
    if (zv) {
      zv.meta?.root.visible(false);
      zv.circle.dash([5, 4]);
      zv.circle.dashEnabled(true);
      await Promise.all([
        this.tween(zv.circle, { fill: "rgba(255,253,248,0)", stroke: HOLE_STROKE, strokeWidth: 2, shadowOpacity: 0 }, 0.4),
        this.tween(zv.text, { opacity: 0 }, 0.4),
      ]);
    }
    await this.beat(0.4);

    // 3 — successor flies up into the hole
    const parent = path[path.length - 1] ?? null;
    this.code(C, below.length ? [L.notDirect, L.spliceS, L.sRight, L.sLeft, L.replaceZ] : [L.notDirect, L.sLeft, L.replaceZ]);
    this.status("Step 3 · Successor moves up",
      `${s.key} leaves its spot` + (below.length && s.right ? `, ${s.right.key} moves up to replace it,` : "") +
      ` and ${s.key} takes over ${z.key}'s place and both of its subtrees.`, "warn");
    promoteSuccessor(z, s, below);
    this.root = replaceChild(this.root, parent, z, s);
    sv?.group.moveToTop();
    await this.morph(0.95);
    this.paintMeta(s);
    await this.nodeStyle(s, "success");
    await this.beat(0.4);
    return [...path, s, ...below];
  }

  // ───────────────────────────── SEARCH ─────────────────────────────

  protected async searchSteps(v: number): Promise<boolean> {
    const C: CodeId = "search";
    const L = LN.search;
    const title = `Search ${v}`;
    this.code(C, L.head);
    this.vars({ key: v });
    if (!this.root) {
      this.code(C, L.missing);
      this.status(title, "The tree is empty.", "danger");
      return false;
    }
    this.code(C, L.start);
    this.status(title, "Start at the root: smaller → go left, larger → go right. Each comparison rules out a whole subtree.");
    const probe = await this.probe(v, "compare");
    const { path, node, found } = await this.descend(v, probe, title, C, { arrive: [L.loop, L.found], equal: L.found, left: L.left, right: L.right }, { key: v });
    const total = size(this.root);

    if (found && node) {
      const nv = this.view(node);
      await this.tween(probe.group, { x: nv?.group.x() ?? 0, y: nv?.group.y() ?? 0, opacity: 0 }, 0.4);
      probe.group.destroy();
      await this.pulse(nv);
      this.status(`✓ Found ${v}`,
        `**${plural(path.length + 1, "comparison")}** out of ${plural(total, "node")} — each one skipped a whole subtree.`, "ok");
    } else {
      this.code(C, L.missing);
      void this.styleView(probe, "danger");
      await this.shake(probe.group);
      this.status(`✗ ${v} not found`,
        `Fell off the tree after **${plural(path.length, "comparison")}**: the empty spot where ${v} would have to be proves it isn't stored.`, "danger");
      await this.tween(probe.group, { opacity: 0 }, 0.4);
      probe.group.destroy();
    }
    await this.beat(0.8);
    return found;
  }

  // ───────────────────────────── TRAVERSALS ─────────────────────────────

  protected async traverseSteps(kind: TraversalKind): Promise<void> {
    const title = `${TRAVERSAL_NAME[kind]} traversal`;
    const how = TRAVERSAL_HOW[kind];
    this.code(kind, 1);
    this.vars(undefined);
    if (!this.root) {
      this.status(title, "The tree is empty — there is nothing to visit.", "danger");
      return;
    }
    const out: number[] = [];
    const outText = () => (out.length ? out.join(" → ") : "—");
    this.cb.traversal({ kind, keys: [], done: false });
    this.beginOutput();
    this.status(title, how);
    await this.beat(0.6);

    const visit = async (n: TreeNode, line: number, why: string) => {
      this.code(kind, line);
      const nv = this.view(n);
      await this.nodeStyle(n, "moving", 0.15);
      void this.pulse(nv);
      const flight = this.flyToOutput(n, out.length);
      out.push(n.key);
      this.cb.traversal({ kind, keys: [...out], done: false });
      this.status(`Visit ${n.key}`, `${why}\nOutput so far: **${outText()}**`);
      await flight;
      void this.nodeStyle(n, "visited", 0.25);
      await this.beat(0.3);
    };

    if (kind === "levelorder") {
      const LL = LN.level;
      const q: TreeNode[] = [this.root];
      const qText = () => (q.length ? q.map((m) => m.key).join(", ") : "∅");
      this.code(kind, LL.init);
      this.vars({ node: "—", queue: qText(), visited: 0 });
      await this.nodeStyle(this.root, "left", 0.2);
      await this.beat(0.4);
      while (q.length) {
        this.code(kind, LL.loop);
        const n = q.shift()!;
        this.code(kind, LL.dequeue);
        this.vars({ node: n.key, queue: qText(), visited: out.length });
        await visit(n, LL.visit, `${n.key} was at the front of the queue, so it is visited next — level by level, left to right.`);
        for (const side of ["left", "right"] as const) {
          const c = n[side];
          if (!c) continue;
          this.code(kind, side === "left" ? LL.left : LL.right);
          q.push(c);
          this.vars({ node: n.key, queue: qText(), visited: out.length });
          void this.edgeStyle(n, c, "active", 0.2);
          await this.nodeStyle(c, "left", 0.2);
          await this.wait(0.15);
        }
      }
    } else {
      const LT = LN.traversal[kind];
      const order = RECURSION_ORDER[kind];
      const stack: number[] = [];
      const why = (n: TreeNode) =>
        kind === "preorder" ? `Pre-order outputs **${n.key}** as soon as the call reaches it — before either subtree.`
          : kind === "inorder" ? `${n.key}'s left subtree is finished, so output **${n.key}** — then its right subtree.`
            : `Both subtrees of ${n.key} are finished, so **${n.key}** is output last.`;
      const rec = async (n: TreeNode | null, from: TreeNode | null): Promise<void> => {
        if (!n) {
          this.code(kind, LT.check);
          await this.wait(0.12);
          return;
        }
        stack.push(n.key);
        const callVars = () => ({ node: n.key, depth: stack.length - 1, stack: stack.join(" › "), visited: out.length });
        this.vars(callVars());
        this.code(kind, 1);
        if (from) void this.edgeStyle(from, n, "active", 0.2);
        await this.nodeStyle(n, "compare", 0.2);
        this.status(`Call ${kind}(${n.key})`,
          `${how}\nBlue nodes are calls still in progress (the call stack).\nOutput so far: **${outText()}**`);
        await this.beat(0.25);
        for (const step of order) {
          if (step === "visit") {
            await visit(n, LT.visit, why(n));
          } else {
            this.code(kind, LT[step]);
            this.vars(callVars());
            await rec(n[step], n);
            this.vars(callVars());
          }
        }
        stack.pop();
        if (from) void this.edgeStyle(from, n, "base", 0.3);
      };
      await rec(this.root, null);
    }

    this.cb.traversal({ kind, keys: [...out], done: true });
    this.vars({ visited: out.length });
    this.status(`✓ ${title}`, `Output: **${outText()}**` + (kind === "inorder" ? "\nSorted — that is the BST property at work." : ""), "ok");
    await this.wait(1);
  }
}
