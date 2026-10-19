/*
 * Heap operations, each recorded as a list of HeapSteps (see recorder.ts).
 * Every function is pure: it copies the input heap and returns { steps, final }.
 */
import { HeapRecorder, heightOf, parentOf, treeHeight, words, type RecorderOptions } from "./recorder";
import type { HeapItem, HeapKind, OpResult } from "./types";

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

/** Does arr[0 … size) satisfy the heap property? */
export function isHeap(arr: readonly { v: number }[], kind: HeapKind, size = arr.length): boolean {
  for (let c = 1; c < size; c++) {
    const p = parentOf(c);
    if (kind === "max" ? arr[c].v > arr[p].v : arr[c].v < arr[p].v) return false;
  }
  return true;
}

/** Floyd's build-heap without recording (initial data, random fill). */
export function heapify(items: readonly HeapItem[], kind: HeapKind): HeapItem[] {
  const a = items.slice();
  const n = a.length;
  const beats = (x: number, y: number) => (kind === "max" ? x > y : x < y);
  for (let s = Math.floor(n / 2) - 1; s >= 0; s--) {
    let i = s;
    for (;;) {
      const l = 2 * i + 1;
      if (l >= n) break;
      const r = l + 1;
      const c = r < n && beats(a[r].v, a[l].v) ? r : l;
      if (!beats(a[c].v, a[i].v)) break;
      [a[i], a[c]] = [a[c], a[i]];
      i = c;
    }
  }
  return a;
}

/** Σ heights of all nodes of a complete tree with n nodes (= n − popcount(n)): the build-heap swap bound. */
export function sumOfHeights(n: number): number {
  let s = 0;
  for (let i = 0; i < n; i++) s += heightOf(i, n);
  return s;
}

/** Gutter notes for build-heap: each level's height and how many nodes sit there. */
function heightNotes(n: number): string[][] {
  const D = treeHeight(n);
  const notes: string[][] = [];
  for (let d = 0; d <= D; d++) {
    const start = 2 ** d - 1;
    const count = Math.min(2 ** d, n - start);
    const h = D - d;
    notes.push([`h = ${h}`, h === 0 ? `${count} × 0` : `${count} × ≤${h}`]);
  }
  return notes;
}

// ─────────────────────────────── idle ───────────────────────────────

export function recordIdle(items: readonly HeapItem[], kind: HeapKind, title: string, detail: string): OpResult {
  const R = new HeapRecorder(kind, "idle", items);
  R.snap(title, detail, { tone: items.length ? "info" : "muted", line: items.length ? R.line("prop", "root") : undefined });
  return { steps: R.steps, final: R.a };
}

// ─────────────────────────────── peek ───────────────────────────────

export function recordPeek(items: readonly HeapItem[], kind: HeapKind): OpResult {
  const R = new HeapRecorder(kind, "peek", items);
  const W = R.W;
  R.vars = { n: items.length, [`a[0]`]: null };
  if (!items.length) {
    R.snap("The heap is empty", "There is no root to read — peek() on an empty heap is an error.", { tone: "danger", line: R.line("empty") });
    return { steps: R.steps, final: R.a };
  }
  R.snap(
    `peek${W.M}()`,
    `Where is the ${W.topWord}? No search needed: the heap property chains every key to its parent, its parent's parent, … all the way up to the root.`,
    { line: R.line("head") },
  );
  const top = R.a[0];
  R.setVars({ "a[0]": top.v });
  R.snap(
    `${W.top} = ${top.v}, read in O(1)`,
    `Since ${W.prop}, every key is ${W.le} its parent ${W.le} … ${W.le} the root. So a[0] = **${top.v}** is the ${W.topWord} — one array read, the heap is not changed.`,
    {
      tone: "ok", line: R.line("ret"), marks: { 0: "best" }, ptrs: { "a[0]": 0 },
      callouts: [{ key: "peek", at: 0, text: `${W.top} = ${top.v}`, tone: "ok" }],
    },
  );
  return { steps: R.steps, final: R.a };
}

// ─────────────────────────────── insert ───────────────────────────────

