import type { StepBase, WatchValue } from "@/lib/player/types";
import type { Tone } from "@/lib/theme";
import { listText, makeItems, plural, seededRandom, stabilityNote, type SortItem } from "../../shared/items";
import type { CallFrame } from "../common/types";
import { QL } from "./pseudocode";

/*
 * Quick sort recorder (pure TS), Lomuto or Hoare partitioning with a choice of pivot rule.
 * Each step snapshots the array order (by item id), colour roles, the tinted ≤ / > regions,
 * the i / j pointers, the active range and the recursion tree built so far.
 */

export type QuickScheme = "lomuto" | "hoare";
export type PivotRule = "last" | "first" | "middle" | "random" | "median3";

export interface QuickOptions {
  scheme?: string | number;
  pivot?: string | number;
  seed?: string | number;
}

/** base · in the ≤ region · in the > (≥) region · pivot · final position · outside the active range. */
export type QuickRole = "base" | "low" | "high" | "pivot" | "locked" | "dim";

export interface QuickNode {
  id: number;
  lo: number;
  hi: number;
  depth: number;
  parent: number;
  /** Item ids of A[lo..hi] when the call started (its input). */
  snapshot: readonly number[];
  /** Lomuto: the pivot's final index. Hoare: the split index j. (−1 until partitioned.) */
  p: number;
  /** Lomuto: the pivot item placed at p. */
  pivotId: number;
}

/** pending = waiting on the stack · active = running · split = partitioned, children running · done. */
export type QuickNodeState = "pending" | "active" | "split" | "done";

export interface QuickPointer {
  key: "i" | "j";
  index: number;
}

export interface QuickRegion {
  kind: "low" | "high";
  from: number;
  to: number;
}

export interface QuickStep extends StepBase {
  serial: number;
  scheme: QuickScheme;
  items: readonly SortItem[];
  /** order[k] = id of the item at index k. */
  order: readonly number[];
  role: readonly QuickRole[];
  /** Ids being examined (amber ring). */
  focus: readonly number[];
  /** Median-of-three candidates (dashed ring). */
  candidates: readonly number[];
  /** Ids exchanged in this step (drawn crossing on an arc). */
  swap: readonly [number, number] | null;
  range: { lo: number; hi: number; label: string } | null;
  pivotId: number;
  ptrs: readonly QuickPointer[];
  regions: readonly QuickRegion[];
  /** Every node of the final recursion tree (shared); nodeState says which exist yet. */
  nodes: readonly QuickNode[];
  nodeState: readonly QuickNodeState[];
  activeNode: number;
  stack: readonly CallFrame[];
  /** Rows in the final recursion tree (constant for the recording, so the layout never jumps). */
  treeRows: number;
  done: boolean;
}

interface PushArgs {
  title: string;
  detail?: string;
  tone?: Tone;
  line?: number | number[];
  focus?: number[];
  candidates?: number[];
  swap?: [number, number] | null;
  ptrs?: QuickPointer[];
  regions?: QuickRegion[];
  hold?: number;
  done?: boolean;
}

export const PIVOT_RULES: readonly PivotRule[] = ["last", "first", "middle", "random", "median3"];

const RULE_TEXT: Record<PivotRule, string> = {
  last: "last element",
  first: "first element",
  middle: "middle element",
  random: "random element",
  median3: "median of three",
};

