/*
 * GraphEngine — the Konva side of the graph visualizer.
 *
 * Every algorithm is first run on a frozen copy of the graph and recorded as a list of steps
 * (see ../recorder.ts). A step is a full picture of the state: the colour of every node and edge,
 * the badge above each node and the contents of the two data-structure rows. Moving to a step
 * tweens everything from what is on screen to what the step describes:
 *
 *   • a glowing comet travels along the edge being examined,
 *   • nodes and edges cross-fade to their new colours (active ones glow),
 *   • chips in the top strip fly out of the node / edge they stand for and slide between rows
 *     (queue → visit order, priority queue → finalized, sorted edges → MST …),
 *   • for SCCs every arrow visibly flips when the graph is reversed.
 *
 * The engine never touches React or queries the DOM: it draws into the container it is given and
 * reports everything the UI needs through `onChange(view)`.
 */
import type KonvaModule from "konva";
import { MONO_FONT, type Tone } from "@/lib/theme";
import { ALGOS, needsWarning } from "../algorithms";
import { LETTERS, MAX_NODES, WEIGHT_MAX, WEIGHT_MIN, byLabel, makeGraph } from "../graphModel";
import { DEFAULT_GRAPH, forceLayout, randWeight, randomSpec, type GraphSpec, type Point } from "../layout";
import { plural } from "../recorder";
import { GTHEME, chipColors, edgeStyle, nodeColors } from "../theme";
import type { AlgoKey, Chip, ChipRow, EdgeState, GEdge, GNode, GraphStep, NodeState, PresetKind, Status, Tool, Travel } from "../types";
import { cubicAt, clamp, ease, lerp, reverseCubic, toward, type Pt } from "./geometry";

type K = typeof KonvaModule;
type KNode = KonvaModule.Node;
type Easing = (t: number, b: number, c: number, d: number) => number;

interface NodeData extends GNode {
  x: number;
  y: number;
}

interface NodeView {
  group: KonvaModule.Group;
  ring: KonvaModule.Circle;
  circle: KonvaModule.Circle;
  text: KonvaModule.Text;
  badge: KonvaModule.Group;
  badgeBg: KonvaModule.Rect;
  badgeText: KonvaModule.Text;
  state: NodeState | null;
  badgeShown: boolean;
}

interface EdgeView {
  line: KonvaModule.Arrow;
  label: KonvaModule.Group;
  lbg: KonvaModule.Rect;
  ltext: KonvaModule.Text;
  state: EdgeState | null;
}

interface ChipView {
  g: KonvaModule.Group;
  rect: KonvaModule.Rect;
  text: KonvaModule.Text;
  str: string | null;
  item: Chip;
}

export interface WeightEditRequest {
  edgeId: string;
  /** "A – B" or "A → B". */
  name: string;
  weight: number;
  /** Anchor in canvas pixels (centre of the weight label). */
  x: number;
  y: number;
  /** Not enough room above the label — open the editor underneath. */
  below: boolean;
}

/** Everything the React UI shows, as one immutable snapshot. */
export interface GraphView {
  nodes: GNode[];
  edges: GEdge[];
  directed: boolean;
  weighted: boolean;
  startId: string | null;
  tool: Tool;
  algoKey: AlgoKey | null;
  index: number;
  total: number;
  playing: boolean;
  speed: number;
  step: GraphStep | null;
  status: Status;
  pending: string | null;
  weightEdit: WeightEditRequest | null;
  /** The user zoomed or panned away from the auto-fit view. */
  viewMoved: boolean;
  /** Every recorded step of the running algorithm (same array while it runs). */
  steps: readonly GraphStep[];
}

/** The editable graph in a portable form (share links). Positions are 0–1 in a landscape box. */
export interface GraphExport {
  directed: boolean;
  weighted: boolean;
  nodes: { label: string; x: number; y: number }[];
  edges: { u: string; v: string; w: number }[];
  start: string | null;
}

export interface GraphEngineOptions {
  onChange: (view: GraphView) => void;
  /** Resolved monospace font family (e.g. the next/font family name). */
  monoFont?: string;
  sansFont?: string;
  initial?: GraphSpec;
}

const TOOL_HINTS: Record<Tool, string> = {
  move: "Drag nodes to rearrange  ·  click a node to start there  ·  drag empty space to pan  ·  Ctrl + scroll to zoom",
  node: "Click anywhere on the canvas to add a node",
  edge: "Click a node, then another node, to connect them  ·  click a weight to change it",
  delete: "Click a node or an edge to delete it",
};

const R = 22; // node radius
const TOP = 124; // room for the HUD and the data-structure strip
const BASE_AREA = 1000 * 560; // virtual drawing area (aspect follows the canvas)
const MIN_AREA = 300_000;
const STEP_PAUSE = 0.55; // seconds autoplay lingers on a step at 1×

export class GraphEngine {
  private readonly K: K;
  private readonly container: HTMLDivElement;
  private readonly opts: GraphEngineOptions;
  private readonly mono: string;
  private readonly sans: string;

  private stage: KonvaModule.Stage;
  private layer: KonvaModule.Layer;
  private hud: KonvaModule.Text;
  private toolHint: KonvaModule.Text;
  private strip: KonvaModule.Rect;
  private rowTitles: KonvaModule.Text[];
  private world: KonvaModule.Group;
  private edgeGroup: KonvaModule.Group;
  private labelGroup: KonvaModule.Group;
  private rubber: KonvaModule.Line;
  private nodeGroup: KonvaModule.Group;
  private fxGroup: KonvaModule.Group;
  private chipGroup: KonvaModule.Group;
  private measure: KonvaModule.Text;
  private ro: ResizeObserver | null = null;

  private VW = 1000;
  private VH = 560;
  private fitScale = 1;
  private fitX = 0;
  private fitY = 0;
  private zoom = 1;
  private ox = 0;
  private oy = 0;
  private panning: { x: number; y: number; ox: number; oy: number; moved: boolean } | null = null;

  private speed = 1;
  private directed = false;
  private weighted = true;
  private nodes = new Map<string, NodeData>();
  private edges = new Map<string, GEdge>();
  private uid = 0;
  private startId: string | null = null;
  private nodeViews = new Map<string, NodeView>();
  private edgeViews = new Map<string, EdgeView>();
  private chipViews = new Map<string, ChipView>();
  private tool: Tool = "move";
  private pending: string | null = null;
  private steps: GraphStep[] = [];
  private idx = -1;
  private target = -1;
  private algoKey: AlgoKey | null = null;
  private epoch = 0;
  private pumping: Promise<void> | null = null;
  private pumpEpoch = -1;
  private playing = false;
  private playToken = 0;
  private flip = 0; // 0 = normal, 1 = every edge drawn reversed
  private statusMsg: Status = { title: "Ready", tone: "info" };
  private weightEdit: WeightEditRequest | null = null;
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private destroyed = false;
  private view: GraphView | null = null;
  /** Bumped on every structural change, so a delayed "run after build" can tell it went stale. */
  private graphGen = 0;

