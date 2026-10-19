/**
 * "Quiz me" questions generated from the tree on screen (VisuAlgo-training style). Pure: no React.
 *
 * Every answer is computed from the current tree (heights from scratch, never the stored values),
 * distractors are the mistakes learners actually make (wrong traversal order, predecessor instead
 * of successor, a wrong turn on the search path, the wrong rotation case, …), deduplicated and
 * shuffled. `scratchpad` scripts re-derive every answer independently.
 */
import { cloneTree, collect, deleteKey, findPath, fmtBf, keysInOrder, maxNode, minNode, traversalOrder, trueHeight } from "./tree";
import type { RotationCase, TraversalKind, TreeNode } from "./types";

export type QuizKind = "traversal" | "successor" | "search" | "height" | "balance" | "insertSpot" | "rotation" | "delete";

export interface TreeQuestion {
  kind: QuizKind;
  /** The key the question is about (x or v); null for whole-tree questions. */
  subject: number | null;
  prompt: string;
  choices: string[];
  answer: number;
  explain: string;
}

export type Rng = () => number;

export interface QuizOptions {
  avl: boolean;
  rng?: Rng;
  /** Force one question type (tests). */
  kind?: QuizKind;
  /** Avoid repeating the previous type when another one is possible. */
  avoid?: QuizKind | null;
  /** Typed values are VALUE_MIN … VALUE_MAX; generated keys stay inside it. */
  min?: number;
  max?: number;
}

export const QUIZ_KINDS: Record<"bst" | "avl", readonly QuizKind[]> = {
  bst: ["traversal", "successor", "search", "height", "balance", "insertSpot", "delete"],
  avl: ["traversal", "successor", "search", "height", "balance", "rotation", "delete"],
};

interface Ctx {
  root: TreeNode;
  avl: boolean;
  rng: Rng;
  min: number;
  max: number;
}

// ───────────────────────────── helpers ─────────────────────────────

const pick = <T,>(a: readonly T[], rng: Rng): T => a[Math.floor(rng() * a.length)];
const randInt = (lo: number, hi: number, rng: Rng) => lo + Math.floor(rng() * (hi - lo + 1));

