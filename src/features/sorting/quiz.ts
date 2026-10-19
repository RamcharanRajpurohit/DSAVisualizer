/*
 * "Quiz me" questions for the sorting page, generated from the array on screen (pure TS, no
 * React, runnable with tsx). Each generator returns null when the array doesn't suit it, and the
 * page-level `sortingQuiz` picks a type weighted towards the selected algorithm.
 */
import type { QuizQuestion } from "@/lib/lesson";

export type Rng = () => number;

/** Longest array a question works on; longer arrays use their first QUIZ_MAX values. */
export const QUIZ_MAX = 8;

export const fmtList = (a: readonly number[]) => `[${a.join(", ")}]`;

const ord = (k: number) => `${k}${k % 10 === 1 && k !== 11 ? "st" : k % 10 === 2 && k !== 12 ? "nd" : k % 10 === 3 && k !== 13 ? "rd" : "th"}`;

function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Correct answer + up to 3 distinct distractors, shuffled. Null when fewer than 2 distractors remain. */
function ask(prompt: string, correct: string, distractors: readonly string[], explain: string, rng: Rng): QuizQuestion | null {
  const seen = new Set([correct]);
  const ds: string[] = [];
  for (const d of distractors) {
    if (seen.has(d)) continue;
    seen.add(d);
    ds.push(d);
  }
  if (ds.length < 2) return null;
  const choices = shuffled([correct, ...shuffled(ds, rng).slice(0, 3)], rng);
  return { prompt, choices, answer: choices.indexOf(correct), explain };
}

/* ---------- reference computations (shared with the explanation text) ---------- */

export function bubblePass(a: readonly number[]): number[] {
  const b = a.slice();
  for (let j = 0; j < b.length - 1; j++) if (b[j] > b[j + 1]) [b[j], b[j + 1]] = [b[j + 1], b[j]];
  return b;
}

export function inversions(a: readonly number[]): number {
  let c = 0;
  for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i] > a[j]) c++;
  return c;
}

/** Index where the Lomuto pivot A[hi] lands: how many other values are ≤ it. */
export function lomutoLanding(a: readonly number[]): number {
  const p = a[a.length - 1];
  return a.slice(0, -1).filter((v) => v <= p).length;
}

/** Halves exactly as mergeSort(A, 0, n − 1) splits them, each sorted. */
export function mergeHalves(a: readonly number[]): [number[], number[]] {
  const mid = Math.floor((a.length - 1) / 2);
  const asc = (x: number[]) => x.sort((p, q) => p - q);
  return [asc(a.slice(0, mid + 1)), asc(a.slice(mid + 1))];
}

export function mergeRuns(L: readonly number[], R: readonly number[]): number[] {
  const out: number[] = [];
  let i = 0;
  let j = 0;
  while (i < L.length && j < R.length) out.push(L[i] <= R[j] ? L[i++] : R[j++]);
  return out.concat(L.slice(i), R.slice(j));
}

/** One stable LSD pass on the digit at `exp` (1 = ones, 10 = tens). */
export function radixPass(a: readonly number[], exp = 1, lifo = false): number[] {
  const buckets: number[][] = Array.from({ length: 10 }, () => []);
  for (const v of a) buckets[Math.floor(v / exp) % 10].push(v);
  return buckets.flatMap((b) => (lifo ? b.slice().reverse() : b));
}

/** Gapped insertion sort with a single gap. */
export function gapPass(a: readonly number[], gap: number): number[] {
  const b = a.slice();
  for (let i = gap; i < b.length; i++) {
    const tmp = b[i];
    let j = i;
    while (j >= gap && b[j - gap] > tmp) {
      b[j] = b[j - gap];
      j -= gap;
    }
    b[j] = tmp;
  }
  return b;
}

const sortedCopy = (a: readonly number[]) => a.slice().sort((x, y) => x - y);

/* ---------- question types ---------- */

export interface QuizInput {
  /** The values the question is about (at most QUIZ_MAX). */
  a: readonly number[];
  /** "the array on screen" or "the first 8 values on screen". */
  where: string;
}

type Gen = (q: QuizInput, rng: Rng) => QuizQuestion | null;

