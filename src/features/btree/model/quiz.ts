/**
 * "Quiz me" questions computed from the B-tree on screen (pure; pass `rng` for tests).
 * Every answer is derived by running the real model on a copy of the tree.
 */
import { BTree, realKeys, type BNode, type FixKind, type ReplaceStrategy } from "./btree";
import { treeFrom, type Snapshot } from "./shape";

export interface Question {
  /** Which generator produced it (tests / analytics). */
  kind: QuizKind;
  prompt: string;
  choices: string[];
  answer: number;
  explain: string;
}

export type QuizKind =
  | "rootChild" | "insertSplit" | "limits" | "splitMedian" | "searchCost"
  | "maxKeysForHeight" | "subtreeKeys" | "deleteFix" | "replacement";

type Rng = () => number;

const keysOf = (n: BNode) => realKeys(n.keys).map((k) => k.v);
const fmt = (vals: readonly number[]) => `[${vals.join(", ")}]`;
const pick = <T,>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];

function shuffle<T>(rng: Rng, xs: T[]): T[] {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [xs[i], xs[j]] = [xs[j], xs[i]];
  }
  return xs;
}

/** Answer + up to `n` distinct distractors, shuffled. */
function choose(rng: Rng, answer: string, distractors: readonly string[], n = 3) {
  const pool = [...new Set(distractors.filter((d) => d !== answer))];
  const picked = shuffle(rng, pool).slice(0, n);
  const choices = shuffle(rng, [answer, ...picked]);
  return { choices, answer: choices.indexOf(answer) };
}

/** Numeric answer with nearby / formula-based distractors (≥ min, distinct). */
function numeric(rng: Rng, answer: number, candidates: readonly number[], min = 0) {
  const pool = candidates.filter((c) => Number.isInteger(c) && c >= min && c !== answer);
  for (let d = 1; pool.length < 6; d++) {
    pool.push(answer + d);
    if (answer - d >= min) pool.push(answer - d);
  }
  return choose(rng, String(answer), pool.map(String));
}

/** Every node with the open key range (lo, hi) that leads into it. */
function allNodes(t: BTree): { node: BNode; lo: number; hi: number }[] {
  const out: { node: BNode; lo: number; hi: number }[] = [];
  const walk = (n: BNode, lo: number, hi: number) => {
    out.push({ node: n, lo, hi });
    const ks = keysOf(n);
    if (!n.leaf) n.children.forEach((c, i) => walk(c, i === 0 ? lo : ks[i - 1], i === ks.length ? hi : ks[i]));
  };
  if (!t.isEmpty()) walk(t.root, -1, 1000);
  return out;
}

/** A value in 1..99 (or above the largest key) that is not in the tree, inside [lo, hi] when possible. */
function freshValue(rng: Rng, t: BTree, lo = 0, hi = 99): number | null {
  const taken = new Set(t.inorder());
  const free: number[] = [];
  for (let v = Math.max(0, lo); v <= Math.min(999, hi); v++) if (!taken.has(v)) free.push(v);
  return free.length ? pick(rng, free) : null;
}

const childLabel = (keys: readonly number[], i: number) =>
  i === 0 ? `child 1 (keys < ${keys[0]})`
    : i === keys.length ? `child ${i + 1} (keys > ${keys[i - 1]})`
      : `child ${i + 1} (between ${keys[i - 1]} and ${keys[i]})`;

// ───────────────────────────── generators ─────────────────────────────

function rootChild(t: BTree, rng: Rng): Question | null {
  if (t.root.leaf) return null;
  const rk = keysOf(t.root);
  const inTree = t.inorder().filter((v) => !rk.includes(v));
  const fresh = freshValue(rng, t, 0, Math.max(99, rk[rk.length - 1] + 10));
  const x = inTree.length && (rng() < 0.6 || fresh === null) ? pick(rng, inTree) : fresh;
  if (x === null) return null;
  const i = BTree.rank(t.root, x);
  const opts = rk.map((_, k) => k).concat(rk.length).filter((k) => Math.abs(k - i) <= 2).map((k) => childLabel(rk, k));
  const { choices, answer } = choose(rng, childLabel(rk, i), [...opts, "none — stop at the root"]);
  return {
    kind: "rootChild",
    prompt: `Searching for **${x}**: which child pointer does the search follow at the root ${fmt(rk)}?`,
    choices, answer,
    explain: `${i === 0 ? `${x} < ${rk[0]}` : i === rk.length ? `${x} > ${rk[i - 1]}` : `${rk[i - 1]} < ${x} < ${rk[i]}`}, ` +
      `so only ${childLabel(rk, i).split(" (")[0]} can contain it — one pointer per level, never two.`,
  };
}

