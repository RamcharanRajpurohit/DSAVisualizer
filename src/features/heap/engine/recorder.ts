/*
 * Step recorder for the binary heap (same idea as the `Rec` class in the legacy graph.js).
 *
 * An operation runs once, up front, on a private copy of the heap. After every interesting moment
 * it calls snap(), which stores a COMPLETE picture of the state (array, heap size, highlights,
 * callouts, index arithmetic, pseudocode line, variables). The UI then plays those snapshots back
 * and can freely pause, step backwards or scrub — every step renders on its own.
 *
 * Pure TypeScript, no React, relative imports only (type imports are erased) so it runs under tsx.
 */
import type { WatchValue } from "@/lib/player/types";
import type { Tone } from "@/lib/theme";
import { listingFor, type Listing } from "./pseudocode";
import type { Arc, Callout, EdgeMark, HeapItem, HeapKind, HeapStep, Mark, OpCode, OutItem } from "./types";

export const parentOf = (i: number) => Math.floor((i - 1) / 2);
export const leftOf = (i: number) => 2 * i + 1;
export const rightOf = (i: number) => 2 * i + 2;

/** Height of slot i in a complete tree of n nodes (the leftmost path is always the longest). */
export function heightOf(i: number, n: number): number {
  let h = 0;
  for (let j = i; 2 * j + 1 < n; j = 2 * j + 1) h++;
  return h;
}

export const treeHeight = (n: number) => (n <= 1 ? 0 : Math.floor(Math.log2(n)));

export interface Words {
  M: string;
  top: string;
  topWord: string;
  /** "beats": > for a max-heap, < for a min-heap. */
  gt: string;
  ge: string;
  lt: string;
  le: string;
  better: string;
  worse: string;
  best: string;
  prop: string;
  order: string;
}

export function words(kind: HeapKind): Words {
  return kind === "max"
    ? {
        M: "Max", top: "max", topWord: "maximum", gt: ">", ge: "≥", lt: "<", le: "≤",
        better: "larger", worse: "smaller", best: "largest", prop: "every parent is ≥ its children", order: "ascending",
      }
    : {
        M: "Min", top: "min", topWord: "minimum", gt: "<", ge: "≤", lt: ">", le: "≥",
        better: "smaller", worse: "larger", best: "smallest", prop: "every parent is ≤ its children", order: "descending",
      };
}

export interface SnapOpts {
  tone?: Tone;
  line?: number | readonly number[];
  hold?: number;
  marks?: Record<number, Mark>;
  edges?: Record<number, EdgeMark>;
  callouts?: Callout[];
  arcs?: Arc[];
  ptrs?: Record<string, number>;
  formula?: string;
  swap?: readonly [number, number];
}

export interface RecorderOptions {
  /** false → merge the "look at the children" step into the verdict (fewer steps for long runs). */
  detailed?: boolean;
}

export class HeapRecorder {
  readonly steps: HeapStep[] = [];
  readonly L: Listing;
  readonly W: Words;
  readonly detailed: boolean;
  a: HeapItem[];
  size: number;
  sorting = false;
  out: OutItem[] = [];
  /** Slots shown green until the end of the operation (build-heap: subtrees that are already heaps). */
  settled = new Set<number>();
  swaps = 0;
  vars: Record<string, WatchValue> = {};
  levelNotes?: string[][];

  constructor(readonly kind: HeapKind, readonly op: OpCode, items: readonly HeapItem[], opts: RecorderOptions = {}) {
    this.a = items.slice();
    this.size = this.a.length;
    this.L = listingFor(op, kind);
    this.W = words(kind);
    this.detailed = opts.detailed ?? true;
  }

  /** x has strictly higher priority than y (it belongs above y). */
  beats(x: number, y: number): boolean {
    return this.kind === "max" ? x > y : x < y;
  }

  line(...tags: string[]): number | number[] {
    const ls = tags.map((t) => this.L.at(t));
    return ls.length === 1 ? ls[0] : ls;
  }

  setVars(patch: Record<string, WatchValue>) {
    Object.assign(this.vars, patch);
  }

  /** Swap two slots. `count` = include it in the sift swap counter. */
  exchange(i: number, j: number, count = true) {
    const t = this.a[i];
    this.a[i] = this.a[j];
    this.a[j] = t;
    if (count) this.swaps++;
  }

