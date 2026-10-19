/* Next Greater Element with a monotonic stack — pure step recorder. */
import { invalid, mark, markAll, newRec, peekTop, pop, push, setCursor, toks, type AppStep, type SItem } from "./core";

export const NGE_MAX = 14;

export interface NgeResult {
  steps: AppStep[];
  result: number[] | null;
}

export function parseNge(src: string): { ok: true; values: number[] } | { ok: false; title: string; detail: string; tokens: string[]; bad: number } {
  const parts = src.split(/[\s,;]+/).filter(Boolean);
  if (!parts.length) return { ok: false, title: "Type some numbers", detail: "For example `4 5 2 25` — or click an example.", tokens: [], bad: -1 };
  const bad = parts.findIndex((p) => !/^\d+$/.test(p) || Number(p) > 999);
  if (bad >= 0) return { ok: false, title: `'${parts[bad]}' isn't a whole number 0–999`, detail: "Use whole numbers from 0 to 999, separated by spaces or commas.", tokens: parts, bad };
  if (parts.length > NGE_MAX) return { ok: false, title: "That's a bit long", detail: `Use at most ${NGE_MAX} numbers so every step fits — you entered ${parts.length}.`, tokens: [], bad: -1 };
  return { ok: true, values: parts.map(Number) };
}

export function runNge(input: string): NgeResult {
  const parsed = parseNge(input);
  if (!parsed.ok) return { steps: invalid("nge", parsed.title, parsed.detail, toks(parsed.tokens), parsed.bad, parsed.bad >= 0 ? "danger" : "warn"), result: null };
  const A = parsed.values;
  const n = A.length;
  const R = newRec("nge", toks(A.map(String)), true);
  const result = A.map(() => -1);
  const setAligned = (i: number, it: SItem) => {
    const al = (R.s.aligned ?? []).slice();
    al[i] = it;
    R.s = { ...R.s, aligned: al };
  };
  const topIdx = () => {
    const t = peekTop(R);
    return t ? Number(t.id.slice(1)) : null;
  };
  const vars = (i: number) => {
    const ti = topIdx();
    return { i, "A[i]": A[i] ?? "—", top: ti ?? "—", "A[top]": ti == null ? "—" : A[ti] };
  };

  R.snap("Find, for every element, the first larger one to its right",
    "Brute force compares every pair: O(n²). A **monotonic stack** does it in one pass: it holds the indices still waiting for an answer, and their values **decrease** from bottom to top.",
    { line: [2, 3], vars: { i: "—", "A[i]": "—", top: "—", "A[top]": "—" } });

  for (let i = 0; i < n; i++) {
    setCursor(R, i);
    mark(R, i, "current");
    for (;;) {
      const ti = topIdx();
      if (ti == null) {
        R.snap(`A[${i}] = ${A[i]}: stack empty → nothing to resolve`, "No earlier element is waiting.", { line: 5, vars: vars(i), fx: { card: { title: "Compare", body: "stack empty", tone: "muted" } } });
        break;
      }
      const top = peekTop(R)!;
      if (A[ti] < A[i]) {
        R.snap(`A[${ti}] = ${A[ti]} < ${A[i]}`,
          `${A[i]} is the first element to the right of index ${ti} that is larger — and every other waiting element below is **larger** than ${A[ti]}, so this check is all we need.`,
          { tone: "warn", line: 5, vars: vars(i), fx: { hl: { [top.id]: "active" }, card: { title: "Compare", body: `A[top] = ${A[ti]}  <  A[i] = ${A[i]}  → resolve`, tone: "warn" } } });
        pop(R);
        result[ti] = A[i];
        setAligned(ti, { id: top.id, text: String(A[i]) });
        mark(R, ti, "ok");
        R.snap(`result[${ti}] = ${A[i]}`,
          `Index ${ti} has its answer and leaves the stack — it will never be looked at again. Each index is pushed once and popped at most once → O(n) total.`,
          { tone: "ok", line: 6, vars: vars(i), fx: { hl: { [top.id]: "ok" } } });
      } else {
        R.snap(`A[${ti}] = ${A[ti]} ≥ ${A[i]} → stop`,
          `${A[i]} is not larger than the top, so it can't be the answer for the top — nor for anything below it, which is even larger.`,
          { line: 5, vars: vars(i), fx: { hl: { [top.id]: "active" }, card: { title: "Compare", body: `A[top] = ${A[ti]}  ≥  A[i] = ${A[i]}  → stop`, tone: "info" } } });
        break;
      }
    }
    push(R, { id: `x${i}`, text: String(A[i]), src: i, sub: `i=${i}` });
    mark(R, i, "wait");
    R.snap(`push index ${i}`,
      `${A[i]} now waits for its own next greater element. The stack stays decreasing from bottom to top.`,
      { line: 7, vars: vars(i), fx: { hl: { [`x${i}`]: "new" } } });
  }

  setCursor(R, n);
  const left = R.s.stack;
  if (left.length) {
    R.snap(`${left.length} element${left.length === 1 ? "" : "s"} never found a larger one`,
      `Nothing to the right of ${left.map((x) => x.text).join(", ")} is larger, so ${left.length === 1 ? "its" : "their"} answer is **-1**.`,
      { tone: "warn", line: 8, vars: vars(n), fx: { hl: Object.fromEntries(left.map((x) => [x.id, "dim" as const])) } });
    for (const it of left) setAligned(Number(it.id.slice(1)), { id: it.id, text: "-1" });
    markAll(R, left.map((it) => Number(it.id.slice(1))), "done");
    R.s = { ...R.s, stack: [] };
  }
  R.snap("Done ✓",
    `Next greater elements: **[${result.join(", ")}]**. One pass, every index pushed and popped at most once → **O(n)** time, O(n) space.`,
    { tone: "ok", line: 8, vars: vars(n), fx: { verdict: { text: `[${result.join(", ")}]`, tone: "ok" } } });
  return { steps: R.steps, result };
}
