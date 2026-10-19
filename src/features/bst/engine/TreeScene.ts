/*
 * TreeScene — the Konva stage behind the tree engines (BSTEngine → AVLEngine build on it).
 *
 *   • node / edge views keyed by node id, and the identity-preserving morph: after any data change
 *     every node glides from where it is to where the layout says, new nodes grow in, removed ones
 *     shrink out, edges cross-fade and follow their nodes every frame, the world re-fits the canvas
 *   • tweens on the Director's clock (pause / step / skip aware), colour + glow styles, callouts,
 *     path arrows, probes, the traversal output strip
 *   • pan (drag, or two fingers), zoom (wheel / pinch / buttons), double-click reset, resize
 *   • the callbacks that report status / pseudocode line / variables / stats to the UI
 *
 * No tree algorithm lives here — see BSTEngine. The scene never touches the DOM outside its container.
 */
import type KonvaNS from "konva";
import type { Stage } from "konva/lib/Stage";
import type { Layer } from "konva/lib/Layer";
import type { Group } from "konva/lib/Group";
import type { Node as KNode } from "konva/lib/Node";
import type { Circle } from "konva/lib/shapes/Circle";
import type { Text } from "konva/lib/shapes/Text";
import type { Rect } from "konva/lib/shapes/Rect";
import type { Line } from "konva/lib/shapes/Line";
import type { Label } from "konva/lib/shapes/Label";
import type { Arrow } from "konva/lib/shapes/Arrow";
import { MONO_FONT } from "@/lib/theme";
import { layoutTree, type TreeLayout } from "../model/layout";
import { collect, computeStats, fmtBf, nodeFactory } from "../model/tree";
import type { TreeNode } from "../model/types";
import type { CodeId } from "../pseudocode";
import { backOut, easeInOut, mixColor, parseColor, toward, type Easing, type Point } from "./anim";
import { Director } from "./director";
import { BADGE, LABEL, LINE, MUTED_TEXT, NODE, SHADOW, STROKE, type LabelTone, type LineStyle, type NodeStyle } from "./theme";
import type { CodeFocus, EngineCallbacks, EngineOptions, StatusInfo, Vars } from "./types";

export type KonvaLib = typeof KonvaNS;

interface MetaView {
  root: Group;
  badge: Group;
  bfBg: Rect;
  bfText: Text;
  hText: Text;
}

export interface NodeView {
  group: Group;
  circle: Circle;
  text: Text;
  meta: MetaView | null;
}

interface EdgeView {
  line: Line;
  pv: NodeView;
  cv: NodeView;
}

interface Move {
  g: Group;
  x0: number; y0: number; s0: number; o0: number;
  x1: number; y1: number; s1: number; o1: number;
  cx?: number; cy?: number;
  kill?: boolean;
}

type TweenAttrs = Record<string, number | string>;

const EDGE_OPACITY = 0.9;
const NUM_DEFAULTS: Record<string, number> = { opacity: 1, scaleX: 1, scaleY: 1 };
const fontFor = (s: string) => (s.length <= 2 ? 15 : s.length === 3 ? 13 : s.length === 4 ? 11 : 10);

export abstract class TreeScene {
  protected readonly K: KonvaLib;
  protected readonly cb: EngineCallbacks;
  protected readonly director: Director;
  protected readonly G = { col: 54, level: 88, r: 21, lift: 58 };
  protected readonly make = nodeFactory();
  protected readonly font: string;
  protected root: TreeNode | null = null;
  protected rotations = 0;
  protected showMeta: boolean;

  private readonly container: HTMLDivElement;
  private readonly stage: Stage;
  private readonly scene: Layer;
  private readonly ui: Layer;
  private readonly camera: Group;
  private readonly world: Group;
  private readonly edgeGroup: Group;
  private readonly nodeGroup: Group;
  private readonly fxGroup: Group;
  private readonly outGroup: Group;
  protected readonly nodeViews = new Map<string, NodeView>();
  private readonly edgeViews = new Map<string, EdgeView>();
  private readonly dyingEdges = new Set<EdgeView>();
  protected readonly floating = new Set<string>();
  private readonly owners = new WeakMap<object, Map<string, number>>();
  private tweenSeq = 0;
  private focus: CodeFocus = { main: null, sub: null };
  private readonly ro: ResizeObserver;
  protected destroyed = false;
  private current: Promise<boolean> | null = null;
  private readonly unlisten: (() => void)[] = [];