  snap(title: string, detail: string, o: SnapOpts = {}) {
    const n = this.size;
    const bad: number[] = [];
    for (let c = 1; c < n; c++) if (this.beats(this.a[c].v, this.a[parentOf(c)].v)) bad.push(c);
    const marks: Record<number, Mark> = {};
    for (const i of this.settled) if (i < n) marks[i] = "ok";
    Object.assign(marks, o.marks);
    if ("n" in this.vars) this.vars.n = n;
    if ("swaps" in this.vars) this.vars.swaps = this.swaps;
    this.steps.push({
      op: this.op,
      kind: this.kind,
      title,
      detail,
      tone: o.tone ?? "info",
      line: o.line,
      hold: o.hold,
      vars: { ...this.vars },
      arr: this.a.slice(),
      size: n,
      sorting: this.sorting,
      marks,
      edges: o.edges ?? {},
      bad,
      callouts: o.callouts ?? [],
      arcs: o.arcs ?? [],
      ptrs: o.ptrs ?? {},
      formula: o.formula,
      out: this.out.slice(),
      levelNotes: this.levelNotes,
      swap: o.swap,
    });
  }

  /** Move the key in the last heap slot out of the heap into the "removed" tray. */
  popToTray(label: string): HeapItem {
    const item = this.a.pop()!;
    this.size--;
    this.out.push({ item, label });
    return item;
  }

  // ─────────────────────────────── sift-up ───────────────────────────────

  /** Bubble a[i] up towards the root. Returns its final index. */
  siftUp(start: number): number {
    const W = this.W;
    let i = start;
    for (;;) {
      const x = this.a[i];
      this.setVars({ i, parent: i > 0 ? parentOf(i) : null });
      if (i === 0) {
        this.snap(
          `${x.v} reached the root`,
          `Index 0 has no parent, so the climb stops. **${x.v}** is the new ${W.topWord}.`,
          {
            tone: "ok", line: this.line("suLoop"), marks: { 0: "ok" }, ptrs: { i: 0 },
            callouts: [{ key: "verdict", at: 0, text: `new ${W.top}`, tone: "ok" }],
          },
        );
        return 0;
      }
      const p = parentOf(i);
      const y = this.a[p];
      const formula = `parent(${i}) = ⌊(${i} − 1) / 2⌋ = ${p}`;
      if (this.beats(x.v, y.v)) {
        this.snap(
          `${x.v} ${W.gt} parent ${y.v} — out of order`,
          `The parent of index ${i} is ⌊(${i} − 1) / 2⌋ = **${p}**. **${x.v}** ${W.gt} **${y.v}**: the child beats its parent, so the heap property is broken here.`,
          {
            tone: "danger", line: this.line("suParent", "suCheck"),
            marks: { [i]: "violation", [p]: "violation" }, edges: { [i]: "violation" },
            arcs: [{ from: i, to: p, label: "parent", tone: "danger" }], ptrs: { i, p }, formula,
            callouts: [{ key: "verdict", at: i, text: `${x.v} ${W.gt} ${y.v}`, tone: "danger" }],
          },
        );
        this.exchange(i, p);
        this.setVars({ i: p, parent: p > 0 ? parentOf(p) : null });
        this.snap(
          `Swap: ${x.v} ↑  ${y.v} ↓`,
          `${y.v} is safe in slot ${i}: it was already ${W.ge} everything below. Repeat one level higher (i ← ${p}).`,
          {
            tone: "warn", line: this.line("suSwap", "suMove"),
            marks: { [p]: "current", [i]: "ok" }, edges: { [i]: "swap" }, ptrs: { i: p }, swap: [x.id, y.id],
          },
        );
        i = p;
      } else {
        this.snap(
          `${y.v} ${W.ge} ${x.v} — in order, stop`,
          `Parent a[${p}] = **${y.v}** is ${W.ge} **${x.v}**, so this edge is in order. Everything above already was — sift-up is done.`,
          {
            tone: "ok", line: this.line("suParent", "suCheck"),
            marks: { [i]: "ok", [p]: "ok" }, edges: { [i]: "ok" },
            arcs: [{ from: i, to: p, label: "parent", tone: "ok" }], ptrs: { i, p }, formula,
            callouts: [{ key: "verdict", at: i, text: `${y.v} ${W.ge} ${x.v} ✓`, tone: "ok" }],
          },
        );
        return i;
      }
    }
  }

  // ─────────────────────────────── sift-down ───────────────────────────────

