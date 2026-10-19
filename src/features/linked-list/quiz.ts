/*
 * "Quiz me" questions generated from the list on screen (VisuAlgo-style training).
 * Pure TypeScript: answers are computed here from plain arrays and cross-checked against the
 * step recorder by a scratchpad script.
 */
import type { QuizQuestion } from "@/lib/lesson";
import type { ListKind, ListState } from "./engine/types";

type Rand = () => number;

const KIND_WORD: Record<ListKind, string> = { singly: "singly linked", doubly: "doubly linked", circular: "circular" };
export const QUIZ_TYPES = [
  "valueAfterHops", "walkCost", "listAfterOp", "insertOrder", "middle", "nextAfterReverse", "cycle", "complexity", "searchCost",
] as const;
export type QuizType = (typeof QUIZ_TYPES)[number];

const fmt = (xs: readonly number[]) => (xs.length ? xs.join(" → ") : "(empty)");
const nodeLabel = (vals: readonly number[], i: number) => `[${i}] ${vals[i]}`;
const ri = (rand: Rand, a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
const pick = <T,>(rand: Rand, xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];

function shuffle<T>(rand: Rand, xs: T[]): T[] {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [xs[i], xs[j]] = [xs[j], xs[i]];
  }
  return xs;
}

/**
 * Multiple choice from a correct answer and distractor candidates in order of plausibility
 * (deduplicated, the first 3 kept, then all choices shuffled).
 */
function mc(rand: Rand, prompt: string, correct: string, candidates: readonly string[], explain: string): QuizQuestion | null {
  const wrong: string[] = [];
  for (const c of candidates) if (c !== correct && !wrong.includes(c)) wrong.push(c);
  if (wrong.length < 2) return null;
  const choices = shuffle(rand, [correct, ...wrong.slice(0, 3)]);
  return { prompt, choices, answer: choices.indexOf(correct), explain };
}

/** A value that is not in the list (for inserts / misses). */
function freshValue(rand: Rand, vals: readonly number[]): number {
  for (;;) {
    const v = ri(rand, 1, 99);
    if (!vals.includes(v)) return v;
  }
}

/** Numeric distractors: the given ones first, then numbers near `n`. */
const nums = (n: number, ...first: number[]) => [...first, n + 1, n - 1, n + 2].filter((x) => x >= 0).map(String);

// ───────────────────────────── shared answers (also used by the checker) ─────────────────────────────

/** Index returned by findMiddle(): the 2nd middle on NULL-terminated lists, the 1st on a ring. */
export const middleIndex = (n: number, kind: ListKind) => (kind === "circular" ? Math.floor((n - 1) / 2) : Math.floor(n / 2));

/** Hops (`x = x.next`) an operation's walk makes on a list of n nodes. */
export function walkHops(op: "insertHead" | "insertTail" | "deleteTail", n: number, kind: ListKind, tailPtr: boolean): number {
  if (op === "insertHead") return kind === "circular" && !tailPtr && n > 0 ? n - 1 : 0;
  if (op === "insertTail") return tailPtr || n === 0 ? 0 : n - 1;
  if (kind === "doubly") return tailPtr ? 0 : Math.max(0, n - 1);
  return n < 2 ? 0 : n - 2;
}

/** Floyd on 0..n-1 with last.next = node k: index where slow and fast first meet. */
export function floydMeet(n: number, k: number): number {
  const nx = (i: number) => (i === n - 1 ? k : i + 1);
  let slow = 0;
  let fast = 0;
  do {
    slow = nx(slow);
    fast = nx(nx(fast));
  } while (slow !== fast);
  return slow;
}

export type EndOp = "insertHead" | "insertTail" | "deleteHead" | "deleteTail";

/** Big-O of an end operation for this kind of list (matches the complexity card). */
export function endCost(op: EndOp, kind: ListKind, tailPtr: boolean): "O(1)" | "O(n)" {
  if (op === "insertTail") return tailPtr ? "O(1)" : "O(n)";
  if (op === "deleteTail") return kind === "doubly" && tailPtr ? "O(1)" : "O(n)";
  return kind === "circular" && !tailPtr ? "O(n)" : "O(1)";
}

const OP_WORD: Record<EndOp, string> = {
  insertHead: "insert at head", insertTail: "insert at tail", deleteHead: "delete head", deleteTail: "delete tail",
};

// ───────────────────────────── question types ─────────────────────────────