  constructor(Konva: K, container: HTMLDivElement, opts: GraphEngineOptions) {
    this.K = Konva;
    this.container = container;
    this.opts = opts;
    this.mono = opts.monoFont || MONO_FONT;
    this.sans = opts.sansFont || "Inter, system-ui, sans-serif";

    const w = Math.max(1, container.offsetWidth);
    const h = Math.max(1, container.offsetHeight);
    this.stage = new Konva.Stage({ container, width: w, height: h });
    this.layer = new Konva.Layer();
    this.stage.add(this.layer);

    this.hud = new Konva.Text({ x: 16, y: 14, fontSize: 12.5, fontFamily: this.mono, fill: GTHEME.hud, wrap: "none", ellipsis: true, listening: false });
    this.toolHint = new Konva.Text({
      x: 16, y: 50, fontSize: 12.5, fontFamily: this.sans, fill: GTHEME.hint, wrap: "none", ellipsis: true, listening: false, visible: false, text: TOOL_HINTS.move,
    });
    this.strip = new Konva.Rect({
      x: 8, y: 40, height: 76, cornerRadius: 12, fill: GTHEME.stripBg, stroke: GTHEME.stripLine, strokeWidth: 1, opacity: 0, listening: false,
    });
    this.rowTitles = [0, 1].map(
      (i) =>
        new Konva.Text({
          x: 18, y: this.rowY(i) - 15, width: 108, height: 30, fontSize: 10, fontStyle: "bold", fontFamily: this.mono,
          fill: GTHEME.rowTitle, lineHeight: 1.3, verticalAlign: "middle", visible: false, listening: false,
        }),
    );
    this.world = new Konva.Group();
    this.edgeGroup = new Konva.Group();
    this.labelGroup = new Konva.Group();
    this.rubber = new Konva.Line({ stroke: GTHEME.rubber, strokeWidth: 2.5, dash: [8, 6], lineCap: "round", visible: false, listening: false });
    this.nodeGroup = new Konva.Group();
    this.fxGroup = new Konva.Group({ listening: false });
    this.world.add(this.edgeGroup, this.labelGroup, this.rubber, this.nodeGroup, this.fxGroup);
    this.chipGroup = new Konva.Group({ listening: false });
    this.measure = new Konva.Text({ fontSize: 13, fontStyle: "bold", fontFamily: this.mono });
    this.layer.add(this.hud, this.toolHint, this.strip, ...this.rowTitles, this.world, this.chipGroup);

    this.bindStage();
    if (typeof ResizeObserver !== "undefined") {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(container);
    }
    window.addEventListener("mouseup", this.endPan);
    this.chooseArea();
    this.fit();
    this.updateHud();
    this.build(opts.initial ?? DEFAULT_GRAPH);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.epoch++;
    this.playToken++;
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
    this.ro?.disconnect();
    window.removeEventListener("mouseup", this.endPan);
    this.stage.destroy();
  }

  getView(): GraphView | null {
    return this.view;
  }

  // ───────────────────────────── view model ─────────────────────────────

  private emit() {
    if (this.destroyed) return;
    const step = this.steps[this.idx] ?? null;
    this.view = {
      nodes: this.sortedNodes().map((n) => ({ id: n.id, label: n.label })),
      edges: [...this.edges.values()].map((e) => ({ ...e })),
      directed: this.directed,
      weighted: this.weighted,
      startId: this.startId,
      tool: this.tool,
      algoKey: this.steps.length ? this.algoKey : null,
      index: Math.max(0, this.idx),
      total: this.steps.length,
      playing: this.playing,
      speed: this.speed,
      step,
      status: this.statusMsg,
      pending: this.pending,
      weightEdit: this.weightEdit,
      viewMoved: this.zoom !== 1 || this.ox !== 0 || this.oy !== 0,
      steps: this.steps,
    };
    this.opts.onChange(this.view);
  }

  private status(title: string, detail = "", tone: Tone = "info") {
    this.statusMsg = { title, detail, tone };
    this.emit();
  }

  // ───────────────────────────── stage setup ─────────────────────────────

  private bindStage() {
    const st = this.stage;
    st.on("click tap", (e) => {
      const evt = e.evt as MouseEvent;
      if (evt && evt.button === 2) return;
      if (e.target === st) this.backgroundClick();
    });
    st.on("dblclick dbltap", (e) => {
      if (e.target === st && this.tool === "move") this.resetView();
    });
    st.on("mousedown touchstart", (e) => {
      if (e.target !== st || this.tool !== "move") return;
      const p = st.getPointerPosition();
      if (p) this.panning = { x: p.x, y: p.y, ox: this.ox, oy: this.oy, moved: false };
    });
    st.on("mousemove touchmove", () => {
      this.moveRubber();
      const pan = this.panning;
      if (!pan) return;
      const p = st.getPointerPosition();
      if (!p) return;
      const dx = p.x - pan.x;
      const dy = p.y - pan.y;
      if (!pan.moved && Math.hypot(dx, dy) < 4) return;
      if (!pan.moved) {
        pan.moved = true;
        this.closeWeightEdit();
        this.setCursor("grabbing");
      }
      this.ox = pan.ox + dx;
      this.oy = pan.oy + dy;
      this.fit();
      this.layer.batchDraw();
    });
    st.on("mouseup touchend", this.endPan);
    st.on("wheel", (e) => {
      const evt = e.evt as WheelEvent;
      if (!evt.ctrlKey && !evt.metaKey) return; // plain scrolling keeps scrolling the page
      evt.preventDefault();
      const p = st.getPointerPosition();
      if (!p) return;
      const z0 = this.zoom;
      const z1 = clamp(z0 * Math.exp(-evt.deltaY * 0.0025), 0.4, 3);
      if (z1 === z0) return;
      const qx = (p.x - this.ox) / z0;
      const qy = (p.y - this.oy) / z0;
      this.zoom = z1;
      this.ox = p.x - z1 * qx;
      this.oy = p.y - z1 * qy;
      this.closeWeightEdit();
      this.fit();
      this.layer.batchDraw();
      this.emit();
    });
  }

  private endPan = () => {
    const pan = this.panning;
    if (!pan) return;
    this.panning = null;
    if (pan.moved) {
      this.setCursor(null);
      this.emit();
    }
  };

  /** Small canvases squeeze the row titles so the chips get more room. */
  private narrow() {
    return this.stage.width() < 560;
  }

  private rowY(i: number) {
    return 58 + i * 38;
  }

  resize() {
    if (this.destroyed) return;
    const c = this.container;
    this.stage.size({ width: Math.max(1, c.offsetWidth), height: Math.max(1, c.offsetHeight) });
    if (!this.nodes.size) this.chooseArea();
    this.fit();
    this.closeWeightEdit();
    const st = this.steps[this.idx];
    void this.renderRows(st ? st.rows : [], 0);
    this.layer.batchDraw();
  }

  /** Pick a virtual drawing area whose aspect matches the canvas (portrait phones get a tall area). */
  private chooseArea() {
    const sw = this.stage.width();
    const sh = this.stage.height() - TOP - 12;
    if (sw < 80 || sh < 80) {
      this.VW = 1000;
      this.VH = 560;
      return;
    }
    const aspect = clamp(sw / sh, 0.5, 2.4);
    // Small canvases get a smaller virtual area, so nodes and labels are drawn bigger.
    const area = clamp(sw * sh * 1.1, MIN_AREA, BASE_AREA);
    this.VW = Math.round(Math.sqrt(area * aspect));
    this.VH = Math.round(area / this.VW);
  }

  private fit() {
    const sw = this.stage.width();
    const sh = this.stage.height();
    const bottom = 12;
    const s = clamp(Math.min((sw - 24) / this.VW, (sh - TOP - bottom) / this.VH), 0.25, 1.35);
    this.fitScale = s;
    this.fitX = (sw - this.VW * s) / 2;
    this.fitY = TOP + Math.max(0, (sh - TOP - bottom - this.VH * s) / 2);
    this.world.setAttrs({
      scaleX: s * this.zoom,
      scaleY: s * this.zoom,
      x: this.fitX * this.zoom + this.ox,
      y: this.fitY * this.zoom + this.oy,
    });
    this.strip.width(Math.max(0, sw - 16));
    this.hud.width(Math.max(40, sw - 32));
    this.toolHint.width(Math.max(40, sw - 32));
    const narrow = this.narrow();
    this.rowTitles.forEach((t) => t.setAttrs({ width: narrow ? 74 : 108, fontSize: narrow ? 9 : 10 }));
  }

  resetView() {
    if (this.zoom === 1 && this.ox === 0 && this.oy === 0) return;
    const z0 = this.zoom;
    const x0 = this.ox;
    const y0 = this.oy;
    this.closeWeightEdit();
    void this.animate(this.sec(0.45) * 1000, (k) => {
      this.zoom = lerp(z0, 1, k);
      this.ox = lerp(x0, 0, k);
      this.oy = lerp(y0, 0, k);
      this.fit();
    }).then(() => {
      this.zoom = 1;
      this.ox = 0;
      this.oy = 0;
      this.fit();
      this.layer.batchDraw();
      this.emit();
    });
  }

