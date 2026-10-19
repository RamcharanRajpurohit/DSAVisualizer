/*
 * "Quiz me" questions generated from the heap currently on screen (VisuAlgo-style training).
 * Pure TS (type-only imports), so the answers can be checked by a script under tsx.
 */
import type { QuizQuestion } from "@/lib/lesson";
import type { HeapKind } from "./engine/types";

export const QUIZ_TYPES = [
  "parent", "children", "afterExtract", "validHeap", "insertLands", "insertSwaps", "extractSwaps", "buildFirst", "kthTop",
] as const;
export type QuizType = (typeof QUIZ_TYPES)[number];

type Rand = () => number;

const parent = (i: number) => Math.floor((i - 1) / 2);
const ordinal = (k: number) => `${k}${k === 1 ? "st" : k === 2 ? "nd" : k === 3 ? "rd" : "th"}`;
const arr = (a: readonly number[]) => `[${a.join(", ")}]`;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

function words(kind: HeapKind) {
  return kind === "max"
    ? { M: "Max", top: "max", ge: "≥", gt: ">", better: "larger", best: "largest", order: "descending" }
    : { M: "Min", top: "min", ge: "≤", gt: "<", better: "smaller", best: "smallest", order: "ascending" };
}

/** x belongs strictly above y. */
const beats = (kind: HeapKind, x: number, y: number) => (kind === "max" ? x > y : x < y);

export function isValidHeap(a: readonly number[], kind: HeapKind): boolean {
  for (let i = 1; i < a.length; i++) if (beats(kind, a[i], a[parent(i)])) return false;
  return true;
}

/** Sift a[i] up; returns [final index, swaps]. */
function siftUp(a: number[], i: number, kind: HeapKind): [number, number] {
  let swaps = 0;
  while (i > 0 && beats(kind, a[i], a[parent(i)])) {
    const p = parent(i);
    [a[i], a[p]] = [a[p], a[i]];
    i = p;
    swaps++;
  }
  return [i, swaps];
}

/** Sift a[i] down inside a[0 … n); returns the number of swaps. */
function siftDown(a: number[], i: number, n: number, kind: HeapKind, pickWorse = false): number {
  let swaps = 0;
  while (2 * i + 1 < n) {
    const l = 2 * i + 1;
    const r = l + 1;
    let c = r < n && beats(kind, a[r], a[l]) ? r : l;
    if (pickWorse && r < n) c = c === l ? r : l;
    if (!beats(kind, a[c], a[i])) break;
    [a[i], a[c]] = [a[c], a[i]];
    i = c;
    swaps++;
  }
  return swaps;
}

function buildHeap(a: number[], kind: HeapKind) {
  for (let i = Math.floor(a.length / 2) - 1; i >= 0; i--) siftDown(a, i, a.length, kind);
}

function shuffle<T>(xs: T[], rand: Rand): T[] {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [xs[i], xs[j]] = [xs[j], xs[i]];
  }
  return xs;
}

const randInt = (lo: number, hi: number, rand: Rand) => lo + Math.floor(rand() * (hi - lo + 1));

/**
 * Answer + the first 3 distinct distractors (callers list the most plausible mistakes first), shuffled.
 * Null when fewer than 2 distractors survive.
 */
function mc(prompt: string, answer: string, distractors: readonly string[], explain: string, rand: Rand): QuizQuestion | null {
  const ds = [...new Set(distractors)].filter((d) => d !== answer).slice(0, 3);
  if (ds.length < 2) return null;
  const choices = shuffle([answer, ...ds], rand);
  return { prompt, choices, answer: choices.indexOf(answer), explain };
}

type Gen = (a: readonly number[], kind: HeapKind, rand: Rand) => QuizQuestion | null;