function qValueAfterHops(rand: Rand, s: ListState, vals: number[]): QuizQuestion | null {
  const n = vals.length;
  const circ = s.kind === "circular";
  const k = circ ? ri(rand, 1, 2 * n - 1) : rand() < 0.2 || n === 1 ? n : ri(rand, 1, n - 1);
  const at = (i: number) => (circ ? String(vals[((i % n) + n) % n]) : i >= 0 && i < n ? String(vals[i]) : "NULL");
  const correct = at(k);
  const others = shuffle(rand, vals.map(String));
  const fallback = [Math.max(...vals) + 1, Math.max(...vals) + 2].map(String);
  return mc(rand, `Start at \`head\` and follow \`next\` **${k}** time${k === 1 ? "" : "s"}. Where are you?`, correct,
    [...shuffle(rand, [at(k - 1), at(k + 1), circ ? at(k + 2) : "NULL"]), ...others, ...fallback],
    circ
      ? `The ring wraps around: ${k} hop${k === 1 ? "" : "s"} from head land${k === 1 ? "s" : ""} on index ${k} mod ${n} = **${k % n}**.`
      : k === n
        ? `After ${n} hops you have stepped past the last node: \`curr\` is **NULL**.`
        : `Each hop moves one node, so ${k} hop${k === 1 ? "" : "s"} reach${k === 1 ? "es" : ""} index **${k}**.`);
}

function qWalkCost(rand: Rand, s: ListState, vals: number[]): QuizQuestion | null {
  const n = vals.length;
  const ops: ("insertHead" | "insertTail" | "deleteTail")[] = ["insertTail", "deleteTail"];
  if (s.kind === "circular") ops.push("insertHead");
  const op = pick(rand, ops);
  const hops = walkHops(op, n, s.kind, s.tailPtr);
  const words = { insertHead: "insert at head", insertTail: "insert at tail", deleteTail: "delete tail" }[op];
  const why = hops === 0
    ? op === "deleteTail" && s.kind !== "doubly" ? "With one node there is no walk." : "The tail pointer (or `head`) gives the node directly — no walk."
    : op === "deleteTail" && s.kind !== "doubly"
      ? `It must stop on the **second-to-last** node: ${hops} hops.`
      : `It walks from head to the last node: ${n} nodes, ${hops} hops.`;
  return mc(rand, `On this list (n = ${n}, tail pointer ${s.tailPtr ? "on" : "off"}), how many \`next\` hops does **${words}** make?`,
    String(hops), nums(hops, ...shuffle(rand, [0, n - 1, n, n - 2])), why);
}

function qListAfterOp(rand: Rand, s: ListState, vals: number[]): QuizQuestion | null {
  const n = vals.length;
  const dupVal = vals.find((v, i) => vals.indexOf(v) !== i);
  const kinds: string[] = ["deleteAt", "insertHead"];
  if (n >= 2) kinds.push("reverse", "insertAt", "deleteValue");
  if (dupVal !== undefined) kinds.push("dedupe");
  const kind = pick(rand, kinds);
  const without = (i: number) => vals.filter((_, j) => j !== i);
  const withAt = (i: number, v: number) => [...vals.slice(0, i), v, ...vals.slice(i)];
  switch (kind) {
    case "reverse": {
      const rev = [...vals].reverse();
      return mc(rand, "What does the list read from `head` after `reverse()`?", fmt(rev),
        [fmt(vals), fmt([...rev.slice(1), rev[0]]), fmt([vals[0], ...vals.slice(1).reverse()]), fmt([...vals.slice(1), vals[0]])],
        "Every `next` arrow flips, so the old tail becomes the new head.");
    }
    case "insertAt": {
      const i = ri(rand, 1, n - 1);
      const v = freshValue(rand, vals);
      return mc(rand, `What is the list after \`insertAt(${i}, ${v})\`?`, fmt(withAt(i, v)),
        [fmt(withAt(i - 1, v)), fmt(withAt(i + 1, v)), fmt(vals.map((x, j) => (j === i ? v : x))), fmt([...vals, v])],
        `Index ${i} means ${i} nodes stay in front of it: walk to node ${i - 1} and link the new node after it.`);
    }
    case "deleteAt": {
      const i = ri(rand, 0, n - 1);
      return mc(rand, `What is the list after \`deleteAt(${i})\`?`, fmt(without(i)),
        [fmt(without(i - 1)), fmt(without(i + 1)), fmt(vals.filter((_, j) => j !== i && j !== i + 1)), fmt(vals)],
        `Index ${i} is node **${vals[i]}** (counting from 0); its predecessor now skips over it.`);
    }
    case "deleteValue": {
      const v = dupVal !== undefined && rand() < 0.6 ? dupVal : pick(rand, vals);
      const first = vals.indexOf(v);
      const last = vals.lastIndexOf(v);
      return mc(rand, `What is the list after \`deleteValue(${v})\`?`, fmt(without(first)),
        [fmt(without(last)), fmt(vals.filter((x) => x !== v)), fmt(without(first + 1)), fmt(without(first - 1))],
        `The search stops at the **first** ${v} (index ${first}) and unlinks only that node.`);
    }
    case "dedupe": {
      const keepFirst = vals.filter((v, i) => vals.indexOf(v) === i);
      const keepLast = vals.filter((v, i) => vals.lastIndexOf(v) === i);
      const uniques = vals.filter((v) => vals.indexOf(v) === vals.lastIndexOf(v));
      const adjacent = vals.filter((v, i) => i === 0 || vals[i - 1] !== v);
      return mc(rand, "What is the list after `removeDuplicates()`?", fmt(keepFirst), [fmt(keepLast), fmt(uniques), fmt(adjacent), fmt(vals)],
        "The first time a value is seen it goes into the set and stays; later copies are unlinked.");
    }
    default: {
      const v = freshValue(rand, vals);
      return mc(rand, `What is the list after \`insertAtHead(${v})\`?`, fmt([v, ...vals]),
        [fmt([...vals, v]), fmt([vals[0], v, ...vals.slice(1)]), fmt([v, ...vals.slice(1)])],
        `The new node points at the old head and becomes \`head\`.`);
    }
  }
}

