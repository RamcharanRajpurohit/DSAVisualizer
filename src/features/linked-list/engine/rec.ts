/*
 * Step recorder for the linked-list visualizer (same idea as the `Rec` class in the legacy graph.js).
 *
 * An operation runs once on a mutable model of the heap — nodes with `next` / `prev` fields plus named
 * pointer variables (head, tail, curr, prev, …) — and calls `snap()` after every meaningful statement.
 * Each snapshot is a complete picture (every node, every pointer, where each node is drawn), so the
 * UI can play, pause, step back and scrub freely. Pure TypeScript: no React, no DOM.
 */
import type { Tone } from "@/lib/theme";
import type { WatchValue } from "@/lib/player/types";
import type { Field, ImplKey, LLStep, ListKind, ListNode, ListState, NodeMark, NodeSnap, Place, PtrSnap } from "./types";

export const MAX_NODES = 15;

/** Deterministic fake heap address for allocation number `n` (unique for n < 3840). */
export function addrOf(n: number): string {
  return "0x" + (0x1000 + ((n * 2971 + 1234) % 3840) * 0x10).toString(16);
}

export function makeNode(seq: number, value: number): ListNode {
  return { id: `n${seq}`, value, addr: addrOf(seq) };
}

/** A committed list built from plain values. */
export function listFrom(values: readonly number[], kind: ListKind, tailPtr: boolean, seq = 0): ListState {
  const nodes = values.map((v, i) => makeNode(seq + i, v));
  return { kind, tailPtr, nodes, seq: seq + values.length };
}

// ───────────────────────────── pseudocode ─────────────────────────────

export type CodeLine = string | readonly [key: string, text: string] | false | null | undefined;

export interface Code {
  lines: readonly string[];
  /** key → 1-based line numbers (a statement may span several lines). */
  at: Readonly<Record<string, readonly number[]>>;
  /** The matching real-code listing (see code/). */
  impl?: ImplKey;
}

/** Build pseudocode from lines; `[key, text]` lines can be referenced by key. Falsy entries are skipped. */
export function code(lines: readonly CodeLine[], impl?: ImplKey): Code {
  const out: string[] = [];
  const at: Record<string, number[]> = {};
  for (const l of lines) {
    if (!l) continue;
    if (typeof l === "string") out.push(l);
    else {
      out.push(l[1]);
      (at[l[0]] ??= []).push(out.length);
    }
  }
  return { lines: out, at, impl };
}

// ───────────────────────────── recorder ─────────────────────────────

interface Cell {
  id: string;
  value: number;
  addr: string;
  label?: string;
}

export interface SnapOptions {
  tone?: Tone;
  line?: string | readonly string[];
  vars?: Record<string, WatchValue>;
  callout?: string;
  hold?: number;
}

export class Rec {
  kind: ListKind;
  tailPtr: boolean;
  seq: number;
  steps: LLStep[] = [];
  direct = false;

  readonly cells = new Map<string, Cell>();
  next: Record<string, string | null> = {};
  prev: Record<string, string | null> = {};
  place: Record<string, Place> = {};
  marks: Record<string, NodeMark> = {};
  badges: Record<string, { text: string; tone: NodeSnap["badgeTone"] }> = {};
  hot: Record<string, Field[]> = {};
  /** Pointer variables, in the order they were first set. */
  ptrs = new Map<string, { to: string | null; at?: Place }>();

  private cur: Code = { lines: [], at: {} };

  constructor(state: ListState, c?: Code) {
    this.kind = state.kind;
    this.tailPtr = state.tailPtr;
    this.seq = state.seq;
    if (c) this.cur = c;
    const ids = state.nodes.map((n) => n.id);
    state.nodes.forEach((n, i) => {
      this.cells.set(n.id, { ...n });
      this.place[n.id] = { line: 0, slot: i, lane: 0 };
      this.marks[n.id] = "base";
      const last = i === ids.length - 1;
      this.next[n.id] = last ? (this.kind === "circular" ? ids[0] : null) : ids[i + 1];
      this.prev[n.id] = this.kind === "doubly" && i > 0 ? ids[i - 1] : null;
    });
    this.ptrs.set("head", { to: ids[0] ?? null });
    if (this.tailPtr) this.ptrs.set("tail", { to: ids[ids.length - 1] ?? null });
  }

