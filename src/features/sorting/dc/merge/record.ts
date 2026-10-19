import type { StepBase, WatchValue } from "@/lib/player/types";
import type { Tone } from "@/lib/theme";
import { listText, makeItems, plural, stabilityNote, type SortItem } from "../../shared/items";
import type { CallFrame } from "../common/types";
import { ML } from "./pseudocode";

/*
 * Merge sort recorder (pure TS). Every step is a full snapshot of the split/merge tree:
 * where each element currently lives (box + slot), the state of every box, the faint
 * "ghost" values a box remembers after its elements moved on, the pointers and the call stack.
 */

export interface MergeNode {
  id: number;
  lo: number;
  hi: number;
  /** Split point (−1 for a single-element leaf). */
  mid: number;
  depth: number;
  parent: number;
  left: number;
  right: number;
}

export interface MergeTree {
  n: number;
  nodes: readonly MergeNode[];
  /** Number of levels (rows) in the tree. */
  levels: number;
  /** splitDepth[k] = depth of the call that splits between index k and k + 1. */
  splitDepth: readonly number[];
}

/**
 * pending  – not reached yet (dashed outline)
 * holding  – holds its unsorted elements, about to be split
 * split    – its elements moved down to the children (faint ghosts of the old values stay)
 * merging  – receiving the merged run
 * sorted   – holds a sorted run
 * spent    – its sorted run moved up to the parent (faint ghosts stay)
 */
export type MergeBoxState = "pending" | "holding" | "split" | "merging" | "sorted" | "spent";

/** Colour role of an element: unsorted, from the left run, from the right run, or sorted. */
export type MergeRole = "base" | "left" | "right" | "sorted";

export interface MergePointer {
  key: "i" | "j" | "k";
  node: number;
  slot: number;
  /** Ran past the end of its run. */
  done: boolean;
}

export interface MergeStep extends StepBase {
  serial: number;
  tree: MergeTree;
  items: readonly SortItem[];
  /** Per item id: the box and slot it currently occupies. */
  at: readonly { node: number; slot: number }[];
  role: readonly MergeRole[];
  /** Item ids being compared (amber ring). */
  focus: readonly number[];
  /** Item that just moved up into the merged run (−1 = none). */
  flying: number;
  box: readonly MergeBoxState[];
  /** Per box, per slot: item id whose value is shown faintly, or −1. */
  ghost: readonly (readonly number[])[];
  /** Box of the call currently executing (−1 = none). */
  active: number;
  stack: readonly CallFrame[];
  /** Split marker drawn inside a box. */
  mid: { node: number; mid: number } | null;
  ptrs: readonly MergePointer[];
  done: boolean;
}

export function buildMergeTree(n: number): MergeTree {
  const nodes: MergeNode[] = [];
  const splitDepth: number[] = new Array(Math.max(0, n - 1)).fill(0);
  let levels = 0;
  const build = (lo: number, hi: number, depth: number, parent: number): number => {
    const id = nodes.length;
    const node: MergeNode = { id, lo, hi, mid: -1, depth, parent, left: -1, right: -1 };
    nodes.push(node);
    levels = Math.max(levels, depth + 1);
    if (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      node.mid = mid;
      splitDepth[mid] = depth;
      node.left = build(lo, mid, depth + 1, id);
      node.right = build(mid + 1, hi, depth + 1, id);
    }
    return id;
  };
  if (n > 0) build(0, n - 1, 0, -1);
  return { n, nodes, levels, splitDepth };
}

interface PushArgs {
  title: string;
  detail?: string;
  tone?: Tone;
  line?: number | number[];
  focus?: number[];
  flying?: number;
  mid?: { node: number; mid: number } | null;
  ptrs?: MergePointer[];
  hold?: number;
  done?: boolean;
}