const GENERATORS: Record<QuizType, Gen> = {
  parent(a, kind, rand) {
    const n = a.length;
    if (n < 2) return null;
    const k = randInt(n >= 4 ? 3 : 1, n - 1, rand);
    const p = parent(k);
    return mc(
      `In this ${kind}-heap, a[${k}] = **${a[k]}**. At which **index** is its parent?`,
      String(p),
      [Math.floor(k / 2), 2 * k + 1, k - 1, p + 1, p - 1, Math.ceil(k / 2) + 1].filter((x) => x >= 0).map(String),
      `parent(i) = ⌊(i − 1) / 2⌋ = ⌊(${k} − 1) / 2⌋ = **${p}**, which holds ${a[p]}. (⌊i / 2⌋ is the formula for 1-based arrays.)`,
      rand,
    );
  },

  children(a, kind, rand) {
    const n = a.length;
    if (n < 3) return null;
    const k = randInt(0, Math.floor((n - 3) / 2), rand);
    const pair = (x: number, y: number) => `${x} and ${y}`;
    return mc(
      `In this ${kind}-heap, a[${k}] = **${a[k]}**. Which indices hold its two children?`,
      pair(2 * k + 1, 2 * k + 2),
      [pair(2 * k, 2 * k + 1), pair(k + 1, k + 2), pair(2 * k + 2, 2 * k + 3), ...(k > 0 ? [pair(2 * k - 1, 2 * k)] : [])],
      `left(i) = 2i + 1 = **${2 * k + 1}** and right(i) = 2i + 2 = **${2 * k + 2}** (holding ${a[2 * k + 1]} and ${a[2 * k + 2]}).`,
      rand,
    );
  },

  afterExtract(a, kind, rand) {
    const n = a.length;
    if (n < 3) return null;
    const W = words(kind);
    const b = a.slice();
    b[0] = b[n - 1];
    b.pop();
    siftDown(b, 0, b.length, kind);
    const answer = b[0];
    const other = beats(kind, a[2], a[1]) ? a[1] : a[2];
    return mc(
      `\`a = ${arr(a)}\` is a ${kind}-heap. After **extract${W.M}()**, which key is at the root?`,
      String(answer),
      [a[n - 1], a[0], other, ...(n > 3 ? [a[3]] : []), ...(n > 4 ? [a[n - 2]] : [])].map(String),
      `${a[0]} leaves; the last key ${a[n - 1]} jumps to the root and sinks below the ${W.better} child each time. The new root is the ${W.better} of a[1] and a[2]: **${answer}**.`,
      rand,
    );
  },

  validHeap(a, kind, rand) {
    const P = a.slice(0, Math.min(a.length, 7));
    if (P.length < 4 || new Set(P).size < 2) return null;
    const W = words(kind);
    const valid = shuffle(P.slice(), rand);
    buildHeap(valid, kind);
    const bad = new Set<string>();
    const ascending = P.slice().sort((x, y) => (kind === "max" ? x - y : y - x));
    if (!isValidHeap(ascending, kind)) bad.add(arr(ascending));
    for (let t = 0; t < 60 && bad.size < 6; t++) {
      const s = shuffle(P.slice(), rand);
      if (!isValidHeap(s, kind)) bad.add(arr(s));
    }
    // One near miss: the valid heap with a parent/child pair swapped.
    const near = valid.slice();
    const c = randInt(1, near.length - 1, rand);
    [near[c], near[parent(c)]] = [near[parent(c)], near[c]];
    const ds = shuffle([...bad], rand);
    if (!isValidHeap(near, kind)) ds.unshift(arr(near));
    return mc(
      `Which of these arrays is a valid **${kind}-heap**?`,
      arr(valid),
      ds,
      `Check every a[i] against its parent a[⌊(i − 1) / 2⌋]: only ${arr(valid)} has every parent ${W.ge} its children. A heap need not be sorted.`,
      rand,
    );
  },

  insertLands(a, kind, rand) {
    const n = a.length;
    if (n < 2) return null;
    const x = pickNewKey(a, kind, rand);
    const b = [...a, x];
    const [at, swaps] = siftUp(b, n, kind);
    const path: number[] = [];
    for (let i = n; i > 0; i = parent(i)) path.push(i);
    path.push(0);
    return mc(
      `\`a = ${arr(a)}\` is a ${kind}-heap. You **insert ${x}**. At which index does it come to rest?`,
      String(at),
      [...shuffle(path, rand), n - 1].map(String),
      `${x} is appended at a[${n}] and swaps upwards while it is ${words(kind).gt} its parent: ${plural(swaps, "swap")}, so it stops at index **${at}**.`,
      rand,
    );
  },

  insertSwaps(a, kind, rand) {
    const n = a.length;
    if (n < 1) return null;
    const x = pickNewKey(a, kind, rand);
    const b = [...a, x];
    const [at, swaps] = siftUp(b, n, kind);
    const depth = Math.floor(Math.log2(n + 1));
    const range = Array.from({ length: depth + 2 }, (_, i) => String(i));
    return mc(
      `\`a = ${arr(a)}\` is a ${kind}-heap. How many **swaps** does insert(${x}) make?`,
      String(swaps),
      shuffle(range, rand),
      `${x} starts at a[${n}] (depth ${depth}) and climbs while it beats its parent — **${swaps}** swap${swaps === 1 ? "" : "s"}, ending at index ${at}.`,
      rand,
    );
  },

  extractSwaps(a, kind, rand) {
    const n = a.length;
    if (n < 3) return null;
    const W = words(kind);
    const b = a.slice();
    b[0] = b[n - 1];
    b.pop();
    const swaps = siftDown(b, 0, b.length, kind);
    const h = Math.floor(Math.log2(b.length));
    return mc(
      `\`a = ${arr(a)}\` is a ${kind}-heap. How many **swaps** does sift-down make during extract${W.M}()?`,
      String(swaps),
      shuffle(Array.from({ length: h + 2 }, (_, i) => String(i)), rand),
      `The last key ${a[n - 1]} moves to the root and sinks below its ${W.better} child until no child beats it: **${swaps}** swap${swaps === 1 ? "" : "s"} (at most ⌊log₂ ${b.length}⌋ = ${h}).`,
      rand,
    );
  },

  buildFirst(a, kind, rand) {
    const keys = a.slice(0, Math.min(a.length, 8));
    if (keys.length < 4) return null;
    const W = words(kind);
    // Worst-case order for this kind: the opposite of the heap order.
    const start = keys.slice().sort((x, y) => (kind === "max" ? x - y : y - x));
    const m = start.length;
    const i = Math.floor(m / 2) - 1;
    const after = start.slice();
    siftDown(after, i, m, kind);
    const fromRoot = start.slice();
    siftDown(fromRoot, 0, m, kind);
    const wrongStart = start.slice();
    siftDown(wrongStart, Math.min(i + 1, m - 1), m, kind);
    const worse = start.slice();
    siftDown(worse, i, m, kind, true);
    const asInsert = start.slice();
    siftUp(asInsert, m - 1, kind);
    const full = start.slice();
    buildHeap(full, kind);
    return mc(
      `Floyd's buildHeap runs on \`${arr(start)}\` (${kind}-heap). What is the array after the **first** siftDown call?`,
      arr(after),
      [start, worse, fromRoot, wrongStart, asInsert, full].map(arr),
      `Leaves a[${i + 1} … ${m - 1}] are skipped: the loop starts at i = ⌊${m}/2⌋ − 1 = **${i}**, where ${start[i]} swaps with its ${W.better} child if that child beats it.`,
      rand,
    );
  },

  kthTop(a, kind, rand) {
    const n = a.length;
    if (n < 4) return null;
    const W = words(kind);
    const k = randInt(2, Math.min(4, n - 1), rand);
    const sorted = a.slice().sort((x, y) => (kind === "max" ? y - x : x - y));
    const answer = sorted[k - 1];
    return mc(
      `\`a = ${arr(a)}\` is a ${kind}-heap. Which key does the **${ordinal(k)}** call to extract${W.M}() return?`,
      String(answer),
      [a[k - 1], a[k], sorted[k], sorted[k - 2], sorted[n - k], a[n - 1]].filter((x) => x !== undefined).map(String),
      `Each extract returns the current ${W.top}, so the ${ordinal(k)} call returns the ${ordinal(k)} ${W.best} key: **${answer}**. A heap is not sorted — a[${k - 1}] = ${a[k - 1]} is just a slot.`,
      rand,
    );
  },
};