  /** Re-measure text once web fonts have loaded. */
  refreshText() {
    if (this.destroyed) return;
    this.edges.forEach((e) => this.setWeightText(e));
    this.nodeViews.forEach((v) => {
      if (v.badgeShown) this.paintBadge(v, v.badgeText.text());
    });
    this.chipViews.forEach((v) => {
      const s = v.str;
      v.str = null;
      if (s !== null) this.setChipText(v, s);
    });
    const st = this.steps[this.idx];
    void this.renderRows(st ? st.rows : [], 0);
    this.layer.batchDraw();
  }

  private toolCursor() {
    return this.tool === "node" ? "copy" : this.tool === "edge" && this.pending ? "crosshair" : "";
  }

  private setCursor(c: string | null) {
    this.stage.container().style.cursor = c || this.toolCursor();
  }

  private sortedNodes() {
    return [...this.nodes.values()].sort((a, b) => byLabel(a.label, b.label));
  }

  private updateHud() {
    const s = this.startId ? this.nodes.get(this.startId) : undefined;
    this.hud.text(
      `${plural(this.nodes.size, "node")}  ·  ${plural(this.edges.size, "edge")}  ·  ${this.directed ? "directed" : "undirected"}  ·  ${this.weighted ? "weighted" : "unweighted"}` +
        (s ? `  ·  start ${s.label}` : ""),
    );
  }

  // ───────────────────────────── animation primitives ─────────────────────────────

  private sec(s: number) {
    return s / this.speed;
  }

  private later(fn: () => void, ms: number) {
    const t = setTimeout(() => {
      this.timers.delete(t);
      if (!this.destroyed) fn();
    }, ms);
    this.timers.add(t);
  }

  private wait(s: number) {
    return new Promise<void>((resolve) => this.later(resolve, this.sec(s) * 1000));
  }

  private tween(node: KNode | undefined, attrs: Record<string, unknown>, s: number, easing?: Easing): Promise<void> {
    const duration = this.sec(s);
    return new Promise((resolve) => {
      if (!node || this.destroyed) return resolve();
      if (duration <= 0.001 || !node.getLayer()) {
        node.setAttrs(attrs);
        this.layer.batchDraw();
        return resolve();
      }
      let done = false;
      const finish = () => {
        if (!done) {
          done = true;
          resolve();
        }
      };
      const tw = new this.K.Tween({
        node,
        duration,
        easing: easing ?? this.K.Easings.EaseInOut,
        ...attrs,
        onFinish: () => {
          tw.destroy();
          finish();
        },
      });
      tw.play();
      // safety net if a node is destroyed mid-tween
      const t = setTimeout(() => {
        this.timers.delete(t);
        finish();
      }, duration * 1000 + 1000);
      this.timers.add(t);
    });
  }

  private animate(ms: number, frame: (k: number) => void): Promise<void> {
    return new Promise((resolve) => {
      if (this.destroyed) return resolve();
      if (ms < 20) {
        frame(1);
        this.layer.batchDraw();
        resolve();
        return;
      }
      const anim = new this.K.Animation((f) => {
        if (this.destroyed) {
          anim.stop();
          resolve();
          return;
        }
        const p = Math.min(1, (f?.time ?? 0) / ms);
        frame(ease(p));
        if (p >= 1) {
          anim.stop();
          resolve();
        }
      }, this.layer);
      anim.start();
    });
  }

  // ───────────────────────────── node & edge views ─────────────────────────────

  private makeNodeView(n: NodeData): NodeView {
    const K = this.K;
    const [fill, stroke, tc] = nodeColors(null);
    const group = new K.Group({ x: n.x, y: n.y, draggable: true });
    const ring = new K.Circle({ radius: R + 7, stroke: GTHEME.startRing, strokeWidth: 2, dash: [5, 4], opacity: 0, listening: false });
    const circle = new K.Circle({
      radius: R, fill, stroke, strokeWidth: 2.5,
      shadowColor: GTHEME.shadow, shadowBlur: 3, shadowOpacity: 0.12, shadowOffset: { x: 0, y: 1 },
    });
    const text = new K.Text({
      x: -R, y: -R, width: 2 * R, height: 2 * R, text: n.label, align: "center", verticalAlign: "middle",
      fontSize: 17, fontStyle: "bold", fontFamily: this.mono, fill: tc, listening: false,
    });
    const badge = new K.Group({ y: -R - 15, opacity: 0, listening: false });
    const badgeBg = new K.Rect({ y: -10, height: 20, cornerRadius: 10, fill: GTHEME.badge[0], stroke: GTHEME.badge[1], strokeWidth: 1.5 });
    const badgeText = new K.Text({
      y: -10, height: 20, fontSize: 12, fontStyle: "bold", fontFamily: this.mono, fill: GTHEME.badge[2], align: "center", verticalAlign: "middle",
    });
    badge.add(badgeBg, badgeText);
    group.add(ring, circle, text, badge);
    this.nodeGroup.add(group);
    const v: NodeView = { group, ring, circle, text, badge, badgeBg, badgeText, state: null, badgeShown: false };
    this.nodeViews.set(n.id, v);

    group.on("dragstart", () => {
      group.moveToTop();
      this.closeWeightEdit();
      this.setCursor("grabbing");
    });
    group.on("dragmove", () => {
      group.position({ x: clamp(group.x(), 26, this.VW - 26), y: clamp(group.y(), 26, this.VH - 26) });
      n.x = group.x();
      n.y = group.y();
      this.refreshEdges(n.id);
      this.moveRubber();
    });
    group.on("dragend", () => this.setCursor(null));
    group.on("click tap", (ev) => {
      ev.cancelBubble = true;
      this.nodeClick(n.id);
    });
    group.on("mouseenter", () => {
      this.setCursor(this.tool === "delete" ? "pointer" : this.tool === "edge" ? "crosshair" : "grab");
      if (this.tool === "delete") void this.tween(circle, { stroke: GTHEME.deleteHover, strokeWidth: 4 }, 0.12);
    });
    group.on("mouseleave", () => {
      this.setCursor(null);
      if (this.tool === "delete" && this.nodeViews.get(n.id) === v) void this.styleNode(n.id, v.state, 0.12);
    });
    return v;
  }

  private makeEdgeView(e: GEdge): EdgeView {
    const K = this.K;
    const B = GTHEME.edge.base;
    const line = new K.Arrow({
      points: [0, 0, 0, 0, 0, 0, 0, 0], bezier: true, stroke: B.stroke, fill: B.stroke, strokeWidth: B.width, opacity: B.opacity,
      pointerLength: this.directed ? 11 : 0, pointerWidth: this.directed ? 10 : 0, lineCap: "round", lineJoin: "round", hitStrokeWidth: 16,
    });
    const label = new K.Group({ opacity: this.weighted ? 1 : 0, listening: this.weighted });
    const lbg = new K.Rect({
      height: 20, cornerRadius: 10, stroke: GTHEME.weightStroke, strokeWidth: 1.5,
    });
    const ltext = new K.Text({ height: 20, fontSize: 12, fontStyle: "bold", fontFamily: this.mono, align: "center", verticalAlign: "middle" });
    label.add(lbg, ltext);
    this.edgeGroup.add(line);
    this.labelGroup.add(label);
    const v: EdgeView = { line, label, lbg, ltext, state: null };
    this.edgeViews.set(e.id, v);

    const enter = () => {
      this.setCursor(this.tool === "delete" || this.weighted ? "pointer" : null);
      if (this.tool === "delete") void this.tween(line, { stroke: GTHEME.deleteHover, fill: GTHEME.deleteHover, strokeWidth: 5 }, 0.12);
    };
    const leave = () => {
      this.setCursor(null);
      if (this.tool === "delete" && this.edgeViews.get(e.id) === v) void this.styleEdge(e.id, v.state, 0.12);
    };
    line.on("mouseenter", enter);
    line.on("mouseleave", leave);
    label.on("mouseenter", enter);
    label.on("mouseleave", leave);
    line.on("click tap", (ev) => {
      ev.cancelBubble = true;
      this.edgeClick(e.id, false);
    });
    label.on("click tap", (ev) => {
      ev.cancelBubble = true;
      this.edgeClick(e.id, true);
    });
    this.setWeightText(e);
    this.placeEdge(e);
    return v;
  }

