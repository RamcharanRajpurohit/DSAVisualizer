/*
 * WebMCP tools for the heap page: an AI agent can insert, extract, build, sort and inspect the heap on
 * screen. Every action records the same animation a click would (it starts playing on the page) and
 * returns a short plain-text answer. Inputs are validated here; nothing throws.
 */
import { VALUE_MAX, VALUE_MIN } from "@/config/input";
import { useAgentTools } from "@/lib/hooks/useAgentTools";
import type { AgentTool } from "@/lib/webmcp";
import { CAPACITY, kindLabel } from "./constants";
import { recordBuild, recordExtract, recordHeapSort, recordIdle, recordInsert } from "./engine/operations";
import type { HeapItem, HeapKind, OpResult } from "./engine/types";
import { fmtValues, idleText } from "./pages";

export interface HeapAgentApi {
  /** The committed heap and its kind right now (kept current synchronously, so back-to-back calls chain). */
  current(): { heap: readonly HeapItem[]; kind: HeapKind };
  /** New keys with fresh identities. */
  mint(values: readonly number[]): HeapItem[];
  /** Show a recorded operation on the page (it starts playing) and commit `res.final`. */
  run(res: OpResult, label: string, kind?: HeapKind): void;
  /** Title of the step currently on screen. */
  stepTitle(): string | undefined;
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const plain = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1");
const arr = (h: readonly { v: number }[]) => `[${h.map((x) => x.v).join(", ")}]`;
const PLAYING = "The animation is playing on the page.";

/** Keys per tree level: [[a0], [a1, a2], [a3 … a6], …]. */
export function heapLevels(values: readonly number[]): number[][] {
  const out: number[][] = [];
  for (let start = 0, width = 1; start < values.length; start += width, width *= 2) out.push(values.slice(start, start + width));
  return out;
}

const VALUES = (what: string, max: number) => ({
  type: "array",
  items: { type: "integer", minimum: VALUE_MIN, maximum: VALUE_MAX },
  minItems: 1,
  maxItems: max,
  description: `${what} (whole numbers ${VALUE_MIN}–${VALUE_MAX}, at most ${max}).`,
});

/** null = valid; otherwise the error text. */
function badValues(v: unknown, max: number): string | null {
  if (!Array.isArray(v) || !v.length) return `Error: 'values' must be a non-empty array of whole numbers ${VALUE_MIN}–${VALUE_MAX}.`;
  if (v.length > max) return `Error: at most ${max} values fit (the heap holds ${CAPACITY} keys).`;
  if (!v.every((x) => Number.isInteger(x) && x >= VALUE_MIN && x <= VALUE_MAX)) return `Error: every value must be a whole number from ${VALUE_MIN} to ${VALUE_MAX}.`;
  return null;
}

/** Register the heap tools while the page is mounted (WebMCP is feature-detected; no-op elsewhere). */
export function useHeapAgentTools(api: HeapAgentApi) {
  useAgentTools(heapAgentTools(api));
}

export function heapAgentTools(api: HeapAgentApi): AgentTool[] {
  const summary = (h: readonly HeapItem[], k: HeapKind) =>
    h.length ? `${kindLabel(k)} of ${plural(h.length, "key")}: ${arr(h)}; ${k} = ${h[0].v}.` : `The ${k}-heap is now empty.`;

  return [
    {
      name: "heap_insert",
      description:
        "Insert one or more keys into the heap on the page, one after another (append at a[n], then sift up), and animate every swap. Returns the heap array afterwards and its new top.",
      inputSchema: {
        type: "object",
        properties: { values: VALUES("Keys to insert, in order", CAPACITY) },
        required: ["values"],
        additionalProperties: false,
      },
      execute: ({ values }: { values?: unknown }) => {
        const { heap, kind } = api.current();
        const room = CAPACITY - heap.length;
        if (!room) return `Error: the heap is full (${CAPACITY} keys). Extract or rebuild first.`;
        const bad = badValues(values, room);
        if (bad) return bad;
        const vals = values as number[];
        const res = recordInsert(heap, kind, api.mint(vals));
        api.run(res, `insert(${fmtValues(vals)})`);
        return `Inserted ${vals.join(", ")}. ${summary(res.final, kind)} ${PLAYING}`;
      },
    },
    {
      name: "heap_extract",
      description:
        "Remove and return the top key of the heap on the page (the max of a max-heap, the min of a min-heap): the last key moves to the root and sifts down. Returns the extracted key and the heap afterwards.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: () => {
        const { heap, kind } = api.current();
        if (!heap.length) return `Error: the heap is empty — there is no ${kind} to extract.`;
        const top = heap[0].v;
        const res = recordExtract(heap, kind);
        api.run(res, `extract${kind === "max" ? "Max" : "Min"}()`);
        return `Extracted ${top} (the ${kind}). ${summary(res.final, kind)} ${PLAYING}`;
      },
    },
    {
      name: "heap_build",
      description:
        "Replace the heap on the page with the given values and turn them into a heap with bottom-up build-heap (heapify, O(n)), animating each sift-down. Uses the current heap type. Returns the resulting array and the number of swaps.",
      inputSchema: {
        type: "object",
        properties: { values: VALUES("Array to heapify, in index order", CAPACITY) },
        required: ["values"],
        additionalProperties: false,
      },
      execute: ({ values }: { values?: unknown }) => {
        const bad = badValues(values, CAPACITY);
        if (bad) return bad;
        const vals = values as number[];
        const { kind } = api.current();
        const res = recordBuild(api.mint(vals), kind);
        api.run(res, `buildHeap([${fmtValues(vals)}])`);
        const swaps = res.steps.at(-1)?.vars?.swaps;
        return `Built a ${kind}-heap from [${vals.join(", ")}]${typeof swaps === "number" ? ` with ${plural(swaps, "swap")}` : ""}. Result: ${arr(res.final)}; ${kind} = ${res.final[0].v}. ${PLAYING}`;
      },
    },
    {
      name: "heap_sort",
      description:
        "Heap-sort the given values on the page: build a heap, then repeatedly swap the root to the end and sift down. With the max-heap type the result is ascending, with min-heap descending. Returns the sorted array.",
      inputSchema: {
        type: "object",
        properties: { values: VALUES("Values to sort", CAPACITY) },
        required: ["values"],
        additionalProperties: false,
      },
      execute: ({ values }: { values?: unknown }) => {
        const bad = badValues(values, CAPACITY);
        if (bad) return bad;
        const vals = values as number[];
        const { kind } = api.current();
        const res = recordHeapSort(api.mint(vals), kind);
        api.run(res, `heapSort([${fmtValues(vals)}])`);
        return `Sorted ${kind === "max" ? "ascending" : "descending"} with a ${kind}-heap: [${res.sorted.join(", ")}]. O(n log n), in place, not stable. Afterwards the page keeps the heap built in phase 1: ${arr(res.final)}. ${PLAYING}`;
      },
    },
    {
      name: "set_heap_type",
      description:
        "Switch the heap on the page between a max-heap (every parent ≥ its children) and a min-heap (every parent ≤ its children); the current keys are rebuilt under the new rule with an animated build-heap. Returns the rebuilt array.",
      inputSchema: {
        type: "object",
        properties: { type: { type: "string", enum: ["min", "max"], description: "'max' = largest key at the root, 'min' = smallest key at the root." } },
        required: ["type"],
        additionalProperties: false,
      },
      execute: ({ type }: { type?: unknown }) => {
        if (type !== "min" && type !== "max") return "Error: 'type' must be \"min\" or \"max\".";
        const { heap, kind } = api.current();
        if (type === kind) return `It is already a ${kind}-heap. ${summary(heap, kind)}`;
        if (heap.length > 1) {
          const res = recordBuild(heap, type, { title: `Switch to a ${type}-heap` });
          api.run(res, `Rebuild as ${type}-heap`, type);
          return `Rebuilt as a ${type}-heap. ${summary(res.final, type)} ${PLAYING}`;
        }
        const title = `${kindLabel(type)}${heap.length ? " of 1 key" : ""}`;
        api.run(recordIdle(heap, type, title, idleText(type, heap.length)), title, type);
        return `Switched to a ${type}-heap. ${summary(heap, type)}`;
      },
    },
    {
      name: "get_heap",
      description:
        "Read the heap currently on the page: its type (min or max), size, backing array in index order, the top key, and the keys on each tree level. Changes nothing.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: () => {
        const { heap, kind } = api.current();
        const values = heap.map((x) => x.v);
        const title = api.stepTitle();
        return {
          type: kind,
          size: values.length,
          capacity: CAPACITY,
          array: values,
          top: values[0] ?? null,
          levels: heapLevels(values),
          note: "Children of index i are at 2i+1 and 2i+2; the parent is at floor((i-1)/2).",
          currentStep: title ? plain(title) : null,
        };
      },
    },
  ];
}