/** Insert one or more keys, one after another (each: append + sift-up). */
export function recordInsert(items: readonly HeapItem[], kind: HeapKind, adds: readonly HeapItem[]): OpResult {
  const R = new HeapRecorder(kind, "insert", items);
  const W = R.W;
  R.vars = { key: null, n: items.length, i: null, parent: null, swaps: 0 };
  adds.forEach((item, k) => {
    const n = R.size;
    R.swaps = 0;
    R.setVars({ key: item.v, i: null, parent: null });
    R.snap(
      adds.length > 1 ? `insert(${item.v}) — key ${k + 1} of ${adds.length}` : `insert(${item.v})`,
      `A new key always goes into the first free slot, index n = **${n}** — the leftmost gap on the bottom level. That keeps the tree complete (no holes in the array); afterwards we repair the order by sifting the key up.`,
      { line: R.line("head"), hold: k > 0 ? 0.7 : 1 },
    );
    R.a.push(item);
    R.size++;
    R.setVars({ i: n, parent: n > 0 ? parentOf(n) : null });
    if (n === 0) {
      R.snap(
        `${item.v} becomes the root`,
        `The heap was empty, so ${item.v} goes to index 0. A single key is trivially a heap — nothing to sift.`,
        { tone: "ok", line: R.line("append", "grow"), marks: { 0: "new" }, callouts: [{ key: "new", at: 0, text: "new root", tone: "ok" }] },
      );
      return;
    }
    const p = parentOf(n);
    const pv = R.a[p].v;
    const broken = R.beats(item.v, pv);
    R.snap(
      `Append ${item.v} at index ${n}`,
      `${item.v} lands in a[${n}] and n becomes ${n + 1}. Its parent is a[⌊(${n} − 1) / 2⌋] = a[${p}] = ${pv}. ` +
        (broken
          ? `${item.v} ${W.gt} ${pv}, so the red edge breaks the heap property — sift ${item.v} up.`
          : `${pv} ${W.ge} ${item.v}, so the heap property already holds — sift-up will stop at once.`),
      {
        line: R.line("append", "grow", "call"), marks: { [n]: "new" },
        callouts: [{ key: "new", at: n, text: `new ${item.v}`, tone: "merge" }],
        arcs: [{ from: n, to: p, label: "parent", tone: broken ? "danger" : "info" }], ptrs: { i: n, p },
        formula: `parent(${n}) = ⌊(${n} − 1) / 2⌋ = ${p}`,
      },
    );
    const at = R.siftUp(n);
    const h = treeHeight(R.size);
    R.snap(
      `Inserted ${item.v}`,
      `${item.v} settled at index ${at} after ${plural(R.swaps, "swap")}. Sift-up climbs at most the height of the tree, ⌊log₂ ${R.size}⌋ = ${h} levels, so insert is **O(log n)** (and O(1) on average for random keys — most keys stay near the bottom).`,
      { tone: "ok", line: R.line("call"), marks: { [at]: "ok" }, hold: 0.8 },
    );
  });
  if (adds.length > 1) {
    R.snap(
      `Inserted ${plural(adds.length, "key")}`,
      `${adds.map((x) => x.v).join(", ")} were added one at a time; every insert kept the tree complete and the ${kind}-heap property intact.`,
      { tone: "ok", line: R.line("head") },
    );
  }
  return { steps: R.steps, final: R.a };
}

// ─────────────────────────────── extract ───────────────────────────────