  private setWeightText(e: GEdge) {
    const v = this.edgeViews.get(e.id);
    if (!v) return;
    const s = String(e.w);
    const w = Math.max(22, Math.ceil(v.ltext.measureSize(s).width) + 12);
    v.lbg.setAttrs({ x: -w / 2, y: -10, width: w, fill: e.w < 0 ? GTHEME.weightBgNeg : GTHEME.weightBg });
    v.ltext.setAttrs({ x: -w / 2, y: -10, width: w, text: s, fill: e.w < 0 ? GTHEME.weightTextNeg : GTHEME.weightText });
  }

  private npos(id: string): Pt {
    const v = this.nodeViews.get(id);
    if (v) return { x: v.group.x(), y: v.group.y() };
    const n = this.nodes.get(id);
    return n ? { x: n.x, y: n.y } : { x: 0, y: 0 };
  }

  private bend(e: GEdge) {
    if (!this.directed) return 0;
    for (const f of this.edges.values()) if (f.u === e.v && f.v === e.u) return 26;
    return 0;
  }

  /** Cubic bezier from the rim of u's circle to the rim of v's circle, bowed when a reverse edge exists. */
  private edgePts(e: GEdge): number[] {
    const A = this.npos(e.u);
    const B = this.npos(e.v);
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const d = Math.hypot(dx, dy) || 1;
    const bend = this.bend(e);
    const Q = { x: (A.x + B.x) / 2 - (dy / d) * bend * 2, y: (A.y + B.y) / 2 + (dx / d) * bend * 2 };
    const p0 = toward(A, Q, R + 1);
    const p3 = toward(B, Q, R + 2);
    const c1 = { x: lerp(p0.x, Q.x, 2 / 3), y: lerp(p0.y, Q.y, 2 / 3) };
    const c2 = { x: lerp(p3.x, Q.x, 2 / 3), y: lerp(p3.y, Q.y, 2 / 3) };
    const pts = [p0.x, p0.y, c1.x, c1.y, c2.x, c2.y, p3.x, p3.y];
    if (!this.flip) return pts;
    const rev = reverseCubic(pts);
    return pts.map((x, i) => lerp(x, rev[i], this.flip));
  }

  private placeEdge(e: GEdge) {
    const v = this.edgeViews.get(e.id);
    if (!v) return;
    const pts = this.edgePts(e);
    v.line.points(pts);
    v.label.position(cubicAt(pts, 0.5));
  }

  private refreshEdges(nodeId?: string) {
    this.edges.forEach((e) => {
      if (!nodeId || e.u === nodeId || e.v === nodeId) this.placeEdge(e);
    });
  }

  /** Tween every edge from its current shape to its target shape (new edges grow out of their tail). */
  private reshapeEdges(s = 0.45) {
    const moves: { v: EdgeView; from: number[]; to: number[]; lf: Pt; lt: Pt }[] = [];
    this.edges.forEach((e) => {
      const v = this.edgeViews.get(e.id);
      if (!v) return;
      const to = this.edgePts(e);
      moves.push({ v, from: v.line.points().slice(), to, lf: v.label.position(), lt: cubicAt(to, 0.5) });
    });
    const pl = this.directed ? 11 : 0;
    const pw = this.directed ? 10 : 0;
    this.edgeViews.forEach((v) => void this.tween(v.line, { pointerLength: pl, pointerWidth: pw }, s));
    return this.animate(this.sec(s) * 1000, (k) =>
      moves.forEach((m) => {
        m.v.line.points(m.from.map((x, i) => lerp(x, m.to[i], k)));
        m.v.label.position({ x: lerp(m.lf.x, m.lt.x, k), y: lerp(m.lf.y, m.lt.y, k) });
      }),
    ).then(() => this.refreshEdges());
  }

  private growEdge(e: GEdge, delayMs: number) {
    const v = this.edgeViews.get(e.id);
    if (!v) return;
    const p = this.edgePts(e);
    v.line.points([p[0], p[1], p[0], p[1], p[0], p[1], p[0], p[1]]);
    v.label.opacity(0);
    this.later(() => {
      if (this.edgeViews.get(e.id) !== v) return;
      void this.animate(this.sec(0.45) * 1000, (k) => {
        const t = this.edgePts(e);
        v.line.points(t.map((x, i) => lerp(t[i % 2], x, k)));
      }).then(() => {
        if (this.edgeViews.get(e.id) !== v) return;
        this.placeEdge(e);
        if (this.weighted && !v.state) void this.tween(v.label, { opacity: 1 }, 0.25);
      });
    }, delayMs);
  }

  // ───────────────────────────── styling ─────────────────────────────

  private styleNode(id: string, state: NodeState | null | undefined, s = 0.25): Promise<unknown> {
    const v = this.nodeViews.get(id);
    if (!v) return Promise.resolve();
    v.state = state || null;
    const [fill, stroke, tc] = nodeColors(state);
    // Emphasis comes from a heavier ink outline, not from glow.
    const strong = state === "current" || state === "selected" || state === "danger";
    const attrs = { fill, stroke, strokeWidth: strong ? 4 : state ? 3 : 2 };
    if (s === 0) {
      v.circle.setAttrs(attrs);
      v.text.fill(tc);
      return Promise.resolve();
    }
    return Promise.all([this.tween(v.circle, attrs, s), this.tween(v.text, { fill: tc }, s)]);
  }

  private styleEdge(id: string, state: EdgeState | null | undefined, s = 0.25): Promise<unknown> {
    const v = this.edgeViews.get(id);
    if (!v) return Promise.resolve();
    v.state = state || null;
    const S = edgeStyle(state);
    v.line.dash(S.dash || []);
    v.line.dashEnabled(!!S.dash);
    const lo = !this.weighted ? 0 : state === "faded" ? 0.3 : 1;
    return Promise.all([
      this.tween(v.line, { stroke: S.stroke, fill: S.stroke, strokeWidth: S.width, opacity: S.opacity }, s),
      this.tween(v.lbg, { stroke: state && state !== "faded" ? S.stroke : GTHEME.weightStroke }, s),
      this.tween(v.label, { opacity: lo }, s),
    ]);
  }

  private paintBadge(v: NodeView, text: string) {
    const w = Math.max(24, Math.ceil(v.badgeText.measureSize(text).width) + 14);
    v.badgeBg.setAttrs({ x: -w / 2, width: w });
    v.badgeText.setAttrs({ x: -w / 2, width: w, text });
  }

  private setBadge(id: string, text: string | undefined, animate: boolean, s: number): Promise<unknown> {
    const v = this.nodeViews.get(id);
    if (!v) return Promise.resolve();
    const show = text !== undefined && text !== null;
    const jobs: Promise<unknown>[] = [];
    if (show && v.badgeText.text() !== text) {
      const wasShown = v.badgeShown;
      this.paintBadge(v, text);
      if (animate && wasShown) jobs.push(this.flashBadge(v));
    }
    v.badgeShown = show;
    jobs.push(this.tween(v.badge, { opacity: show ? 1 : 0 }, s));
    return Promise.all(jobs);
  }

  private async flashBadge(v: NodeView) {
    const [hf, hs, ht] = GTHEME.badgeHot;
    const [bf, bs, bt] = GTHEME.badge;
    await Promise.all([
      this.tween(v.badge, { scaleX: 1.45, scaleY: 1.45 }, 0.16),
      this.tween(v.badgeBg, { fill: hf, stroke: hs }, 0.16),
      this.tween(v.badgeText, { fill: ht }, 0.16),
    ]);
    await this.wait(0.2);
    await Promise.all([
      this.tween(v.badge, { scaleX: 1, scaleY: 1 }, 0.25),
      this.tween(v.badgeBg, { fill: bf, stroke: bs }, 0.25),
      this.tween(v.badgeText, { fill: bt }, 0.25),
    ]);
  }