export const QUIZ_TYPES = {
  bubblePass: ({ a, where }, rng) => {
    if (a.length < 3) return null;
    const ans = bubblePass(a);
    const max = Math.max(...a);
    const maxOnly = a.slice();
    maxOnly.splice(a.indexOf(max), 1);
    maxOnly.push(max);
    const firstSwap = a.slice();
    const k = firstSwap.findIndex((v, i) => i < a.length - 1 && v > firstSwap[i + 1]);
    if (k >= 0) [firstSwap[k], firstSwap[k + 1]] = [firstSwap[k + 1], firstSwap[k]];
    const selFirst = a.slice();
    const m = selFirst.indexOf(Math.min(...a));
    [selFirst[0], selFirst[m]] = [selFirst[m], selFirst[0]];
    return ask(
      `Bubble sort makes its **first pass** (left → right, swapping out-of-order neighbours) over ${where} **${fmtList(a)}**. What does the array look like afterwards?`,
      fmtList(ans),
      [sortedCopy(a), maxOnly, firstSwap, selFirst, bubblePass(ans), a.slice()].map(fmtList),
      `Each out-of-order neighbour pair is swapped as the pass sweeps right, so the largest value **${max}** is carried to the end while every value it passes moves left one slot: ${fmtList(ans)}.`,
      rng,
    );
  },

  lomutoPivot: ({ a, where }, rng) => {
    if (a.length < 3) return null;
    const n = a.length;
    const p = a[n - 1];
    const ans = lomutoLanding(a);
    const less = a.slice(0, -1).filter((v) => v < p).length;
    const cands = [ans - 1, ans + 1, ans - 2, ans + 2, n - 1, 0, less, Math.floor(n / 2)].filter((x) => x >= 0 && x < n);
    return ask(
      `Quick sort partitions ${where} **${fmtList(a)}** with **Lomuto** and the **last element** (${p}) as pivot. At which index (0-based) does the pivot land?`,
      `index ${ans}`,
      cands.map((x) => `index ${x}`),
      ans === 0
        ? `No other value is ≤ ${p}, so the ≤ region stays empty and the final swap puts the pivot at **index 0** — its sorted position.`
        : `${ans === 1 ? "One other value is" : `${ans} other values are`} ≤ ${p}, so the ≤ region fills indices 0…${ans - 1} and the final swap puts the pivot at **index ${ans}** — its sorted position.`,
      rng,
    );
  },

  insertionShifts: ({ a, where }, rng) => {
    if (a.length < 3) return null;
    const n = a.length;
    const inv = inversions(a);
    const all = (n * (n - 1)) / 2;
    const cands = [all, n - 1, inv + 1, inv - 1, inv + 2, inv - 2, Math.max(0, all - inv), n].filter((x) => x >= 0);
    return ask(
      `How many **shifts** (\`A[j+1] ← A[j]\`) will insertion sort make on ${where} **${fmtList(a)}**?`,
      String(inv),
      cands.map(String),
      `Each shift removes exactly one **inversion** (a pair i < j with A[i] > A[j]); this array has **${inv}** of them (the maximum for n = ${n} is ${all}).`,
      rng,
    );
  },

  mergeKth: ({ a, where }, rng) => {
    if (a.length < 4) return null;
    const [L, R] = mergeHalves(a);
    const merged = mergeRuns(L, R);
    const k = 2 + Math.floor(rng() * Math.min(3, merged.length - 1));
    const ans = merged[k - 1];
    const cands = [L[k - 1], R[k - 1], merged[k - 2], merged[k], L[0], R[0], L[L.length - 1], R[R.length - 1]].filter(
      (x): x is number => x !== undefined,
    );
    return ask(
      `Merge sort's last step on ${where} merges the sorted halves L = **${fmtList(L)}** and R = **${fmtList(R)}**. What is the **${ord(k)}** value written back into A?`,
      String(ans),
      cands.map(String),
      `Always take the smaller front value (L wins ties, which keeps it stable): A starts ${fmtList(merged.slice(0, k + 1))}…, so the ${ord(k)} value is **${ans}**.`,
      rng,
    );
  },

  stability: ({ a }, rng) => {
    const STABLE = ["Bubble sort", "Insertion sort", "Merge sort", "Counting sort", "Radix sort (LSD)"];
    const UNSTABLE = ["Selection sort", "Shell sort", "Quick sort"];
    const WHY: Record<string, string> = {
      "Bubble sort": "only swaps neighbours that are strictly out of order",
      "Insertion sort": "stops shifting at the first key that is not bigger",
      "Merge sort": "takes from the left run on ties (`L[i] <= R[j]`)",
      "Counting sort": "places elements right → left into their slots",
      "Radix sort (LSD)": "keeps bucket order (first in, first out) on every pass",
      "Selection sort": "swaps the minimum to the front, which can jump A[i] over an equal key",
      "Shell sort": "moves keys gap positions at a time, leaping over equal keys",
      "Quick sort": "swaps keys across the partition, so equal keys can trade places",
    };
    const counts = new Map<number, number>();
    for (const v of a) counts.set(v, (counts.get(v) ?? 0) + 1);
    const dup = [...counts].find(([, c]) => c > 1)?.[0];
    if (dup !== undefined || rng() < 0.5) {
      const ans = STABLE[Math.floor(rng() * STABLE.length)];
      return ask(
        dup !== undefined
          ? `The array on screen contains **${dup}** more than once. Which algorithm **guarantees** the copies of ${dup} keep their original order?`
          : "Which of these sorting algorithms is **stable** (equal keys keep their input order)?",
        ans,
        UNSTABLE,
        `${ans} is stable: it ${WHY[ans]}. Selection, Shell and quick sort are not — they move keys over long distances.`,
        rng,
      );
    }
    const ans = UNSTABLE[Math.floor(rng() * UNSTABLE.length)];
    return ask(
      "Which of these sorting algorithms is **not stable**?",
      ans,
      STABLE,
      `${ans} ${WHY[ans]}. Bubble, insertion, merge, counting and radix sort all keep equal keys in order.`,
      rng,
    );
  },

  radixPass: ({ a, where }, rng) => {
    if (a.length < 3 || a.some((v) => v < 0)) return null;
    const ans = radixPass(a, 1);
    return ask(
      `After **one LSD radix pass on the ones digit**, what is the order of ${where} **${fmtList(a)}**?`,
      fmtList(ans),
      [sortedCopy(a), radixPass(a, 1, true), radixPass(a, 10), radixPass(a, 1).reverse(), a.slice()].map(fmtList),
      `Each value goes into bucket (value mod 10), keeping its order inside the bucket; then buckets 0…9 are read back: ${fmtList(ans)}. Only after the tens pass is it fully sorted.`,
      rng,
    );
  },

  selectionSwap: ({ a, where }, rng) => {
    if (a.length < 3) return null;
    let m = 0;
    for (let j = 1; j < a.length; j++) if (a[j] < a[m]) m = j;
    const NONE = "No swap — A[0] is already the minimum";
    const pair = (x: number, y: number) => `${x} ↔ ${y}`;
    const max = Math.max(...a);
    const ans = m === 0 ? NONE : pair(a[0], a[m]);
    const cands = [NONE, pair(a[0], max), pair(a[0], a[1]), pair(a[m], a[a.length - 1]), pair(a[1], a[m])].filter(
      (s) => !/^(\d+) ↔ \1$/.test(s),
    );
    return ask(
      `Selection sort's **first pass** over ${where} **${fmtList(a)}** ends with a swap. Which one?`,
      ans,
      cands,
      m === 0
        ? `The scan finds no value smaller than A[0] = ${a[0]}, so nothing moves.`
        : `The scan finds the minimum **${a[m]}** at index ${m} and swaps it with A[0] = ${a[0]}.`,
      rng,
    );
  },

  countingK: ({ a, where }, rng) => {
    if (a.length < 2) return null;
    const lo = Math.min(...a);
    const hi = Math.max(...a);
    const k = hi - lo + 1;
    const distinct = new Set(a).size;
    return ask(
      `Counting sort on ${where} **${fmtList(a)}** uses one counter per possible value from min to max. How many counters **k** does it need?`,
      String(k),
      [hi + 1, a.length, distinct, k - 1, k + 1, hi - lo + 2].map(String),
      `k = max − min + 1 = ${hi} − ${lo} + 1 = **${k}** — every value in the range gets a counter, even ones that never occur. That is why a wide range makes counting sort slow.`,
      rng,
    );
  },

  shellGap: ({ a, where }, rng) => {
    if (a.length < 4) return null;
    const gap = Math.floor(a.length / 2);
    const ans = gapPass(a, gap);
    return ask(
      `Shell sort on ${where} **${fmtList(a)}** starts with gap ⌊n/2⌋ = **${gap}**. What is the array after that first gapped pass?`,
      fmtList(ans),
      [sortedCopy(a), bubblePass(a), gapPass(a, Math.max(1, gap - 1)), gapPass(a, 1), a.slice()].map(fmtList),
      `With gap ${gap}, each chain A[i], A[i+${gap}], … is insertion-sorted on its own (elements ${gap} apart are compared), giving ${fmtList(ans)}.`,
      rng,
    );
  },
} satisfies Record<string, Gen>;