export function recordMergeSort(input: readonly number[]): MergeStep[] {
  const n = input.length;
  const items = makeItems(input);
  const tree = buildMergeTree(n);
  const nodes = tree.nodes;
  const steps: MergeStep[] = [];

  const len = (id: number) => nodes[id].hi - nodes[id].lo + 1;
  const at = items.map((it) => ({ node: 0, slot: it.id }));
  const role: MergeRole[] = items.map(() => "base");
  const box: MergeBoxState[] = nodes.map((nd) => (nd.id === 0 ? "holding" : "pending"));
  const ghost: number[][] = nodes.map((nd) => new Array<number>(len(nd.id)).fill(-1));
  /** Live item ids per box slot (−1 = empty). */
  const content: number[][] = nodes.map((nd) => new Array<number>(len(nd.id)).fill(-1));
  if (n > 0) content[0] = items.map((it) => it.id);

  const stack: CallFrame[] = [];
  let active = -1;
  let comparisons = 0;
  let writes = 0;
  const vars: Record<string, WatchValue> = { lo: null, hi: null, mid: null, i: null, j: null, k: null };
  const setVars = (v: Partial<Record<"lo" | "hi" | "mid" | "i" | "j" | "k", WatchValue>>) => {
    for (const key of ["lo", "hi", "mid", "i", "j", "k"] as const) vars[key] = key in v ? v[key] : null;
  };

  const val = (id: number) => items[id].value;
  const vals = (ids: readonly number[]) => ids.filter((x) => x >= 0).map(val);

  const push = (a: PushArgs) => {
    steps.push({
      serial: steps.length,
      title: a.title,
      detail: a.detail,
      tone: a.tone ?? "info",
      line: a.line,
      hold: a.hold,
      vars: {
        ...vars,
        depth: active >= 0 ? nodes[active].depth : null,
        comparisons,
        writes,
      },
      tree,
      items,
      at: at.map((p) => ({ ...p })),
      role: role.slice(),
      focus: a.focus ?? [],
      flying: a.flying ?? -1,
      box: box.slice(),
      ghost: ghost.map((g) => g.slice()),
      active,
      stack: stack.slice(),
      mid: a.mid ?? null,
      ptrs: a.ptrs ?? [],
      done: a.done ?? false,
    });
  };

  if (n === 0) {
    push({ title: "Nothing to sort", detail: "The array is empty.", tone: "muted", done: true });
    return steps;
  }

  push({
    title: `Start: one unsorted array of ${plural(n, "element")}`,
    detail:
      "Merge sort is **divide and conquer**: keep splitting the array in half until every piece holds a single element " +
      "(which is trivially sorted), then **merge** the pieces back together, two sorted runs at a time.",
    line: ML.call,
  });

  const sort = (id: number, callerLine: number, intro: string) => {
    const nd = nodes[id];
    const { lo, hi } = nd;
    stack.push({ key: `ms-${id}`, label: `mergeSort(${lo}, ${hi})`, kind: "call" });
    active = id;
    setVars({ lo, hi });

    if (lo === hi) {
      const it = content[id][0];
      role[it] = "sorted";
      box[id] = "sorted";
      push({
        title: `mergeSort(${lo}, ${hi}) — base case`,
        detail: `${intro}A piece with a single element (**${val(it)}**) is already sorted, so this call returns straight away.`,
        tone: "ok",
        line: ML.base,
        hold: 0.85,
      });
      stack.pop();
      return;
    }

    const size = len(id);
    push({
      title: `Call mergeSort(${lo}, ${hi})`,
      detail: `${intro}Sort A[${lo}..${hi}] = ${listText(vals(content[id]))}. It has ${size} elements, so it must be divided first.`,
      line: callerLine,
    });

    const mid = nd.mid;
    const nLeft = mid - lo + 1;
    setVars({ lo, hi, mid });
    content[id].forEach((it, s) => (role[it] = s < nLeft ? "left" : "right"));
    push({
      title: `mid = ⌊(${lo} + ${hi}) / 2⌋ = ${mid}`,
      detail:
        `Split point. The **left half** is A[${lo}..${mid}] (${plural(nLeft, "element")}), ` +
        `the **right half** A[${mid + 1}..${hi}] (${plural(size - nLeft, "element")}).`,
      line: ML.mid,
      mid: { node: id, mid },
    });

    // Divide: the halves drop down into the two child boxes.
    const L = nd.left;
    const R = nd.right;
    content[id].forEach((it, s) => {
      const toLeft = s < nLeft;
      const child = toLeft ? L : R;
      const slot = toLeft ? s : s - nLeft;
      at[it] = { node: child, slot };
      content[child][slot] = it;
    });
    ghost[id] = content[id].slice();
    content[id].fill(-1);
    box[id] = "split";
    box[L] = "holding";
    box[R] = "holding";
    push({
      title: `Divide A[${lo}..${hi}] into two halves`,
      detail:
        `${listText(vals(content[L]))} and ${listText(vals(content[R]))} drop down one level. ` +
        "Each half is a smaller copy of the same problem, so the same function sorts it recursively.",
      line: [ML.recurseLeft, ML.recurseRight],
      mid: { node: id, mid },
    });
    for (const it of [...content[L], ...content[R]]) role[it] = "base";

    sort(L, ML.recurseLeft, "Recurse into the **left half** first. ");
    active = id;
    sort(R, ML.recurseRight, `Left half A[${lo}..${mid}] is sorted ✓. Now recurse into the **right half**. `);
    active = id;
    merge(id);
    stack.pop();
  };

  const merge = (id: number) => {
    const nd = nodes[id];
    const { lo, mid, hi } = nd;
    const Lid = nd.left;
    const Rid = nd.right;
    stack.push({ key: `mg-${id}`, label: `merge(${lo}, ${mid}, ${hi})`, kind: "merge" });
    active = id;

    const Lc = content[Lid].slice();
    const Rc = content[Rid].slice();
    for (const it of Lc) role[it] = "left";
    for (const it of Rc) role[it] = "right";
    box[id] = "merging";
    ghost[id] = ghost[id].map(() => -1);

    let i = 0;
    let j = 0;
    let k = 0;
    const ptrs = (): MergePointer[] => [
      { key: "i", node: Lid, slot: i, done: i >= Lc.length },
      { key: "j", node: Rid, slot: j, done: j >= Rc.length },
      { key: "k", node: id, slot: k, done: k >= len(id) },
    ];
    const sync = () => setVars({ lo, hi, mid, i, j, k: lo + k });

    sync();
    push({
      title: `Both halves sorted → merge(${lo}, ${mid}, ${hi})`,
      detail:
        `L = ${listText(vals(Lc))} and R = ${listText(vals(Rc))} are each sorted. Merge them back into A[${lo}..${hi}]: ` +
        "**i** walks along L, **j** along R, and **k** marks the next slot to fill. The smaller front element always goes next.",
      line: [ML.copy, ML.init],
      ptrs: ptrs(),
    });

    const take = (fromLeft: boolean) => {
      const it = fromLeft ? Lc[i] : Rc[j];
      const child = fromLeft ? Lid : Rid;
      const slot = fromLeft ? i : j;
      at[it] = { node: id, slot: k };
      content[id][k] = it;
      ghost[child][slot] = it;
      content[child][slot] = -1;
      if (content[child].every((x) => x < 0)) box[child] = "spent";
      if (fromLeft) i++;
      else j++;
      k++;
      writes++;
      return it;
    };

    while (i < Lc.length && j < Rc.length) {
      const a = Lc[i];
      const b = Rc[j];
      const va = val(a);
      const vb = val(b);
      comparisons++;
      const takeLeft = va <= vb;
      sync();
      push({
        title: `Compare L[${i}] = ${va} with R[${j}] = ${vb}`,
        detail: takeLeft
          ? va === vb
            ? `Equal keys! Take the one from **L** first (\`<=\`, not \`<\`): it came earlier in the input, so equal keys keep their original order — that is what makes merge sort **stable**.`
            : `${va} ≤ ${vb}, so **${va}** is the smallest element left in either run.`
          : `${vb} < ${va}, so **${vb}** is the smallest element left in either run.`,
        line: [ML.loop, ML.compare],
        focus: [a, b],
        ptrs: ptrs(),
      });
      const slotAbs = lo + k;
      const it = take(takeLeft);
      sync();
      push({
        title: `A[${slotAbs}] = ${val(it)}  (from ${takeLeft ? "L" : "R"})`,
        detail: `Copy **${val(it)}** up into the merged run, then advance ${takeLeft ? "**i**" : "**j**"} and **k**.`,
        line: takeLeft ? [ML.takeLeft, ML.advanceK] : [ML.takeRight, ML.advanceK],
        tone: "merge",
        flying: it,
        ptrs: ptrs(),
        hold: 0.85,
      });
    }

    let first = true;
    while (i < Lc.length) {
      const slotAbs = lo + k;
      const it = take(true);
      sync();
      push({
        title: `A[${slotAbs}] = ${val(it)}  (rest of L)`,
        detail: first
          ? `R is used up. Whatever is left in L is already sorted and larger than everything placed so far, so it is copied over as is.`
          : "Keep copying the rest of L.",
        line: ML.restLeft,
        tone: "merge",
        flying: it,
        ptrs: ptrs(),
        hold: 0.7,
      });
      first = false;
    }
    first = true;
    while (j < Rc.length) {
      const slotAbs = lo + k;
      const it = take(false);
      sync();
      push({
        title: `A[${slotAbs}] = ${val(it)}  (rest of R)`,
        detail: first
          ? `L is used up. Whatever is left in R is already sorted and larger than everything placed so far, so it is copied over as is.`
          : "Keep copying the rest of R.",
        line: ML.restRight,
        tone: "merge",
        flying: it,
        ptrs: ptrs(),
        hold: 0.7,
      });
      first = false;
    }

    for (const it of content[id]) role[it] = "sorted";
    box[id] = "sorted";
    box[Lid] = "spent";
    box[Rid] = "spent";
    setVars({ lo, hi, mid });
    push({
      title: `Merged A[${lo}..${hi}] = ${listText(vals(content[id]))}`,
      detail:
        id === 0
          ? `The last merge combines the two halves of the whole array into one sorted run.`
          : `These ${plural(len(id), "element")} now form one sorted run. Return it to the caller, which will merge it with its sibling.`,
      line: ML.merge,
      tone: "ok",
    });
    stack.pop();
  };

  sort(0, ML.call, "");
  active = -1;
  setVars({});
  const lg = Math.ceil(Math.log2(n));
  push({
    title: "Sorted!",
    detail:
      n === 1
        ? "A single element is already sorted — no splitting or merging needed."
        : `${plural(n, "element")} sorted with **${plural(comparisons, "comparison")}** and **${plural(writes, "write")}** into the array. ` +
          `The tree is ⌈log₂ ${n}⌉ = ${lg} splits deep and each level does at most ${n} writes — hence **O(n log n)**.` +
          stabilityNote(items, content[0]),
    tone: "ok",
    hold: 2,
    done: true,
  });
  return steps;
}