  private async pulseNode(id: string) {
    const v = this.nodeViews.get(id);
    if (!v) return;
    await this.tween(v.group, { scaleX: 1.22, scaleY: 1.22 }, 0.16);
    await this.tween(v.group, { scaleX: 1, scaleY: 1 }, 0.22);
  }

  private async flashEdge(id: string) {
    const v = this.edgeViews.get(id);
    if (!v) return;
    await this.tween(v.line, { strokeWidth: 7, stroke: GTHEME.badgeHot[1], fill: GTHEME.badgeHot[1] }, 0.15);
    await this.styleEdge(id, v.state, 0.3);
  }

  private paintStart() {
    this.nodeViews.forEach((v, id) => void this.tween(v.ring, { opacity: id === this.startId ? 1 : 0 }, 0.25));
  }

  // ───────────────────────────── data-structure chips ─────────────────────────────

  private chipWidth(text: string) {
    return Math.max(30, Math.ceil(this.measure.measureSize(text).width) + 18);
  }

  private makeChip(it: Chip): ChipView {
    const K = this.K;
    const g = new K.Group({ opacity: 0 });
    const rect = new K.Rect({ y: -14, height: 28, cornerRadius: 8, strokeWidth: 1.5, shadowColor: GTHEME.shadow, shadowBlur: 2, shadowOpacity: 0.1, shadowOffset: { x: 0, y: 1 } });
    const text = new K.Text({ y: -14, height: 28, fontSize: 13, fontStyle: "bold", fontFamily: this.mono, align: "center", verticalAlign: "middle" });
    g.add(rect, text);
    this.chipGroup.add(g);
    const v: ChipView = { g, rect, text, str: null, item: it };
    const [f, s, t] = chipColors(it.tone);
    rect.setAttrs({ fill: f, stroke: s });
    text.fill(t);
    this.setChipText(v, it.text);
    return v;
  }

  private setChipText(v: ChipView, str: string) {
    if (v.str === str) return;
    v.str = str;
    const w = this.chipWidth(str);
    v.rect.setAttrs({ x: -w / 2, width: w });
    v.text.setAttrs({ x: -w / 2, width: w, text: str });
  }

  /** Where a chip comes from / returns to: the node or edge it stands for. */
  private anchor(it: Chip | undefined): Pt | null {
    if (!it) return null;
    const nv = it.node ? this.nodeViews.get(it.node) : undefined;
    if (nv) return nv.group.getAbsolutePosition();
    const ev = it.edge ? this.edgeViews.get(it.edge) : undefined;
    if (ev) return ev.label.getAbsolutePosition();
    return null;
  }

  private chipSlots(rows: readonly ChipRow[]) {
    const slots = new Map<string, Pt>();
    const x0 = this.narrow() ? 98 : 134;
    const xMax = this.stage.width() - 20;
    const gap = 6;
    rows.forEach((r, ri) => {
      if (!r || !r.items.length) return;
      const ws = r.items.map((it) => this.chipWidth(it.text));
      const centers: number[] = [];
      let acc = 0;
      ws.forEach((w) => {
        centers.push(acc + w / 2);
        acc += w + gap;
      });
      const first = ws[0] / 2;
      const last = ws[ws.length - 1] / 2;
      const natural = centers[centers.length - 1] - first;
      const room = Math.max(0, xMax - x0 - first - last);
      const k = natural > room && natural > 0 ? room / natural : 1;
      r.items.forEach((it, j) => slots.set(it.key, { x: x0 + first + (centers[j] - first) * k, y: this.rowY(ri) }));
    });
    return slots;
  }

  private renderRows(rowsIn: readonly ChipRow[] | undefined, s: number): Promise<unknown> {
    const rows = rowsIn || [];
    const jobs: Promise<unknown>[] = [];
    this.rowTitles.forEach((t, i) => {
      const r = rows[i];
      t.visible(!!(r && r.title));
      if (r) t.text(r.title);
    });
    jobs.push(this.tween(this.strip, { opacity: rows.length ? 1 : 0 }, s || 0.001));
    const slots = this.chipSlots(rows);
    const want = new Map<string, Chip>();
    rows.forEach((r) => r && r.items.forEach((it) => want.set(it.key, it)));

    want.forEach((it, key) => {
      let v = this.chipViews.get(key);
      const slot = slots.get(key) as Pt;
      if (!v) {
        v = this.makeChip(it);
        this.chipViews.set(key, v);
        const a = this.anchor(it);
        v.g.setAttrs(a ? { x: a.x, y: a.y, scaleX: 0.4, scaleY: 0.4 } : { x: slot.x, y: slot.y - 18 });
      } else if (Math.abs(v.g.y() - slot.y) > 1) {
        v.g.moveToTop(); // switching rows — keep it above its neighbours while it slides
      }
      v.item = it;
      this.setChipText(v, it.text);
      const [f, st, tc] = chipColors(it.tone);
      jobs.push(
        this.tween(v.g, { x: slot.x, y: slot.y, scaleX: 1, scaleY: 1, opacity: 1 }, s),
        this.tween(v.rect, { fill: f, stroke: st, strokeWidth: it.tone === "current" ? 2.5 : 1.5 }, s),
        this.tween(v.text, { fill: tc }, s),
      );
    });

    [...this.chipViews].forEach(([key, v]) => {
      if (want.has(key)) return;
      this.chipViews.delete(key);
      const a = this.anchor(v.item);
      jobs.push(
        this.tween(v.g, a ? { x: a.x, y: a.y, scaleX: 0.3, scaleY: 0.3, opacity: 0 } : { y: v.g.y() - 18, opacity: 0 }, s).then(() => v.g.destroy()),
      );
    });
    return Promise.all(jobs);
  }

  // ───────────────────────────── running algorithms ─────────────────────────────

  private snapshot() {
    return makeGraph([...this.nodes.values()], [...this.edges.values()], this.directed, this.weighted);
  }

  run(key: AlgoKey) {
    const A = ALGOS[key];
    if (!A) return;
    this.closeWeightEdit();
    if (!this.nodes.size) {
      this.status("Nothing to run", "Add some nodes first, or press **Generate**.", "danger");
      return;
    }
    const warn = needsWarning(A, this.directed);
    if (warn) {
      this.status(`${A.name} needs ${A.needs === "directed" ? "a directed" : "an undirected"} graph`, warn, "danger");
      return;
    }
    this.cancelPending();
    this.stopAlgorithm(true);
    if (!this.startId || !this.nodes.has(this.startId)) this.startId = this.sortedNodes()[0].id;
    this.algoKey = key;
    this.steps = A.run(this.snapshot(), this.startId);
    this.idx = -1;
    this.target = -1;
    this.emit();
    // Autoplay from step 0; any navigation (→, End, scrub…) pauses it straight away.
    void this.play();
  }

  /** Leave the algorithm and go back to editing. */
  stop() {
    this.closeWeightEdit();
    this.stopAlgorithm(false);
  }

  private stopAlgorithm(silent: boolean) {
    this.epoch++;
    this.playToken++;
    this.playing = false;
    const had = this.steps.length > 0;
    this.steps = [];
    this.idx = -1;
    this.target = -1;
    if (had) {
      this.fxGroup.destroyChildren();
      this.nodeViews.forEach((_, id) => {
        void this.styleNode(id, null, 0.3);
        void this.setBadge(id, undefined, false, 0.3);
      });
      this.edgeViews.forEach((_, id) => void this.styleEdge(id, null, 0.3));
      void this.renderRows([], 0.35);
      if (this.flip) void this.animateFlip(0, 0.35);
      if (!silent) {
        this.statusMsg = { title: "Stopped", detail: "Back to editing. Pick an algorithm and press **Run**.", tone: "info" };
      }
    }
    this.emit();
  }