export function recordExtract(items: readonly HeapItem[], kind: HeapKind, opts?: RecorderOptions): OpResult {
  const R = new HeapRecorder(kind, "extract", items, opts);
  const W = R.W;
  const n = items.length;
  R.vars = { n, top: null, i: null, left: null, right: null, [W.best]: null, swaps: 0 };
  if (!n) {
    R.snap("The heap is empty", `There is nothing to extract — extract${W.M}() on an empty heap is an error.`, { tone: "danger", line: R.line("empty") });
    return { steps: R.steps, final: R.a };
  }
  const top = R.a[0];
  R.setVars({ top: top.v });
  R.snap(
    `extract${W.M}() — the ${W.top} is the root`,
    `The ${W.topWord} is always a[0] = **${top.v}**. We can't just delete the root — that would leave a hole at the top. Instead we fill it with the last key, which is the only slot that can disappear without breaking the complete shape.`,
    { line: R.line("head", "top"), marks: { 0: "best" }, callouts: [{ key: "top", at: 0, text: `${W.top} = ${top.v}`, tone: "merge" }] },
  );
  if (n === 1) {
    R.popToTray("extracted");
    R.snap(
      `Remove ${top.v} — the heap is now empty`,
      `${top.v} was the only key, so it is both the root and the last slot: remove it and return it.`,
      { tone: "ok", line: R.line("swap", "shrink", "ret"), callouts: [{ key: "out", outId: top.id, text: `returned ${top.v}`, tone: "ok" }] },
    );
    return { steps: R.steps, final: R.a };
  }
  const last = R.a[n - 1];
  R.exchange(0, n - 1, false);
  R.snap(
    `Swap the root ${top.v} with the last key ${last.v}`,
    `a[0] ↔ a[${n - 1}]: ${top.v} goes to the end of the array, ready to be cut off, and ${last.v} jumps to the root. The shape is still a complete tree.`,
    {
      tone: "warn", line: R.line("swap"), marks: { 0: "current", [n - 1]: "removed" }, swap: [last.id, top.id],
      callouts: [{ key: "top", at: n - 1, text: `${W.top} ${top.v}`, tone: "merge" }],
    },
  );
  R.popToTray("extracted");
  const broken = (R.size > 1 && R.beats(R.a[1].v, last.v)) || (R.size > 2 && R.beats(R.a[2].v, last.v));
  R.snap(
    `Remove ${top.v} from the end (n = ${R.size})`,
    `The heap shrinks by one; ${top.v} is out. ` +
      (broken
        ? `But ${last.v} — a key from the bottom — is now the root and loses to a child (red edge). Sift it down to restore the heap property.`
        : `${last.v} happens to be in order at the root, but we still run sift-down to check.`),
    { line: R.line("shrink", "call"), marks: { 0: "current" }, callouts: [{ key: "out", outId: top.id, text: `${W.top} = ${top.v}`, tone: "merge" }] },
  );
  R.siftDown(0);
  const h = treeHeight(n);
  R.snap(
    `Extracted ${top.v}`,
    `Returned **${top.v}**. The new root a[0] = ${R.a[0].v} is the next ${W.top}. Sift-down used ${plural(R.swaps, "swap")}; it can sink at most ⌊log₂ ${n}⌋ = ${h} levels, so extract is **O(log n)**.`,
    {
      tone: "ok", line: R.line("ret"), marks: { 0: "ok" },
      callouts: [
        { key: "next", at: 0, text: `new ${W.top}`, tone: "ok" },
        { key: "out", outId: top.id, text: `returned ${top.v}`, tone: "ok" },
      ],
    },
  );
  return { steps: R.steps, final: R.a };
}

// ─────────────────────────────── delete at index ───────────────────────────────

