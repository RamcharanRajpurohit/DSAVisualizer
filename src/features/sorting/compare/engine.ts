/*
 * Compare-mode race engine (imperative, framework-free).
 *
 * One requestAnimationFrame loop drives every cell: each running cell advances by the same
 * number of ticks per frame (one tick = one comparison or one write), replays the operations
 * from its trace and repaints its own small <canvas>. React only hears about coarse changes
 * (play / pause / a cell finishing) through subscribe/getSnapshot; live counters are written
 * straight into their DOM nodes so 24–36 cells stay smooth.
 */
import { BAR } from "./palette";
import { OP_AUX, OP_CMP, OP_WRITE, type Trace } from "./trace";

export interface CellDef {
  id: string;
  row: number;
  col: number;
  trace: Trace;
}

export interface EngineSnapshot {
  playing: boolean;
  /** Ids of cells that have finished. */
  done: ReadonlySet<string>;
  /** Ids of cells currently running. */
  running: ReadonlySet<string>;
  /** Some cell has moved away from its start. */
  started: boolean;
}

interface Cell extends CellDef {
  arr: number[];
  pos: number;
  t: number;
  running: boolean;
  cmps: number;
  writes: number;
  hiKind: number;
  hiA: number;
  hiB: number;
  finishedAt: number | null;
  /** The green "sorted" sweep has been fully drawn. */
  swept: boolean;
  dirty: boolean;
}

interface View {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | null;
  w: number;
  h: number;
  dpr: number;
}

const SWEEP_MS = 520;
const MAX_VALUE = 99;

const COLOR_CMP = BAR.compare;
const COLOR_WRITE = BAR.write;
const COLOR_AUX = BAR.aux;

const EMPTY: EngineSnapshot = { playing: false, done: new Set(), running: new Set(), started: false };

export class CompareEngine {
  private cells: Cell[] = [];
  private byId = new Map<string, Cell>();
  private views = new Map<string, View>();
  private stats = new Map<string, { el: HTMLElement; last: string }>();
  private clockEl: { el: HTMLElement; last: string } | null = null;
  private ro: ResizeObserver | null = null;
  private raf = 0;
  private last = 0;
  private rate = 60;
  private listeners = new Set<() => void>();
  private snap: EngineSnapshot = EMPTY;
  private pending: ((c: CellDef) => boolean) | null = null;

  /* ---------- React glue ---------- */

  subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };
  getSnapshot = () => this.snap;
  getServerSnapshot = () => EMPTY;

  private emit() {
    const done = new Set<string>();
    const running = new Set<string>();
    let started = false;
    for (const c of this.cells) {
      if (c.finishedAt !== null) done.add(c.id);
      if (c.running) running.add(c.id);
      if (c.pos > 0 || c.running) started = true;
    }
    this.snap = { playing: running.size > 0, done, running, started };
    this.listeners.forEach((l) => l());
  }

  /* ---------- setup ---------- */

  /** Replace the grid (new inputs, size or algorithm set). Everything rewinds to the start. */
  load(defs: readonly CellDef[]) {
    this.stop();
    this.cells = defs.map((d) => this.fresh(d));
    this.byId = new Map(this.cells.map((c) => [c.id, c]));
    this.ensureObserver();
    this.drawAll();
    const pending = this.pending;
    this.pending = null;
    if (pending) this.play(pending);
    else this.emit();
  }

  /** Play the matching cells right after the next load() (e.g. once an added column is traced). */
  playAfterLoad(match: (c: CellDef) => boolean) {
    this.pending = match;
  }

  /** Ticks per second (all cells share it). */
  setRate(ticksPerSecond: number) {
    this.rate = Math.max(1, ticksPerSecond);
  }

  attachCanvas(id: string, canvas: HTMLCanvasElement | null) {
    const old = this.views.get(id);
    if (old && this.ro) this.ro.unobserve(old.canvas);
    if (!canvas) {
      this.views.delete(id);
      return;
    }
    const view: View = { canvas, ctx: canvas.getContext("2d"), w: 0, h: 0, dpr: 1 };
    this.views.set(id, view);
    this.measure(view, canvas.clientWidth, canvas.clientHeight);
    this.ensureObserver();
    this.ro?.observe(canvas);
    const cell = this.byId.get(id);
    if (cell) this.draw(cell, performance.now());
  }

  /** A text node that shows one cell's live comparison or write count. */
  attachStat(id: string, kind: "cmp" | "wr", el: HTMLElement | null) {
    const key = `${id}:${kind}`;
    if (!el) {
      this.stats.delete(key);
      return;
    }
    this.stats.set(key, { el, last: "" });
    const cell = this.byId.get(id);
    if (cell) this.writeStats(cell);
  }

  /** A text node that shows the shared clock (ticks elapsed). */
  attachClock(el: HTMLElement | null) {
    this.clockEl = el ? { el, last: "" } : null;
    this.writeClock();
  }

  destroy() {
    this.stop();
    this.ro?.disconnect();
    this.ro = null;
  }

  /* ---------- transport ---------- */

  /**
   * Start (or resume) the matching cells. When every matching cell has already finished,
   * they restart from the beginning — so a row / column button doubles as "replay".
   */
  play(match: (c: CellDef) => boolean = () => true) {
    const sel = this.cells.filter(match);
    if (!sel.length) return;
    if (sel.every((c) => c.finishedAt !== null)) sel.forEach((c) => this.rewind(c));
    for (const c of sel) if (c.finishedAt === null) c.running = true;
    this.start();
    this.emit();
  }

  pause() {
    let any = false;
    for (const c of this.cells) {
      if (c.running) any = true;
      c.running = false;
    }
    if (any) this.emit();
  }

  toggle() {
    if (this.snap.playing) this.pause();
    else this.play();
  }

  reset() {
    this.stop();
    this.cells.forEach((c) => this.rewind(c));
    this.drawAll();
    this.emit();
  }

  /* ---------- internals ---------- */

  private fresh(d: CellDef): Cell {
    return {
      ...d,
      arr: d.trace.input.slice(),
      pos: 0,
      t: 0,
      running: false,
      cmps: 0,
      writes: 0,
      hiKind: -1,
      hiA: -1,
      hiB: -1,
      finishedAt: null,
      swept: false,
      dirty: true,
    };
  }

  private rewind(c: Cell) {
    c.arr = c.trace.input.slice();
    c.pos = 0;
    c.t = 0;
    c.running = false;
    c.cmps = 0;
    c.writes = 0;
    c.hiKind = -1;
    c.hiA = -1;
    c.hiB = -1;
    c.finishedAt = null;
    c.swept = false;
    c.dirty = true;
  }

  private ensureObserver() {
    if (this.ro || typeof ResizeObserver === "undefined") return;
    this.ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const canvas = e.target as HTMLCanvasElement;
        for (const [id, v] of this.views) {
          if (v.canvas !== canvas) continue;
          this.measure(v, e.contentRect.width, e.contentRect.height);
          const cell = this.byId.get(id);
          if (cell) this.draw(cell, performance.now());
        }
      }
    });
    for (const v of this.views.values()) this.ro.observe(v.canvas);
  }

  private measure(v: View, w: number, h: number) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    v.w = w;
    v.h = h;
    v.dpr = dpr;
    const pw = Math.max(1, Math.round(w * dpr));
    const ph = Math.max(1, Math.round(h * dpr));
    if (v.canvas.width !== pw) v.canvas.width = pw;
    if (v.canvas.height !== ph) v.canvas.height = ph;
  }

  private start() {
    if (this.raf) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    for (const c of this.cells) c.running = false;
  }

  private frame = (now: number) => {
    this.raf = 0;
    const dt = Math.min(0.1, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    let finished = false;
    let busy = false;

    for (const c of this.cells) {
      if (c.running) {
        c.t = Math.min(c.trace.length, c.t + dt * this.rate);
        this.advance(c, Math.floor(c.t));
        if (c.pos >= c.trace.length) {
          c.running = false;
          c.finishedAt = now;
          c.hiKind = -1;
          finished = true;
        } else busy = true;
        c.dirty = true;
      }
      if (c.finishedAt !== null && !c.swept) {
        c.dirty = true;
        busy = true;
      }
      if (c.dirty) this.draw(c, now);
    }

    this.writeClock();
    if (finished) this.emit();
    if (busy) this.raf = requestAnimationFrame(this.frame);
  };

  /** Apply operations until `target` of them have run. */
  private advance(c: Cell, target: number) {
    const ops = c.trace.ops;
    while (c.pos < target) {
      const o = c.pos * 3;
      const kind = ops[o];
      if (kind === OP_CMP) c.cmps++;
      else {
        c.writes++;
        if (kind === OP_WRITE) c.arr[ops[o + 1]] = ops[o + 2];
      }
      c.hiKind = kind;
      c.hiA = ops[o + 1];
      c.hiB = kind === OP_CMP ? ops[o + 2] : -1;
      c.pos++;
    }
    this.writeStats(c);
  }

  private writeStats(c: Cell) {
    for (const [kind, value] of [["cmp", c.cmps], ["wr", c.writes]] as const) {
      const s = this.stats.get(`${c.id}:${kind}`);
      if (!s) continue;
      const text = String(value);
      if (text !== s.last) {
        s.el.textContent = text;
        s.last = text;
      }
    }
  }

  private writeClock() {
    if (!this.clockEl) return;
    let t = 0;
    for (const c of this.cells) t = Math.max(t, Math.floor(c.t));
    const text = t.toLocaleString("en-US");
    if (text !== this.clockEl.last) {
      this.clockEl.el.textContent = text;
      this.clockEl.last = text;
    }
  }

  private drawAll() {
    const now = performance.now();
    for (const c of this.cells) {
      this.draw(c, now);
      this.writeStats(c);
    }
    this.writeClock();
  }

  private draw(c: Cell, now: number) {
    c.dirty = false;
    // Once the sweep time has passed, this draw shows it complete (and the loop may stop).
    if (c.finishedAt !== null && now - c.finishedAt >= SWEEP_MS) c.swept = true;
    const v = this.views.get(c.id);
    if (!v || !v.ctx || v.w < 2 || v.h < 2) return;
    const { ctx, w, h, dpr } = v;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const n = c.arr.length;
    if (!n) return;
    const bw = w / n;
    const gap = bw >= 5 ? 1.5 : bw >= 3 ? 1 : bw >= 2 ? 0.5 : 0;
    const top = 3;
    const usable = h - top;
    const done = c.finishedAt !== null;
    const sweep = done ? Math.min(1, (now - (c.finishedAt ?? now)) / SWEEP_MS) : 0;
    const sweepTo = done ? Math.ceil(sweep * n) : 0;

    for (let k = 0; k < n; k++) {
      const val = Math.max(0, Math.min(MAX_VALUE, c.arr[k]));
      const bh = Math.max(2, (val / MAX_VALUE) * usable);
      const x = k * bw + gap / 2;
      let color: string = k < sweepTo ? BAR.done : BAR.base;
      if (!done && (k === c.hiA || k === c.hiB)) {
        color = c.hiKind === OP_CMP ? COLOR_CMP : c.hiKind === OP_WRITE ? COLOR_WRITE : c.hiKind === OP_AUX ? COLOR_AUX : color;
      }
      ctx.fillStyle = color;
      ctx.fillRect(x, h - bh, Math.max(0.6, bw - gap), bh);
    }
  }
}