  /** Animate toward step i. Rapid clicks just move the target; the pump catches up. */
  goto(i: number): Promise<void> {
    if (!this.steps.length) return Promise.resolve();
    this.target = clamp(i, 0, this.steps.length - 1);
    if (this.pumping && this.pumpEpoch === this.epoch) return this.pumping;
    const epoch = (this.pumpEpoch = this.epoch);
    const p: Promise<void> = (this.pumping || Promise.resolve())
      .then(async () => {
        while (this.epoch === epoch && this.target !== this.idx && !this.destroyed) {
          await this.apply(this.target, this.target === this.idx + 1, epoch);
        }
      })
      .catch((err: unknown) => {
        console.error(err);
        this.status("Animation error", err instanceof Error ? err.message : String(err), "danger");
      })
      .finally(() => {
        if (this.pumping === p) this.pumping = null;
        this.emit();
      });
    this.pumping = p;
    return p;
  }

  private async apply(i: number, forward: boolean, epoch: number) {
    const step = this.steps[i];
    if (!step) return;
    this.idx = i;
    this.statusMsg = { title: step.title, detail: step.detail, tone: step.tone ?? "info" };
    this.emit();

    if (forward && step.travel) {
      await this.travel(step.travel);
      if (epoch !== this.epoch) return;
    }
    if (!!step.transposed !== this.flip > 0.5) {
      await this.animateFlip(step.transposed ? 1 : 0, forward ? 0.9 : 0.35);
      if (epoch !== this.epoch) return;
    }

    const s = forward ? 0.4 : 0.22;
    const jobs: Promise<unknown>[] = [];
    this.nodeViews.forEach((v, id) => {
      const st = this.pending === id ? "selected" : step.nodes[id];
      if (forward && st === "current" && v.state !== "current") jobs.push(this.pulseNode(id));
      jobs.push(this.styleNode(id, st, s), this.setBadge(id, step.badges[id], forward, s));
    });
    this.edgeViews.forEach((_, id) => jobs.push(this.styleEdge(id, step.edges[id], s)));
    jobs.push(this.renderRows(step.rows, forward ? 0.55 : 0.28));
    await Promise.all(jobs);
  }

  /** A glowing comet runs along the edge, starting at `from`. */
  private async travel({ edge, from, style }: Travel) {
    const e = this.edges.get(edge);
    const v = this.edgeViews.get(edge);
    if (!e || !v) return;
    let p = v.line.points().slice();
    const tail = this.flip > 0.5 ? e.v : e.u;
    if (from !== tail) p = reverseCubic(p);
    const color = edgeStyle(style).stroke;
    const trail = new this.K.Line({
      stroke: color, strokeWidth: 5, lineCap: "round", lineJoin: "round", opacity: 0.9, listening: false,
    });
    const p0 = cubicAt(p, 0);
    trail.points([p0.x, p0.y, p0.x, p0.y]);
    const head = new this.K.Circle({ ...p0, radius: 6, fill: GTHEME.weightBg, stroke: color, strokeWidth: 2.5, listening: false });
    this.fxGroup.add(trail, head);
    await this.animate(this.sec(0.5) * 1000, (k) => {
      const out: number[] = [];
      for (let j = 0; j <= 24; j++) {
        const q = cubicAt(p, (j / 24) * k);
        out.push(q.x, q.y);
      }
      trail.points(out);
      head.position(cubicAt(p, k));
    });
    void this.tween(trail, { opacity: 0 }, 0.35).then(() => trail.destroy());
    void this.tween(head, { opacity: 0, scaleX: 2.2, scaleY: 2.2 }, 0.3).then(() => head.destroy());
  }

  /** Every arrow shrinks to its midpoint and regrows pointing the other way. */
  private animateFlip(to: number, s: number) {
    const from = this.flip;
    return this.animate(this.sec(s) * 1000, (k) => {
      this.flip = lerp(from, to, k);
      const h = Math.abs(1 - 2 * this.flip);
      this.edgeViews.forEach((v) => {
        v.line.pointerLength(11 * h);
        v.line.pointerWidth(10 * h);
      });
      this.refreshEdges();
    }).then(() => {
      this.flip = to;
      this.edgeViews.forEach((v) => {
        v.line.pointerLength(this.directed ? 11 : 0);
        v.line.pointerWidth(this.directed ? 10 : 0);
      });
      this.refreshEdges();
    });
  }

  async play() {
    if (!this.steps.length || this.playing) return;
    const token = ++this.playToken;
    this.playing = true;
    this.emit();
    if (this.idx >= this.steps.length - 1) await this.goto(0);
    while (this.playToken === token && this.idx < this.steps.length - 1) {
      await this.goto(this.idx + 1);
      if (this.playToken !== token) break;
      const st = this.steps[this.idx];
      if (this.idx < this.steps.length - 1) await this.wait(STEP_PAUSE * (st?.hold ?? 1));
    }
    if (this.playToken === token) {
      this.playing = false;
      this.emit();
    }
  }

  pause() {
    if (!this.playing) return;
    this.playToken++;
    this.playing = false;
    this.emit();
  }

  toggle() {
    if (this.playing) this.pause();
    else void this.play();
  }

  /** Where the pump is heading (rapid presses accumulate instead of repeating the same step). */
  private aim() {
    return this.pumping && this.target >= 0 ? this.target : this.idx;
  }

  next() {
    this.pause();
    void this.goto(this.aim() + 1);
  }

  prev() {
    this.pause();
    void this.goto(this.aim() - 1);
  }

  first() {
    this.pause();
    void this.goto(0);
  }

  last() {
    this.pause();
    void this.goto(this.steps.length - 1);
  }

  seek(i: number) {
    void this.goto(i);
  }

  setSpeed(speed: number) {
    this.speed = clamp(speed, 0.1, 8);
    this.emit();
  }

  // ───────────────────────────── editing ─────────────────────────────

  setTool(t: Tool) {
    this.tool = t;
    this.cancelPending();
    this.closeWeightEdit();
    this.toolHint.text(TOOL_HINTS[t] || "");
    this.setCursor(null);
    this.layer.batchDraw();
    this.emit();
  }

  /** Esc: close the weight editor, else cancel a half-drawn edge, else leave the algorithm. */
  escape() {
    if (this.weightEdit) this.closeWeightEdit();
    else if (this.pending) this.cancelPending();
    else if (this.steps.length) this.stop();
  }

  private backgroundClick() {
    if (this.weightEdit) {
      this.closeWeightEdit();
      return;
    }
    if (this.tool === "edge") {
      this.cancelPending();
      return;
    }
    if (this.tool !== "node") return;
    const p = this.stage.getPointerPosition();
    if (!p || p.y < TOP - 8) return;
    const q = this.world.getAbsoluteTransform().copy().invert().point(p);
    const x = clamp(q.x, 30, this.VW - 30);
    const y = clamp(q.y, 30, this.VH - 30);
    for (const n of this.nodes.values()) if (Math.hypot(n.x - x, n.y - y) < R * 2 + 8) return;
    const n = this.addNode(x, y);
    if (n) this.status(`Added node ${n.label}`, "Switch to the **Edge** tool (E) to connect it to other nodes.", "ok");
  }

  private nodeClick(id: string) {
    if (!this.nodes.has(id)) return;
    this.closeWeightEdit();
    if (this.tool === "delete") {
      this.removeNode(id);
      return;
    }
    if (this.tool === "edge") {
      if (!this.pending) {
        this.pending = id;
        void this.styleNode(id, "selected", 0.15);
        this.rubber.visible(true);
        this.moveRubber();
        this.setCursor(null);
        this.status(`Connect ${this.nodes.get(id)?.label} to…`, "Click the node the edge should go to. Click empty space or press **Esc** to cancel.");
        return;
      }
      const from = this.pending;
      this.cancelPending();
      if (from !== id) this.addEdge(from, id);
      return;
    }
    if (!this.steps.length) this.setStart(id); // while an algorithm runs, clicks only drag
  }

  private edgeClick(id: string, onLabel: boolean) {
    if (!this.edges.has(id) || this.pending) return;
    if (this.tool === "delete") {
      this.removeEdge(id);
      return;
    }
    if (this.weighted && (onLabel || this.tool === "edge")) this.openWeightEdit(id);
  }