  /** Push a[i] down within the first `size` slots. Returns its final index. */
  siftDown(start: number): number {
    const W = this.W;
    let i = start;
    for (;;) {
      const n = this.size;
      const x = this.a[i];
      const l = leftOf(i);
      const r = rightOf(i);
      this.setVars({ i, left: l < n ? l : null, right: r < n ? r : null, [W.best]: null });
      if (l >= n) {
        this.snap(
          i === start ? `${x.v} has no children — nothing to do` : `${x.v} reached a leaf — stop`,
          `left(${i}) = ${l} ≥ n = ${n}, so slot ${i} has no children. Nothing below can be out of order.`,
          {
            tone: "ok", line: this.line("sdLoop"), marks: { [i]: "ok" }, ptrs: { i },
            formula: `left(${i}) = 2·${i} + 1 = ${l} ≥ n = ${n}`, hold: 0.7,
          },
        );
        return i;
      }
      const hasR = r < n;
      const lv = this.a[l].v;
      const c = hasR && this.beats(this.a[r].v, lv) ? r : l;
      const other = c === l ? r : l;
      const cv = this.a[c];
      const side = c === l ? "l" : "r";
      const formula = hasR
        ? `left(${i}) = 2·${i}+1 = ${l}    right(${i}) = 2·${i}+2 = ${r}`
        : `left(${i}) = 2·${i}+1 = ${l}    right(${i}) = ${r} ≥ n`;
      const kidArcs: Arc[] = [{ from: i, to: l, label: "2i+1", tone: "info" }];
      if (hasR) kidArcs.push({ from: i, to: r, label: "2i+2", tone: "info" });
      const pickLines = hasR ? (c === r ? ["sdPickL", "sdPickR", "sdPickR2"] : ["sdPickL", "sdPickR"]) : ["sdPickL"];
      const pickWhy = hasR
        ? `**${cv.v}** is the ${W.better} child — only it can move up and parent both subtrees.`
        : `Only a left child (2i+2 = ${r} ≥ n), so **${cv.v}** is the candidate.`;

      if (this.detailed) {
        this.setVars({ [W.best]: c });
        this.snap(
          hasR ? `Children of ${x.v}: ${lv} and ${this.a[r].v}` : `Only child of ${x.v}: ${lv}`,
          `Children of index ${i} sit at 2i+1 = **${l}**${hasR ? ` and 2i+2 = **${r}**` : ""}. ${pickWhy}`,
          {
            line: this.line("sdLoop", "sdKids", ...pickLines),
            marks: { [i]: "current", [c]: "best", ...(hasR ? { [other]: "compare" } : {}) },
            edges: { [l]: "compare", ...(hasR ? { [r]: "compare" } : {}) },
            arcs: kidArcs, ptrs: { i, l, ...(hasR ? { r } : {}) }, formula,
            callouts: [{ key: "pick", at: c, text: W.best === "largest" ? "larger" : "smaller", tone: "merge" }],
          },
        );
      }
      this.setVars({ [W.best]: c });
      const verdictArcs: Arc[] = this.detailed
        ? [{ from: i, to: c, label: side === "l" ? "2i+1" : "2i+2", tone: "info" }]
        : kidArcs;

      if (this.beats(cv.v, x.v)) {
        this.snap(
          `${x.v} ${W.lt} child ${cv.v} — out of order`,
          `${this.detailed ? "" : `${pickWhy} `}**${cv.v}** ${W.gt} **${x.v}**: the child beats its parent, so swap them.`,
          {
            tone: "danger", line: this.line(...(this.detailed ? [] : ["sdKids", ...pickLines]), "sdCheck"),
            marks: { [i]: "violation", [c]: "violation", ...(!this.detailed && hasR ? { [other]: "compare" } : {}) },
            edges: { [c]: "violation" },
            arcs: verdictArcs.map((a) => (a.to === c ? { ...a, tone: "danger" as Tone } : a)),
            ptrs: { i, [side]: c }, formula,
            callouts: [{ key: "verdict", at: c, text: `${cv.v} ${W.gt} ${x.v}`, tone: "danger" }],
          },
        );
        this.exchange(i, c);
        this.snap(
          `Swap: ${cv.v} ↑  ${x.v} ↓`,
          `${cv.v} is ${W.ge} ${x.v} and its old sibling, so slot ${i} is now correct. ${x.v} keeps sinking from slot ${c}.`,
          {
            tone: "warn", line: this.line("sdSwap", "sdMove"),
            marks: { [i]: "ok", [c]: "current" }, edges: { [c]: "swap" }, ptrs: { i: c }, swap: [cv.id, x.id],
          },
        );
        i = c;
      } else {
        this.snap(
          `${x.v} ${W.ge} ${cv.v} — in order, stop`,
          `${this.detailed ? "" : `${pickWhy} `}**${x.v}** ${W.ge} its ${W.better} child **${cv.v}**, so the subtree at slot ${i} is a valid heap — stop.`,
          {
            tone: "ok", line: this.line(...(this.detailed ? [] : ["sdKids", ...pickLines]), "sdCheck"),
            marks: { [i]: "ok", [c]: "ok" }, edges: { [c]: "ok" },
            arcs: verdictArcs.map((a) => (a.to === c ? { ...a, tone: "ok" as Tone } : a)),
            ptrs: { i, [side]: c }, formula,
            callouts: [{ key: "verdict", at: i, text: `${x.v} ${W.ge} ${cv.v} ✓`, tone: "ok" }],
          },
        );
        return i;
      }
    }
  }
}