/** A key not in the heap that, more often than not, has to climb. */
function pickNewKey(a: readonly number[], kind: HeapKind, rand: Rand): number {
  const taken = new Set(a);
  const lo = Math.min(...a);
  const hi = Math.max(...a);
  const mid = Math.round((lo + hi) / 2);
  // Biased towards the "top" half of the key range so the new key usually climbs a few levels.
  const [from, to] = kind === "max" ? [mid, Math.min(999, hi + 10)] : [Math.max(0, lo - 10), mid];
  for (let t = 0; t < 200; t++) {
    const x = rand() < 0.6 ? randInt(from, to, rand) : randInt(1, 99, rand);
    if (!taken.has(x)) return x;
  }
  let x = 0;
  while (taken.has(x)) x++;
  return x;
}

/**
 * A question about the heap `a` (array order). `only` forces one type (used by the checker);
 * otherwise a random applicable type is chosen. Null when the heap is empty.
 */
export function heapQuiz(a: readonly number[], kind: HeapKind, rand: Rand = Math.random, only?: QuizType): QuizQuestion | null {
  if (!a.length) return null;
  const types = only ? [only] : shuffle([...QUIZ_TYPES], rand);
  for (const t of types) {
    const q = GENERATORS[t](a, kind, rand);
    if (q) return q;
  }
  return null;
}
