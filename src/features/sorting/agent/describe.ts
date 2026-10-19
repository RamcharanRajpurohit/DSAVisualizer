/*
 * Plain-text descriptions of recorded sorting steps, for WebMCP tools (agents read these).
 * Pure TS: no React. Each algorithm records a different step shape; `arrayState` reads the
 * array out of whichever shape it gets.
 */
import type { StepBase, WatchValue } from "@/lib/player/types";
import type { BarsStep, CountingStep, RadixStep } from "../basic/types";
import type { MergeStep } from "../dc/merge/record";
import type { QuickStep } from "../dc/quick/record";
import { splitVars } from "../shared/counters";

type AnyStep = StepBase & Partial<{ kind: string }>;

const list = (xs: readonly (number | string)[]) => `[${xs.join(", ")}]`;
/** Drop the light markup (**bold**, `code`) and collapse whitespace. */
export const plain = (s: string | undefined) => (s ?? "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/\s+/g, " ").trim();

function barsState(s: BarsStep): string {
  let out = `A = ${list(s.slots.map((it) => (it ? it.value : "_")))}`;
  for (const f of s.floating) out += `; ${f.label} = ${f.item.value} (lifted out above index ${f.at})`;
  return out;
}

function countingState(s: CountingStep): string {
  const counts = s.columns.map((v, c) => `${v}:${s.counts[c]}`).join(", ");
  return [
    `A = ${list(s.input.map((it) => (it ? it.value : "_")))}`,
    `C (value:count${s.phase === "prefix" || s.phase === "place" || s.phase === "done" ? " or running total" : ""}) = {${counts}}`,
    `B = ${list(s.output.map((it) => (it ? it.value : "_")))}`,
  ].join("; ");
}

function radixState(s: RadixStep): string {
  const buckets = s.buckets
    .map((b, d) => (b.length ? `${d}:${list(b.map((it) => it.value))}` : ""))
    .filter(Boolean)
    .join(" ");
  return `A = ${list(s.row.map((it) => (it ? it.value : "_")))}${buckets ? `; buckets ${buckets}` : ""}`;
}

/**
 * Merge sort keeps elements in a split/merge tree of boxes. The real array A is: a holding or
 * sorted box's contents; for a split box, its children; for a merging box, the slots already
 * written, and the old values (faint ghosts in the children) everywhere else.
 */
function mergeState(s: MergeStep): string {
  const nodes = s.tree.nodes;
  if (!nodes.length) return "A = []";
  const itemAt = new Map<string, number>();
  s.at.forEach((p, id) => itemAt.set(`${p.node}:${p.slot}`, id));
  const live = (node: number, x: number) => itemAt.get(`${node}:${x - nodes[node].lo}`);
  const ghost = (node: number, x: number) => {
    const g = s.ghost[node]?.[x - nodes[node].lo] ?? -1;
    return g >= 0 ? g : undefined;
  };
  const child = (node: number, x: number) => (x <= nodes[node].mid ? nodes[node].left : nodes[node].right);
  const lookup = (node: number, x: number): number | undefined => {
    const state = s.box[node];
    if (state === "split" && nodes[node].mid >= 0) return lookup(child(node, x), x);
    if (state === "merging") {
      const own = live(node, x);
      if (own !== undefined) return own;
      const c = child(node, x);
      return live(c, x) ?? ghost(c, x);
    }
    return live(node, x) ?? ghost(node, x);
  };
  const values = Array.from({ length: s.tree.n }, (_, x) => {
    const id = lookup(0, x);
    return id === undefined ? "_" : s.items[id].value;
  });
  return `A = ${list(values)}`;
}

function quickState(s: QuickStep): string {
  return `A = ${list(s.order.map((id) => s.items[id]?.value ?? "_"))}`;
}

/** The array as it stands at this step (plus any helper arrays the algorithm uses). */
export function arrayState(step: StepBase): string {
  const s = step as AnyStep;
  if (s.kind === "bars") return barsState(s as BarsStep);
  if (s.kind === "counting") return countingState(s as CountingStep);
  if (s.kind === "radix") return radixState(s as RadixStep);
  if ("tree" in s) return mergeState(s as MergeStep);
  if ("order" in s) return quickState(s as QuickStep);
  return "";
}

const fmt = (v: WatchValue) => (typeof v === "string" ? v : String(v));

/** Counter variables the recorders keep, in display order (each algorithm uses a subset). */
const COUNTER_KEYS = ["comparisons", "swaps", "shifts", "writes", "moves"] as const;

/** Operation counts from a step's variables, e.g. { comparisons: 14, writes: 20 }. */
export function countersOf(vars: Record<string, WatchValue> | undefined): Partial<Record<(typeof COUNTER_KEYS)[number], number>> {
  const out: Partial<Record<(typeof COUNTER_KEYS)[number], number>> = {};
  for (const k of COUNTER_KEYS) {
    const v = vars?.[k];
    if (typeof v === "number") out[k] = v;
  }
  return out;
}

/** "14 comparisons, 20 writes" from a step's counter variables. */
export function countersText(vars: Record<string, WatchValue> | undefined): string {
  const c = countersOf(vars);
  // Every key is a plain plural: drop the "s" for a count of one.
  const parts = COUNTER_KEYS.filter((k) => c[k] !== undefined).map((k) => `${c[k]} ${c[k] === 1 ? k.slice(0, -1) : k}`);
  if (c.comparisons === undefined) parts.unshift("0 comparisons (non-comparison sort)");
  return parts.join(", ");
}

/** Full description of one step: position, headline, explanation, code line, array, variables, counters. */
export function describeStep(algoName: string, steps: readonly StepBase[], index: number, playing: boolean): string {
  const step = steps[index];
  if (!step) return `${algoName}: nothing recorded yet.`;
  const { rest } = splitVars(step.vars);
  const vars = Object.entries(rest)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k} = ${fmt(v)}`)
    .join(", ");
  const line = Array.isArray(step.line) ? step.line.join(", ") : step.line;
  return [
    `${algoName} — step ${index + 1} of ${steps.length}${playing ? " (playing)" : ""}`,
    `Title: ${plain(step.title)}`,
    step.detail ? `Explanation: ${plain(step.detail)}` : "",
    line !== undefined ? `Pseudocode line: ${line}` : "",
    `State: ${arrayState(step)}`,
    vars ? `Variables: ${vars}` : "",
    `Counters so far: ${countersText(step.vars)}`,
  ]
    .filter(Boolean)
    .join("\n");
}