  constructor(K: KonvaLib, container: HTMLDivElement, cb: EngineCallbacks, opts: EngineOptions = {}) {
    this.K = K;
    this.container = container;
    this.cb = cb;
    this.font = opts.font || MONO_FONT;
    this.showMeta = opts.showMeta ?? true;

    this.director = new Director(() => this.redraw(), (r) => this.cb.run(r));
    this.director.rate = opts.speed ?? 1;
    this.director.setStepMode(opts.stepMode ?? false);

    this.stage = new K.Stage({ container, width: container.offsetWidth || 300, height: container.offsetHeight || 300 });
    this.scene = new K.Layer();
    this.ui = new K.Layer({ listening: false });
    this.stage.add(this.scene, this.ui);
    this.camera = new K.Group();
    this.world = new K.Group();
    this.edgeGroup = new K.Group({ listening: false });
    this.nodeGroup = new K.Group();
    this.fxGroup = new K.Group({ listening: false });
    this.world.add(this.edgeGroup, this.nodeGroup, this.fxGroup);
    this.camera.add(this.world);
    this.scene.add(this.camera);
    this.outGroup = new K.Group();
    this.ui.add(this.outGroup);

    this.bindViewControls();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);

    this.emitStats();
    this.fitNow();
  }

  // ───────────────────────────── view & playback controls ─────────────────────────────

  get busy(): boolean { return this.director.isBusy; }

  setSpeed(rate: number) { this.director.rate = rate; }
  setStepMode(on: boolean) { this.director.setStepMode(on); }
  pause() { this.director.pause(); }
  resume() { this.director.resume(); }
  togglePause() { this.director.toggle(); }
  step() { this.director.step(); }
  skip() { this.director.skip(); }

  setShowMeta(on: boolean) {
    this.showMeta = on;
    this.nodeViews.forEach((v, id) => { if (!this.floating.has(id)) v.meta?.root.visible(on); });
    this.redraw();
  }

  /** Zoom the user camera around the canvas centre (or a given point). */
  zoomBy(f: number, at?: Point) {
    const c = this.camera;
    const p = at ?? { x: this.stage.width() / 2, y: this.stage.height() / 2 };
    const s0 = c.scaleX();
    const s1 = Math.max(0.3, Math.min(3, s0 * f));
    c.setAttrs({ scaleX: s1, scaleY: s1, x: p.x - (p.x - c.x()) * (s1 / s0), y: p.y - (p.y - c.y()) * (s1 / s0) });
    this.redraw();
  }

  resetView() {
    this.camera.setAttrs({ x: 0, y: 0, scaleX: 1, scaleY: 1 });
    this.redraw();
  }

  redraw() {
    if (this.destroyed) return;
    this.scene.batchDraw();
    this.ui.batchDraw();
  }

  destroy() {
    if (this.destroyed) return;
    this.director.destroy();
    this.destroyed = true;
    this.ro.disconnect();
    this.unlisten.forEach((f) => f());
    this.stage.destroy();
  }

  // ───────────────────────────── callbacks ─────────────────────────────

  protected status(title: string, detail = "", tone: StatusInfo["tone"] = "info") {
    if (!this.destroyed) this.cb.status({ title, detail, tone });
  }

  protected code(id: CodeId, line?: number | readonly number[]) {
    this.focus = { ...this.focus, main: { id, line } };
    if (!this.destroyed) this.cb.code(this.focus);
  }

  protected subCode(id: CodeId | null, line?: number | readonly number[]) {
    this.focus = { ...this.focus, sub: id ? { id, line } : null };
    if (!this.destroyed) this.cb.code(this.focus);
  }

  /** The helper listing currently shown (so a nested helper can restore it). */
  protected focusSub(): CodeFocus["sub"] { return this.focus.sub; }

  protected vars(v: Vars | undefined) {
    if (!this.destroyed) this.cb.vars(v);
  }

  protected emitStats() {
    if (!this.destroyed) this.cb.stats(computeStats(this.root, this.rotations));
  }

  // ───────────────────────────── timing ─────────────────────────────

  /** Phase boundary: waits `sec`, or for "Next step" in step mode. */
  protected beat(sec: number) { return this.director.beat(sec); }

  /** Plain timed wait (never a step boundary). */
  protected wait(sec: number) { return this.director.wait(sec); }

  /**
   * Tween numeric and colour attributes of a Konva node on the director's clock. A newer tween of
   * the same attribute takes ownership, so overlapping style changes never fight.
   */
  protected tween(node: KNode | null | undefined, attrs: TweenAttrs, sec: number, easing: Easing = easeInOut): Promise<void> {
    if (!node) return Promise.resolve();
    const id = ++this.tweenSeq;
    let own = this.owners.get(node);
    if (!own) this.owners.set(node, (own = new Map()));
    const owner = own;
    const plans: ((e: number) => void)[] = [];
    for (const [key, target] of Object.entries(attrs)) {
      owner.set(key, id);
      const cur: unknown = node.getAttr(key);
      if (typeof target === "number") {
        const from = typeof cur === "number" ? cur : NUM_DEFAULTS[key] ?? 0;
        plans.push((e) => { if (owner.get(key) === id) node.setAttr(key, from + (target - from) * e); });
      } else {
        const a = parseColor(typeof cur === "string" ? cur : target);
        const b = parseColor(target);
        plans.push((e) => { if (owner.get(key) === id) node.setAttr(key, e >= 1 ? target : mixColor(a, b, e)); });
      }
    }
    return this.director.animate(sec, (k) => {
      const e = k >= 1 ? 1 : easing(k);
      for (const p of plans) p(e);
    });
  }

  // ───────────────────────────── stage & view controls ─────────────────────────────

  private bindViewControls() {
    const el = this.container;
    el.style.cursor = "grab";
    // On a phone the canvas fills most of the screen, so one finger scrolls the page (as on the graph
    // and B-tree canvases); two fingers pan and pinch-zoom the tree. The mouse and pen drag to pan.
    el.style.touchAction = "pan-x pan-y";
    const local = (e: { clientX: number; clientY: number }) => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    let drag: { id: number; at: Point } | null = null;
    const down = (e: PointerEvent) => {
      if (e.pointerType === "touch" || (e.button !== 0 && e.pointerType === "mouse")) return;
      drag = { id: e.pointerId, at: local(e) };
      el.setPointerCapture?.(e.pointerId);
      el.style.cursor = "grabbing";
    };
    const move = (e: PointerEvent) => {
      if (drag?.id !== e.pointerId) return;
      const p = local(e);
      this.camera.position({ x: this.camera.x() + p.x - drag.at.x, y: this.camera.y() + p.y - drag.at.y });
      drag.at = p;
      this.redraw();
    };
    const up = (e: PointerEvent) => {
      if (drag?.id !== e.pointerId) return;
      drag = null;
      el.style.cursor = "grab";
    };
    // Two fingers: the tree follows their midpoint and zooms with their spread.
    let pinch: { x: number; y: number; d: number } | null = null;
    const fingers = (t: TouchList) => {
      const r = el.getBoundingClientRect();
      const [a, b] = [t[0], t[1]];
      return {
        x: (a.clientX + b.clientX) / 2 - r.left,
        y: (a.clientY + b.clientY) / 2 - r.top,
        d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1,
      };
    };
    const touchStart = (e: TouchEvent) => {
      if (e.touches.length < 2) return;
      if (e.cancelable) e.preventDefault();
      pinch = fingers(e.touches);
    };
    const touchMove = (e: TouchEvent) => {
      if (!pinch || e.touches.length < 2) return;
      // The second finger landed after the page had started scrolling: the gesture stays a scroll.
      if (!e.cancelable) {
        pinch = null;
        return;
      }
      e.preventDefault();
      const m = fingers(e.touches);
      this.camera.position({ x: this.camera.x() + m.x - pinch.x, y: this.camera.y() + m.y - pinch.y });
      this.zoomBy(m.d / pinch.d, m);
      pinch = m;
    };
    const touchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinch = null;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const f = Math.exp(-Math.max(-60, Math.min(60, e.deltaY)) * 0.004);
      this.zoomBy(f, local(e));
    };
    const dbl = () => this.resetView();
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("touchstart", touchStart, { passive: false });
    el.addEventListener("touchmove", touchMove, { passive: false });
    el.addEventListener("touchend", touchEnd);
    el.addEventListener("touchcancel", touchEnd);
    el.addEventListener("dblclick", dbl);
    this.unlisten.push(() => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("touchstart", touchStart);
      el.removeEventListener("touchmove", touchMove);
      el.removeEventListener("touchend", touchEnd);
      el.removeEventListener("touchcancel", touchEnd);
      el.removeEventListener("dblclick", dbl);
    });
  }

  private resize() {
    if (this.destroyed) return;
    const w = this.container.offsetWidth;
    const h = this.container.offsetHeight;
    if (!w || !h) return;
    this.stage.size({ width: w, height: h });
    if (!this.busy) this.fitNow();
    this.redraw();
  }

  protected reset() {
    this.root = null;
    this.floating.clear();
    [this.edgeGroup, this.nodeGroup, this.fxGroup, this.outGroup].forEach((g) => g.destroyChildren());
    this.nodeViews.clear();
    this.edgeViews.clear();
    this.dyingEdges.clear();
    this.fitNow();
    this.redraw();
  }

  // ───────────────────────────── layout ─────────────────────────────

  protected layout(): TreeLayout {
    return layoutTree(this.root, this.G);
  }

  private fitFor(L: TreeLayout) {
    const sw = this.stage.width();
    const sh = this.stage.height();
    // Room above the root for the HUD, the traversal output strip and the probe hovering over the root.
    const top = sh < 480 ? 112 : 132;
    const bottom = 48;
    const avail = sh - top - bottom;
    // Small trees may grow a little for readability; big ones shrink to fit (pan/zoom covers the rest).
    const s = Math.max(0.3, Math.min(1.25, (sw - 48) / Math.max(L.width, 1), avail / Math.max(L.height, 1)));
    // Spend part of the leftover vertical space so a small tree sits nearer the middle.
    const slack = Math.max(0, avail - L.height * s);
    return { x: sw / 2, y: top + slack * 0.35, s };
  }

  private fitNow() {
    const f = this.fitFor(this.layout());
    this.world.setAttrs({ x: f.x, y: f.y, scaleX: f.s, scaleY: f.s });
    this.refreshEdges();
  }

  protected view(n: TreeNode | null | undefined): NodeView | undefined {
    return n ? this.nodeViews.get(n.id) : undefined;
  }

  protected pos(n: TreeNode): Point {
    const v = this.nodeViews.get(n.id);
    if (v) return { x: v.group.x(), y: v.group.y() };
    const g = this.layout().nodes.get(n.id);
    return g ? { x: g.x, y: g.y } : { x: 0, y: 0 };
  }

  protected rootPos(): Point {
    return this.root ? this.pos(this.root) : { x: 0, y: 0 };
  }

  // ───────────────────────────── shapes ─────────────────────────────

  protected shape(value: number, withMeta: boolean): NodeView {
    const K = this.K;
    const R = this.G.r;
    const [fill, stroke, tc] = NODE.base;
    const group = new K.Group();
    const circle = new K.Circle({
      radius: R, fill, stroke, strokeWidth: STROKE.base,
      shadowColor: SHADOW.color, shadowBlur: SHADOW.blur, shadowOpacity: SHADOW.opacity, shadowOffsetX: 0, shadowOffsetY: SHADOW.offsetY,
    });
    const str = String(value);
    const text = new K.Text({
      x: -R - 6, y: -R, width: 2 * R + 12, height: 2 * R, text: str,
      align: "center", verticalAlign: "middle", fontSize: fontFor(str), fontStyle: "bold",
      fontFamily: this.font, fill: tc, listening: false,
    });
    group.add(circle, text);
    let meta: MetaView | null = null;
    if (withMeta) {
      const root = new K.Group({ visible: this.showMeta, listening: false });
      const badge = new K.Group({ x: R * 0.92, y: -R * 0.95 });
      const bfBg = new K.Rect({ height: 17, cornerRadius: 8.5, strokeWidth: 1.5 });
      const bfText = new K.Text({ height: 17, fontSize: 11, fontStyle: "bold", fontFamily: this.font, align: "center", verticalAlign: "middle" });
      badge.add(bfBg, bfText);
      const hText = new K.Text({ x: -R - 4, y: R + 4, width: 2 * R + 8, align: "center", fontSize: 10, fontFamily: this.font, fill: MUTED_TEXT });
      root.add(badge, hText);
      group.add(root);
      meta = { root, badge, bfBg, bfText, hText };
    }
    return { group, circle, text, meta };
  }

  protected makeNodeView(n: TreeNode, x: number, y: number): NodeView {
    const v = this.shape(n.key, true);
    v.group.position({ x, y });
    this.nodeGroup.add(v.group);
    this.nodeViews.set(n.id, v);
    this.paintMeta(n, v);
    return v;
  }

  /** Draws the balance-factor badge and height label; returns true if anything changed. */
  protected paintMeta(n: TreeNode, v = this.nodeViews.get(n.id)): boolean {
    const m = v?.meta;
    if (!m) return false;
    const txt = fmtBf(n.bf);
    const ht = `h=${n.h}`;
    const changed = m.bfText.text() !== txt || m.hText.text() !== ht;
    const w = Math.max(24, Math.ceil(m.bfText.measureSize(txt).width) + 12);
    const [bg, st, fg] = Math.abs(n.bf) > 1 ? BADGE.bad : n.bf !== 0 ? BADGE.lean : BADGE.ok;
    m.bfBg.setAttrs({ x: -w / 2, y: -8.5, width: w, fill: bg, stroke: st });
    m.bfText.setAttrs({ x: -w / 2, y: -8.5, width: w, text: txt, fill: fg });
    m.hText.text(ht);
    return changed;
  }

  protected async updateMeta(n: TreeNode): Promise<void> {
    const v = this.nodeViews.get(n.id);
    if (!this.paintMeta(n, v) || !this.showMeta || !v?.meta) return;
    await this.tween(v.meta.badge, { scaleX: 1.5, scaleY: 1.5 }, 0.15);
    await this.tween(v.meta.badge, { scaleX: 1, scaleY: 1 }, 0.15);
  }

  /** Repaint several nodes' badges at once (changed ones pulse). */
  protected refreshMeta(nodes: readonly TreeNode[]): Promise<unknown> {
    return Promise.all(nodes.map((n) => this.updateMeta(n)));
  }

  private edgeKey(p: TreeNode, c: TreeNode) { return `${p.id}>${c.id}`; }

  private wantEdges() {
    const out = new Map<string, { p: TreeNode; c: TreeNode }>();
    const walk = (n: TreeNode | null) => {
      if (!n) return;
      for (const c of [n.left, n.right]) {
        if (c) {
          out.set(this.edgeKey(n, c), { p: n, c });
          walk(c);
        }
      }
    };
    walk(this.root);
    return out;
  }

  private edgePts(pv: NodeView, cv: NodeView): number[] {
    const R = this.G.r;
    const px = pv.group.x(), py = pv.group.y(), cx = cv.group.x(), cy = cv.group.y();
    const dx = cx - px, dy = cy - py, d = Math.hypot(dx, dy);
    if (d < 2 * R) return [px, py, px, py];
    const ux = dx / d, uy = dy / d;
    return [px + ux * R, py + uy * R, cx - ux * R, cy - uy * R];
  }

  private makeEdge(pv: NodeView, cv: NodeView): EdgeView {
    const line = new this.K.Line({
      points: this.edgePts(pv, cv), stroke: LINE.base.stroke, strokeWidth: LINE.base.width,
      lineCap: "round", opacity: 0, listening: false,
    });
    this.edgeGroup.add(line);
    return { line, pv, cv };
  }

  private refreshEdges() {
    this.edgeViews.forEach((ev) => ev.line.points(this.edgePts(ev.pv, ev.cv)));
    this.dyingEdges.forEach((ev) => ev.line.points(this.edgePts(ev.pv, ev.cv)));
  }

  /** On-canvas callout with a pointer, in world coordinates. */
  protected label(text: string, x: number, y: number, tone: LabelTone = "info", dir: "down" | "left" | "up" | "right" = "down"): Label {
    const K = this.K;
    const [bg, fg] = LABEL[tone];
    const lbl = new K.Label({ x, y, opacity: 0, listening: false });
    lbl.add(new K.Tag({
      fill: bg, pointerDirection: dir, pointerWidth: 10, pointerHeight: 7, cornerRadius: 6,
      shadowColor: SHADOW.color, shadowBlur: SHADOW.blur, shadowOpacity: SHADOW.opacity, shadowOffsetY: SHADOW.offsetY,
    }));
    lbl.add(new K.Text({ text, padding: 6, fontSize: 13, fontStyle: "bold", fontFamily: this.font, fill: fg }));
    this.fxGroup.add(lbl);
    void this.tween(lbl, { opacity: 1 }, 0.2);
    return lbl;
  }

  protected nodeLabel(n: TreeNode, text: string, tone: LabelTone): Label {
    const p = this.pos(n);
    return this.label(text, p.x, p.y - this.G.r - (this.showMeta ? 20 : 4), tone, "down");
  }

  protected dropLabel(lbl: KNode | null | undefined) {
    if (lbl) void this.tween(lbl, { opacity: 0 }, 0.2).then(() => lbl.destroy());
  }

  /** Dashed curved arrow showing where a node is about to travel. */
  protected pathArrow(a: Point, b: Point, bow: Point, color: string): Arrow {
    const R = this.G.r;
    const c = { x: (a.x + b.x) / 2 + bow.x, y: (a.y + b.y) / 2 + bow.y };
    const p0 = toward(a, c, R + 3), p3 = toward(b, c, R + 5);
    const c1 = { x: p0.x + ((c.x - p0.x) * 2) / 3, y: p0.y + ((c.y - p0.y) * 2) / 3 };
    const c2 = { x: p3.x + ((c.x - p3.x) * 2) / 3, y: p3.y + ((c.y - p3.y) * 2) / 3 };
    const arrow = new this.K.Arrow({
      points: [p0.x, p0.y, c1.x, c1.y, c2.x, c2.y, p3.x, p3.y], bezier: true,
      stroke: color, fill: color, strokeWidth: 2.5, dash: [7, 6], pointerLength: 10, pointerWidth: 10,
      opacity: 0, listening: false,
    });
    this.fxGroup.add(arrow);
    void this.tween(arrow, { opacity: 0.95 }, 0.25);
    return arrow;
  }

  // ───────────────────────────── style primitives ─────────────────────────────

  protected styleView(v: NodeView | undefined, style: NodeStyle, s = 0.25): Promise<unknown> {
    if (!v) return Promise.resolve();
    const [fill, stroke, text] = NODE[style];
    // No glow on paper: a highlighted node is drawn with a heavier outline.
    const attrs: TweenAttrs = { fill, stroke, strokeWidth: style === "base" ? STROKE.base : STROKE.emphasis };
    if (s === 0 || this.director.instant) {
      v.circle.setAttrs(attrs);
      v.text.fill(text);
      return Promise.resolve();
    }
    return Promise.all([this.tween(v.circle, attrs, s), this.tween(v.text, { fill: text }, s)]);
  }

  protected nodeStyle(n: TreeNode | null | undefined, style: NodeStyle, s = 0.25): Promise<unknown> {
    return n ? this.styleView(this.nodeViews.get(n.id), style, s) : Promise.resolve();
  }

  protected subtreeStyle(n: TreeNode | null, style: NodeStyle, s = 0.25): Promise<unknown> {
    return Promise.all(collect(n).map((m) => this.nodeStyle(m, style, s)));
  }

  protected edgeStyle(p: TreeNode | null | undefined, c: TreeNode | null | undefined, style: LineStyle = "active", s = 0.2): Promise<unknown> {
    const ev = p && c ? this.edgeViews.get(this.edgeKey(p, c)) : undefined;
    if (!ev) return Promise.resolve();
    const S = LINE[style];
    ev.line.dash(S.dash ?? []);
    ev.line.dashEnabled(!!S.dash);
    return this.tween(ev.line, { stroke: S.stroke, strokeWidth: S.width }, s);
  }

  protected resetStyles(s = 0.3): Promise<unknown> {
    const jobs: Promise<unknown>[] = [];
    this.nodeViews.forEach((v, id) => { if (!this.floating.has(id)) jobs.push(this.styleView(v, "base", s)); });
    this.edgeViews.forEach((ev) => {
      ev.line.dashEnabled(false);
      jobs.push(this.tween(ev.line, { stroke: LINE.base.stroke, strokeWidth: LINE.base.width }, s));
    });
    return Promise.all(jobs);
  }

  protected async pulse(v: NodeView | undefined) {
    if (!v) return;
    await this.tween(v.group, { scaleX: 1.3, scaleY: 1.3 }, 0.16);
    await this.tween(v.group, { scaleX: 1, scaleY: 1 }, 0.2);
  }

  protected async flash(n: TreeNode) {
    const v = this.nodeViews.get(n.id);
    if (!v) return;
    for (let r = 0; r < 2; r++) {
      await this.tween(v.circle, { strokeWidth: 6 }, 0.12);
      await this.tween(v.circle, { strokeWidth: STROKE.emphasis }, 0.12);
    }
  }

  protected async shake(group: Group) {
    const x = group.x();
    for (const dx of [-7, 7, -5, 5, 0]) await this.tween(group, { x: x + dx }, 0.05);
  }

  /** A ghost node carrying the key being searched for, hovering above the root. */
  protected async probe(v: number, style: NodeStyle): Promise<NodeView> {
    const g = this.rootPos();
    const p = this.shape(v, false);
    p.group.setAttrs({ x: g.x, y: g.y - 80, scaleX: 0.01, scaleY: 0.01 });
    this.fxGroup.add(p.group);
    await this.styleView(p, style, 0);
    await this.tween(p.group, { y: g.y - this.G.lift, scaleX: 1, scaleY: 1 }, 0.35, backOut);
    return p;
  }

  private move(g: Group, x1: number, y1: number, s1: number, o1: number, bow?: Point): Move {
    const m: Move = { g, x0: g.x(), y0: g.y(), s0: g.scaleX(), o0: g.opacity(), x1, y1, s1, o1 };
    if (bow && Math.hypot(x1 - m.x0, y1 - m.y0) > 1) {
      m.cx = (m.x0 + x1) / 2 + bow.x;
      m.cy = (m.y0 + y1) / 2 + bow.y;
    }
    return m;
  }

  /**
   * Glide every node from where it is now to where the current data says it should be. New nodes
   * grow in, removed nodes shrink out, edges cross-fade and follow their nodes every frame, and the
   * world re-fits the canvas. `bow` (id → offset) makes those nodes travel along an arc.
   */
  protected morph(sec = 0.7, bow?: Map<string, Point>): Promise<void> {
    const L = this.layout();
    const fit = this.fitFor(L);
    const moves: Move[] = [];
    this.emitStats();

    for (const [id, t] of L.nodes) {
      if (this.floating.has(id)) continue;
      let v = this.nodeViews.get(id);
      if (!v) {
        v = this.makeNodeView(t.node, t.x, t.y - 16);
        v.group.setAttrs({ scaleX: 0.01, scaleY: 0.01, opacity: 0 });
      }
      moves.push(this.move(v.group, t.x, t.y, 1, 1, bow?.get(id)));
    }
    for (const [id, v] of [...this.nodeViews]) {
      if (L.nodes.has(id) || this.floating.has(id)) continue;
      this.nodeViews.delete(id);
      moves.push({ ...this.move(v.group, v.group.x(), v.group.y(), 0.01, 0), kill: true });
    }

    const want = this.wantEdges();
    const fades: { line: Line; o0: number; o1: number; kill?: EdgeView }[] = [];
    for (const [key, e] of want) {
      let ev = this.edgeViews.get(key);
      if (!ev) {
        const pv = this.nodeViews.get(e.p.id), cv = this.nodeViews.get(e.c.id);
        if (!pv || !cv) continue;
        ev = this.makeEdge(pv, cv);
        this.edgeViews.set(key, ev);
      }
      fades.push({ line: ev.line, o0: ev.line.opacity(), o1: EDGE_OPACITY });
    }
    for (const [key, ev] of [...this.edgeViews]) {
      if (want.has(key)) continue;
      this.edgeViews.delete(key);
      this.dyingEdges.add(ev);
      fades.push({ line: ev.line, o0: ev.line.opacity(), o1: 0, kill: ev });
    }

    const w = this.world;
    const W0 = { x: w.x(), y: w.y(), s: w.scaleX() };
    return this.director.animate(sec, (k) => {
      const e = easeInOut(k);
      for (const m of moves) {
        let x: number, y: number;
        if (m.cx !== undefined && m.cy !== undefined) {
          const a = (1 - e) * (1 - e), b = 2 * (1 - e) * e, c = e * e;
          x = a * m.x0 + b * m.cx + c * m.x1;
          y = a * m.y0 + b * m.cy + c * m.y1;
        } else {
          x = m.x0 + (m.x1 - m.x0) * e;
          y = m.y0 + (m.y1 - m.y0) * e;
        }
        const sc = m.s0 + (m.s1 - m.s0) * e;
        m.g.setAttrs({ x, y, scaleX: sc, scaleY: sc, opacity: m.o0 + (m.o1 - m.o0) * e });
      }
      for (const f of fades) f.line.opacity(f.o0 + (f.o1 - f.o0) * e);
      const ws = W0.s + (fit.s - W0.s) * e;
      w.setAttrs({ x: W0.x + (fit.x - W0.x) * e, y: W0.y + (fit.y - W0.y) * e, scaleX: ws, scaleY: ws });
      this.refreshEdges();
    }).then(() => {
      moves.forEach((m) => { if (m.kill) m.g.destroy(); });
      fades.forEach((f) => {
        if (f.kill) {
          f.line.destroy();
          this.dyingEdges.delete(f.kill);
        }
      });
      this.redraw();
    });
  }

  /** Called after every operation, once the view is back in sync (BSTEngine records undo history here). */
  protected onRunEnd(label: string, mutated: boolean): void {
    void label;
    void mutated;
  }

  /** Finish the running operation instantly; resolves once the engine is idle again. */
  async interrupt(): Promise<void> {
    const p = this.current;
    if (!p) return;
    this.director.skip();
    await p;
  }

  /** Drop callouts, arrows, the traversal output strip and any floating node. */
  protected clearOverlays() {
    this.fxGroup.destroyChildren();
    this.outGroup.destroyChildren();
    this.floating.clear();
  }

  /**
   * Run one user operation: lock, animate, then always resync the view with the data.
   * `mutates` clears the previous traversal output (it no longer describes the tree).
   */
  protected run(label: string, fn: () => Promise<void>, mutates = false): Promise<boolean> {
    if (this.director.isBusy || this.destroyed) return Promise.resolve(false);
    this.director.begin(label);
    this.outGroup.destroyChildren();
    if (mutates) this.cb.traversal(null);
    this.subCode(null);
    const job = (async () => {
      try {
        await fn();
      } catch (err) {
        console.error(err);
        this.status("Animation error", err instanceof Error ? err.message : String(err), "danger");
      } finally {
        this.fxGroup.destroyChildren();
        this.floating.clear();
        await this.resetStyles(0.25);
        await this.morph(0.3);
        this.subCode(null);
        this.current = null;
        if (!this.destroyed) this.onRunEnd(label, mutates);
        this.director.end();
      }
      return true;
    })();
    this.current = job;
    return job;
  }

  // ───────────────────────────── traversal output strip ─────────────────────────────

  /** "OUTPUT" caption above the strip of visited keys (screen space, not panned). */
  protected beginOutput() {
    this.outGroup.add(new this.K.Text({ x: 16, y: 44, text: "OUTPUT", fontSize: 11, fontStyle: "bold", fontFamily: this.font, fill: MUTED_TEXT, letterSpacing: 1 }));
  }

  /** Fly a green chip with the node's key from the node into slot `index` of the output strip. */
  protected flyToOutput(n: TreeNode, index: number, sec = 0.42): Promise<void> {
    const K = this.K;
    const g = new K.Group();
    const str = String(n.key);
    const [fill, stroke, ink] = NODE.success;
    g.add(new K.Circle({ radius: 16, fill, stroke, strokeWidth: STROKE.base }));
    g.add(new K.Text({
      x: -22, y: -16, width: 44, height: 32, text: str, align: "center", verticalAlign: "middle",
      fontSize: Math.min(13, fontFor(str)), fontStyle: "bold", fontFamily: this.font, fill: ink,
    }));
    this.outGroup.add(g);
    const nv = this.view(n);
    if (nv) {
      const sc = nv.group.getAbsoluteScale().x;
      g.scale({ x: sc, y: sc });
      g.absolutePosition(nv.group.getAbsolutePosition());
    }
    const per = Math.max(1, Math.floor((this.stage.width() - 40) / 38));
    const slot = { x: 32 + (index % per) * 38, y: 74 + Math.floor(index / per) * 38 };
    return this.tween(g, { x: slot.x, y: slot.y, scaleX: 1, scaleY: 1 }, sec);
  }
}
