/*
 * Lightweight instrumented sorts for Compare mode (pure TS, no React, no "@/" imports).
 *
 * Each algorithm runs on a copy of the input and logs every primitive operation into a flat
 * Int32Array of [kind, a, b] triples. One operation = one tick of the shared clock:
 *   OP_CMP   compare two keys            a, b = indices to highlight (−1 = a key held in a register)
 *   OP_WRITE write into the shown array  a = index, b = value written
 *   OP_AUX   write into a helper buffer  a = index of the element involved (−1 = none)
 * Replaying the writes in order reproduces every frame of the array, so the race can be drawn
 * at any speed without storing per-step snapshots.
 */

export const OP_CMP = 0;
export const OP_WRITE = 1;
export const OP_AUX = 2;

export type CompareAlgoKey = "bubble" | "selection" | "insertion" | "shell" | "merge" | "quick" | "quick3" | "counting" | "radix";

export interface Trace {
  key: CompareAlgoKey;
  input: readonly number[];
  /** [kind, a, b] per operation. */
  ops: Int32Array;
  /** Number of operations (= ticks to finish). */
  length: number;
  comparisons: number;
  /** Writes to the array plus writes to helper buffers (merge runs, counters, buckets). */
  writes: number;
  output: readonly number[];
}

class Tracer {
  private buf: number[] = [];
  comparisons = 0;
  writes = 0;
  constructor(readonly a: number[]) {}

  /** Log a comparison involving A[i] and A[j] (the caller does the actual test). */
  cmp(i: number, j: number) {
    this.buf.push(OP_CMP, i, j);
    this.comparisons++;
  }
  write(i: number, v: number) {
    this.a[i] = v;
    this.buf.push(OP_WRITE, i, v);
    this.writes++;
  }
  aux(i = -1) {
    this.buf.push(OP_AUX, i, 0);
    this.writes++;
  }
  swap(i: number, j: number) {
    const t = this.a[i];
    this.write(i, this.a[j]);
    this.write(j, t);
  }
  /** a[i] > a[j], logged. */
  gt(i: number, j: number) {
    this.cmp(i, j);
    return this.a[i] > this.a[j];
  }
  done(key: CompareAlgoKey, input: readonly number[]): Trace {
    return {
      key,
      input,
      ops: Int32Array.from(this.buf),
      length: this.buf.length / 3,
      comparisons: this.comparisons,
      writes: this.writes,
      output: this.a.slice(),
    };
  }
}

function bubble(t: Tracer) {
  const a = t.a;
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - 1 - i; j++) {
      if (t.gt(j, j + 1)) {
        t.swap(j, j + 1);
        swapped = true;
      }
    }
    if (!swapped) break;
  }
}

function selection(t: Tracer) {
  const a = t.a;
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let min = i;
    for (let j = i + 1; j < n; j++) {
      t.cmp(j, min);
      if (a[j] < a[min]) min = j;
    }
    if (min !== i) t.swap(i, min);
  }
}

/** Gapped insertion sort; gap 1 is plain insertion sort. Shifts are single writes. */
function gappedInsertion(t: Tracer, gap: number) {
  const a = t.a;
  for (let i = gap; i < a.length; i++) {
    const key = a[i];
    let j = i;
    while (j >= gap) {
      t.cmp(j - gap, j);
      if (a[j - gap] <= key) break;
      t.write(j, a[j - gap]);
      j -= gap;
    }
    if (j !== i) t.write(j, key);
  }
}

function insertion(t: Tracer) {
  gappedInsertion(t, 1);
}

/** Shell's original gaps n/2, n/4, …, 1 (the same sequence as the step-by-step page). */
function shell(t: Tracer) {
  for (let gap = Math.floor(t.a.length / 2); gap > 0; gap = Math.floor(gap / 2)) gappedInsertion(t, gap);
}