export function recordDelete(items: readonly HeapItem[], kind: HeapKind, k: number, opts?: RecorderOptions): OpResult {
  const R = new HeapRecorder(kind, "delete", items, opts);
  const W = R.W;
  const n = items.length;
  if (k < 0 || k >= n) throw new Error(`deleteAt(${k}) out of range`);
  R.vars = { k, n, i: null, parent: null, left: null, right: null, [W.best]: null, swaps: 0 };
  const x = R.a[k];
  R.snap(
    `deleteAt(${k}) — remove ${x.v}`,
    `Remove a[${k}] = **${x.v}**. As with extract, the hole is filled with the last key so the tree stays complete; then the order is repaired in whichever direction it broke.`,
    { line: R.line("head"), marks: { [k]: "removed" }, callouts: [{ key: "del", at: k, text: `delete ${x.v}`, tone: "danger" }], ptrs: { k } },
  );
  if (k === n - 1) {
    R.popToTray("deleted");
    R.snap(
      `${x.v} was in the last slot — just drop it`,
      `Removing the last array slot never breaks the shape or the order (\`if k = n: return\`). Done in O(1).`,
      { tone: "ok", line: R.line("swap", "shrink", "last"), callouts: [{ key: "out", outId: x.id, text: `deleted ${x.v}`, tone: "ok" }] },
    );
    return { steps: R.steps, final: R.a };
  }
  const last = R.a[n - 1];
  R.exchange(k, n - 1, false);
  R.snap(
    `Swap ${x.v} with the last key ${last.v}`,
    `a[${k}] ↔ a[${n - 1}]: ${x.v} moves to the end where it can be cut off, and ${last.v} takes over slot ${k}.`,
    { tone: "warn", line: R.line("swap"), marks: { [k]: "current", [n - 1]: "removed" }, swap: [last.id, x.id], ptrs: { k } },
  );
  R.popToTray("deleted");
  R.snap(
    `Remove ${x.v} (n = ${R.size})`,
    `${last.v} now sits in slot ${k}, which it never belonged to. It came from the bottom of a *different* branch, so it may be too ${W.better} for its new parent or too ${W.worse} for its new children.`,
    { line: R.line("shrink", "last"), marks: { [k]: "current" }, ptrs: { k }, callouts: [{ key: "out", outId: x.id, text: `deleted ${x.v}`, tone: "danger" }] },
  );
  if (k > 0 && R.beats(last.v, R.a[parentOf(k)].v)) {
    const p = parentOf(k);
    R.snap(
      `${last.v} ${W.gt} parent ${R.a[p].v} → sift up`,
      `${last.v} beats its new parent a[${p}] = ${R.a[p].v}. Its new children can't be a problem then (they are ${W.le} ${R.a[p].v}), so it only needs to move **up**.`,
      {
        tone: "danger", line: R.line("up", "callUp"), marks: { [k]: "violation", [p]: "violation" }, edges: { [k]: "violation" },
        arcs: [{ from: k, to: p, label: "parent", tone: "danger" }], ptrs: { k, p }, formula: `parent(${k}) = ⌊(${k} − 1) / 2⌋ = ${p}`,
      },
    );
    R.siftUp(k);
  } else {
    const p = k > 0 ? parentOf(k) : -1;
    R.snap(
      k === 0 ? `${last.v} is at the root → sift down` : `${R.a[p].v} ${W.ge} ${last.v} → sift down`,
      (k === 0 ? `Slot 0 has no parent, ` : `Its parent a[${p}] = ${R.a[p].v} is still ${W.ge} ${last.v}, `) +
        `so the only possible problem is below: a child may beat ${last.v}. Sift it **down**.`,
      {
        line: R.line("up", "callDown"), marks: { [k]: "current", ...(p >= 0 ? { [p]: "ok" } : {}) },
        ...(p >= 0
          ? { arcs: [{ from: k, to: p, label: "parent", tone: "ok" as const }], ptrs: { k, p }, formula: `parent(${k}) = ⌊(${k} − 1) / 2⌋ = ${p}` }
          : { ptrs: { k } }),
      },
    );
    R.siftDown(k);
  }
  R.snap(
    `Deleted ${x.v}`,
    `The heap has ${plural(R.size, "key")} again in valid ${kind}-heap order, after ${plural(R.swaps, "swap")}. Only one of sift-up / sift-down ever runs, so delete is **O(log n)**.`,
    { tone: "ok", line: R.line("head"), callouts: [{ key: "out", outId: x.id, text: `deleted ${x.v}`, tone: "ok" }] },
  );
  return { steps: R.steps, final: R.a };
}

// ─────────────────────────────── update key ───────────────────────────────

