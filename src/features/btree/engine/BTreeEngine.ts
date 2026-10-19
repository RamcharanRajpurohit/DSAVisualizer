/*
 * BTreeEngine — Konva renderer that animates the *process* of every B-tree operation.
 *
 * Every key is its own shape that can travel anywhere on the canvas; a node is only the box
 * drawn behind its keys. Each operation is broken into small data steps (primitives of the pure
 * model in ../model/btree) and, after every step, morph() tweens all boxes, keys and edges from
 * where they are now to where the new layout puts them. Because keys keep their identity you
 * watch the median rise into the parent on a split, the separator drop on a merge, and keys
 * rotate through the parent when a sibling lends one.
 *
 * Playback: every phase ends in hold(). In step mode hold() is an awaitable gate opened by
 * next(); otherwise it is a timer. Pause freezes running tweens and timers; skip() finishes the
 * running operation instantly. The engine never queries the DOM — it reports through callbacks.
 */

import type Konva from "konva";
import { EDGE, MONO_FONT, TONE_LABEL, type Tone } from "@/lib/theme";
import type { WatchValue } from "@/lib/player/types";
import { plural } from "@/lib/utils";
import {
  BTree, describeNode, fmtKeys,
  type BKey, type BNode, type Located, type PathStep, type ReplaceStrategy, type TreeProps, type TreeStats,
} from "../model/btree";
import { CODE, type OpKind } from "../pseudocode";
import { GEO, GLOW, KEY_STYLE, MAX_KEYS, NODE_STYLE, type KeyStyle, type NodeStyle } from "../constants";

type KonvaModule = typeof Konva;
type Attrs = Konva.NodeConfig;
type Easing = (t: number, b: number, c: number, d: number) => number;
export type Vars = Record<string, WatchValue>;

export interface EngineStep {
  title: string;
  detail?: string;
  tone: Tone;
  /** Phase counter inside the running operation (0 when idle). */
  step: number;
  op: OpKind | null;
  /** 1-based pseudocode lines of `op`. */
  lines: number[];
  vars: Vars;
}

export type HistoryOp = OpKind | "build" | "clear" | "order";

export interface HistoryEntry {
  id: number;
  op: HistoryOp;
  value?: number;
  text: string;
  tone: Tone;
}

export interface EngineCallbacks {
  onStep(step: EngineStep): void;
  onBusy(busy: boolean, label?: string): void;
  onStats(stats: TreeStats, props: TreeProps): void;
  /** Step mode: the engine is waiting for next(). */
  onGate(waiting: boolean): void;
  onPaused(paused: boolean): void;
  onHistory(entry: HistoryEntry): void;
}

export interface EngineOptions {
  order: number;
  /** Playback rate: 2 = twice as fast. */
  rate: number;
  stepMode: boolean;
  replace: ReplaceStrategy;
}

interface KeyView { group: Konva.Group; circle: Konva.Circle; text: Konva.Text; ghost: boolean }
interface NodeView { group: Konva.Group; rect: Konva.Rect }
interface NodeGeo { node: BNode; x: number; y: number; w: number }
interface KeyGeo { key: BKey; x: number; y: number }
interface Layout { nodes: Map<string, NodeGeo>; keys: Map<string, KeyGeo>; width: number; height: number }
interface Timer { pause(): void; resume(): void; flush(): void }

class Aborted extends Error {}