const SPLIT_CHOICES = [
  "No — its leaf still has room",
  "Yes — exactly one split (the leaf)",
  "Yes — splits cascade up 2+ levels",
  "Yes — the root splits and the tree grows taller",
] as const;

/** Insert `x` into a copy and report what split. */
export function simulateInsert(snap: Snapshot, x: number) {
  const t = treeFrom(snap);
  const before = t.stats().height;
  const medians: number[] = [];
  const split = t.splitData.bind(t);
  t.splitData = (node, parent, idx, right) => {
    const r = split(node, parent, idx, right);
    medians.push(r.med.v);
    return r;
  };
  const { node } = t.locate(x);
  const leafKeys = keysOf(node);
  t.insert(x);
  return { splits: medians.length, grew: t.stats().height > before, medians, leafKeys };
}

function insertSplit(t: BTree, snap: Snapshot, rng: Rng): Question | null {
  // Half the time aim at a full leaf, so "yes" answers are common too.
  const full = allNodes(t).filter((n) => n.node.leaf && n.node.keys.length === t.maxKeys);
  let x: number | null = null;
  if (full.length && rng() < 0.6) {
    const { lo, hi } = pick(rng, full);
    x = freshValue(rng, t, lo + 1, hi - 1);
  }
  x ??= freshValue(rng, t, 0, 99);
  if (x === null) return null;
  const sim = simulateInsert(snap, x);
  const cat = sim.grew ? 3 : sim.splits === 0 ? 0 : sim.splits === 1 ? 1 : 2;
  const choices = [...SPLIT_CHOICES];
  const explain = sim.splits === 0
    ? `${x} lands in leaf ${fmt(sim.leafKeys)}, which has ${sim.leafKeys.length} of ${t.maxKeys} keys — room to spare, no split.`
    : `${x} lands in the full leaf ${fmt(sim.leafKeys)} (max ${t.maxKeys}). It splits and ${sim.medians[0]} moves up` +
      (sim.splits > 1 ? `; the parent overflows too (${sim.splits} splits in total)` : "") +
      (sim.grew ? " — the root splits, so the tree grows one level at the top." : ".");
  return {
    kind: "insertSplit",
    prompt: `Order ${t.order}: will inserting **${x}** cause a split?`,
    choices, answer: cat, explain,
  };
}

function limits(t: BTree, rng: Rng): Question | null {
  const m = t.order, max = m - 1, min = Math.ceil(m / 2) - 1;
  const variants = [
    { q: `at most how many **keys** can one node hold`, a: max, why: `A node has at most m = ${m} children, so at most m − 1 = ${max} keys.` },
    { q: `at least how many **keys** must every non-root node hold`, a: min, why: `Minimum = ⌈m/2⌉ − 1 = ⌈${m}/2⌉ − 1 = ${min}. Only the root may have fewer.` },
    { q: `at most how many **children** can one node have`, a: m, why: `That is the definition of the order: m = ${m} child pointers, separated by ${max} keys.` },
    { q: `at least how many **children** must a non-root internal node have`, a: min + 1, why: `⌈m/2⌉ = ${min + 1} children, i.e. ⌈m/2⌉ − 1 = ${min} keys.` },
  ];
  const v = pick(rng, variants);
  const { choices, answer } = numeric(rng, v.a, [m - 2, m - 1, m, m + 1, min, min + 1, Math.floor(m / 2), 2 * m - 1]);
  return { kind: "limits", prompt: `In an order-**${m}** B-tree, ${v.q}?`, choices, answer, explain: v.why };
}

function splitMedian(t: BTree, snap: Snapshot, rng: Rng): Question | null {
  const full = allNodes(t).filter((n) => n.node.leaf && n.node.keys.length === t.maxKeys);
  if (!full.length) return null;
  const { node: leaf, lo, hi } = pick(rng, full);
  const x = freshValue(rng, t, lo + 1, hi - 1);
  if (x === null) return null;
  const over = [...keysOf(leaf), x].sort((a, b) => a - b);
  const mid = Math.floor(over.length / 2);
  const sim = simulateInsert(snap, x);
  const med = sim.medians[0];
  if (med !== over[mid]) return null; // cannot happen — guards against model drift
  const distract = over.filter((v) => v !== med).map(String);
  const { choices, answer } = choose(rng, String(med), [...distract, String(x)]);
  return {
    kind: "splitMedian",
    prompt: `Inserting **${x}** into the full leaf ${fmt(keysOf(leaf))} makes it ${fmt(over)} — too many keys for order ${t.order}. Which key moves up into the parent?`,
    choices, answer,
    explain: `The middle key (index ⌊${over.length}/2⌋ = ${mid}) rises: ${med}. ${fmt(over.slice(0, mid))} stays, ${fmt(over.slice(mid + 1))} becomes a new right sibling.`,
  };
}