export function recordUpdate(items: readonly HeapItem[], kind: HeapKind, k: number, v: number, opts?: RecorderOptions): OpResult {
  const R = new HeapRecorder(kind, "update", items, opts);
  const W = R.W;
  const n = items.length;
  if (k < 0 || k >= n) throw new Error(`updateKey(${k}) out of range`);
  const old = R.a[k];
  R.vars = { k, old: old.v, key: v, n, i: null, parent: null, left: null, right: null, [W.best]: null, swaps: 0 };
  R.snap(
    `updateKey(${k}, ${v})`,
    `Change a[${k}] from ${old.v} to ${v}. The tree shape doesn't change; only the order between this key and its parent or its children can break.`,
    { line: R.line("head"), marks: { [k]: "current" }, ptrs: { k }, callouts: [{ key: "upd", at: k, text: `${old.v} → ${v}`, tone: "info" }] },
  );
  const item: HeapItem = { id: old.id, v };
  R.a[k] = item;
  const verb = v > old.v ? "increased" : v < old.v ? "decreased" : "unchanged";
  if (v === old.v) {
    R.snap(`Same key — nothing to do`, `${v} = ${old.v}, so the heap property can't have changed.`, {
      tone: "ok", line: R.line("set"), marks: { [k]: "ok" },
    });
    return { steps: R.steps, final: R.a };
  }
  const up = R.beats(v, old.v);
  R.snap(
    `a[${k}] ← ${v} (key ${verb})`,
    up
      ? `In a ${kind}-heap a key that ${verb} moved *towards the top* of the order. Its children were already ${W.le} ${old.v}, so they are still ${W.le} ${v} — only the **parent** can now be beaten.`
      : `In a ${kind}-heap a key that ${verb} moved *away from the top*. Its parent was ${W.ge} ${old.v}, so it is still ${W.ge} ${v} — only a **child** can now beat it.`,
    { tone: "warn", line: R.line("set"), marks: { [k]: "new" }, ptrs: { k }, callouts: [{ key: "upd", at: k, text: `${old.v} → ${v}`, tone: "warn" }] },
  );
  R.snap(
    up ? `${v} ${W.gt} ${old.v} → sift up` : `${v} ${W.lt} ${old.v} → sift down`,
    up ? `Run sift-up from slot ${k}.` : `Run sift-down from slot ${k}.`,
    { line: R.line(up ? "up" : "down"), marks: { [k]: "current" }, ptrs: { k }, hold: 0.7 },
  );
  if (up) R.siftUp(k);
  else R.siftDown(k);
  R.snap(
    `Updated ${old.v} → ${v}`,
    `Restored with ${plural(R.swaps, "swap")}. A changed key moves in one direction only, at most the tree height ⌊log₂ ${n}⌋ = ${treeHeight(n)} levels: **O(log n)**. (Priority queues call this increase-key / decrease-key.)`,
    { tone: "ok", line: R.line("head") },
  );
  return { steps: R.steps, final: R.a };
}

// ─────────────────────────────── build heap (Floyd) ───────────────────────────────

interface FloydLines {
  intro: number | number[];
  leaves: number | number[];
  loop: number | number[];
}

function floyd(R: HeapRecorder, lines: FloydLines, phase = "") {
  const W = R.W;
  const n = R.size;
  const first = Math.floor(n / 2) - 1;
  const bound = sumOfHeights(n);
  R.levelNotes = heightNotes(n);
  R.setVars({ bound });
  R.snap(
    `${phase}Load the ${n} keys as a complete tree`,
    `Any array already IS a complete binary tree — a[i]'s children are a[2i+1] and a[2i+2]. It just isn't ordered yet: red edges break the ${R.kind}-heap property. ` +
      `Floyd's method fixes it bottom-up. The left margin shows each level's height h: a key at height h can sink at most h levels.`,
    { line: lines.intro },
  );
  if (n <= 1) return;
  for (let i = first + 1; i < n; i++) R.settled.add(i);
  R.snap(
    `${phase}Leaves ${first + 1}…${n - 1} are already heaps`,
    `Slots ⌊n/2⌋ = ${first + 1} through ${n - 1} have no children (2i+1 ≥ n), and a single node is always a valid heap. That's ${n - first - 1} of ${n} keys done with **zero** work — we start at the last internal node, ⌊n/2⌋ − 1 = ${first}.`,
    { tone: "ok", line: lines.leaves, ptrs: { first: first + 1 } },
  );
  for (let i = first; i >= 0; i--) {
    const h = heightOf(i, n);
    R.setVars({ i, left: null, right: null, [W.best]: null });
    R.snap(
      `${phase}heapify(${i}): sink ${R.a[i].v}`,
      `Both subtrees under slot ${i} are already heaps (green), so only **${R.a[i].v}** itself can be out of place. It sits at height ${h}, so it sinks at most ${plural(h, "level")}.`,
      { line: lines.loop, marks: { [i]: "current" }, ptrs: { i }, callouts: [{ key: "h", at: i, text: `h = ${h}`, tone: "info" }], hold: 0.8 },
    );
    R.siftDown(i);
    R.settled.add(i);
  }
  R.snap(
    `${phase}${W.M}-heap built with ${plural(R.swaps, "swap")}`,
    `Total work: ${R.swaps} swaps ≤ Σ heights = ${bound} < n = ${n}. Half the nodes are leaves (0 work), a quarter sink ≤ 1 level, an eighth ≤ 2 … Σ h·n/2^(h+1) < n, so build-heap is **O(n)** — cheaper than ${n} separate inserts (O(n log n)).`,
    { tone: "ok", line: lines.intro, marks: Object.fromEntries(R.a.map((_, i) => [i, "ok" as const])) },
  );
}