const EDGE_OPACITY = 0.9;
const BLACK = "#000000";
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export class BTreeEngine {
  readonly tree: BTree;

  private readonly K: KonvaModule;
  private readonly container: HTMLDivElement;
  private readonly cb: EngineCallbacks;
  private readonly font: string;
  private readonly stage: Konva.Stage;
  private readonly layer: Konva.Layer;
  private readonly world: Konva.Group;
  private readonly edgeGroup: Konva.Group;
  private readonly nodeGroup: Konva.Group;
  private readonly keyGroup: Konva.Group;
  private readonly fxGroup: Konva.Group;
  /** Only used while nodes are moved by hand (merge step 2); morph() tweens edges itself. */
  private readonly edgeAnim: Konva.Animation;
  private readonly ro: ResizeObserver;

  private readonly nodeViews = new Map<string, NodeView>();
  private readonly keyViews = new Map<string, KeyView>();
  private readonly edgeViews = new Map<string, Konva.Line>();
  /** Key ids being moved by hand (morph leaves them alone). */
  private readonly floating = new Set<string>();

  private rate: number;
  private stepMode: boolean;
  private strategy: ReplaceStrategy;

  private busy = false;
  private paused = false;
  private skipping = false;
  private dead = false;
  private gate: (() => void) | null = null;
  private resumeWaiters: (() => void)[] = [];
  private readonly tweens = new Set<Konva.Tween>();
  private readonly timers = new Set<Timer>();
  private tweenSeq = 0;

  private op: OpKind | null = null;
  private stepNo = 0;
  private vars: Vars = {};
  private historyId = 0;

  constructor(K: KonvaModule, container: HTMLDivElement, cb: EngineCallbacks, opts: EngineOptions) {
    this.K = K;
    this.container = container;
    this.cb = cb;
    this.rate = opts.rate;
    this.stepMode = opts.stepMode;
    this.strategy = opts.replace;
    this.tree = new BTree(opts.order);

    const family = getComputedStyle(container).getPropertyValue("--font-jetbrains").trim();
    this.font = family ? `${family}, ${MONO_FONT}` : MONO_FONT;

    this.stage = new K.Stage({
      container, width: Math.max(1, container.clientWidth), height: Math.max(1, container.clientHeight), draggable: true,
    });
    this.layer = new K.Layer();
    this.stage.add(this.layer);
    this.world = new K.Group();
    this.edgeGroup = new K.Group({ listening: false });
    this.nodeGroup = new K.Group({ listening: false });
    this.keyGroup = new K.Group({ listening: false });
    this.fxGroup = new K.Group({ listening: false });
    [this.edgeGroup, this.nodeGroup, this.keyGroup, this.fxGroup].forEach((g) => this.world.add(g));
    this.layer.add(this.world);

    this.edgeAnim = new K.Animation(() => this.refreshEdges(), this.layer);

    container.style.cursor = "grab";
    this.stage.on("dragstart", () => { container.style.cursor = "grabbing"; });
    this.stage.on("dragend", () => { container.style.cursor = "grab"; });
    this.stage.on("dblclick dbltap", () => this.recenter());
    // Ctrl/⌘ + wheel (and trackpad pinch) zooms around the pointer; a plain wheel keeps scrolling the page.
    this.stage.on("wheel", (ev) => {
      if (!ev.evt.ctrlKey && !ev.evt.metaKey) return;
      ev.evt.preventDefault();
      const p = this.stage.getPointerPosition();
      if (p) this.zoomAt(ev.evt.deltaY > 0 ? 1 / 1.12 : 1.12, p);
    });

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.emitStats();
  }

  // ───────────────────────────── public API ─────────────────────────────

  get isBusy() { return this.busy; }
  get order() { return this.tree.order; }
  values() { return this.tree.inorder(); }

  setRate(rate: number) { this.rate = rate; }
  setStrategy(s: ReplaceStrategy) { this.strategy = s; }

  setStepMode(on: boolean) {
    this.stepMode = on;
    if (!on) this.next(); // a pending gate continues as normal playback
  }

  /** Step mode: continue past the current phase boundary. */
  next(): boolean {
    const g = this.gate;
    if (!g) return false;
    this.gate = null;
    this.cb.onGate(false);
    if (this.paused) this.setPaused(false);
    g();
    return true;
  }

  setPaused(p: boolean) {
    if (this.dead || p === this.paused || (p && !this.busy)) return;
    this.paused = p;
    if (p) {
      this.tweens.forEach((t) => t.pause());
      this.timers.forEach((t) => t.pause());
    } else {
      this.tweens.forEach((t) => t.play());
      this.timers.forEach((t) => t.resume());
      const waiters = this.resumeWaiters;
      this.resumeWaiters = [];
      waiters.forEach((w) => w());
    }
    this.cb.onPaused(p);
  }

  togglePause() { this.setPaused(!this.paused); }

  /** Finish the running operation instantly. */
  skip() {
    if (!this.busy || this.dead) return;
    this.skipping = true;
    if (this.paused) this.setPaused(false);
    this.next();
    [...this.tweens].forEach((t) => t.finish());
    [...this.timers].forEach((t) => t.flush());
  }

  /** Zoom the view (on top of the automatic fit) around the canvas centre. */
  zoom(factor: number) {
    this.zoomAt(factor, { x: this.stage.width() / 2, y: this.stage.height() / 2 });
  }

  private zoomAt(factor: number, p: { x: number; y: number }) {
    const old = this.stage.scaleX();
    const s = Math.min(4, Math.max(0.4, old * factor));
    const to = { x: (p.x - this.stage.x()) / old, y: (p.y - this.stage.y()) / old };
    this.stage.scale({ x: s, y: s });
    this.stage.position({ x: p.x - to.x * s, y: p.y - to.y * s });
    this.layer.batchDraw();
  }

  recenter() {
    this.stage.scale({ x: 1, y: 1 });
    this.stage.position({ x: 0, y: 0 });
    if (!this.busy) this.fitNow();
    this.layer.batchDraw();
  }

  insert(values: readonly number[]) { return this.batch("insert", values, (v) => this.doInsert(v)); }
  search(values: readonly number[]) { return this.batch("search", values, (v) => this.doSearch(v)); }
  delete(values: readonly number[]) { return this.batch("delete", values, (v) => this.doDelete(v)); }

  /** Replace the tree with `values`, inserted silently, then let everything grow into place. */
  build(values: readonly number[], title: string, detail?: string) {
    return this.run(title, async () => {
      const T = this.tree;
      T.reset(T.order);
      let added = 0;
      for (const v of values) if (T.insert(v)) added++;
      const st = T.stats();
      const dup = values.length - added;
      this.say(title,
        (detail ? `${detail}\n` : "") +
        `${plural(added, "key")} in an order-${T.order} B-tree${dup ? ` (${plural(dup, "duplicate")} skipped)` : ""}: ` +
        `${plural(st.nodes, "node")}, height ${st.height}. Every leaf sits on the same level.`, "ok");
      this.log("build", undefined, `${title} · ${plural(added, "key")}`, "info");
      await this.morph(0.9);
    });
  }

  clear() {
    return this.run("Clear", async () => {
      this.tree.reset();
      this.say("Tree cleared",
        `Empty B-tree of order ${this.tree.order}. Type a key and press **Insert** — or just press Insert for a random one.`, "info");
      this.log("clear", undefined, "Cleared the tree", "muted");
      await this.morph(0.5);
    });
  }

  /** Change the order and re-insert the existing keys (same key objects, so they glide to their new homes). */
  setOrder(order: number) {
    return this.run(`Order ${order}`, async () => {
      const T = this.tree;
      const keys = T.levelOrderKeys();
      T.reset(order);
      keys.forEach((k) => T.insertKey(k));
      this.say(`Order ${order}`,
        `Each node now holds at most **${T.maxKeys}** keys (${order} children); every node except the root keeps at least **${T.minKeys}**.` +
        (keys.length ? ` The ${plural(keys.length, "existing key")} were re-inserted — height is now ${T.stats().height}.` : ""), "ok");
      this.log("order", order, `Order → ${order}${keys.length ? ` · rebuilt ${plural(keys.length, "key")}` : ""}`, "info");
      await this.morph(0.9);
    });
  }

  destroy() {
    if (this.dead) return;
    this.dead = true;
    this.ro.disconnect();
    this.edgeAnim.stop();
    const g = this.gate;
    this.gate = null;
    g?.();
    [...this.timers].forEach((t) => t.flush());
    const waiters = this.resumeWaiters;
    this.resumeWaiters = [];
    waiters.forEach((w) => w());
    // Destroying the stage fires "destroy" on every node, which resolves their pending tweens.
    this.stage.destroy();
  }

  // ───────────────────────────── run loop ─────────────────────────────

  private batch(op: OpKind, values: readonly number[], fn: (v: number) => Promise<void>) {
    return this.run(`${cap(op)} ${values.join(", ")}`, async () => {
      for (let n = 0; n < values.length; n++) {
        if (n > 0) {
          this.fxGroup.destroyChildren();
          await this.resetStyles(0.25);
          await this.wait(0.3);
        }
        this.op = op;
        this.vars = values.length > 1 ? { batch: `${n + 1}/${values.length}` } : {};
        await fn(values[n]);
      }
    });
  }

  private async run(label: string, body: () => Promise<void>): Promise<boolean> {
    if (this.busy || this.dead) return false;
    this.busy = true;
    this.stepNo = 0;
    this.vars = {};
    this.op = null;
    this.cb.onBusy(true, label);
    try {
      await body();
    } catch (err) {
      if (this.dead) return false;
      if (!(err instanceof Aborted)) {
        console.error(err);
        this.say("Animation error", err instanceof Error ? err.message : String(err), "danger");
      }
    }
    if (this.dead) return false;
    // Resync the view with the data, quickly.
    if (this.paused) this.setPaused(false);
    try {
      this.fxGroup.destroyChildren();
      this.floating.clear();
      await this.resetStyles(0.25);
      await this.morph(0.3);
    } catch {
      if (this.dead) return false;
    }
    this.skipping = false;
    this.busy = false;
    this.gate = null;
    this.cb.onGate(false);
    this.cb.onBusy(false);
    this.emitStats();
    return true;
  }

  private assertAlive() {
    if (this.dead) throw new Aborted();
  }

  private say(title: string, detail = "", tone: Tone = "info", at?: string | readonly string[], vars?: Vars) {
    this.assertAlive();
    if (vars) this.vars = { ...this.vars, ...vars };
    this.stepNo++;
    let lines: number[] = [];
    if (this.op && at) {
      const map = CODE[this.op].at as Record<string, number>;
      lines = (typeof at === "string" ? [at] : at).map((t) => map[t]).filter((n): n is number => typeof n === "number");
    }
    this.cb.onStep({ title, detail, tone, step: this.stepNo, op: this.op, lines, vars: this.vars });
  }

  private log(op: HistoryOp, value: number | undefined, text: string, tone: Tone) {
    this.cb.onHistory({ id: ++this.historyId, op, value, text, tone });
  }

  private emitStats() {
    this.cb.onStats(this.tree.stats(), this.tree.props());
  }

  // ───────────────────────────── timing primitives ─────────────────────────────

  private sec(s: number) {
    return this.skipping ? 0 : s / this.rate;
  }

  private whenRunning(): Promise<void> {
    return this.paused ? new Promise((r) => this.resumeWaiters.push(r)) : Promise.resolve();
  }

  /** A pausable timer. */
  private wait(s: number): Promise<void> {
    this.assertAlive();
    const ms = this.sec(s) * 1000;
    if (ms < 1) return Promise.resolve();
    return new Promise<void>((resolve) => {
      let remaining = ms;
      let started = 0;
      let handle: ReturnType<typeof setTimeout> | null = null;
      const done = () => {
        if (handle) clearTimeout(handle);
        handle = null;
        this.timers.delete(timer);
        resolve();
      };
      const arm = () => {
        started = performance.now();
        handle = setTimeout(done, remaining);
      };
      const timer: Timer = {
        pause: () => {
          if (!handle) return;
          clearTimeout(handle);
          handle = null;
          remaining -= performance.now() - started;
        },
        resume: () => { if (!handle) arm(); },
        flush: done,
      };
      this.timers.add(timer);
      if (!this.paused) arm();
    }).then(() => this.assertAlive());
  }

  /** End of a phase: a timed beat, or — in step mode — wait for next(). */
  private async hold(s: number) {
    this.assertAlive();
    if (this.stepMode && !this.skipping) {
      await new Promise<void>((resolve) => {
        this.gate = resolve;
        this.cb.onGate(true);
      });
      this.assertAlive();
    } else {
      await this.wait(s);
    }
  }

  private tween(node: Konva.Node | null | undefined, attrs: Attrs, s: number, easing?: Easing): Promise<void> {
    if (!node || this.dead) return Promise.resolve();
    return this.whenRunning().then(() => new Promise<void>((resolve) => {
      if (this.dead) return resolve();
      const duration = this.sec(s);
      if (duration <= 0.001 || !node.getLayer()) {
        node.setAttrs(attrs);
        this.layer.batchDraw();
        return resolve();
      }
      let done = false;
      const ns = `destroy.btw${++this.tweenSeq}`;
      const finish = () => {
        if (done) return;
        done = true;
        node.off(ns);
        this.tweens.delete(tw);
        resolve();
      };
      const tw: Konva.Tween = new this.K.Tween({
        ...attrs, node, duration, easing: easing ?? this.K.Easings.EaseInOut,
        onFinish: () => { finish(); tw.destroy(); },
      });
      node.on(ns, finish); // a node destroyed mid-tween never finishes its tween
      this.tweens.add(tw);
      tw.play();
    }));
  }

  // ───────────────────────────── layout ─────────────────────────────

  private layout(): Layout {
    const { slot: S, pad, nodeH: H, levelGap: V } = GEO;
    // Narrow canvases pack sibling subtrees tighter so the keys stay readable.
    const GAP = Math.round(Math.min(GEO.gap, Math.max(10, this.stage.width() / 38)));
    const nodes = new Map<string, NodeGeo>(), keys = new Map<string, KeyGeo>();
    if (this.tree.isEmpty()) return { nodes, keys, width: 0, height: 0 };

    const nodeW = (n: BNode) => 2 * pad + Math.max(1, n.keys.length) * S;
    const span = new Map<string, number>();
    const measure = (n: BNode): number => {
      let w = nodeW(n);
      if (!n.leaf && n.children.length) {
        const kids = n.children.reduce((a, c) => a + measure(c), 0) + GAP * (n.children.length - 1);
        w = Math.max(w, kids);
      }
      span.set(n.id, w);
      return w;
    };
    const total = measure(this.tree.root);
    let depth = 0;

    const place = (n: BNode, left: number, level: number) => {
      const w = nodeW(n), cx = left + span.get(n.id)! / 2, x = cx - w / 2, y = level * V;
      depth = Math.max(depth, level);
      nodes.set(n.id, { node: n, x, y, w });
      n.keys.forEach((k, i) => keys.set(k.id, { key: k, x: x + pad + (i + 0.5) * S, y: y + H / 2 }));
      if (!n.leaf && n.children.length) {
        const kids = n.children.reduce((a, c) => a + span.get(c.id)!, 0) + GAP * (n.children.length - 1);
        let cl = cx - kids / 2;
        n.children.forEach((c) => {
          place(c, cl, level + 1);
          cl += span.get(c.id)! + GAP;
        });
      }
    };
    place(this.tree.root, -total / 2, 0);
    return { nodes, keys, width: total, height: depth * V + H };
  }

  private fitFor(L: Layout) {
    const sw = this.stage.width(), sh = this.stage.height();
    const scale = (top: number) =>
      Math.max(0.25, Math.min(1, (sw - 48) / Math.max(L.width, 1), (sh - top - 36) / Math.max(L.height, 1)));
    let s = scale(GEO.top);
    // Room above the root for the probe key and its callout, proportional to the zoom.
    const top = Math.max(30, 84 * s + 12);
    s = scale(top);
    // Centre vertically when the canvas has height to spare.
    return { x: sw / 2, y: Math.max(top, (sh - L.height * s) / 2 - 20), s };
  }

  private fitNow() {
    const f = this.fitFor(this.layout());
    this.world.setAttrs({ x: f.x, y: f.y, scaleX: f.s, scaleY: f.s });
  }

  private resize() {
    if (this.dead) return;
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.stage.size({ width: w, height: h });
    // Idle: snap boxes, keys and edges to the new layout (the subtree gap depends on the width).
    if (!this.busy) void this.morph(0).catch(() => {});
    this.layer.batchDraw();
  }

  private nodeGeo(node: BNode) {
    const v = this.nodeViews.get(node.id);
    if (v) {
      const x = v.group.x(), y = v.group.y(), w = v.rect.width();
      return { x, y, w, cx: x + w / 2 };
    }
    const g = this.layout().nodes.get(node.id);
    if (g) return { x: g.x, y: g.y, w: g.w, cx: g.x + g.w / 2 };
    const w = 2 * GEO.pad + GEO.slot;
    return { x: -w / 2, y: 0, w, cx: 0 };
  }

  /** Edge from child pointer i of a parent (at px, py, width pw, n keys) to a child's top-centre. */
  private edgePts(px: number, py: number, pw: number, n: number, i: number, cx: number, cy: number) {
    const sx = px + (n === 0 ? pw / 2 : GEO.pad + i * GEO.slot);
    const sy = py + GEO.nodeH;
    const my = (sy + cy) / 2;
    return [sx, sy, sx, my, cx, my, cx, cy];
  }

  private currentEdgePts(p: BNode, i: number, c: BNode) {
    const pv = this.nodeViews.get(p.id), cv = this.nodeViews.get(c.id);
    if (!pv || !cv) return null;
    return this.edgePts(pv.group.x(), pv.group.y(), pv.rect.width(), p.keys.length, i,
      cv.group.x() + cv.rect.width() / 2, cv.group.y());
  }

  private edgeTargets(L: Layout) {
    const out = new Map<string, { parent: BNode; child: BNode; i: number; pts: number[] }>();
    const walk = (p: BNode) => {
      if (p.leaf) return;
      const pg = L.nodes.get(p.id);
      p.children.forEach((c, i) => {
        const cg = L.nodes.get(c.id);
        if (pg && cg) {
          out.set(c.id, { parent: p, child: c, i, pts: this.edgePts(pg.x, pg.y, pg.w, p.keys.length, i, cg.x + cg.w / 2, cg.y) });
        }
        walk(c);
      });
    };
    walk(this.tree.root);
    return out;
  }

  private refreshEdges() {
    const walk = (n: BNode) => {
      if (n.leaf) return;
      n.children.forEach((c, i) => {
        const line = this.edgeViews.get(c.id), pts = this.currentEdgePts(n, i, c);
        if (line && pts) line.points(pts);
        walk(c);
      });
    };
    walk(this.tree.root);
  }

  // ───────────────────────────── shapes ─────────────────────────────

  private keyShape(label: number, ghost = false): KeyView {
    const K = this.K, R = GEO.r;
    const [fill, stroke, textFill] = KEY_STYLE.base;
    const group = new K.Group({ listening: false });
    const circle = new K.Circle({
      radius: R, strokeWidth: 2,
      fill: ghost ? "rgba(0,0,0,0)" : fill,
      stroke: ghost ? "#8a8a96" : stroke,
      shadowColor: BLACK, shadowBlur: ghost ? 0 : 6, shadowOpacity: 0.35, shadowEnabled: !ghost,
      ...(ghost ? { dash: [4, 4] } : {}),
    });
    const str = ghost ? "" : String(label);
    const text = new K.Text({
      x: -R - 6, y: -R, width: 2 * R + 12, height: 2 * R, text: str,
      align: "center", verticalAlign: "middle", fontSize: str.length > 3 ? 11 : 15, fontStyle: "bold",
      fontFamily: this.font, fill: textFill, listening: false,
    });
    group.add(circle);
    group.add(text);
    return { group, circle, text, ghost };
  }

  private makeKeyView(k: BKey, x: number, y: number, scale = 1) {
    const v = this.keyShape(k.v, !!k.ghost);
    v.group.setAttrs({ x, y, scaleX: scale, scaleY: scale });
    this.keyGroup.add(v.group);
    this.keyViews.set(k.id, v);
    return v;
  }

  private makeNodeView(node: BNode, { x, y, w, opacity = 1 }: { x: number; y: number; w: number; opacity?: number }) {
    const group = new this.K.Group({ x, y, opacity });
    const [fill, stroke] = NODE_STYLE.base;
    const rect = new this.K.Rect({
      width: w, height: GEO.nodeH, cornerRadius: 10, strokeWidth: 2, fill, stroke,
      shadowColor: BLACK, shadowBlur: 12, shadowOffsetX: 0, shadowOffsetY: 4, shadowOpacity: 0.45,
    });
    group.add(rect);
    this.nodeGroup.add(group);
    const v = { group, rect };
    this.nodeViews.set(node.id, v);
    return v;
  }

  private makeEdge(points: number[]) {
    const line = new this.K.Line({
      points, bezier: true, stroke: EDGE.base, strokeWidth: 2.5, lineCap: "round", opacity: EDGE_OPACITY,
      shadowColor: EDGE.active, shadowBlur: 0, shadowOpacity: 0, listening: false,
    });
    this.edgeGroup.add(line);
    return line;
  }

  /** On-canvas callout with a pointer. */
  private label(text: string, x: number, y: number, tone: Tone = "info", dir: "down" | "left" | "up" | "right" = "down") {
    const [bg, fg] = TONE_LABEL[tone];
    const lbl = new this.K.Label({ x, y, opacity: 0, listening: false });
    lbl.add(new this.K.Tag({
      fill: bg, pointerDirection: dir, pointerWidth: 10, pointerLength: 7, cornerRadius: 6,
      shadowColor: bg, shadowBlur: 12, shadowOpacity: 0.55,
    }));
    lbl.add(new this.K.Text({ text, padding: 6, fontSize: 13, fontStyle: "bold", fontFamily: this.font, fill: fg }));
    this.fxGroup.add(lbl);
    void this.tween(lbl, { opacity: 1 }, 0.2);
    return lbl;
  }

  private nodeLabel(node: BNode, text: string, tone: Tone) {
    const g = this.nodeGeo(node);
    return this.label(text, g.cx, g.y - 4, tone, "down");
  }

  private dropLabel(lbl: Konva.Label | null | undefined) {
    if (lbl) void this.tween(lbl, { opacity: 0 }, 0.2).then(() => lbl.destroy());
  }

  // ───────────────────────────── styling ─────────────────────────────

  private rectStyle(rect: Konva.Rect, style: NodeStyle, s = 0.25) {
    const [fill, stroke] = NODE_STYLE[style];
    const glow = style === "base" ? undefined : GLOW[style];
    const attrs: Attrs = {
      fill, stroke, strokeWidth: style === "base" ? 2 : 3,
      shadowColor: glow ?? BLACK, shadowBlur: glow ? 22 : 12, shadowOpacity: glow ? 0.5 : 0.45, shadowOffsetY: glow ? 0 : 4,
    };
    if (s === 0) {
      rect.setAttrs(attrs);
      return Promise.resolve();
    }
    return this.tween(rect, attrs, s);
  }

  private nodeStyle(node: BNode, style: NodeStyle, s = 0.25) {
    const v = this.nodeViews.get(node.id);
    return v ? this.rectStyle(v.rect, style, s) : Promise.resolve();
  }

  private keyViewStyle(v: KeyView | undefined, style: KeyStyle, s = 0.25): Promise<unknown> {
    if (!v || v.ghost) return Promise.resolve();
    const [fill, stroke, text] = KEY_STYLE[style];
    const glow = style === "base" ? undefined : GLOW[style];
    const attrs: Attrs = { fill, stroke, shadowColor: glow ?? BLACK, shadowBlur: glow ? 16 : 6, shadowOpacity: glow ? 0.85 : 0.35 };
    if (s === 0) {
      v.circle.setAttrs(attrs);
      v.text.fill(text);
      return Promise.resolve();
    }
    return Promise.all([this.tween(v.circle, attrs, s), this.tween(v.text, { fill: text }, s)]);
  }

  private keyStyle(k: BKey, style: KeyStyle, s = 0.25) {
    return this.keyViewStyle(this.keyViews.get(k.id), style, s);
  }

  private edgeStyle(child: BNode, on: boolean, s = 0.2) {
    const line = this.edgeViews.get(child.id);
    return this.tween(line, { stroke: on ? EDGE.active : EDGE.base, strokeWidth: on ? 4 : 2.5, shadowBlur: on ? 10 : 0, shadowOpacity: on ? 0.9 : 0 }, s);
  }

  private resetStyles(s = 0.3) {
    const jobs: Promise<unknown>[] = [];
    this.nodeViews.forEach((v) => jobs.push(this.rectStyle(v.rect, "base", s)));
    this.keyViews.forEach((v) => jobs.push(this.keyViewStyle(v, "base", s)));
    this.edgeViews.forEach((l) => jobs.push(this.tween(l, { stroke: EDGE.base, strokeWidth: 2.5, shadowBlur: 0, shadowOpacity: 0 }, s)));
    return Promise.all(jobs);
  }

  // ───────────────────────────── little animations ─────────────────────────────

  private async pulseKey(k: BKey) {
    const v = this.keyViews.get(k.id);
    if (!v) return;
    await this.tween(v.group, { scaleX: 1.35, scaleY: 1.35 }, 0.18);
    await this.tween(v.group, { scaleX: 1.1, scaleY: 1.1 }, 0.18);
  }

  private async flashNode(node: BNode) {
    const v = this.nodeViews.get(node.id);
    if (!v) return;
    for (let r = 0; r < 2; r++) {
      await this.tween(v.rect, { strokeWidth: 6 }, 0.12);
      await this.tween(v.rect, { strokeWidth: 3 }, 0.12);
    }
  }

  private async shake(group: Konva.Group) {
    const x = group.x();
    for (const dx of [-7, 7, -5, 5, 0]) await this.tween(group, { x: x + dx }, 0.05);
  }

  private nudgeKey(k: BKey, dx: number, s: number) {
    const v = this.keyViews.get(k.id);
    return v ? this.tween(v.group, { x: v.group.x() + dx }, s) : Promise.resolve();
  }

  /** A free-floating copy of the searched value that walks down the tree. */
  private async probe(v: number, style: KeyStyle) {
    const g = this.nodeGeo(this.tree.root);
    const p = this.keyShape(v);
    p.group.setAttrs({ x: g.cx, y: g.y - 64, scaleX: 0.01, scaleY: 0.01 });
    this.fxGroup.add(p.group);
    await this.keyViewStyle(p, style, 0);
    await this.tween(p.group, { y: g.y - 40, scaleX: 1, scaleY: 1 }, 0.35, this.K.Easings.BackEaseOut);
    return p;
  }

  /**
   * Tween every node box, key and edge from where it is now to where the current data says it
   * should be. New things fade/grow in, removed things fade/shrink out.
   */
  private async morph(s = 0.7) {
    this.assertAlive();
    const L = this.layout();
    const fit = this.fitFor(L);
    const jobs: Promise<unknown>[] = [];

    for (const [id, g] of L.nodes) {
      const v = this.nodeViews.get(id) ?? this.makeNodeView(g.node, { x: g.x, y: g.y - 14, w: g.w, opacity: 0 });
      jobs.push(this.tween(v.group, { x: g.x, y: g.y, opacity: 1 }, s));
      jobs.push(this.tween(v.rect, { width: g.w }, s));
    }
    for (const [id, v] of [...this.nodeViews]) {
      if (L.nodes.has(id)) continue;
      this.nodeViews.delete(id);
      jobs.push(this.tween(v.group, { opacity: 0 }, s * 0.6).then(() => v.group.destroy()));
    }

    for (const [id, g] of L.keys) {
      if (this.floating.has(id)) continue;
      const v = this.keyViews.get(id) ?? this.makeKeyView(g.key, g.x, g.y, 0.01);
      jobs.push(this.tween(v.group, { x: g.x, y: g.y, scaleX: 1, scaleY: 1, opacity: 1 }, s));
    }
    for (const [id, v] of [...this.keyViews]) {
      if (L.keys.has(id) || this.floating.has(id)) continue;
      this.keyViews.delete(id);
      jobs.push(this.tween(v.group, { scaleX: 0.01, scaleY: 0.01, opacity: 0 }, s * 0.6).then(() => v.group.destroy()));
    }

    const targets = this.edgeTargets(L);
    for (const [cid, t] of targets) {
      let line = this.edgeViews.get(cid);
      if (!line) {
        line = this.makeEdge(this.currentEdgePts(t.parent, t.i, t.child) ?? t.pts);
        line.opacity(0);
        this.edgeViews.set(cid, line);
      }
      jobs.push(this.tween(line, { points: t.pts, opacity: EDGE_OPACITY }, s));
    }
    for (const [cid, line] of [...this.edgeViews]) {
      if (targets.has(cid)) continue;
      this.edgeViews.delete(cid);
      jobs.push(this.tween(line, { opacity: 0 }, s * 0.5).then(() => line.destroy()));
    }

    jobs.push(this.tween(this.world, { x: fit.x, y: fit.y, scaleX: fit.s, scaleY: fit.s }, s));
    this.emitStats();
    await Promise.all(jobs);
  }

  // ───────────────────────────── walking down the tree ─────────────────────────────

  private async descend(v: number, probe: KeyView, title: string): Promise<Located> {
    const path: PathStep[] = [];
    let node = this.tree.root;
    for (;;) {
      const g = this.nodeGeo(node);
      probe.group.moveToTop();
      await this.tween(probe.group, { x: g.cx, y: g.y - 40 }, 0.45);
      await this.nodeStyle(node, "visit", 0.2);

      const keys = node.keys;
      const i = BTree.rank(node, v);
      const vars: Vars = { k: v, x: fmtKeys(keys), i, depth: path.length };

      if (i < keys.length && keys[i].v === v) {
        const dup = this.op === "insert";
        const lbl = this.label(dup ? `${v} is here` : `found ${v}`, g.cx + GEO.r + 6, g.y - 40, dup ? "danger" : "ok", "left");
        if (this.op === "search") {
          this.say(`Found ${v}`, `At ${fmtKeys(keys)}: key[${i}] = ${v}. The search stops here.`, "ok", ["index", "hit", "found"], vars);
        } else if (this.op === "delete") {
          this.say(`Found ${v}`, `${v} sits in ${node.leaf ? "a leaf" : "an internal node"} ${fmtKeys(keys)} at depth ${path.length}.`, "ok", "find", vars);
        } else {
          this.say(`${v} is already in the tree`, `At ${fmtKeys(keys)}: key[${i}] = ${v}. Keys are unique, so nothing is inserted.`, "danger", ["index", "dup"], vars);
        }
        await this.keyStyle(keys[i], dup ? "danger" : "success");
        await this.hold(0.5);
        this.dropLabel(lbl);
        return { path, node, idx: i, found: true };
      }
      if (node.leaf) return { path, node, idx: i, found: false };

      const lo = keys[i - 1], hi = keys[i];
      const cmp = !lo ? `${v} < ${hi.v}` : !hi ? `${v} > ${lo.v}` : `${lo.v} < ${v} < ${hi.v}`;
      const where = i === 0 ? "leftmost child" : i === keys.length ? "rightmost child" : `child #${i + 1}`;
      const at = this.op === "delete" ? "find" : this.op === "insert" ? ["index", "down"] : ["index", "leaf", "down"];
      this.say(title, `At ${fmtKeys(keys)}: ${cmp}, so follow the pointer to the **${where}** — only that subtree can hold ${v}.`, "info", at, vars);
      const lbl = this.label(cmp, g.cx + GEO.r + 6, g.y - 40, "info", "left");
      await Promise.all([
        lo && this.keyStyle(lo, "compare"),
        hi && this.keyStyle(hi, "compare"),
        this.edgeStyle(node.children[i], true),
      ]);
      await this.hold(0.6);
      this.dropLabel(lbl);
      void this.nodeStyle(node, "base");
      if (lo) void this.keyStyle(lo, "base");
      if (hi) void this.keyStyle(hi, "base");
      void this.edgeStyle(node.children[i], false, 0.6);

      path.push({ node, idx: i });
      node = node.children[i];
    }
  }

  // ───────────────────────────── INSERT ─────────────────────────────

  private async doInsert(v: number) {
    const T = this.tree;
    const title = `Insert ${v}`;
    if (T.stats().keys >= MAX_KEYS) {
      this.say("The tree is full", `This visualizer keeps at most ${MAX_KEYS} keys so the drawing stays readable. Delete some keys or clear the tree.`, "danger");
      this.log("insert", v, `${v} skipped — tree is full`, "warn");
      return;
    }
    const k = T.newKey(v);
    const start = this.nodeGeo(T.root);
    const probe = this.makeKeyView(k, start.cx, start.y - 64, 0.01);
    probe.group.moveToTop();
    this.floating.add(k.id);
    void this.keyViewStyle(probe, "moving", 0);

    if (T.isEmpty()) {
      this.say(title, `The tree is empty, so **${v}** becomes the only key of the root.`, "info", ["empty", "emptyRoot"], { k: v });
      await this.tween(probe.group, { y: start.y - 40, scaleX: 1, scaleY: 1 }, 0.4, this.K.Easings.BackEaseOut);
      T.insertAt(T.root, 0, k);
      this.floating.delete(k.id);
      await this.morph(0.6);
      await this.keyStyle(k, "success");
      this.say(`✓ Inserted ${v}`, "The root is a leaf holding one key — a B-tree of height 1.", "ok", "emptyRoot");
      this.log("insert", v, `Inserted ${v} as the first key`, "ok");
      await this.wait(0.5);
      return;
    }

    this.say(title, `Every insertion ends in a leaf. Walk down from the root, comparing **${v}** with each node's keys to pick the one subtree whose range contains it.`, "info", ["start", "loop"], { k: v, max: T.maxKeys });
    await this.tween(probe.group, { y: start.y - 40, scaleX: 1, scaleY: 1 }, 0.4, this.K.Easings.BackEaseOut);
    await this.hold(0.3);
    const res = await this.descend(v, probe, title);

    if (res.found) {
      void this.keyViewStyle(probe, "danger");
      await this.shake(probe.group);
      await this.tween(probe.group, { opacity: 0, scaleX: 0.01, scaleY: 0.01 }, 0.35);
      probe.group.destroy();
      this.keyViews.delete(k.id);
      this.floating.delete(k.id);
      this.log("insert", v, `${v} already present — skipped`, "warn");
      await this.wait(0.4);
      return;
    }

    const { path, node, idx } = res;
    const room = node.keys.length < T.maxKeys;
    this.say(`Reached leaf ${fmtKeys(node.keys)}`,
      `**${v}** goes into position ${idx + 1}. ` +
      (room ? `The leaf has room (${node.keys.length} of ${T.maxKeys} slots used), so its keys simply slide apart.`
            : `The leaf already holds ${node.keys.length} keys — the maximum for order ${T.order} — so it will overflow.`),
      room ? "info" : "warn", ["leafBrk", "place"], { x: fmtKeys(node.keys), i: idx, n: node.keys.length + 1 });
    T.insertAt(node, idx, k);
    this.floating.delete(k.id);
    void this.nodeStyle(node, room ? "visit" : "danger");
    await this.morph(0.65);
    await this.keyStyle(k, "success");
    await this.hold(0.4);

    let splits = 0, grew = false, cur = node;
    for (let d = path.length; cur.keys.length > T.maxKeys; d--) {
      const up = d > 0 ? path[d - 1] : null;
      grew = await this.split(cur, up ? up.node : null, up ? up.idx : 0, splits > 0);
      splits++;
      if (!up) break;
      cur = up.node;
    }

    const height = T.stats().height;
    this.say(`✓ Inserted ${v}`,
      splits
        ? `${plural(splits, "split")} kept every node within ${T.maxKeys} keys${grew ? " and the tree grew one level taller — at the root, so all leaves stay level" : ""}.`
        : "No split was needed — the leaf had room.",
      "ok", splits ? (grew ? ["newRoot", "grow"] : "overflow") : "place", { height });
    this.log("insert", v, `Inserted ${v}${splits ? ` · ${plural(splits, "split")}` : ""}${grew ? " · new root" : ""}`, "ok");
    await this.wait(0.5);
  }

  /** Animated split of an overflowing node. Returns true when a new root was created. */
  private async split(node: BNode, parent: BNode | null, idx: number, cascaded: boolean): Promise<boolean> {
    const T = this.tree;
    const { slot: S, pad, nodeH: H } = GEO;
    const m = node.keys.length, mid = Math.floor(m / 2);
    const med = node.keys[mid];
    const leftKeys = node.keys.slice(0, mid), rightKeys = node.keys.slice(mid + 1);

    // 0 — show the overflow
    this.say(`Overflow in ${fmtKeys(node.keys)}`,
      (cascaded ? "Receiving the median made this node overflow too — the split **cascades upward**. " : "") +
      `It has ${m} keys but order ${T.order} allows at most ${T.maxKeys}, so it must split.`,
      "danger", "overflow", { x: fmtKeys(node.keys), n: m, max: T.maxKeys });
    await this.nodeStyle(node, "danger");
    const lbl = this.nodeLabel(node, `${m} keys > max ${T.maxKeys}`, "danger");
    await this.flashNode(node);
    await this.hold(0.5);
    this.dropLabel(lbl);

    // 1 — pick the median, colour the two halves
    this.say("Split · 1 · pick the median",
      `The middle key **${med.v}** will move up. ${fmtKeys(leftKeys)} stays here and ${fmtKeys(rightKeys)} moves to a new node — ` +
      "both halves keep at least the minimum number of keys.", "warn", "median", { m: med.v });
    await Promise.all([
      ...leftKeys.map((k) => this.keyStyle(k, "left")),
      ...rightKeys.map((k) => this.keyStyle(k, "right")),
      this.keyStyle(med, "moving"),
    ]);
    await this.pulseKey(med);
    await this.hold(0.5);

    // 2 — the median rises out of the node
    const g = this.nodeGeo(node);
    const mv = this.keyViews.get(med.id);
    this.floating.add(med.id);
    mv?.group.moveToTop();
    this.say("Split · 2 · push the median up",
      parent ? `**${med.v}** leaves the node and heads for the parent ${fmtKeys(parent.keys)}, where it will separate the two halves.`
             : `This node is the root, so there is no parent — **${med.v}** will become a new root above it.`,
      "warn", parent ? "toParent" : ["isRoot", "newRoot"]);
    await this.tween(mv?.group, { y: g.y - 34, scaleX: 1.15, scaleY: 1.15 }, 0.6, this.K.Easings.BackEaseOut);
    await this.hold(0.2);

    // 3 — the box cracks into two halves (keys stay where they are)
    this.say("Split · 3 · divide the node",
      `The node breaks into ${fmtKeys(leftKeys)} and a new node ${fmtKeys(rightKeys)}` +
      (node.leaf ? "." : ", and the child pointers are shared out between them."), "warn", ["divide", "keepLeft"]);
    const right = T.newNode(node.leaf);
    const lv = this.nodeViews.get(node.id);
    const rv = this.makeNodeView(right, { x: g.x + (mid + 1) * S, y: g.y, w: 2 * pad + rightKeys.length * S, opacity: 0 });
    void this.rectStyle(rv.rect, "right", 0);
    const nudge = 8;
    await Promise.all([
      lv && this.rectStyle(lv.rect, "left", 0.45),
      lv && this.tween(lv.rect, { width: 2 * pad + leftKeys.length * S }, 0.45),
      lv && this.tween(lv.group, { x: g.x - nudge }, 0.45),
      this.tween(rv.group, { x: g.x + (mid + 1) * S + nudge, opacity: 1 }, 0.45),
      ...leftKeys.map((k) => this.nudgeKey(k, -nudge, 0.45)),
      ...rightKeys.map((k) => this.nudgeKey(k, nudge, 0.45)),
    ]);
    await this.hold(0.3);

    // 4 — commit and let everything settle into the new layout
    const { newRoot } = T.splitData(node, parent, idx, right);
    if (newRoot && mv) {
      const w0 = 2 * pad + S;
      const nv = this.makeNodeView(newRoot, { x: mv.group.x() - w0 / 2, y: mv.group.y() - H / 2, w: w0, opacity: 0 });
      void this.rectStyle(nv.rect, "success", 0);
    } else if (parent) {
      void this.nodeStyle(parent, "visit");
    }
    this.floating.delete(med.id);
    this.say("Split · 4 · re-link",
      newRoot ? `**${med.v}** becomes the new root with the two halves as its children — the tree grows one level taller, and every leaf moves down together.`
              : `**${med.v}** slots into the parent, which now points to both halves.`,
      "ok", newRoot ? ["newRoot", "grow"] : ["toParent", "climb"]);
    await this.morph(0.85);
    await Promise.all([this.nodeStyle(node, "success"), this.nodeStyle(right, "success"), this.keyStyle(med, "success")]);
    await this.hold(0.5);
    await this.resetStyles(0.3);
    return !!newRoot;
  }

  // ───────────────────────────── SEARCH ─────────────────────────────

  private async doSearch(v: number) {
    const T = this.tree;
    const title = `Search ${v}`;
    if (T.isEmpty()) {
      this.say(title, "The tree is empty — there is nothing to search.", "danger", "sig");
      this.log("search", v, `${v}: tree is empty`, "danger");
      return;
    }
    this.say(title, `Start at the root and compare **${v}** with the keys of each node. Each node narrows the search to exactly one subtree.`, "info", ["sig", "index"], { k: v });
    const probe = await this.probe(v, "compare");
    await this.hold(0.3);
    const res = await this.descend(v, probe, title);

    if (res.found) {
      const key = res.node.keys[res.idx];
      const kv = this.keyViews.get(key.id);
      if (kv) await this.tween(probe.group, { x: kv.group.x(), y: kv.group.y(), opacity: 0 }, 0.4);
      probe.group.destroy();
      await Promise.all([this.nodeStyle(res.node, "success"), this.pulseKey(key)]);
      this.say(`✓ Found ${v}`,
        `Found at depth ${res.path.length} after visiting ${plural(res.path.length + 1, "node")} — one node per level, which is why search costs O(log n).`,
        "ok", "found", { depth: res.path.length });
      this.log("search", v, `Found ${v} · depth ${res.path.length}`, "ok");
    } else {
      void this.keyViewStyle(probe, "danger");
      await this.nodeStyle(res.node, "danger");
      await this.shake(probe.group);
      this.say(`✗ ${v} not found`,
        `Reached leaf ${describeNode(res.node)} and ${v} is not in it. A leaf has no children to try, so ${v} is nowhere in the tree.`,
        "danger", ["leaf", "miss"], { i: res.idx });
      this.log("search", v, `${v} not found · ${plural(res.path.length + 1, "node")} visited`, "danger");
      await this.tween(probe.group, { opacity: 0 }, 0.4);
    }
    await this.wait(0.8);
  }

  // ───────────────────────────── DELETE ─────────────────────────────

  private async doDelete(v: number) {
    const T = this.tree;
    const title = `Delete ${v}`;
    if (T.isEmpty()) {
      this.say(title, "The tree is empty — there is nothing to delete.", "danger", "sig");
      this.log("delete", v, `${v}: tree is empty`, "danger");
      return;
    }
    this.say(title, `First find **${v}**: walk down from the root like a search, remembering the path — the repair work later climbs back up it.`, "info", ["sig", "find"], { k: v, min: T.minKeys });
    const probe = await this.probe(v, "danger");
    await this.hold(0.3);
    const res = await this.descend(v, probe, title);

    if (!res.found) {
      void this.keyViewStyle(probe, "danger");
      await this.nodeStyle(res.node, "danger");
      await this.shake(probe.group);
      this.say(`✗ ${v} not found`, `Reached leaf ${describeNode(res.node)} without meeting ${v}, so there is nothing to delete.`, "danger", "missing");
      this.log("delete", v, `${v} not found`, "danger");
      await this.tween(probe.group, { opacity: 0 }, 0.4);
      await this.wait(0.5);
      return;
    }

    const { node, idx } = res;
    const target = node.keys[idx];
    const tv = this.keyViews.get(target.id);
    if (tv) await this.tween(probe.group, { x: tv.group.x(), y: tv.group.y(), opacity: 0 }, 0.35);
    probe.group.destroy();
    await this.keyStyle(target, "danger");
    const path = res.path.slice();
    let how = "from a leaf";

    if (node.leaf) {
      this.say(`${v} is in a leaf`, "A key in a leaf has no subtrees hanging off it, so it can be removed directly — take it out and close the gap.", "danger", ["isLeaf", "leafDel"], { case: "leaf" });
      await this.pulseKey(target);
      if (tv) {
        await this.tween(tv.group, { scaleX: 0.01, scaleY: 0.01, opacity: 0 }, 0.4);
        tv.group.destroy();
      }
      this.keyViews.delete(target.id);
      T.removeAt(node, idx);
      await this.morph(0.55);
      await this.hold(0.3);
    } else {
      how = await this.replaceInternal(node, idx, path);
    }

    const fixes = await this.rebalance(path);
    let shrank = false;
    if (T.needsCollapse()) {
      await this.collapseRoot();
      shrank = true;
    }

    this.say(`✓ Deleted ${v}`,
      fixes.length
        ? `Repairs: ${fixes.join(" → ")}${shrank ? " → root collapsed (the tree got one level shorter)" : ""}. Every node is back within its key limits.`
        : `No node dropped below the minimum of ${plural(T.minKeys, "key")}, so no rebalancing was needed.`,
      "ok", shrank ? ["shrink", "newRoot"] : fixes.length ? "under" : node.leaf ? "leafDel" : "replace");
    this.log("delete", v, `Deleted ${v} · ${how}${fixes.length ? ` · ${fixes.join(", ")}` : ""}${shrank ? " · shrank" : ""}`, "ok");
    await this.wait(0.5);
  }

  private async replaceInternal(node: BNode, idx: number, path: PathStep[]): Promise<string> {
    const T = this.tree;
    const target = node.keys[idx];
    const { side, reason } = T.chooseReplacement(node, idx, this.strategy);
    const pred = side === "predecessor";
    const lineTag = pred ? "pred" : "succ";
    const why = reason === "spare" ? " Its leaf has a spare key, so taking it causes no underflow."
      : reason === "neither" ? " Both candidate leaves are at the minimum, so either choice needs a repair — use the predecessor." : "";
    this.say(`${target.v} is in an internal node`,
      `It separates two subtrees, so it can't just vanish. Replace it with its in-order **${side}**: the ${pred ? "largest key in its left" : "smallest key in its right"} subtree.${why}`,
      "warn", ["internal", lineTag], { case: side });
    await this.hold(0.6);

    const { steps, leaf, key: r } = T.replacementPath(node, idx, side);
    path.push(...steps);
    await this.edgeStyle(node.children[steps[0].idx], true);
    for (const st of steps.slice(1)) {
      this.say(`Go ${pred ? "right" : "left"}-most`,
        `${fmtKeys(st.node.keys)} is not a leaf, so keep following the ${pred ? "last" : "first"} child pointer — the ${side} always lives in a leaf.`,
        "info", lineTag);
      await this.nodeStyle(st.node, "visit", 0.2);
      const lbl = this.nodeLabel(st.node, pred ? "go right-most" : "go left-most", "info");
      await this.edgeStyle(st.node.children[st.idx], true);
      await this.hold(0.45);
      this.dropLabel(lbl);
    }

    this.say(`Step 1 · find the ${side}`,
      pred ? `**${r.v}** is the largest key smaller than ${target.v} — the right-most key of the left subtree.`
           : `**${r.v}** is the smallest key larger than ${target.v} — the left-most key of the right subtree.`,
      "warn", lineTag, { r: r.v });
    await this.nodeStyle(leaf, "visit", 0.2);
    await this.keyStyle(r, "moving");
    await this.pulseKey(r);
    const lbl = this.nodeLabel(leaf, `${side} ${r.v}`, "warn");
    await this.hold(0.6);
    this.dropLabel(lbl);

    this.say("Step 2 · remove the key", `**${target.v}** is removed, leaving an empty slot in its node.`, "danger", "replace");
    T.vacate(node, idx);
    await this.morph(0.45);
    await this.hold(0.3);

    this.say(`Step 3 · the ${side} moves up`,
      `**${r.v}** leaves its leaf and fills the empty slot — every key on its left is still smaller and every key on its right still larger, so the order is preserved.`,
      "warn", ["replace", "toLeaf"]);
    T.promote(node, idx, leaf, side);
    this.keyViews.get(r.id)?.group.moveToTop();
    await this.morph(0.85);
    await this.keyStyle(r, "success");
    await this.hold(0.4);
    await this.resetStyles(0.3);
    return `${side} ${r.v} took its place`;
  }

  private async rebalance(path: readonly PathStep[]): Promise<string[]> {
    const T = this.tree;
    const fixes: string[] = [];
    for (let d = path.length - 1; d >= 0; d--) {
      const { node: parent, idx } = path[d];
      if (parent.children[idx].keys.length >= T.minKeys) break;
      fixes.push(await this.fixUnderflow(parent, idx));
    }
    return fixes;
  }

  private async fixUnderflow(parent: BNode, i: number): Promise<string> {
    const T = this.tree;
    const child = parent.children[i];
    this.say(`Underflow in ${describeNode(child)}`,
      `Every node except the root needs at least ${plural(T.minKeys, "key")}; this one has ${child.keys.length}. ` +
      "First try to borrow from a sibling; if neither can spare a key, merge.",
      "danger", ["under", "parent"], { x: describeNode(child), n: child.keys.length, min: T.minKeys });
    await this.nodeStyle(child, "danger");
    const lbl = this.nodeLabel(child, `${child.keys.length} < min ${T.minKeys}`, "danger");
    await this.flashNode(child);
    await this.hold(0.5);
    this.dropLabel(lbl);

    switch (T.chooseFix(parent, i)) {
      case "borrow-left":
        await this.borrowFromLeft(parent, i);
        return "borrow-left";
      case "borrow-right":
        await this.borrowFromRight(parent, i);
        return "borrow-right";
      case "merge-left":
        await this.merge(parent, i - 1, "right");
        return "merge";
      case "merge-right":
        await this.merge(parent, i, "left");
        return "merge";
    }
  }

  private async borrowFromLeft(parent: BNode, i: number) {
    const T = this.tree;
    const child = parent.children[i], sib = parent.children[i - 1];
    const sep = parent.keys[i - 1], donor = sib.keys[sib.keys.length - 1];

    this.say("Borrow from the left sibling",
      `${fmtKeys(sib.keys)} has ${sib.keys.length} keys — more than the minimum — so it can lend one. ` +
      `Keys **rotate through the parent** to keep everything in order: ${sep.v} comes down, ${donor.v} goes up.`,
      "warn", ["canL", "borrowL"], { L: fmtKeys(sib.keys), sep: sep.v });
    await Promise.all([this.nodeStyle(sib, "donor"), this.keyStyle(sep, "moving"), this.keyStyle(donor, "moving")]);
    const lbl = this.nodeLabel(sib, "can lend", "warn");
    await this.hold(0.8);
    this.dropLabel(lbl);

    this.say("Borrow · 1 · separator moves down",
      `**${sep.v}** drops from the parent into the front of the underflowing node` +
      (child.leaf ? "." : `, and ${donor.v}'s right-hand subtree moves across with it.`), "warn", "borrowL");
    T.borrowLeftDown(parent, i);
    this.keyViews.get(sep.id)?.group.moveToTop();
    await this.morph(0.75);
    await this.hold(0.2);

    this.say("Borrow · 2 · sibling key moves up",
      `**${donor.v}** is the largest key of the left sibling, so it fills the gap in the parent — larger than everything left of it, smaller than ${sep.v}.`,
      "warn", ["borrowL", "doneL"]);
    T.borrowLeftUp(parent, i);
    this.keyViews.get(donor.id)?.group.moveToTop();
    await this.morph(0.75);

    await Promise.all([this.nodeStyle(child, "success"), this.nodeStyle(sib, "success")]);
    await this.hold(0.4);
    await this.resetStyles(0.3);
  }

  private async borrowFromRight(parent: BNode, i: number) {
    const T = this.tree;
    const child = parent.children[i], sib = parent.children[i + 1];
    const sep = parent.keys[i], donor = sib.keys[0];

    this.say("Borrow from the right sibling",
      `${fmtKeys(sib.keys)} has ${sib.keys.length} keys — more than the minimum — so it can lend one. ` +
      `Keys **rotate through the parent**: ${sep.v} comes down, ${donor.v} goes up.`,
      "warn", ["canR", "borrowR"], { R: fmtKeys(sib.keys), sep: sep.v });
    await Promise.all([this.nodeStyle(sib, "donor"), this.keyStyle(sep, "moving"), this.keyStyle(donor, "moving")]);
    const lbl = this.nodeLabel(sib, "can lend", "warn");
    await this.hold(0.8);
    this.dropLabel(lbl);

    this.say("Borrow · 1 · separator moves down",
      `**${sep.v}** drops from the parent onto the end of the underflowing node.`, "warn", "borrowR");
    T.borrowRightDown(parent, i);
    this.keyViews.get(sep.id)?.group.moveToTop();
    await this.morph(0.75);
    await this.hold(0.2);

    this.say("Borrow · 2 · sibling key moves up",
      `**${donor.v}** is the smallest key of the right sibling, so it fills the gap in the parent` +
      (child.leaf ? "." : "; its left-hand subtree moves across to the underflowing node."), "warn", ["borrowR", "doneR"]);
    T.borrowRightUp(parent, i);
    this.keyViews.get(donor.id)?.group.moveToTop();
    await this.morph(0.75);

    await Promise.all([this.nodeStyle(child, "success"), this.nodeStyle(sib, "success")]);
    await this.hold(0.4);
    await this.resetStyles(0.3);
  }

  /** Merge children i and i+1 of `parent`; `under` says which of the two underflowed. */
  private async merge(parent: BNode, i: number, under: "left" | "right") {
    const T = this.tree;
    const { slot: S, pad, nodeH: H } = GEO;
    const L = parent.children[i], R = parent.children[i + 1], sep = parent.keys[i];
    const lender = under === "left" ? R : L;
    const nL = L.keys.length, total = nL + 1 + R.keys.length;

    this.say("Merge needed",
      `The sibling ${fmtKeys(lender.keys)} has only ${plural(lender.keys.length, "key")} (the minimum), so it cannot lend. ` +
      `Instead the two nodes and their separator **${sep.v}** merge into one node of ${total} keys (max ${T.maxKeys}).`,
      "merge", ["canL", "canR", "merge"], { sep: sep.v });
    await Promise.all([this.nodeStyle(lender, "donor"), this.keyStyle(sep, "moving")]);
    const lbl = this.nodeLabel(lender, "at minimum — can't lend", "warn");
    await this.hold(0.9);
    this.dropLabel(lbl);

    const lv = this.nodeViews.get(L.id), rv = this.nodeViews.get(R.id), sv = this.keyViews.get(sep.id);
    if (!lv || !rv || !sv) {
      T.mergeData(parent, i);
      await this.morph(0.8);
      return;
    }
    const x0 = lv.group.x(), y0 = lv.group.y(), cy = y0 + H / 2;

    // 1 — separator comes down between the two nodes
    this.say("Merge · 1 · pull the separator down",
      `**${sep.v}** sat between these two nodes in the parent. It comes down to join them.`, "merge", "merge");
    this.floating.add(sep.id);
    sv.group.moveToTop();
    await this.tween(sv.group, { x: x0 + pad + (nL + 0.5) * S, y: cy, scaleX: 1.12, scaleY: 1.12 }, 0.75);
    await this.hold(0.2);

    // 2 — right node slides over so all keys line up in order
    this.say("Merge · 2 · slide the nodes together",
      `The right node slides left so the keys line up in order: ${fmtKeys([...L.keys, sep, ...R.keys])}.`, "merge", "merge");
    this.edgeAnim.start();
    await Promise.all([
      this.tween(rv.group, { x: x0 + (nL + 1) * S, y: y0 }, 0.6),
      ...R.keys.map((k, j) => this.tween(this.keyViews.get(k.id)?.group, { x: x0 + pad + (nL + 1 + j + 0.5) * S, y: cy }, 0.6)),
    ]);
    this.edgeAnim.stop();
    await this.hold(0.2);

    // 3 — fuse the two boxes into one
    this.say("Merge · 3 · fuse", `The two nodes become one. The parent loses **${sep.v}** and one child pointer.`, "merge", ["merge", "up"]);
    T.mergeData(parent, i);
    this.floating.delete(sep.id);
    this.nodeViews.delete(R.id);
    await Promise.all([
      this.rectStyle(lv.rect, "merge", 0.4),
      this.tween(lv.rect, { width: 2 * pad + L.keys.length * S }, 0.4),
      this.tween(rv.group, { opacity: 0 }, 0.4).then(() => rv.group.destroy()),
      ...L.keys.map((k) => this.keyStyle(k, "merge", 0.4)),
    ]);
    await this.hold(0.3);

    // 4 — everything settles into the new layout
    const parentShort = parent !== T.root && parent.keys.length < T.minKeys;
    const rootEmpty = parent === T.root && parent.keys.length === 0;
    this.say("Merge · 4 · settle",
      `Merged node: ${fmtKeys(L.keys)}. The parent is now ${describeNode(parent)}` +
      (parentShort ? " — below the minimum, so the repair continues one level up." : rootEmpty ? " — the root has no keys left." : "."),
      "merge", "up", { x: fmtKeys(L.keys) });
    await this.morph(0.8);
    await this.nodeStyle(L, "success");
    await this.hold(0.4);
    await this.resetStyles(0.3);
  }

  private async collapseRoot() {
    const T = this.tree;
    const old = T.root;
    this.say("Shrink the tree",
      "The root has no keys left, so its only child becomes the new root. This is the **only** way a B-tree gets shorter — " +
      "every root-to-leaf path loses one level at once, so all leaves stay level.", "merge", ["shrink", "newRoot"]);
    await this.nodeStyle(old, "danger");
    const lbl = this.nodeLabel(old, "empty root", "danger");
    await this.hold(0.6);
    this.dropLabel(lbl);
    T.collapseRoot();
    await this.morph(0.8);
  }
}