  cancelPending() {
    if (!this.pending) return;
    const id = this.pending;
    const st = this.steps[this.idx];
    this.pending = null;
    this.rubber.visible(false);
    void this.styleNode(id, st ? st.nodes[id] : null, 0.15);
    this.setCursor(null);
    this.layer.batchDraw();
    this.emit();
  }

  private moveRubber() {
    if (!this.pending) return;
    const p = this.stage.getPointerPosition();
    const a = this.npos(this.pending);
    if (!p) return;
    const q = this.world.getAbsoluteTransform().copy().invert().point(p);
    const d = Math.hypot(q.x - a.x, q.y - a.y) || 1;
    this.rubber.points([a.x + ((q.x - a.x) / d) * R, a.y + ((q.y - a.y) / d) * R, q.x, q.y]);
    this.layer.batchDraw();
  }

  private edgeName(e: GEdge) {
    const L = (x: string) => this.nodes.get(x)?.label ?? "?";
    return `${L(e.u)}${this.directed ? " → " : " – "}${L(e.v)}`;
  }

  addNode(x: number, y: number): NodeData | null {
    if (this.nodes.size >= MAX_NODES) {
      this.status("Node limit reached", `This visualizer supports up to ${MAX_NODES} nodes (A–Z).`, "danger");
      return null;
    }
    this.stopAlgorithm(true);
    const used = new Set([...this.nodes.values()].map((n) => n.label));
    const n: NodeData = { id: `n${++this.uid}`, label: LETTERS.find((l) => !used.has(l)) as string, x, y };
    this.nodes.set(n.id, n);
    const v = this.makeNodeView(n);
    v.group.scale({ x: 0.01, y: 0.01 });
    void this.tween(v.group, { scaleX: 1, scaleY: 1 }, 0.45, this.K.Easings.BackEaseOut);
    if (!this.startId) this.startId = n.id;
    this.graphChanged();
    return n;
  }

  addEdge(u: string, v: string, w = randWeight()): GEdge | null {
    if (u === v || !this.nodes.has(u) || !this.nodes.has(v)) return null;
    const L = (id: string) => this.nodes.get(id)?.label ?? "?";
    const dup = [...this.edges.values()].find((e) => (e.u === u && e.v === v) || (!this.directed && e.u === v && e.v === u));
    if (dup) {
      this.status("That edge already exists", `${L(u)} and ${L(v)} are already connected.`, "warn");
      void this.flashEdge(dup.id);
      return null;
    }
    this.stopAlgorithm(true);
    const e: GEdge = { id: `e${++this.uid}`, u, v, w };
    this.edges.set(e.id, e);
    const view = this.makeEdgeView(e);
    const p = this.edgePts(e);
    view.line.points([p[0], p[1], p[0], p[1], p[0], p[1], p[0], p[1]]);
    view.label.opacity(0);
    void this.reshapeEdges(0.45).then(() => {
      if (this.weighted && this.edgeViews.get(e.id) === view) void this.tween(view.label, { opacity: 1 }, 0.25);
    });
    this.graphChanged();
    this.status(`Added edge ${this.edgeName(e)}`, this.weighted ? `Weight ${w}. Click the weight label to change it.` : "", "ok");
    return e;
  }

  private dropEdge(id: string) {
    const v = this.edgeViews.get(id);
    this.edges.delete(id);
    this.edgeViews.delete(id);
    if (!v) return;
    v.line.listening(false);
    v.label.listening(false);
    void this.tween(v.line, { opacity: 0 }, 0.3).then(() => v.line.destroy());
    void this.tween(v.label, { opacity: 0 }, 0.3).then(() => v.label.destroy());
  }

  removeNode(id: string) {
    const n = this.nodes.get(id);
    if (!n) return;
    this.stopAlgorithm(true);
    [...this.edges.values()].filter((e) => e.u === id || e.v === id).forEach((e) => this.dropEdge(e.id));
    const v = this.nodeViews.get(id);
    this.nodes.delete(id);
    this.nodeViews.delete(id);
    if (v) {
      v.group.listening(false);
      void this.tween(v.group, { scaleX: 0.01, scaleY: 0.01, opacity: 0 }, 0.3).then(() => v.group.destroy());
    }
    if (this.startId === id) this.startId = this.sortedNodes()[0]?.id ?? null;
    void this.reshapeEdges(0.35);
    this.graphChanged();
    this.status(`Deleted node ${n.label}`, "Its edges were removed too.", "danger");
  }

  removeEdge(id: string) {
    const e = this.edges.get(id);
    if (!e) return;
    const name = this.edgeName(e);
    this.stopAlgorithm(true);
    this.dropEdge(id);
    void this.reshapeEdges(0.35);
    this.graphChanged();
    this.status(`Deleted edge ${name}`, "", "danger");
  }

  // ───────────────────────────── weight editing ─────────────────────────────

  private openWeightEdit(id: string) {
    const e = this.edges.get(id);
    const v = this.edgeViews.get(id);
    if (!e || !v) return;
    if (this.weightEdit) this.closeWeightEdit();
    const a = v.label.getAbsolutePosition();
    const sw = this.stage.width();
    this.weightEdit = {
      edgeId: id,
      name: this.edgeName(e),
      weight: e.w,
      x: clamp(a.x, 130, Math.max(130, sw - 130)),
      y: a.y,
      below: a.y < 170,
    };
    void this.tween(v.label, { scaleX: 1.3, scaleY: 1.3 }, 0.15);
    void this.tween(v.lbg, { stroke: GTHEME.badgeHot[1] }, 0.15);
    this.emit();
  }

  /** Close the weight editor without changing anything. */
  closeWeightEdit() {
    const we = this.weightEdit;
    if (!we) return;
    this.weightEdit = null;
    const v = this.edgeViews.get(we.edgeId);
    if (v) {
      void this.tween(v.label, { scaleX: 1, scaleY: 1 }, 0.15);
      void this.styleEdge(we.edgeId, v.state, 0.15);
    }
    this.emit();
  }

  setWeight(id: string, w: number): boolean {
    const e = this.edges.get(id);
    if (!e) return false;
    if (!Number.isInteger(w) || w < WEIGHT_MIN || w > WEIGHT_MAX) {
      this.status("Invalid weight", `Use a whole number between ${WEIGHT_MIN} and ${WEIGHT_MAX}.`, "danger");
      return false;
    }
    this.weightEdit = null;
    const v = this.edgeViews.get(id);
    if (w === e.w) {
      if (v) {
        void this.tween(v.label, { scaleX: 1, scaleY: 1 }, 0.15);
        void this.styleEdge(id, v.state, 0.15);
      }
      this.emit();
      return true;
    }
    this.stopAlgorithm(true);
    e.w = w;
    this.setWeightText(e);
    if (v) {
      void this.styleEdge(id, v.state, 0.15);
      void (async () => {
        await this.tween(v.label, { scaleX: 1.45, scaleY: 1.45 }, 0.12);
        await this.tween(v.label, { scaleX: 1, scaleY: 1 }, 0.22, this.K.Easings.BackEaseOut);
      })();
    }
    this.graphChanged();
    this.status(
      `Weight of ${this.edgeName(e)} set to ${w}`,
      w < 0 ? "Negative weight! Dijkstra can give wrong answers now — **Bellman-Ford** handles it and can detect negative cycles." : "",
      w < 0 ? "warn" : "ok",
    );
    return true;
  }

  // ───────────────────────────── graph settings ─────────────────────────────

  setStart(id: string) {
    const n = this.nodes.get(id);
    if (!n) return;
    const changed = id !== this.startId;
    this.startId = id;
    if (changed && this.steps.length && this.algoKey && ALGOS[this.algoKey].start) this.stopAlgorithm(true);
    this.paintStart();
    this.updateHud();
    this.layer.batchDraw();
    if (!this.steps.length) {
      this.status(`Start node: ${n.label}`, "BFS, DFS, Dijkstra, Bellman-Ford and Prim will begin here. Press **Run**.", "ok");
    } else this.emit();
  }