export function recordBuild(
  items: readonly HeapItem[], kind: HeapKind, opts: RecorderOptions & { title?: string } = {},
): OpResult {
  const R = new HeapRecorder(kind, "build", items, opts);
  const W = R.W;
  R.vars = { n: items.length, i: null, left: null, right: null, [W.best]: null, swaps: 0, bound: null };
  if (opts.title) {
    R.snap(opts.title, `Same keys, new rule: now ${W.prop}. Re-run build-heap on the array to reorder it.`, { line: R.line("head") });
  }
  floyd(R, { intro: R.line("head", "n"), leaves: R.line("leaves"), loop: R.line("loop", "call") });
  R.settled.clear();
  return { steps: R.steps, final: R.a };
}

// ─────────────────────────────── heap sort ───────────────────────────────

export interface SortResult extends OpResult {
  sorted: number[];
}

export function recordHeapSort(
  items: readonly HeapItem[], kind: HeapKind, opts: RecorderOptions & { alreadyHeap?: boolean } = {},
): SortResult {
  const R = new HeapRecorder(kind, "sort", items, opts);
  const W = R.W;
  const n = items.length;
  R.sorting = true;
  R.vars = { n, end: null, i: null, left: null, right: null, [W.best]: null, swaps: 0 };
  R.snap(
    `heapSort — ${plural(n, "key")}, ${W.order}`,
    `Two phases, all inside the same array (O(1) extra space): **1)** arrange the keys into a ${kind}-heap, **2)** repeatedly swap the root — the ${W.topWord} — to the end of the heap and shrink the heap by one. The array ends up in ${W.order} order${kind === "min" ? " (use a max-heap for ascending)" : ""}.`,
    { line: R.line("head") },
  );
  if (n <= 1) {
    R.size = 0;
    R.snap("Already sorted", `${plural(n, "key")} — nothing to do.`, { tone: "ok", line: R.line("head") });
    return { steps: R.steps, final: items.slice(), sorted: items.map((x) => x.v) };
  }
  if (opts.alreadyHeap) {
    R.snap(
      `Phase 1: already a ${kind}-heap`,
      `These keys come straight from the heap, so the heap property already holds — buildHeap would make 0 swaps. On to phase 2.`,
      { tone: "ok", line: R.line("build") },
    );
  } else {
    const b = R.line("build");
    floyd(R, { intro: b, leaves: b, loop: b }, "Phase 1 · ");
    R.settled.clear();
    R.levelNotes = undefined;
  }
  const heap = R.a.slice();
  const buildSwaps = R.swaps;
  for (let end = n - 1; end >= 1; end--) {
    const x = R.a[0];
    const y = R.a[end];
    R.swaps = 0;
    R.setVars({ end, i: null, left: null, right: null, [W.best]: null });
    R.exchange(0, end, false);
    R.size = end;
    R.snap(
      `Move ${W.top} ${x.v} to its final slot ${end}`,
      `The root ${x.v} is the ${W.topWord} of the ${end + 1} keys still in the heap, so it belongs in the last heap slot. Swap a[0] ↔ a[${end}] and shrink the heap to n = ${end}: ${x.v} is now locked in the sorted region.` +
        (end > 1 ? ` ${y.v} at the root is probably out of order — sift it down.` : ""),
      {
        tone: "warn", line: R.line("loop", "swap", "shrink"), marks: { 0: "current" }, swap: [y.id, x.id],
        callouts: [{ key: "lock", at: end, text: `${x.v} ✓`, tone: "ok" }],
      },
    );
    if (end > 1) R.siftDown(0);
  }
  R.size = 0;
  R.setVars({ end: 0, i: null, left: null, right: null, [W.best]: null });
  R.snap(
    `Sorted: ${R.a.map((x) => x.v).join(", ")}`,
    `With one key left, a[0] is the ${W.topWord === "maximum" ? "smallest" : "largest"} and already in place. Phase 1 cost O(n)${opts.alreadyHeap ? " (skipped here)" : ` (${plural(buildSwaps, "swap")})`}; phase 2 ran n − 1 = ${n - 1} sift-downs of O(log n) each → **O(n log n)** in the worst case, in place. Heap sort is not stable. (Your heap is left as it was after phase 1.)`,
    { tone: "ok", line: R.line("head"), ptrs: {} },
  );
  return { steps: R.steps, final: heap, sorted: R.a.map((x) => x.v) };
}

export { words };