export function recordQuickSort(input: readonly number[], opts: QuickOptions = {}): QuickStep[] {
  const scheme: QuickScheme = opts.scheme === "hoare" ? "hoare" : "lomuto";
  const rule: PivotRule = PIVOT_RULES.includes(opts.pivot as PivotRule) ? (opts.pivot as PivotRule) : "last";
  const rng = seededRandom(Number(opts.seed ?? 1) || 1);
  const lomuto = scheme === "lomuto";

  const n = input.length;
  const items = makeItems(input);
  const A = items.map((it) => it.id);
  const locked: boolean[] = items.map(() => false);
  const nodes: QuickNode[] = [];
  const nodeState: QuickNodeState[] = [];
  const stack: CallFrame[] = [];
  const steps: QuickStep[] = [];

  let range: QuickStep["range"] = null;
  let pivotId = -1;
  let activeNode = -1;
  let comparisons = 0;
  let swaps = 0;
  const vars: Record<string, WatchValue> = { lo: null, hi: null, pivot: null, i: null, j: null, p: null };
  const setVars = (v: Partial<Record<"lo" | "hi" | "pivot" | "i" | "j" | "p", WatchValue>>) => {
    for (const key of ["lo", "hi", "pivot", "i", "j", "p"] as const) vars[key] = key in v ? v[key] : null;
  };

  const v = (k: number) => items[A[k]].value;
  const slice = (lo: number, hi: number) => A.slice(lo, hi + 1).map((id) => items[id].value);
  const swapIdx = (a: number, b: number) => {
    const t = A[a];
    A[a] = A[b];
    A[b] = t;
  };

  const roles = (regions: readonly QuickRegion[]): QuickRole[] => {
    const out: QuickRole[] = items.map(() => "base");
    A.forEach((id, k) => {
      if (locked[id]) out[id] = "locked";
      else if (range && (k < range.lo || k > range.hi)) out[id] = "dim";
      else if (id === pivotId) out[id] = "pivot";
      else {
        const r = regions.find((g) => k >= g.from && k <= g.to);
        out[id] = r ? r.kind : "base";
      }
    });
    return out;
  };

  const push = (a: PushArgs) => {
    const regions = a.regions ?? [];
    steps.push({
      serial: steps.length,
      title: a.title,
      detail: a.detail,
      tone: a.tone ?? "info",
      line: a.line,
      hold: a.hold,
      vars: {
        ...vars,
        depth: activeNode >= 0 ? nodes[activeNode].depth : null,
        comparisons,
        swaps,
      },
      scheme,
      items,
      order: A.slice(),
      role: roles(regions),
      focus: a.focus ?? [],
      candidates: a.candidates ?? [],
      swap: a.swap ?? null,
      range: range ? { ...range } : null,
      pivotId,
      ptrs: a.ptrs ?? [],
      regions,
      nodes,
      nodeState: nodeState.slice(),
      activeNode,
      stack: stack.slice(),
      treeRows: 1,
      done: a.done ?? false,
    });
  };

  const newNode = (lo: number, hi: number, depth: number, parent: number) => {
    const id = nodes.length;
    nodes.push({ id, lo, hi, depth, parent, snapshot: A.slice(lo, hi + 1), p: -1, pivotId: -1 });
    nodeState.push("pending");
    return id;
  };

  if (n === 0) {
    push({ title: "Nothing to sort", detail: "The array is empty.", tone: "muted", done: true });
    return finish(steps);
  }

  newNode(0, n - 1, 0, -1);
  push({
    title: `Start: quick sort ${plural(n, "element")}`,
    detail:
      "Quick sort is **divide and conquer** too, but it does the work *before* recursing: pick a **pivot**, **partition** the range " +
      "so smaller elements end up left of it and larger ones right, then sort both sides independently — no merge step needed.\n" +
      `Scheme: **${lomuto ? "Lomuto" : "Hoare"}** · pivot: **${RULE_TEXT[rule]}**.`,
    line: QL.call,
  });

  /** Pick the pivot index for A[lo..hi] according to the rule (may record a median-of-three step). */
  const choosePivot = (lo: number, hi: number): number => {
    const mid = Math.floor((lo + hi) / 2);
    switch (rule) {
      case "last":
        return hi;
      case "first":
        return lo;
      case "middle":
        return mid;
      case "random":
        return lo + Math.floor(rng() * (hi - lo + 1));
      case "median3": {
        const idx = [...new Set([lo, mid, hi])];
        const sorted = idx.slice().sort((a, b) => v(a) - v(b) || a - b);
        comparisons += idx.length === 3 ? 3 : 1;
        const m = sorted[Math.floor((sorted.length - 1) / 2)];
        setVars({ lo, hi });
        push({
          title: `Median of three → ${v(m)}`,
          detail:
            `Look at ${idx.map((k) => `A[${k}] = ${v(k)}`).join(", ")}. Their median, **${v(m)}**, is a cheap guess at the middle value ` +
            "and keeps already-sorted input from hitting the O(n²) worst case.",
          line: QL.choose,
          candidates: idx.map((k) => A[k]),
          focus: [A[m]],
          hold: 1.2,
        });
        return m;
      }
    }
  };

  const ruleWhy = (lo: number, hi: number, idx: number) => {
    switch (rule) {
      case "last":
        return "The textbook (CLRS) choice: simple, but it degrades to O(n²) on sorted input.";
      case "first":
        return "Simple, but like the last element it degrades to O(n²) on sorted input.";
      case "middle":
        return `Index ⌊(${lo} + ${hi}) / 2⌋ = ${idx}. Sorted input now splits evenly.`;
      case "random":
        return "A random pivot makes the O(n²) worst case vanishingly unlikely on any input.";
      case "median3":
        return "";
    }
  };

  const partitionLomuto = (lo: number, hi: number, node: number): number => {
    stack.push({ key: `pt-${node}`, label: `partition(${lo}, ${hi})`, kind: "partition" });
    setVars({ lo, hi });
    const idx = choosePivot(lo, hi);
    pivotId = A[idx];
    if (rule !== "median3") {
      push({
        title: `Pivot: ${RULE_TEXT[rule]} → A[${idx}] = ${v(idx)}`,
        detail: ruleWhy(lo, hi, idx),
        line: QL.choose,
        focus: [A[idx]],
      });
    }
    if (idx !== hi) {
      swapIdx(idx, hi);
      swaps++;
      push({
        title: `Move the pivot to the end: swap A[${idx}] ↔ A[${hi}]`,
        detail: "Lomuto's loop scans A[lo..hi−1], so the pivot is parked at A[hi] out of the way until the end.",
        line: QL.choose,
        swap: [A[hi], A[idx]],
      });
    }
    const pv = v(hi);
    let i = lo - 1;
    setVars({ lo, hi, pivot: pv, i, j: lo });
    push({
      title: `pivot = ${pv};  i = ${i}`,
      detail:
        `Invariant: A[lo..i] ≤ ${pv} (blue) and A[i+1..j−1] > ${pv} (purple). Both regions start empty (i = lo − 1); ` +
        `**j** will examine A[${lo}..${hi - 1}] one element at a time.`,
      line: [QL.pivot, QL.init],
      ptrs: [{ key: "i", index: i }, { key: "j", index: lo }],
    });

    const regions = (scanEnd: number): QuickRegion[] => {
      const out: QuickRegion[] = [];
      if (i >= lo) out.push({ kind: "low", from: lo, to: i });
      if (scanEnd - 1 >= i + 1) out.push({ kind: "high", from: i + 1, to: scanEnd - 1 });
      return out;
    };

    for (let j = lo; j < hi; j++) {
      comparisons++;
      const x = v(j);
      setVars({ lo, hi, pivot: pv, i, j });
      if (x <= pv) {
        push({
          title: `A[${j}] = ${x} ≤ ${pv}`,
          detail: `${x} belongs in the **≤ region**: grow it by one (i = i + 1) and swap A[j] in.`,
          line: [QL.loop, QL.test],
          focus: [A[j]],
          ptrs: [{ key: "i", index: i }, { key: "j", index: j }],
          regions: regions(j),
        });
        i++;
        setVars({ lo, hi, pivot: pv, i, j });
        if (i !== j) {
          swapIdx(i, j);
          swaps++;
          push({
            title: `i = ${i};  swap A[${i}] ↔ A[${j}]`,
            detail: `**${v(i)}** joins the ≤ region; **${v(j)}** (the first element of the > region) moves to its end.`,
            line: [QL.inc, QL.swap],
            swap: [A[i], A[j]],
            ptrs: [{ key: "i", index: i }, { key: "j", index: j }],
            regions: regions(j + 1),
          });
        } else {
          push({
            title: `i = ${i};  swap A[${i}] with itself`,
            detail: `The > region is still empty, so ${x} is already where it belongs — the swap changes nothing.`,
            line: [QL.inc, QL.swap],
            ptrs: [{ key: "i", index: i }, { key: "j", index: j }],
            regions: regions(j + 1),
            hold: 0.7,
          });
        }
      } else {
        push({
          title: `A[${j}] = ${x} > ${pv}`,
          detail: `${x} stays put — the **> region** simply grows to include it. Move j on.`,
          line: [QL.loop, QL.test],
          focus: [A[j]],
          ptrs: [{ key: "i", index: i }, { key: "j", index: j }],
          regions: regions(j + 1),
        });
      }
    }

    const p = i + 1;
    setVars({ lo, hi, pivot: pv, i, j: hi, p });
    const after: QuickRegion[] = [];
    if (p - 1 >= lo) after.push({ kind: "low", from: lo, to: p - 1 });
    if (hi >= p + 1) after.push({ kind: "high", from: p + 1, to: hi });
    locked[pivotId] = true;
    if (p !== hi) {
      swapIdx(p, hi);
      swaps++;
      push({
        title: `Place the pivot: swap A[${p}] ↔ A[${hi}]`,
        detail:
          `Everything left of index ${p} is ≤ ${pv} and everything right of it is > ${pv}, so index **${p}** is the pivot's ` +
          "**final position** — it never moves again.",
        line: [QL.place, QL.ret],
        swap: [A[p], A[hi]],
        ptrs: [{ key: "i", index: i }, { key: "j", index: hi }],
        regions: after,
        tone: "ok",
      });
    } else {
      push({
        title: `Pivot ${pv} is already in its final position (index ${p})`,
        detail: `No element is greater than ${pv}, so it stays at A[${hi}] — the end of the range is exactly where it belongs.`,
        line: [QL.place, QL.ret],
        ptrs: [{ key: "i", index: i }, { key: "j", index: hi }],
        regions: after,
        tone: "ok",
      });
    }
    nodes[node].p = p;
    nodes[node].pivotId = pivotId;
    stack.pop();
    return p;
  };

  const partitionHoare = (lo: number, hi: number, node: number): number => {
    stack.push({ key: `pt-${node}`, label: `partition(${lo}, ${hi})`, kind: "partition" });
    setVars({ lo, hi });
    const idx = choosePivot(lo, hi);
    pivotId = A[idx];
    if (rule !== "median3") {
      push({
        title: `Pivot: ${RULE_TEXT[rule]} → A[${idx}] = ${v(idx)}`,
        detail: ruleWhy(lo, hi, idx),
        line: QL.choose,
        focus: [A[idx]],
      });
    }
    if (idx !== lo) {
      swapIdx(idx, lo);
      swaps++;
      push({
        title: `Move the pivot to the front: swap A[${idx}] ↔ A[${lo}]`,
        detail: "With the pivot at A[lo], the scans are guaranteed to stop inside the range and both parts end up non-empty.",
        line: QL.choose,
        swap: [A[lo], A[idx]],
      });
    }
    const pv = v(lo);
    let i = lo - 1;
    let j = hi + 1;
    const P = () => [{ key: "i" as const, index: i }, { key: "j" as const, index: j }];
    const regions = (lowEnd: number, highStart: number): QuickRegion[] => {
      const out: QuickRegion[] = [];
      if (lowEnd >= lo) out.push({ kind: "low", from: lo, to: lowEnd });
      if (highStart <= hi) out.push({ kind: "high", from: highStart, to: hi });
      return out;
    };
    setVars({ lo, hi, pivot: pv, i, j });
    push({
      title: `pivot = ${pv};  i = ${i}, j = ${j}`,
      detail:
        "Hoare's scheme scans inward from **both ends**: **i** looks for an element ≥ pivot on the left, **j** for one ≤ pivot on " +
        "the right, and the two are swapped. When the pointers cross, the range is split at j.",
      line: [QL.pivot, QL.init],
      ptrs: P(),
    });

    let lowEnd = lo - 1;
    let highStart = hi + 1;
    for (let guard = 0; guard < 10 * n + 10; guard++) {
      do {
        i++;
        comparisons++;
        const x = v(i);
        setVars({ lo, hi, pivot: pv, i, j });
        if (x < pv) {
          lowEnd = i;
          push({
            title: `i → ${i}:  ${x} < ${pv}, keep scanning`,
            detail: `${x} is already on the correct (left) side.`,
            line: [QL.hLoop, QL.scanI],
            focus: [A[i]],
            ptrs: P(),
            regions: regions(lowEnd, highStart),
            hold: 0.8,
          });
        } else {
          lowEnd = i - 1;
          push({
            title: `i stops at ${i}:  ${x} ≥ ${pv}`,
            detail: `${x} ${x === pv ? "equals the pivot" : "is too big for the left side"} — i waits here for a swap partner.`,
            line: [QL.hLoop, QL.scanI],
            focus: [A[i]],
            ptrs: P(),
            regions: regions(lowEnd, highStart),
          });
        }
      } while (v(i) < pv);

      do {
        j--;
        comparisons++;
        const x = v(j);
        setVars({ lo, hi, pivot: pv, i, j });
        if (x > pv) {
          highStart = j;
          push({
            title: `j → ${j}:  ${x} > ${pv}, keep scanning`,
            detail: `${x} is already on the correct (right) side.`,
            line: QL.scanJ,
            focus: [A[j]],
            ptrs: P(),
            regions: regions(lowEnd, highStart),
            hold: 0.8,
          });
        } else {
          highStart = j + 1;
          push({
            title: `j stops at ${j}:  ${x} ≤ ${pv}`,
            detail: `${x} ${x === pv ? "equals the pivot" : "is too small for the right side"} — j stops here.`,
            line: QL.scanJ,
            focus: [A[j]],
            ptrs: P(),
            regions: regions(lowEnd, highStart),
          });
        }
      } while (v(j) > pv);

      if (i >= j) {
        setVars({ lo, hi, pivot: pv, i, j, p: j });
        push({
          title: `Pointers crossed (i = ${i} ≥ j = ${j}) → return ${j}`,
          detail:
            `Everything in A[${lo}..${j}] is ≤ ${pv} and everything in A[${j + 1}..${hi}] is ≥ ${pv}. ` +
            "Unlike Lomuto, the pivot is *not* necessarily in its final place — both parts are sorted recursively.",
          line: QL.cross,
          ptrs: P(),
          regions: regions(j, j + 1),
          tone: "ok",
        });
        nodes[node].p = j;
        stack.pop();
        return j;
      }

      swapIdx(i, j);
      swaps++;
      lowEnd = i;
      highStart = j;
      push({
        title: `Swap A[${i}] ↔ A[${j}]`,
        detail: `**${v(i)}** moves to the left side and **${v(j)}** to the right side — both are now where they belong.`,
        line: [QL.cross, QL.hSwap],
        swap: [A[i], A[j]],
        ptrs: P(),
        regions: regions(lowEnd, highStart),
      });
    }
    throw new Error("Hoare partition did not terminate");
  };

  const quickSort = (node: number, callerLine: number, intro: string) => {
    const { lo, hi, depth } = nodes[node];
    stack.push({ key: `qs-${node}`, label: `quickSort(${lo}, ${hi})`, kind: "call" });
    activeNode = node;
    nodeState[node] = "active";
    range = { lo, hi, label: `quickSort(${lo}, ${hi})` };
    pivotId = -1;
    setVars({ lo, hi });

    if (lo === hi) {
      locked[A[lo]] = true;
      nodeState[node] = "done";
      push({
        title: `quickSort(${lo}, ${hi}) — one element`,
        detail: `${intro}A single element is trivially in its final position: **${v(lo)}** stays at index ${lo}.`,
        line: QL.base,
        tone: "ok",
        hold: 0.85,
      });
      stack.pop();
      return;
    }

    push({
      title: `Call quickSort(${lo}, ${hi})`,
      detail: `${intro}Sort A[${lo}..${hi}] = ${listText(slice(lo, hi))}. Partition it around a pivot first.`,
      line: callerLine,
    });
    range = { lo, hi, label: `partition(${lo}, ${hi})` };
    const p = lomuto ? partitionLomuto(lo, hi, node) : partitionHoare(lo, hi, node);
    range = { lo, hi, label: `quickSort(${lo}, ${hi})` };

    const [lLo, lHi] = lomuto ? [lo, p - 1] : [lo, p];
    const [rLo, rHi] = [p + 1, hi];
    const left = lLo <= lHi ? newNode(lLo, lHi, depth + 1, node) : -1;
    const right = rLo <= rHi ? newNode(rLo, rHi, depth + 1, node) : -1;
    nodeState[node] = "split";
    activeNode = node;
    pivotId = -1;
    setVars({ lo, hi, p });
    const part = (a: number, b: number) => (a <= b ? `A[${a}..${b}] ${listText(slice(a, b), 8)}` : "nothing (empty)");
    push({
      title: lomuto ? `p = ${p}: pivot ${v(p)} is locked in place` : `p = ${p}: split into [${lo}..${p}] and [${p + 1}..${hi}]`,
      detail:
        `Divide step done. Left part: ${part(lLo, lHi)}. Right part: ${part(rLo, rHi)}. ` +
        "The two parts never need to be combined — once both are sorted, the whole range is sorted.",
      line: QL.partition,
      tone: "ok",
      regions: [
        ...(lLo <= lHi ? [{ kind: "low" as const, from: lLo, to: lHi }] : []),
        ...(rLo <= rHi ? [{ kind: "high" as const, from: rLo, to: rHi }] : []),
      ],
    });

    if (left >= 0) quickSort(left, QL.recurseLeft, "Recurse into the **left part**. ");
    if (right >= 0) {
      quickSort(
        right,
        QL.recurseRight,
        left >= 0 ? `Left part A[${lLo}..${lHi}] is sorted ✓. Now the **right part**. ` : "The left part is empty. Recurse into the **right part**. ",
      );
    }
    nodeState[node] = "done";
    stack.pop();
  };

  quickSort(0, QL.call, "");
  activeNode = -1;
  range = null;
  pivotId = -1;
  for (const it of items) locked[it.id] = true;
  setVars({});
  const maxDepth = Math.max(...nodes.map((nd) => nd.depth));
  push({
    title: "Sorted!",
    detail:
      n === 1
        ? "A single element is already sorted."
        : `${plural(n, "element")} sorted in place with **${plural(comparisons, "comparison")}** and **${plural(swaps, "swap")}**. ` +
          `Recursion depth ${maxDepth} (balanced would be ⌈log₂ ${n}⌉ = ${Math.ceil(Math.log2(n))})` +
          (maxDepth > 2 * Math.ceil(Math.log2(n)) + 1 ? " — unbalanced splits are what make quick sort slow on bad pivots." : ".") +
          stabilityNote(items, A),
    tone: "ok",
    hold: 2,
    done: true,
  });
  return finish(steps);
}

function finish(steps: QuickStep[]): QuickStep[] {
  const last = steps[steps.length - 1];
  const rows = last.nodes.length ? Math.max(...last.nodes.map((nd) => nd.depth)) + 1 : 1;
  for (const s of steps) s.treeRows = rows;
  return steps;
}