  setDirected(on: boolean) {
    if (on === this.directed) return;
    this.stopAlgorithm(true);
    this.cancelPending();
    this.closeWeightEdit();
    this.directed = on;
    let dropped = 0;
    if (!on) {
      const seen = new Set<string>();
      [...this.edges.values()].forEach((e) => {
        const k = [e.u, e.v].sort().join("|");
        if (seen.has(k)) {
          this.dropEdge(e.id);
          dropped++;
        } else seen.add(k);
      });
    }
    void this.reshapeEdges(0.5);
    this.graphChanged();
    this.status(
      on ? "Directed graph" : "Undirected graph",
      on
        ? "Each edge now points from the node it was drawn from. It can only be followed in the direction of its arrow."
        : "Edges now work both ways." + (dropped ? ` ${plural(dropped, "duplicate edge")} (the reverse of another edge) removed.` : ""),
      "ok",
    );
  }

  setWeighted(on: boolean) {
    if (on === this.weighted) return;
    this.stopAlgorithm(true);
    this.closeWeightEdit();
    this.weighted = on;
    this.edgeViews.forEach((v) => {
      v.label.listening(on);
      void this.tween(v.label, { opacity: on ? 1 : 0 }, 0.3);
    });
    this.graphChanged();
    this.status(on ? "Weighted graph" : "Unweighted graph", on ? "Each edge has a cost. Click a weight to change it." : "Every edge now counts as 1.", "ok");
  }

  private clearViews() {
    this.nodeViews.forEach((v) => {
      v.group.listening(false);
      void this.tween(v.group, { opacity: 0, scaleX: 0.4, scaleY: 0.4 }, 0.2).then(() => v.group.destroy());
    });
    this.edgeViews.forEach((v) => {
      v.line.listening(false);
      v.label.listening(false);
      void this.tween(v.line, { opacity: 0 }, 0.2).then(() => v.line.destroy());
      void this.tween(v.label, { opacity: 0 }, 0.2).then(() => v.label.destroy());
    });
    this.nodes.clear();
    this.edges.clear();
    this.nodeViews.clear();
    this.edgeViews.clear();
    this.startId = null;
  }

  clear() {
    this.stopAlgorithm(true);
    this.cancelPending();
    this.closeWeightEdit();
    this.clearViews();
    this.chooseArea();
    this.fit();
    this.graphChanged();
    this.status("Graph cleared", "Pick the **Node** tool (N) and click the canvas to add nodes, or press **Generate**.");
  }

  generate(kind: PresetKind = "random", count = 7) {
    this.build(randomSpec(kind, count, this.directed));
  }

  /** Replace the graph with `spec`, popping nodes in one by one and growing the edges out of them. */
  load(spec: GraphSpec) {
    this.build(spec);
  }

  /**
   * Build `spec`, then run `key` once the nodes have popped in (lesson "Try it" buttons).
   * Skipped if the graph is edited or another run starts in the meantime.
   */
  loadAndRun(spec: GraphSpec, key: AlgoKey) {
    this.build(spec);
    const gen = this.graphGen;
    const delay = this.sec(0.06) * 1000 * spec.n + 150 + Math.min(this.sec(0.05) * 1000 * spec.edges.length, 700) + 250;
    this.later(() => {
      if (this.graphGen === gen && !this.steps.length) this.run(key);
    }, delay);
  }

  /** The graph as plain data: labels, positions normalised to a landscape box, edges by label. */
  exportGraph(): GraphExport {
    const portrait = this.VH > this.VW * 1.05; // specPositions() rotates presets on portrait canvases — undo that
    const unit = (v: number) => clamp(v, 0, 1);
    const L = (id: string) => this.nodes.get(id)?.label ?? "?";
    return {
      directed: this.directed,
      weighted: this.weighted,
      nodes: this.sortedNodes().map((n) => ({
        label: n.label,
        x: unit(portrait ? n.y / this.VH : n.x / this.VW),
        y: unit(portrait ? n.x / this.VW : n.y / this.VH),
      })),
      edges: [...this.edges.values()].map((e) => ({ u: L(e.u), v: L(e.v), w: e.w })),
      start: this.startId ? L(this.startId) : null,
    };
  }

  private build(spec: GraphSpec) {
    this.stopAlgorithm(true);
    this.cancelPending();
    this.closeWeightEdit();
    this.clearViews();
    this.chooseArea();
    this.fit();
    if (spec.directed !== undefined) this.directed = spec.directed;
    if (spec.weighted !== undefined) this.weighted = spec.weighted;

    const ids: string[] = [];
    for (let i = 0; i < spec.n; i++) {
      const n: NodeData = { id: `n${++this.uid}`, label: spec.labels?.[i] ?? LETTERS[i], x: 0, y: 0 };
      this.nodes.set(n.id, n);
      ids.push(n.id);
    }
    const pos = spec.pos ? this.specPositions(spec.pos, ids) : forceLayout(ids, spec.edges.map(([a, b]) => [ids[a], ids[b]] as const), this.VW, this.VH);

    const stagger = this.sec(0.06) * 1000;
    ids.forEach((id, i) => {
      const n = this.nodes.get(id) as NodeData;
      const p = pos.get(id) as Point;
      n.x = p.x;
      n.y = p.y;
      const v = this.makeNodeView(n);
      v.group.scale({ x: 0.01, y: 0.01 });
      this.later(() => void this.tween(v.group, { scaleX: 1, scaleY: 1 }, 0.45, this.K.Easings.BackEaseOut), stagger * i);
    });
    const edgeStart = stagger * ids.length + 150;
    spec.edges.forEach(([a, b, w], j) => {
      const e: GEdge = { id: `e${++this.uid}`, u: ids[a], v: ids[b], w: w ?? randWeight() };
      this.edges.set(e.id, e);
      this.makeEdgeView(e);
      this.growEdge(e, edgeStart + this.sec(0.05) * 1000 * j);
    });
    this.startId = ids[spec.start ?? 0] ?? ids[0] ?? null;
    this.graphChanged();
    this.status(spec.title, spec.detail, "ok");
  }

  /** Fixed preset positions live in a 1000 × 560 box; a portrait canvas gets them rotated. */
  private specPositions(pos: readonly [number, number][], ids: string[]) {
    const portrait = this.VH > this.VW * 1.05;
    return new Map<string, Point>(
      ids.map((id, i) => {
        const [px, py] = pos[i];
        const [x, y, bw, bh] = portrait ? [py, px, 560, 1000] : [px, py, 1000, 560];
        return [id, { x: (x / bw) * this.VW, y: (y / bh) * this.VH }];
      }),
    );
  }

  arrange() {
    if (this.nodes.size < 2) return Promise.resolve();
    this.closeWeightEdit();
    const ids = [...this.nodes.keys()];
    const init = new Map(ids.map((id) => [id, { ...this.npos(id) }]));
    const pos = forceLayout(ids, [...this.edges.values()].map((e) => [e.u, e.v] as const), this.VW, this.VH, init);
    const moves = ids.map((id) => {
      const v = this.nodeViews.get(id) as NodeView;
      return { n: this.nodes.get(id) as NodeData, g: v.group, x0: v.group.x(), y0: v.group.y(), p: pos.get(id) as Point };
    });
    if (!this.steps.length) this.status("Auto-arrange", "Nodes push each other apart while edges pull their ends together, until everything settles.");
    return this.animate(this.sec(0.9) * 1000, (k) => {
      moves.forEach((m) => {
        m.g.position({ x: lerp(m.x0, m.p.x, k), y: lerp(m.y0, m.p.y, k) });
        m.n.x = m.g.x();
        m.n.y = m.g.y();
      });
      this.refreshEdges();
    });
  }

  private graphChanged() {
    this.graphGen++;
    if (this.steps.length) this.stopAlgorithm(true);
    this.updateHud();
    this.paintStart();
    this.layer.batchDraw();
    this.emit();
  }
}