function searchCost(t: BTree, rng: Rng): Question | null {
  const h = t.stats().height;
  const vals = t.inorder();
  const hit = vals.length > 0 && rng() < 0.6;
  const x = hit ? pick(rng, vals) : freshValue(rng, t, 0, 99);
  if (x === null) return null;
  const loc = t.locate(x);
  const visited = loc.path.length + 1;
  const { choices, answer } = numeric(rng, visited, [h, h + 1, h - 1, visited + 1, visited - 1, 1], 1);
  return {
    kind: "searchCost",
    prompt: `How many nodes (disk pages) does a search for **${x}** read in this tree?`,
    choices, answer,
    explain: loc.found
      ? `${x} sits at depth ${loc.path.length} in ${fmt(keysOf(loc.node))}: one node per level from the root = ${visited}.`
      : `${x} is not in the tree, so the search walks all the way to a leaf: ${visited} node${visited === 1 ? "" : "s"} (the height).`,
  };
}

function maxKeysForHeight(t: BTree, rng: Rng): Question | null {
  const h = t.stats().height, m = t.order;
  if (h < 1 || h > 4) return null;
  const ans = m ** h - 1;
  const { choices, answer } = numeric(rng, ans, [m ** h, (m - 1) * h, m ** (h - 1) - 1, (m - 1) ** h, m * h, 2 * Math.ceil(m / 2) ** (h - 1) - 1]);
  return {
    kind: "maxKeysForHeight",
    prompt: `This order-${m} tree has **${h}** level${h === 1 ? "" : "s"}. At most how many keys can an order-${m} B-tree with ${h} level${h === 1 ? "" : "s"} hold?`,
    choices, answer,
    explain: `Every node full: level d has ${m}^d nodes of ${m - 1} keys, so (${m} − 1)(1 + ${m} + … + ${m}^${h - 1}) = ${m}^${h} − 1 = ${ans}.`,
  };
}

function subtreeKeys(t: BTree, rng: Rng): Question | null {
  if (t.root.leaf) return null;
  const i = Math.floor(rng() * t.root.children.length);
  const child = t.root.children[i];
  let count = 0, nodes = 0;
  const walk = (n: BNode) => { nodes++; count += realKeys(n.keys).length; if (!n.leaf) n.children.forEach(walk); };
  walk(child);
  const rk = keysOf(t.root);
  const { choices, answer } = numeric(rng, count, [count + 1, count - 1, count + 2, nodes, count + keysOf(child).length], 1);
  return {
    kind: "subtreeKeys",
    prompt: `How many keys are stored in the subtree under the root's ${childLabel(rk, i)}, whose top node is ${fmt(keysOf(child))}?`,
    choices, answer,
    explain: `Count every key in that subtree: ${count} key${count === 1 ? "" : "s"} in ${nodes} node${nodes === 1 ? "" : "s"}.`,
  };
}

const FIX_CHOICES = [
  "No repair needed",
  "Borrow a key from the left sibling",
  "Borrow a key from the right sibling",
  "Merge with a sibling",
] as const;

/** Delete `x` from a copy and report which repairs ran (in order). */
export function simulateDelete(snap: Snapshot, x: number, strategy: ReplaceStrategy) {
  const t = treeFrom(snap);
  const before = t.stats().height;
  const fixes: FixKind[] = [];
  const fix = t.fixUnderflow.bind(t);
  t.fixUnderflow = (p, i) => {
    const k = fix(p, i);
    fixes.push(k);
    return k;
  };
  const loc = t.locate(x);
  const internal = loc.found && !loc.node.leaf;
  const repl = internal ? t.chooseReplacement(loc.node, loc.idx, strategy) : null;
  const replKey = repl ? t.replacementPath(loc.node, loc.idx, repl.side).key.v : null;
  const ok = t.delete(x, strategy);
  return { ok, fixes, shrank: t.stats().height < before, internal, side: repl?.side ?? null, replKey };
}