/** Top-down merge sort: copy both runs out (helper writes), merge them back (array writes). */
function merge(t: Tracer) {
  const a = t.a;
  const sort = (lo: number, hi: number) => {
    if (lo >= hi) return;
    const mid = Math.floor((lo + hi) / 2);
    sort(lo, mid);
    sort(mid + 1, hi);
    const L = a.slice(lo, mid + 1);
    const R = a.slice(mid + 1, hi + 1);
    for (let x = lo; x <= hi; x++) t.aux(x);
    let i = 0;
    let j = 0;
    let k = lo;
    while (i < L.length && j < R.length) {
      t.cmp(k, mid + 1 + j);
      if (L[i] <= R[j]) t.write(k++, L[i++]);
      else t.write(k++, R[j++]);
    }
    while (i < L.length) t.write(k++, L[i++]);
    while (j < R.length) t.write(k++, R[j++]);
  };
  sort(0, a.length - 1);
}

/** Lomuto partition around A[hi]; no-op swaps (i = j) are skipped. */
function lomuto(t: Tracer, lo: number, hi: number) {
  const a = t.a;
  const pivot = a[hi];
  let i = lo - 1;
  for (let j = lo; j < hi; j++) {
    t.cmp(j, hi);
    if (a[j] <= pivot) {
      i++;
      if (i !== j) t.swap(i, j);
    }
  }
  if (i + 1 !== hi) t.swap(i + 1, hi);
  return i + 1;
}

function quickWith(t: Tracer, median3: boolean) {
  const a = t.a;
  const sort = (lo: number, hi: number) => {
    if (lo >= hi) return;
    if (median3 && hi - lo >= 2) {
      // Order A[lo], A[mid], A[hi] with three compares; the median ends in the middle, then moves to hi.
      const mid = Math.floor((lo + hi) / 2);
      if (t.gt(lo, mid)) t.swap(lo, mid);
      if (t.gt(mid, hi)) t.swap(mid, hi);
      if (t.gt(lo, mid)) t.swap(lo, mid);
      t.swap(mid, hi);
    }
    const p = lomuto(t, lo, hi);
    sort(lo, p - 1);
    sort(p + 1, hi);
  };
  sort(0, a.length - 1);
}

/** Stable counting sort: count (n), prefix sums (k − 1), place into B (n), copy B back (n). */
function counting(t: Tracer) {
  const a = t.a;
  const n = a.length;
  if (!n) return;
  let lo = a[0];
  let hi = a[0];
  for (const v of a) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const C = new Array<number>(hi - lo + 1).fill(0);
  for (let i = 0; i < n; i++) {
    C[a[i] - lo]++;
    t.aux(i);
  }
  for (let v = 1; v < C.length; v++) {
    C[v] += C[v - 1];
    t.aux();
  }
  const B = new Array<number>(n);
  for (let i = n - 1; i >= 0; i--) {
    B[--C[a[i] - lo]] = a[i];
    t.aux(i);
  }
  for (let i = 0; i < n; i++) t.write(i, B[i]);
}

/** LSD radix sort, base 10: distribute into buckets (helper writes), collect back (array writes). */
function radix(t: Tracer) {
  const a = t.a;
  const n = a.length;
  if (!n) return;
  const off = Math.max(0, -Math.min(...a));
  const max = Math.max(...a) + off;
  for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
    const buckets: number[][] = Array.from({ length: 10 }, () => []);
    for (let i = 0; i < n; i++) {
      buckets[Math.floor((a[i] + off) / exp) % 10].push(a[i]);
      t.aux(i);
    }
    let k = 0;
    for (const b of buckets) for (const v of b) t.write(k++, v);
  }
}

const RUNNERS: Record<CompareAlgoKey, (t: Tracer) => void> = {
  bubble,
  selection,
  insertion,
  shell,
  merge,
  quick: (t) => quickWith(t, false),
  quick3: (t) => quickWith(t, true),
  counting,
  radix,
};

/** Run `key` on a copy of `input` and log every comparison and write. */
export function traceSort(key: CompareAlgoKey, input: readonly number[]): Trace {
  const t = new Tracer(input.slice());
  RUNNERS[key](t);
  return t.done(key, input);
}