function qInsertOrder(rand: Rand, s: ListState, vals: number[]): QuizQuestion | null {
  const n = vals.length;
  if (n < 2) return null;
  const i = ri(rand, 1, n - 1);
  const v = freshValue(rand, vals);
  const a = vals[i - 1];
  const b = vals[i];
  if (s.kind === "doubly") {
    return mc(rand, `Inserting **${v}** between **${a}** (\`curr\`) and **${b}**. Which pointer write must come **last**?`, "curr.next = new",
      ["new.next = curr.next", "new.prev = curr", "curr.next.prev = new"],
      `\`curr.next\` is how we reach ${b}; overwrite it last, after the other three links are set.`);
  }
  return mc(rand, `Inserting **${v}** between **${a}** (\`curr\`) and **${b}**. Which statement must run **first**?`, "new.next = curr.next",
    ["curr.next = new", "head = new", "curr = curr.next"],
    `\`curr.next\` is the only link to ${b}; copy it into the new node before overwriting it.`);
}

function qMiddle(rand: Rand, s: ListState, vals: number[]): QuizQuestion | null {
  const n = vals.length;
  if (n < 2) return null;
  const m = middleIndex(n, s.kind);
  const cands = [m - 1, m + 1, 0, n - 1, Math.floor((n - 1) / 2), Math.floor(n / 2)].filter((i) => i >= 0 && i < n);
  return mc(rand, "Which node does `findMiddle()` (slow +1, fast +2) return?", nodeLabel(vals, m), cands.map((i) => nodeLabel(vals, i)),
    n % 2
      ? `With ${n} nodes, slow stops halfway: index **${m}**.`
      : `With ${n} nodes there are two middles; this loop returns the **${s.kind === "circular" ? "first" : "second"}** (index ${m}).`);
}

function qNextAfterReverse(rand: Rand, s: ListState, vals: number[]): QuizQuestion | null {
  const n = vals.length;
  if (n < 2) return null;
  const i = ri(rand, 0, n - 1);
  const circ = s.kind === "circular";
  const target = (j: number) => (j < 0 ? (circ ? nodeLabel(vals, n - 1) : "NULL") : j >= n ? (circ ? nodeLabel(vals, 0) : "NULL") : nodeLabel(vals, j));
  return mc(rand, `Node **${nodeLabel(vals, i)}**: after \`reverse()\`, where does its \`next\` point?`, target(i - 1),
    [target(i + 1), "NULL", nodeLabel(vals, 0), nodeLabel(vals, n - 1), nodeLabel(vals, i)],
    i === 0
      ? circ ? "The old head becomes the last node, so it points back to the new head (the old tail)." : "The old head becomes the last node: its `next` is NULL."
      : `Reversing flips each arrow: it now points at its old predecessor, ${nodeLabel(vals, i - 1)}.`);
}

