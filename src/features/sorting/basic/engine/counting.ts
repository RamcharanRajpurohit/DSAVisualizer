import type { CountingPhase, CountingStep, Marks, Pointer, SortItem } from "../types";
import { listText, makeItems, paint, s } from "./common";

/** Widest value range drawn as a full count array; wider ranges hide the zero counters. */
export const COUNTING_DENSE_MAX = 30;

type CountingInput = Omit<
  CountingStep,
  "kind" | "phase" | "input" | "output" | "counts" | "columns" | "colIndex" | "sparse" | "lo" | "k" | "countMax" | "pointers" | "inputMarks" | "outputMarks" | "countMarks"
> & {
  pointers?: Pointer[];
  inputMarks?: Marks;
  outputMarks?: Marks;
  countMarks?: Marks;
};

/** Stable counting sort (offset by the minimum, so any integers work). */
export function recordCounting(source: readonly number[]): CountingStep[] {
  const n = source.length;
  const items = makeItems(source);
  const steps: CountingStep[] = [];
  const lo = n ? Math.min(...source) : 0;
  const hi = n ? Math.max(...source) : 0;
  const k = n ? hi - lo + 1 : 0;
  const sparse = k > COUNTING_DENSE_MAX;
  const columns = sparse
    ? [...new Set(source)].sort((a, b) => a - b)
    : Array.from({ length: k }, (_, c) => lo + c);
  const colOf = new Map(columns.map((v, c) => [v, c]));
  const counts = columns.map(() => 0);
  const input: (SortItem | null)[] = items.slice();
  const output: (SortItem | null)[] = items.map(() => null);
  let writes = 0;

  /** `C[x − lo]` when lo ≠ 0 (so the offset is visible), plain `C[x]` otherwise. */
  const cName = (v: number) => (lo === 0 ? `C[${v}]` : `C[${v}−${lo < 0 ? `(${lo})` : lo}]`);
  const vars = (phase: CountingPhase, i: number | null, v: number | null) => ({
    lo,
    k,
    phase,
    i,
    "A[i]": i == null || i < 0 ? null : source[i],
    [`C[v]`]: v == null ? null : counts[colOf.get(v) ?? 0],
    writes,
  });

  const snap = (phase: CountingPhase, st: CountingInput) =>
    steps.push({
      ...st,
      kind: "counting",
      phase,
      input: input.slice(),
      output: output.slice(),
      columns,
      counts: counts.slice(),
      colIndex: columns.map((v) => v - lo),
      sparse,
      lo,
      k,
      countMax: Math.max(1, n),
      pointers: st.pointers ?? [],
      inputMarks: { ...(st.inputMarks ?? {}) },
      outputMarks: { ...(st.outputMarks ?? {}) },
      countMarks: { ...(st.countMarks ?? {}) },
    });

  if (n === 0) {
    snap("done", {
      title: "Nothing to sort",
      detail: "The array is empty. Add a few values (or generate a random array) to watch counting sort work.",
      tone: "muted",
      done: true,
    });
    return steps;
  }

  snap("setup", {
    title: `Range ${lo} … ${hi} → k = ${k} counters`,
    detail:
      "Counting sort never compares two elements. Instead it counts how often each value occurs, in an array **C** of " +
      `k = max − min + 1 = ${hi} − ${lo} + 1 = **${k}** counters, then uses the counts to compute where every element goes.\n` +
      `C is indexed by \`value − lo\` (lo = ${lo}) so the smallest value lands in C[0]` +
      (lo < 0 ? " — that offset is also what makes **negative values** work." : ".") +
      (sparse
        ? `\n**k = ${k} is too wide to draw**, so only the ${s(columns.length, "value")} that actually occur get a column; ` +
          "the hidden counters (marked ⋯) stay 0 the whole time. A real implementation still allocates all k of them — " +
          "counting sort only pays off when k is small compared to n."
        : ""),
    tone: "info",
    line: [1, 2, 3],
    tag: sparse ? `k = ${k} · ${columns.length} shown` : `k = ${k}`,
    hold: 1.6,
    vars: vars("setup", null, null),
  });

  // ── Phase 1: count ─────────────────────────────────────────────────────────
  for (let i = 0; i < n; i++) {
    const v = source[i];
    const c = colOf.get(v) ?? 0;
    counts[c]++;
    snap("count", {
      title: `Count A[${i}] = ${v}`,
      detail:
        `\`${cName(v)}\` goes ${counts[c] - 1} → **${counts[c]}**: one more ${v} seen.` +
        (counts[c] > 1 ? ` (${v} is a duplicate — its column simply grows.)` : ""),
      tone: "info",
      line: [4, 5],
      inputMarks: { ...paint({}, 0, i - 1, "dim"), [i]: "compare" },
      countMarks: { [c]: "active" },
      pointers: [{ id: "i", label: "i", at: i, color: "amber" }],
      callout: { row: "count", at: [c], text: "+1", tone: "warn" },
      tag: "1 · count",
      vars: vars("count", i, v),
    });
  }

  const dupes = columns.filter((_, c) => counts[c] > 1);
  // ── Phase 2: prefix sums ───────────────────────────────────────────────────
  snap("prefix", {
    title: "Histogram done → prefix sums",
    detail:
      `C now says how many times each value occurs${dupes.length ? ` (e.g. ${dupes[0]} × ${counts[colOf.get(dupes[0]) ?? 0]})` : ""}. ` +
      "Next, a running total turns counts into **positions**: afterwards C[v] = how many elements are ≤ v, which is one past the " +
      `last output slot v will occupy. ${cName(columns[0])} stays as it is.`,
    tone: "info",
    line: 6,
    inputMarks: paint({}, 0, n - 1, "dim"),
    countMarks: { 0: "merge" },
    tag: "2 · prefix sums",
    hold: 1.3,
    vars: vars("prefix", null, null),
  });

  for (let c = 1; c < columns.length; c++) {
    const before = counts[c];
    counts[c] += counts[c - 1];
    const v = columns[c];
    const total = counts[c];
    snap("prefix", {
      title: `${cName(v)} = ${before} + ${counts[c - 1]} = ${total}`,
      detail:
        `${s(total, "element")} ${total === 1 ? "is" : "are"} ≤ ${v}` +
        (before
          ? `, so the ${before === 1 ? "copy" : `${before} copies`} of ${v} will fill output slot${before === 1 ? ` ${total - 1}` : `s ${total - before}…${total - 1}`}.`
          : ` (there is no ${v} in the input — the total just carries over).`) +
        (sparse && columns[c] - columns[c - 1] > 1 ? " The hidden zero counters in between don't change the running total." : ""),
      tone: "info",
      line: [6, 7],
      inputMarks: paint({}, 0, n - 1, "dim"),
      countMarks: { ...paint({}, 0, c - 2, "merge"), [c - 1]: "compare", [c]: "active" },
      carry: { from: c - 1, to: c },
      tag: "2 · prefix sums",
      vars: vars("prefix", null, v),
    });
  }

  // ── Phase 3: place, scanning right → left ──────────────────────────────────
  snap("place", {
    title: "Place elements, right → left",
    detail:
      "Walk A **backwards**. For each element, decrement its counter and write the element at that position in B. " +
      "Going right-to-left means the last copy of a value takes the last slot of its block — equal values keep their input order, so counting sort is **stable** (radix sort depends on that).",
    tone: "info",
    line: 8,
    countMarks: paint({}, 0, columns.length - 1, "merge"),
    tag: "3 · place",
    hold: 1.3,
    vars: vars("place", null, null),
  });

  const seen = new Set<number>();
  for (let i = n - 1; i >= 0; i--) {
    const item = input[i] as SortItem;
    const v = item.value;
    const c = colOf.get(v) ?? 0;
    counts[c]--;
    const pos = counts[c];
    output[pos] = item;
    input[i] = null;
    writes++;
    const dup = seen.has(v);
    seen.add(v);
    snap("place", {
      title: `Place ${v} at B[${pos}]`,
      detail:
        `\`${cName(v)}\` was ${pos + 1}; decrement it to **${pos}** — the last free slot in ${v}'s block — and write ${v} into B[${pos}].` +
        (dup ? ` Another ${v} already sits to its right in B: the original order of the equal values is preserved.` : ""),
      tone: "warn",
      line: [8, 9, 10, 11],
      outputMarks: { ...paint({}, 0, n - 1, "merge"), [pos]: "active" },
      countMarks: { ...paint({}, 0, columns.length - 1, "merge"), [c]: "active" },
      pointers: [{ id: "i", label: "i", at: i, color: "amber" }],
      callout: { row: "count", at: [c], text: "−1", tone: "warn" },
      tag: "3 · place",
      vars: vars("place", i, v),
    });
  }

  snap("done", {
    title: "Sorted!",
    detail:
      `B holds the sorted array — copy it back into A. ${n} elements, ${s(k, "counter")}, **0 comparisons**: ` +
      `O(n + k) time and O(n + k) extra space. Result: ${listText(output.map((it) => it?.value ?? 0), 12)}.`,
    tone: "ok",
    line: 12,
    outputMarks: paint({}, 0, n - 1, "success"),
    countMarks: paint({}, 0, columns.length - 1, "dim"),
    done: true,
    hold: 2,
    vars: vars("done", null, null),
  });
  return steps;
}