  // ── reading ──
  get dbl() { return this.kind === "doubly"; }
  get circ() { return this.kind === "circular"; }
  get head(): string | null { return this.ptrs.get("head")?.to ?? null; }
  get tail(): string | null { return this.ptrs.get("tail")?.to ?? null; }
  /** Value of a node. */
  v(id: string | null): number { return id ? (this.cells.get(id)?.value ?? NaN) : NaN; }
  nx(id: string | null): string | null { return id ? (this.next[id] ?? null) : null; }
  pv(id: string | null): string | null { return id ? (this.prev[id] ?? null) : null; }
  at(name: string): string | null { return this.ptrs.get(name)?.to ?? null; }
  addr(id: string | null): string { return id ? (this.cells.get(id)?.addr ?? "?") : "NULL"; }
  /** Node ids from `start` following `next` (stops at NULL, at the start again, or on a repeat). */
  walk(start: string | null = this.head): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    for (let c = start; c && !seen.has(c); c = this.next[c] ?? null) {
      seen.add(c);
      out.push(c);
    }
    return out;
  }
  get size() { return this.walk().length; }
  values(): number[] { return this.walk().map((id) => this.v(id)); }
  /** "Is this node the end of the list?" — NULL-terminated or circular. */
  isEnd(id: string | null): boolean { return id === null || (this.circ && id === this.head); }

  // ── code ──
  use(c: Code) { this.cur = c; }
  get code() { return this.cur; }

  // ── writing ──
  alloc(value: number, place: Place, label?: string): string {
    const n = makeNode(this.seq++, value);
    this.cells.set(n.id, { ...n, label });
    this.next[n.id] = null;
    this.prev[n.id] = null;
    this.place[n.id] = place;
    this.marks[n.id] = "new";
    return n.id;
  }

  /** free(): remove the node; pointer variables that still hold it are dropped (they'd dangle). */
  free(id: string) {
    this.cells.delete(id);
    delete this.next[id];
    delete this.prev[id];
    delete this.place[id];
    delete this.marks[id];
    delete this.badges[id];
    delete this.hot[id];
    for (const [name, p] of [...this.ptrs]) if (p.to === id) this.ptrs.delete(name);
  }

  setNext(a: string, b: string | null) { this.next[a] = b; this.heat(a, "next"); }
  setPrev(a: string, b: string | null) { this.prev[a] = b; this.heat(a, "prev"); }
  heat(id: string, f: Field) { (this.hot[id] ??= []).push(f); }

  ptr(name: string, to: string | null, at?: Place) { this.ptrs.set(name, { to, at }); }
  drop(...names: string[]) { for (const n of names) this.ptrs.delete(n); }

  mark(id: string | null, m: NodeMark) { if (id && this.cells.has(id)) this.marks[id] = m; }
  markAll(m: NodeMark, ids: Iterable<string> = this.cells.keys()) { for (const id of ids) this.marks[id] = m; }
  badge(id: string | null, text: string, tone: NodeSnap["badgeTone"] = "info") { if (id) this.badges[id] = { text, tone }; }
  unbadge(id?: string | null) { if (id === undefined) this.badges = {}; else if (id) delete this.badges[id]; }
  move(id: string, p: Partial<Place>) { this.place[id] = { ...this.place[id], ...p }; }

  /** Lay the list out left-to-right in list order (from `start`), on `line`. */
  relayout(start: string | null = this.head, line = 0) {
    this.walk(start).forEach((id, i) => { this.place[id] = { line, slot: i, lane: 0 }; });
  }

  /** Record the current state as a step. */
  snap(title: string, detail: string, o: SnapOptions = {}) {
    const lines = o.line === undefined ? undefined : (typeof o.line === "string" ? [o.line] : o.line)
      .flatMap((k) => this.cur.at[k] ?? []);
    const nodes: NodeSnap[] = [];
    for (const [id, c] of this.cells) {
      const b = this.badges[id];
      nodes.push({
        id, value: c.value, addr: c.addr, label: c.label,
        place: { ...this.place[id] },
        mark: this.marks[id] ?? "base",
        hot: [...(this.hot[id] ?? [])],
        next: this.next[id] ?? null,
        prev: this.dbl ? (this.prev[id] ?? null) : null,
        badge: b?.text, badgeTone: b?.tone,
      });
    }
    const ptrs: PtrSnap[] = [...this.ptrs].map(([name, p]) => ({ name, to: p.to, at: p.at ? { ...p.at } : undefined }));
    this.steps.push({
      title, detail, tone: o.tone ?? "info",
      line: lines && lines.length ? lines : undefined,
      vars: { ...this.ptrVars(), ...(o.vars ?? {}) },
      hold: o.hold,
      kind: this.kind, nodes, ptrs, code: this.cur.lines, impl: this.cur.impl, callout: o.callout, direct: this.direct || undefined,
    });
    this.hot = {};
  }

  /** Pointer variables as watch values: the address they hold (and the value there). */
  private ptrVars(): Record<string, WatchValue> {
    const out: Record<string, WatchValue> = {};
    for (const [name, p] of this.ptrs) {
      out[name] = p.to ? `${this.addr(p.to)} (${this.cells.get(p.to)?.label ?? this.v(p.to)})` : "NULL";
    }
    return out;
  }

  /** The committed list this recording leaves behind (walked from head). */
  final(): ListState {
    return {
      kind: this.kind,
      tailPtr: this.tailPtr,
      nodes: this.walk().map((id) => {
        const c = this.cells.get(id)!;
        return { id: c.id, value: c.value, addr: c.addr };
      }),
      seq: this.seq,
    };
  }
}

/** "node 7" / "the node holding 7" helper used in explanations. */
export const fmtList = (vals: readonly number[]) => (vals.length ? vals.join(" → ") : "(empty)");