function qCycle(rand: Rand, s: ListState, vals: number[]): QuizQuestion | null {
  const n = vals.length;
  if (s.kind === "circular") {
    return mc(rand, "Floyd's `detectCycle()` on this circular list returns…", `the head, ${nodeLabel(vals, 0)}`,
      ["NULL — no cycle", ...(n > 1 ? [`the last node, ${nodeLabel(vals, n - 1)}`] : []), ...(n > 2 ? [`the middle, ${nodeLabel(vals, middleIndex(n, "circular"))}`] : []), "it never stops"],
      "A ring is one big cycle that starts at `head`; slow and fast must meet inside it.");
  }
  if (n < 2) return null;
  const k = ri(rand, 0, n - 1);
  if (rand() < 0.5) {
    const len = n - k;
    return mc(rand, `Suppose the last node's \`next\` is set to **${nodeLabel(vals, k)}**. How many nodes are on the cycle?`, String(len),
      nums(len, ...shuffle(rand, [n, len + 1, len - 1, k + 1])), `The loop is ${nodeLabel(vals, k)} … ${nodeLabel(vals, n - 1)}: ${n} − ${k} = **${len}** nodes.`);
  }
  const meet = floydMeet(n, k);
  const cands = [k, n - 1, 0, meet - 1, meet + 1, Math.floor(n / 2)].filter((i) => i >= 0 && i < n);
  return mc(rand, `Suppose the last node's \`next\` is set to **${nodeLabel(vals, k)}**. Where do slow and fast **first meet**?`,
    nodeLabel(vals, meet), cands.map((i) => nodeLabel(vals, i)),
    `Step them by hand (slow +1, fast +2): they first land together on ${nodeLabel(vals, meet)}${meet === k ? ", which is also where the cycle starts" : ` — not necessarily the cycle start (${nodeLabel(vals, k)})`}.`);
}

function qComplexity(rand: Rand, s: ListState): QuizQuestion | null {
  const op = pick(rand, ["insertHead", "insertTail", "deleteHead", "deleteTail"] as const);
  const cost = endCost(op, s.kind, s.tailPtr);
  const why: Record<EndOp, string> = {
    insertHead: cost === "O(1)" ? "Only `head` (and one or two links) change — no walk." : "The last node's `next` must point at the new head, and finding it needs a walk.",
    insertTail: cost === "O(1)" ? "The tail pointer gives the last node directly." : "Without a tail pointer you must walk to the end.",
    deleteHead: cost === "O(1)" ? "`head = head.next` — no walk." : "The last node must be re-pointed at the new head, and finding it needs a walk.",
    deleteTail: cost === "O(1)" ? "`tail.prev` gives the new last node directly." : "You need the node **before** the tail, and a forward-only walk is the only way there.",
  };
  return mc(rand, `On this **${KIND_WORD[s.kind]}** list with the tail pointer **${s.tailPtr ? "on" : "off"}**, what does **${OP_WORD[op]}** cost?`,
    cost, ["O(1)", "O(n)", "O(log n)", "O(n²)"], why[op]);
}

function qSearchCost(rand: Rand, s: ListState, vals: number[]): QuizQuestion | null {
  const n = vals.length;
  const hit = rand() < 0.65;
  const v = hit ? pick(rand, vals) : freshValue(rand, vals);
  const f = vals.indexOf(v);
  const cmp = hit ? f + 1 : n;
  return mc(rand, `How many nodes does \`search(${v})\` compare before it returns?`, String(cmp), nums(cmp, ...shuffle(rand, [cmp - 1, cmp + 1, n, 1])),
    hit ? `The first ${v} is at index ${f}, so it checks ${f + 1} node${f ? "s" : ""}.` : `${v} isn't in the list: all ${n} nodes are checked, then it returns -1.`);
}

const GEN: Record<QuizType, (rand: Rand, s: ListState, vals: number[]) => QuizQuestion | null> = {
  valueAfterHops: qValueAfterHops,
  walkCost: qWalkCost,
  listAfterOp: qListAfterOp,
  insertOrder: qInsertOrder,
  middle: qMiddle,
  nextAfterReverse: qNextAfterReverse,
  cycle: qCycle,
  complexity: (rand, s) => qComplexity(rand, s),
  searchCost: qSearchCost,
};

/** Types asked recently go to the back of the queue, so consecutive questions vary. */
const recent: QuizType[] = [];

/** A question about the list on screen (null when the list is empty). `only` forces a type (for tests). */
export function makeQuiz(s: ListState, rand: Rand = Math.random, only?: QuizType): QuizQuestion | null {
  const vals = s.nodes.map((x) => x.value);
  if (!vals.length) return null;
  const shuffled = shuffle(rand, [...QUIZ_TYPES]);
  const order = only ? [only] : [...shuffled.filter((t) => !recent.includes(t)), ...recent.filter((t) => shuffled.includes(t))];
  for (const t of order) {
    const q = GEN[t](rand, s, vals);
    if (q) {
      if (!only) {
        recent.push(t);
        if (recent.length > 4) recent.shift();
      }
      return q;
    }
  }
  return null;
}
