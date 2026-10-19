/*
 * The Compare grid (rows = input kinds, columns = algorithms) and the "what to notice" notes
 * computed from it. Pure TS.
 */
import { COMPARE_ALGOS, INPUT_KINDS, compareAlgo, type CompareAlgo, type InputKind } from "./catalog";
import type { LessonTry } from "@/lib/lesson";
import type { CellDef } from "./engine";
import { traceSort, type CompareAlgoKey } from "./trace";

export interface GridCell extends CellDef {
  algo: CompareAlgo;
  kind: InputKind;
  /** Finish place within its row (ties share a place). */
  rank: number;
}

export interface GridRow {
  kind: InputKind;
  label: string;
  hint: string;
  input: readonly number[];
  cells: readonly GridCell[];
}

export interface CompareGridModel {
  n: number;
  cols: readonly CompareAlgo[];
  rows: readonly GridRow[];
  cells: readonly GridCell[];
}

export const cellId = (kind: InputKind, key: CompareAlgoKey) => `${kind}:${key}`;

export function buildGrid(inputs: Record<InputKind, readonly number[]>, algos: readonly CompareAlgoKey[]): CompareGridModel {
  // Keep catalogue order whatever order the keys were toggled in.
  const cols = COMPARE_ALGOS.filter((a) => algos.includes(a.key));
  const rows: GridRow[] = INPUT_KINDS.map(({ kind, label, hint }, r) => {
    const input = inputs[kind];
    const traced = cols.map((algo, c) => ({ algo, c, trace: traceSort(algo.key, input) }));
    const cells = traced.map(({ algo, c, trace }) => ({
      id: cellId(kind, algo.key),
      row: r,
      col: c,
      trace,
      algo,
      kind,
      rank: 1 + traced.filter((o) => o.trace.length < trace.length).length,
    }));
    return { kind, label, hint, input, cells };
  });
  return { n: inputs.random.length, cols, rows, cells: rows.flatMap((r) => r.cells) };
}

export interface CompareNote {
  title: string;
  /** RichText, at most three short sentences. */
  body: string;
  /** Lesson "Try it" buttons (compare:* action ids). */
  tryIt?: readonly LessonTry[];
}

const fmt = (x: number) => x.toLocaleString("en-US");

/** Observations worth pointing at, with the actual tick counts of this grid (they become Learn slides). */
export function compareNotes(model: CompareGridModel): CompareNote[] {
  const get = (kind: InputKind, key: CompareAlgoKey) => model.rows.find((r) => r.kind === kind)?.cells.find((c) => c.algo.key === key);
  const ticks = (kind: InputKind, key: CompareAlgoKey) => get(kind, key)?.trace.length;
  const has = (key: CompareAlgoKey) => model.cols.some((c) => c.key === key);
  const n = model.n;
  const notes: CompareNote[] = [];

  const insNear = ticks("nearly", "insertion");
  if (insNear !== undefined) {
    const rivals = (["merge", "quick"] as const).filter(has).map((k) => `${compareAlgo(k).name.toLowerCase()} sort ${fmt(ticks("nearly", k) ?? 0)}`);
    notes.push({
      title: "Insertion sort loves nearly-sorted data",
      body:
        `It finishes the **Nearly sorted** row in **${fmt(insNear)}** ticks${rivals.length ? ` (${rivals.join(", ")})` : ""}: each key slides only a step or two. ` +
        "That's why Timsort and introsort hand small or almost-sorted runs to insertion sort.",
      tryIt: [{ label: "Race the nearly-sorted row", action: "compare:row:nearly" }],
    });
  }

  const qRand = ticks("random", "quick");
  const qRev = ticks("reversed", "quick");
  const qNear = ticks("nearly", "quick");
  if (qRand !== undefined && qRev !== undefined && qNear !== undefined) {
    const q3Near = ticks("nearly", "quick3");
    const q3Rev = ticks("reversed", "quick3");
    notes.push({
      title: "A bad pivot makes quick sort quadratic",
      body:
        `With the last element as pivot, ordered input makes each partition peel off one element: **${fmt(qNear)}** (nearly sorted) and ` +
        `**${fmt(qRev)}** (reversed) ticks vs **${fmt(qRand)}** on random.` +
        (q3Near !== undefined && q3Rev !== undefined
          ? ` A median-of-three pivot splits them evenly again: **${fmt(q3Near)}** / **${fmt(q3Rev)}**.`
          : " A median-of-three pivot fixes it."),
      tryIt: [
        { label: "Run the quick sort column", action: "compare:col:quick" },
        { label: has("quick3") ? "Run median-of-3" : "Add median-of-3", action: "compare:col:quick3" },
      ],
    });
  }

  const sel = model.rows.map((r) => r.cells.find((c) => c.algo.key === "selection")?.trace.comparisons);
  if (sel.every((x) => x !== undefined)) {
    notes.push({
      title: "Selection sort ignores the input",
      body: `**${fmt(sel[0] ?? 0)}** comparisons = n(n−1)/2 on every row: it always scans the rest for the minimum. Only its few writes change.`,
      tryIt: [{ label: "Run the selection column", action: "compare:col:selection" }],
    });
  }

  const merge = model.rows.map((r) => r.cells.find((c) => c.algo.key === "merge")?.trace.length);
  if (merge.every((x) => x !== undefined)) {
    const vals = merge as number[];
    notes.push({
      title: "Merge sort is steady",
      body:
        `**${fmt(Math.min(...vals))}–${fmt(Math.max(...vals))}** ticks on every row: it always halves and merges all log₂ n levels. ` +
        "Copying runs into a buffer is what its writes pay for.",
      tryIt: [{ label: "Run the merge column", action: "compare:col:merge" }],
    });
  }

  const bRev = ticks("reversed", "bubble");
  const iRev = ticks("reversed", "insertion");
  const sRev = ticks("reversed", "shell");
  if (bRev !== undefined || sRev !== undefined) {
    const parts: string[] = [];
    if (bRev !== undefined) parts.push(`bubble sort turns all n(n−1)/2 = ${fmt((n * (n - 1)) / 2)} comparisons into swaps (**${fmt(bRev)}** ticks)`);
    if (sRev !== undefined && iRev !== undefined) parts.push(`Shell sort's long gaps need only **${fmt(sRev)}** vs **${fmt(iRev)}** for insertion sort`);
    notes.push({
      title: "Reversed input",
      body: `Every pair is out of order: ${parts.join("; ")}.`,
      tryIt: [{ label: "Race the reversed row", action: "compare:row:reversed" }],
    });
  }

  const cnt = ticks("random", "counting");
  const rdx = ticks("random", "radix");
  notes.push(
    cnt !== undefined || rdx !== undefined
      ? {
          title: "Sorting without comparisons",
          body:
            `${[cnt !== undefined ? `Counting (**${fmt(cnt)}**)` : "", rdx !== undefined ? `radix (**${fmt(rdx)}**)` : ""].filter(Boolean).join(" and ")} ` +
            "never compare keys, so order doesn't matter. They win here only because the keys are small integers.",
          tryIt: [{ label: "Race the random row", action: "compare:row:random" }],
        }
      : {
          title: "Sorting without comparisons",
          body: "Counting and radix sort never compare keys. Add them to see how they race on small integers.",
          tryIt: [
            { label: "Add counting sort", action: "compare:col:counting" },
            { label: "Add radix sort", action: "compare:col:radix" },
          ],
        },
  );

  return notes;
}
