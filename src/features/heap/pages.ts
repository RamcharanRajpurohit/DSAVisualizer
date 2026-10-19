/*
 * Topic pages under /heap/<slug>: each opens the visualizer with the matching operation already
 * recorded (paused on step 0, ready to play). Deterministic, so the server render and the first
 * client render agree; a share link in the URL still wins.
 */
import { DEFAULT_VALUES, kindLabel } from "./constants";
import { heapify, recordBuild, recordExtract, recordHeapSort, recordIdle } from "./engine/operations";
import type { HeapItem, HeapKind, HeapStep } from "./engine/types";
import { LESSON_BUILD, LESSON_SORT } from "./lesson";

export type HeapPage = "heap-sort" | "priority-queue" | "build-heap";

const PAGES: Record<HeapPage, true> = { "heap-sort": true, "priority-queue": true, "build-heap": true };

export const isHeapPage = (slug: string): slug is HeapPage => Object.hasOwn(PAGES, slug);

export interface HeapRecording {
  steps: readonly HeapStep[];
  label: string;
}

export interface HeapStart {
  kind: HeapKind;
  heap: readonly HeapItem[];
  rec: HeapRecording;
  subtitle: string;
}

/** Ids the page itself mints start here, above every id used by a preset. */
export const FIRST_FREE_ID = 64;

export const idleText = (kind: HeapKind, n: number) =>
  n
    ? `Tree and array are the **same data**: a[i]'s children are a[2i+1] and a[2i+2]. ` +
      `Every parent is ${kind === "max" ? "≥" : "≤"} its children, so the ${kind} sits at a[0].`
    : "Insert keys or build a heap from an array.";

export const fmtValues = (vals: readonly number[]) => (vals.length > 4 ? `${vals.slice(0, 4).join(", ")}, …` : vals.join(", "));

const items = (values: readonly number[]): HeapItem[] => values.map((v, id) => ({ id, v }));

function build(page?: HeapPage): HeapStart {
  switch (page) {
    case "heap-sort": {
      const res = recordHeapSort(items(LESSON_SORT), "max");
      return {
        kind: "max",
        heap: res.final,
        rec: { steps: res.steps, label: `heapSort([${fmtValues(LESSON_SORT)}])` },
        subtitle: "Build a max-heap, then move the root to the end n − 1 times — in place, O(n log n).",
      };
    }
    case "priority-queue": {
      const res = recordExtract(heapify(items(DEFAULT_VALUES), "min"), "min");
      return {
        kind: "min",
        heap: res.final,
        rec: { steps: res.steps, label: "extractMin()" },
        subtitle: "A binary heap that always serves the most urgent key first: insert, peek, extract.",
      };
    }
    case "build-heap": {
      const res = recordBuild(items(LESSON_BUILD), "max");
      return {
        kind: "max",
        heap: res.final,
        rec: { steps: res.steps, label: `buildHeap([${fmtValues(LESSON_BUILD)}])` },
        subtitle: "Sift down from the last parent back to the root: a whole heap in O(n).",
      };
    }
    default: {
      const heap = heapify(items(DEFAULT_VALUES), "max");
      const title = `${kindLabel("max")} of ${heap.length} keys`;
      return {
        kind: "max",
        heap,
        rec: { steps: recordIdle(heap, "max", title, idleText("max", heap.length)).steps, label: "Example heap" },
        subtitle: "A complete binary tree stored in a plain array: sift-up, sift-down, O(n) build-heap and heap sort.",
      };
    }
  }
}

const cache = new Map<string, HeapStart>();

/** What the page shows on first render (memoised: the same recording object every time). */
export function heapStart(page?: HeapPage): HeapStart {
  const key = page ?? "";
  let start = cache.get(key);
  if (!start) {
    start = build(page);
    cache.set(key, start);
  }
  return start;
}