function deleteFix(t: BTree, snap: Snapshot, rng: Rng, strategy: ReplaceStrategy): Question | null {
  const vals = t.inorder();
  if (!vals.length || t.root.leaf) return null;
  // Prefer leaf keys whose deletion does something interesting, but keep some "no repair" cases.
  const leafVals = allNodes(t).filter((n) => n.node.leaf).flatMap((n) => keysOf(n.node));
  const x = pick(rng, rng() < 0.8 ? leafVals : vals);
  const sim = simulateDelete(snap, x, strategy);
  const first = sim.fixes[0];
  const cat = !first ? 0 : first === "borrow-left" ? 1 : first === "borrow-right" ? 2 : 3;
  const node = t.locate(x).node;
  const where = sim.internal
    ? `${x} is internal, so its ${sim.side} ${sim.replKey} moves up and that leaf loses a key`
    : `${x} is in the leaf ${fmt(keysOf(node))}`;
  const explain = !first
    ? `${where}; the leaf keeps ≥ ${t.minKeys} key${t.minKeys === 1 ? "" : "s"}, so nothing else changes.`
    : first.startsWith("borrow")
      ? `${where} and drops below ${t.minKeys}. The ${first === "borrow-left" ? "left" : "right"} sibling has a spare key, so keys rotate through the parent (the left sibling is tried first).`
      : `${where} and drops below ${t.minKeys}; no adjacent sibling can spare a key, so it merges with one plus their separator` +
        (sim.fixes.length > 1 ? ` — and the repair cascades (${sim.fixes.length} fixes${sim.shrank ? ", the tree gets shorter" : ""}).` : ".");
  return {
    kind: "deleteFix",
    prompt: `What does deleting **${x}** need to keep every node within its limits?${sim.internal ? ` (${strategyText(strategy)} replacement rule)` : ""}`,
    choices: [...FIX_CHOICES], answer: cat, explain,
  };
}

const strategyText = (s: ReplaceStrategy) => (s === "auto" ? "Smart" : s === "predecessor" ? "predecessor" : "successor");

function replacement(t: BTree, snap: Snapshot, rng: Rng, strategy: ReplaceStrategy): Question | null {
  const internal = allNodes(t).filter((n) => !n.node.leaf);
  if (!internal.length) return null;
  const node = pick(rng, internal).node;
  const ks = keysOf(node);
  const idx = Math.floor(rng() * ks.length);
  const x = ks[idx];
  const sim = simulateDelete(snap, x, strategy);
  if (sim.replKey === null) return null;
  const vals = t.inorder();
  const pos = vals.indexOf(x);
  const pred = vals[pos - 1], succ = vals[pos + 1];
  const near = [pred, succ, vals[pos - 2], vals[pos + 2], ...ks.filter((v) => v !== x)].filter((v): v is number => v !== undefined);
  const { choices, answer } = choose(rng, String(sim.replKey), [...near.map(String), "none — the node just loses a key"]);
  const rule = strategy === "auto"
    ? `the Smart rule takes the ${sim.side} ${sim.replKey} because ${sim.side === "predecessor" ? "its leaf can spare a key (or neither can)" : "only the successor's leaf can spare a key"}`
    : `the ${strategy} rule always takes the ${strategy === "predecessor" ? "largest key of the left subtree" : "smallest key of the right subtree"}`;
  return {
    kind: "replacement",
    prompt: `Deleting the internal key **${x}** from ${fmt(ks)} (${strategyText(strategy)} rule): which key takes its place?`,
    choices, answer,
    explain: `An internal key is replaced by its in-order neighbour (predecessor ${pred}, successor ${succ}); ${rule}.`,
  };
}

// ───────────────────────────── entry point ─────────────────────────────

const ALL: QuizKind[] = ["rootChild", "insertSplit", "limits", "splitMedian", "searchCost", "maxKeysForHeight", "subtreeKeys", "deleteFix", "replacement"];

/** A question about `snap`, or null for an empty tree. `only` forces one kind (tests). */
export function makeQuestion(snap: Snapshot, strategy: ReplaceStrategy = "auto", rng: Rng = Math.random, only?: QuizKind): Question | null {
  if (!snap.shape.length) return null;
  const t = treeFrom(snap);
  const gen: Record<QuizKind, () => Question | null> = {
    rootChild: () => rootChild(t, rng),
    insertSplit: () => insertSplit(t, snap, rng),
    limits: () => limits(t, rng),
    splitMedian: () => splitMedian(t, snap, rng),
    searchCost: () => searchCost(t, rng),
    maxKeysForHeight: () => maxKeysForHeight(t, rng),
    subtreeKeys: () => subtreeKeys(t, rng),
    deleteFix: () => deleteFix(t, snap, rng, strategy),
    replacement: () => replacement(t, snap, rng, strategy),
  };
  if (only) return gen[only]();
  for (const kind of shuffle(rng, [...ALL])) {
    const q = gen[kind]();
    if (q) return q;
  }
  return null;
}