export type QuizType = keyof typeof QUIZ_TYPES;

/** Which question types fit each algorithm best (they get extra weight). */
const FOCUS: Record<string, readonly QuizType[]> = {
  bubble: ["bubblePass"],
  selection: ["selectionSwap"],
  insertion: ["insertionShifts"],
  shell: ["shellGap"],
  merge: ["mergeKth"],
  quick: ["lomutoPivot"],
  counting: ["countingK"],
  radix: ["radixPass"],
};

export function quizInput(values: readonly number[]): QuizInput | null {
  if (values.length < 2) return null;
  const a = values.length > QUIZ_MAX ? values.slice(0, QUIZ_MAX) : values.slice();
  return { a, where: values.length > QUIZ_MAX ? `the first ${QUIZ_MAX} values on screen` : "the array on screen" };
}

/** A question about `values`, leaning towards the selected algorithm. Null when the array is too small. */
export function sortingQuiz(values: readonly number[], algoKey: string, rng: Rng = Math.random): QuizQuestion | null {
  const input = quizInput(values);
  if (!input) return null;
  const focus = FOCUS[algoKey] ?? [];
  const pool: QuizType[] = [];
  for (const t of Object.keys(QUIZ_TYPES) as QuizType[]) {
    pool.push(t);
    if (focus.includes(t)) pool.push(t, t, t, t);
  }
  for (let tries = 0; tries < 12; tries++) {
    const t = pool[Math.floor(rng() * pool.length)];
    const q = QUIZ_TYPES[t](input, rng);
    if (q) return q;
  }
  return QUIZ_TYPES.stability(input, rng);
}