function shuffle<T>(a: readonly T[], rng: Rng): T[] {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Up to 3 distinct distractors (in priority order), shuffled in with the answer. */
function finish(
  c: Ctx, kind: QuizKind, subject: number | null, prompt: string, correct: string,
  distractors: readonly (string | null | undefined)[], explain: string, minChoices = 3,
): TreeQuestion | null {
  const seen = new Set([correct]);
  const picked: string[] = [];
  for (const d of distractors) {
    if (d == null || seen.has(d)) continue;
    seen.add(d);
    picked.push(d);
    if (picked.length === 3) break;
  }
  if (picked.length + 1 < minChoices) return null;
  const choices = shuffle([correct, ...picked], c.rng);
  return { kind, subject, prompt, choices, answer: choices.indexOf(correct), explain };
}

const NAME: Record<TraversalKind, string> = {
  preorder: "pre-order", inorder: "in-order", postorder: "post-order", levelorder: "level-order",
};

/** Keys in traversal order; `mirror` visits right before left (a classic slip). */
function order(root: TreeNode | null, kind: TraversalKind, mirror = false): number[] {
  if (!mirror) return traversalOrder(root, kind).map((n) => n.key);
  const out: number[] = [];
  if (kind === "levelorder") {
    const q = root ? [root] : [];
    while (q.length) {
      const n = q.shift()!;
      out.push(n.key);
      if (n.right) q.push(n.right);
      if (n.left) q.push(n.left);
    }
    return out;
  }
  const rec = (n: TreeNode | null) => {
    if (!n) return;
    if (kind === "preorder") out.push(n.key);
    rec(n.right);
    if (kind === "inorder") out.push(n.key);
    rec(n.left);
    if (kind === "postorder") out.push(n.key);
  };
  rec(root);
  return out;
}

/** Recompute every stored height / balance factor bottom-up (the delete simulation relies on them). */
function refreshHeights(n: TreeNode | null): number {
  if (!n) return 0;
  const hl = refreshHeights(n.left), hr = refreshHeights(n.right);
  n.h = 1 + Math.max(hl, hr);
  n.bf = hl - hr;
  return n.h;
}

const parentOf = (root: TreeNode, key: number): TreeNode | null => findPath(root, key).path.at(-1) ?? null;

/** A value that is not in the tree, near its key range (null if none could be found). */
function absentValue(c: Ctx, keys: readonly number[]): number | null {
  const set = new Set(keys);
  const lo = Math.max(c.min, (keys[0] ?? 50) - 10);
  const hi = Math.min(c.max, (keys.at(-1) ?? 50) + 10);
  for (let t = 0; t < 60; t++) {
    const v = randInt(lo, hi, c.rng);
    if (!set.has(v)) return v;
  }
  for (let v = lo; v <= hi; v++) if (!set.has(v)) return v;
  return null;
}

const cmpText = (v: number, path: readonly TreeNode[]) => path.map((n) => `${v} ${v < n.key ? "<" : ">"} ${n.key}`).join(", ");

// ───────────────────────────── question types ─────────────────────────────

function qTraversal(c: Ctx): TreeQuestion | null {
  const kinds: TraversalKind[] = ["preorder", "inorder", "postorder", "levelorder"];
  const kind = pick(kinds, c.rng);
  const n = collect(c.root).length;
  if (n < 3) return null;
  const cut = n > 10 ? 8 : n;
  const fmt = (keys: number[]) => keys.slice(0, cut).join(", ") + (n > cut ? ", …" : "");
  const correct = fmt(order(c.root, kind));
  const others = shuffle([
    ...kinds.filter((k) => k !== kind).map((k) => order(c.root, k)),
    order(c.root, kind, true),
    order(c.root, kind).reverse(),
  ].map(fmt), c.rng);
  const why: Record<TraversalKind, string> = {
    preorder: `Pre-order = **node, left subtree, right subtree**: the root ${c.root.key} is output first, then everything to its left.`,
    inorder: "In-order = **left subtree, node, right subtree** — on a BST that is simply the keys in **sorted** order.",
    postorder: `Post-order = **left subtree, right subtree, node**: children always come before their parent, so the root ${c.root.key} is last.`,
    levelorder: `Level-order visits the tree **level by level**, left to right, with a queue: ${c.root.key} first, then its children.`,
  };
  const prompt = n > cut
    ? `What are the first **${cut}** keys of a **${NAME[kind]}** traversal of this tree?`
    : `What does a **${NAME[kind]}** traversal of this tree output?`;
  return finish(c, "traversal", null, prompt, correct, others, why[kind]);
}

function qSuccessor(c: Ctx): TreeQuestion | null {
  const sorted = keysInOrder(c.root);
  const nodes = collect(c.root).filter((m) => m.key !== sorted.at(-1));
  if (!nodes.length || sorted.length < 3) return null;
  const withRight = nodes.filter((m) => m.right);
  const x = withRight.length && c.rng() < 0.65 ? pick(withRight, c.rng) : pick(nodes, c.rng);
  const i = sorted.indexOf(x.key);
  const s = sorted[i + 1];
  const p = parentOf(c.root, x.key);
  const ds = [
    i > 0 ? sorted[i - 1] : null, x.right?.key, p?.key, maxNode(x.right)?.key, x.left?.key,
    sorted[i + 2], minNode(c.root)?.key, maxNode(c.root)?.key,
  ].filter((k): k is number => k != null && k !== x.key).map(String);
  const explain = x.right
    ? `${x.key} has a right subtree, so its successor is the **smallest key in it**: go right to ${x.right.key}, then left as far as possible → **${s}**.`
    : `${x.key} has no right subtree, so climb up until you arrive from a left child: the first ancestor larger than ${x.key} is **${s}**.`;
  return finish(c, "successor", x.key,
    `What is the **in-order successor** of **${x.key}** (the next larger key in the tree)?`, String(s), ds, explain);
}

/** Keys compared when searching for v in the subtree `from`. */
function searchFrom(from: TreeNode | null, v: number): number[] {
  const out: number[] = [];
  let n = from;
  while (n) {
    out.push(n.key);
    if (n.key === v) break;
    n = v < n.key ? n.left : n.right;
  }
  return out;
}

function qSearch(c: Ctx): TreeQuestion | null {
  const keys = keysInOrder(c.root);
  let v: number | null = c.rng() < 0.6 ? pick(keys, c.rng) : absentValue(c, keys);
  if (v === null) v = pick(keys, c.rng);
  const { path, node } = findPath(c.root, v);
  const seq = [...path, ...(node ? [node] : [])].map((m) => m.key);
  if (seq.length < 2) return null;
  const fmt = (a: number[]) => a.join(" → ");
  const ds: string[] = [];
  // a wrong turn at some step, then searching on correctly from there
  for (const at of shuffle(seq.map((_, k) => k), c.rng)) {
    const here = [...path, ...(node ? [node] : [])][at];
    const wrong = v < here.key ? here.right : here.left;
    if (wrong) ds.push(fmt([...seq.slice(0, at + 1), ...searchFrom(wrong, v)]));
  }
  ds.splice(2);
  ds.push(fmt(seq.slice(0, -1)));                       // stopped one step early
  const last = node ?? path.at(-1)!;
  const past = last.left ?? last.right;
  if (past) ds.push(fmt([...seq, past.key]));          // kept going past the target
  const i = keys.findIndex((k) => k >= v);
  for (const other of [keys[i - 1], keys[i + 1]]) if (other !== undefined && other !== v) ds.push(fmt(searchFrom(c.root, other)));
  const explain = node
    ? `Smaller → go left, larger → go right: ${cmpText(v, path)}${path.length ? ", then " : ""}**found ${v}** after ${seq.length} comparisons.`
    : `Smaller → go left, larger → go right: ${cmpText(v, path)}. The next spot is empty, so **${v} is not in the tree** (${seq.length} comparisons).`;
  return finish(c, "search", v, `Searching for **${v}**: which keys are compared, in order?`, fmt(seq), shuffle(ds, c.rng), explain);
}

function pickNode(c: Ctx, preferInner = 0.75): TreeNode {
  const nodes = collect(c.root);
  const inner = nodes.filter((m) => m.left || m.right);
  return inner.length && c.rng() < preferInner ? pick(inner, c.rng) : pick(nodes, c.rng);
}

function qHeight(c: Ctx): TreeQuestion | null {
  const x = pickNode(c);
  const h = trueHeight(x), hl = trueHeight(x.left), hr = trueHeight(x.right);
  const depth = findPath(c.root, x.key).path.length;
  const ds = shuffle([h - 1, h + 1, h + 2, depth + 1, collect(x).length, h - 2], c.rng)
    .filter((d) => d >= 0 && d !== h).map(String);
  return finish(c, "height", x.key,
    `What is the **height** of node **${x.key}**? (Count the nodes on the longest path down — a leaf has height 1.)`,
    String(h), ds, `height = 1 + max(h(left), h(right)) = 1 + max(${hl}, ${hr}) = **${h}**.`);
}

function qBalance(c: Ctx): TreeQuestion | null {
  const x = pickNode(c, 0.85);
  const hl = trueHeight(x.left), hr = trueHeight(x.right);
  const bf = hl - hr;
  const pool = c.avl ? [-2, -1, 0, 1, 2] : [bf - 2, bf - 1, bf + 1, bf + 2];
  const ds = shuffle([-bf, ...shuffle(pool, c.rng)], c.rng).filter((d) => d !== bf).map(fmtBf);
  const note = Math.abs(bf) > 1 ? " That is outside −1…+1 — an AVL tree would rotate here."
    : c.avl ? " In an AVL tree every node stays within −1…+1." : "";
  return finish(c, "balance", x.key,
    `What is the **balance factor** of **${x.key}**, i.e. h(left) − h(right)?`,
    fmtBf(bf), ds, `h(left) = ${hl} and h(right) = ${hr}, so bf = ${hl} − ${hr} = **${fmtBf(bf)}**.${note}`);
}

function qInsertSpot(c: Ctx): TreeQuestion | null {
  const keys = keysInOrder(c.root);
  const v = absentValue(c, keys);
  if (v === null) return null;
  const { path } = findPath(c.root, v);
  const parent = path.at(-1)!;
  const side = v < parent.key ? "left" : "right";
  const slot = (s: string, k: number) => `${s} child of ${k}`;
  const ds: string[] = [slot(side === "left" ? "right" : "left", parent.key)];
  const gp = path.at(-2);
  if (gp) ds.push(slot(v < gp.key ? "right" : "left", gp.key));
  const free = shuffle(collect(c.root).filter((m) => m !== parent), c.rng);
  for (const m of free) {
    if (!m.left) ds.push(slot("left", m.key));
    if (!m.right) ds.push(slot("right", m.key));
  }
  return finish(c, "insertSpot", v, `Where does **${v}** end up when it is inserted?`, slot(side, parent.key), ds,
    `Walk down like a search: ${cmpText(v, path)}. The empty spot is the **${side} child of ${parent.key}** — a new key always becomes a leaf.`);
}

interface Imbalance {
  kase: RotationCase;
  z: TreeNode;
  y: TreeNode;
  bf: number;
}

/**
 * Where inserting v would first break the AVL rule (independent of the engine: plain insert into
 * a copy, heights recomputed from scratch, case named by the textbook key comparisons).
 */
export function predictInsertImbalance(root: TreeNode, v: number): Imbalance | null {
  const t = cloneTree(root)!;
  const { path, node } = findPath(t, v);
  if (node || !path.length) return null;
  const parent = path.at(-1)!;
  const leaf: TreeNode = { id: "q", key: v, left: null, right: null, h: 1, bf: 0 };
  if (v < parent.key) parent.left = leaf;
  else parent.right = leaf;
  for (let i = path.length - 1; i >= 0; i--) {
    const z = path[i];
    const bf = trueHeight(z.left) - trueHeight(z.right);
    if (Math.abs(bf) <= 1) continue;
    const y = (v < z.key ? z.left : z.right)!;
    const kase: RotationCase = v < z.key ? (v < y.key ? "LL" : "LR") : v > y.key ? "RR" : "RL";
    return { kase, z, y, bf };
  }
  return null;
}

const caseText = (kase: RotationCase, z: number, y: number | undefined): string => {
  switch (kase) {
    case "LL": return `LL · right rotation at ${z}`;
    case "RR": return `RR · left rotation at ${z}`;
    case "LR": return `LR · left at ${y}, then right at ${z}`;
    case "RL": return `RL · right at ${y}, then left at ${z}`;
  }
};
const NO_ROTATION = "No rotation needed";

function qRotation(c: Ctx): TreeQuestion | null {
  const keys = keysInOrder(c.root);
  // Every value inside the same gap between neighbouring keys lands in the same empty slot.
  const gaps: number[] = [];
  if (keys[0] > c.min) gaps.push(randInt(Math.max(c.min, keys[0] - 12), keys[0] - 1, c.rng));
  for (let i = 0; i + 1 < keys.length; i++) if (keys[i + 1] - keys[i] >= 2) gaps.push(randInt(keys[i] + 1, keys[i + 1] - 1, c.rng));
  if (keys.at(-1)! < c.max) gaps.push(randInt(keys.at(-1)! + 1, Math.min(c.max, keys.at(-1)! + 12), c.rng));
  if (!gaps.length) return null;
  const hits = gaps.filter((v) => predictInsertImbalance(c.root, v));
  const v = hits.length && c.rng() < 0.85 ? pick(hits, c.rng) : pick(gaps, c.rng);
  const hit = predictInsertImbalance(c.root, v);
  const { path } = findPath(c.root, v);

  /** Every case that could be named at node m (its pivot child must exist). */
  const casesAt = (m: TreeNode, only?: RotationCase) =>
    (["LL", "RR", "LR", "RL"] as const)
      .filter((k) => (!only || k === only) && (k[0] === "L" ? m.left : m.right))
      .map((k) => caseText(k, m.key, (k[0] === "L" ? m.left : m.right)!.key));

  let correct: string, explain: string;
  let ds: string[];
  if (hit) {
    const z = path.find((m) => m.key === hit.z.key)!;
    const heavy = hit.bf > 0 ? "left" : "right";
    const zig = hit.kase === "LR" || hit.kase === "RL";
    correct = caseText(hit.kase, hit.z.key, hit.y.key);
    // "no rotation", the other cases at the right node, the right case at the wrong node
    ds = [NO_ROTATION, ...shuffle([...casesAt(z), ...path.filter((m) => m !== z).flatMap((m) => casesAt(m, hit.kase))], c.rng)];
    explain = `After ${v} is attached, **${hit.z.key}** is the lowest unbalanced node (bf ${fmtBf(hit.bf)}, ${heavy}-heavy) and ${v} went ${heavy} of it, then ${v < hit.y.key ? "left" : "right"} of ${hit.y.key}` +
      (zig ? " — a zig-zag, so **two rotations**." : " — a straight line, so **one rotation**.");
  } else {
    correct = NO_ROTATION;
    ds = shuffle([...path].reverse().slice(0, 3).flatMap((m) => casesAt(m)), c.rng);
    explain = `Every ancestor of the new leaf (under ${path.at(-1)?.key}) keeps its balance factor within −1…+1, so no rotation is needed.`;
  }
  return finish(c, "rotation", v, `Insert **${v}** into this AVL tree. Which rebalancing case does it trigger?`, correct, ds, explain);
}

/** Delete with the in-order PREDECESSOR instead (mirror the tree, delete, mirror back). */
function deleteWithPredecessor(root: TreeNode | null, key: number, avl: boolean): TreeNode | null {
  const mirror = (n: TreeNode | null): TreeNode | null =>
    n ? { ...n, key: -n.key, bf: -n.bf, left: mirror(n.right), right: mirror(n.left) } : null;
  return mirror(deleteKey(mirror(cloneTree(root)), -key, avl).root);
}

function qDelete(c: Ctx): TreeQuestion | null {
  const nodes = collect(c.root);
  if (nodes.length < 3) return null;
  const two = nodes.filter((m) => m.left && m.right);
  const inner = nodes.filter((m) => m.left || m.right);
  const x = two.length && c.rng() < 0.6 ? pick(two, c.rng) : inner.length ? pick(inner, c.rng) : pick(nodes, c.rng);
  const keys = keysInOrder(c.root);
  const succ = x.left && x.right ? keys[keys.indexOf(x.key) + 1] : null;

  // Big trees: ask only which key takes x's place (level-order lists would be too long).
  if (nodes.length > 12 && succ !== null && x.left && x.right) {
    const ds = [x.right.key, x.left.key, parentOf(c.root, x.key)?.key, maxNode(x.right)?.key, keys[keys.indexOf(x.key) - 1]]
      .filter((k): k is number => k != null).map(String);
    return finish(c, "delete", x.key,
      `Delete **${x.key}** (it has two children). Following this page's pseudocode, which key moves into its place?`,
      String(succ), ds,
      `Case 3 uses the **in-order successor**, the smallest key in ${x.key}'s right subtree: right to ${x.right.key}, then left as far as possible → **${succ}**.`);
  }

  const fmt = (r: TreeNode | null) => order(r, "levelorder").join(", ") || "(empty)";
  const res = deleteKey(cloneTree(c.root), x.key, c.avl);
  const plain = deleteKey(cloneTree(c.root), x.key, false).root;
  const ds = [
    c.avl ? fmt(plain) : null,                                                   // forgot to rebalance
    succ !== null ? fmt(deleteWithPredecessor(c.root, x.key, c.avl)) : null,     // used the predecessor
    order(c.root, "levelorder").filter((k) => k !== x.key).join(", "),           // "just erase it from the list"
    succ !== null && c.avl ? fmt(deleteWithPredecessor(c.root, x.key, false)) : null,
  ];
  // Fallback: the right keys in a slightly wrong order.
  const right = order(res.root, "levelorder");
  for (let i = 1; i + 1 < right.length; i++) {
    const w = [...right];
    [w[i], w[i + 1]] = [w[i + 1], w[i]];
    ds.push(w.join(", "));
  }
  const child = x.left ?? x.right;
  const how = !x.left && !x.right ? `${x.key} is a leaf, so it is simply cut off.`
    : succ === null ? `${x.key} has one child, so **${child!.key}** (with its subtree) moves up into its place.`
      : `${x.key} has two children, so its in-order successor **${succ}** (smallest key in its right subtree) takes its place.`;
  const fix = c.avl && res.rotations ? ` Then the retrace finds a node outside −1…+1 and rotates (${res.rotations} rotation${res.rotations > 1 ? "s" : ""}).` : "";
  return finish(c, "delete", x.key,
    `Delete **${x.key}**${succ !== null ? " (two children → this page uses the in-order **successor**)" : ""}. What is the **level-order** of the tree afterwards?`,
    fmt(res.root), ds, how + fix);
}

const GEN: Record<QuizKind, (c: Ctx) => TreeQuestion | null> = {
  traversal: qTraversal, successor: qSuccessor, search: qSearch, height: qHeight,
  balance: qBalance, insertSpot: qInsertSpot, rotation: qRotation, delete: qDelete,
};

/** A question about `root` (null when the tree is empty or nothing sensible can be asked). */
export function makeQuestion(root: TreeNode | null, o: QuizOptions): TreeQuestion | null {
  if (!root) return null;
  const copy = cloneTree(root)!;
  refreshHeights(copy);
  const c: Ctx = { root: copy, avl: o.avl, rng: o.rng ?? Math.random, min: o.min ?? 0, max: o.max ?? 999 };
  const all = QUIZ_KINDS[o.avl ? "avl" : "bst"];
  const order_ = o.kind ? [o.kind] : [...shuffle(all.filter((k) => k !== o.avoid), c.rng), ...all.filter((k) => k === o.avoid)];
  for (const k of order_) {
    const q = GEN[k](c);
    if (q) return q;
  }
  return null;
}
