/*
 * bst_visualizer.js — BSTVisualizer, the shared parent class for binary-search-tree visualizers.
 *
 * This class owns everything a search tree needs regardless of how it balances:
 *   • the node/edge view model and the morph animation engine
 *   • BST search and the animated walk down the tree (_descend)
 *   • insert / delete / traverse / search skeletons
 *   • height + balance-factor bookkeeping (_recalc) so children can display it
 *
 * Subclasses customize behavior through three seams (Template Method pattern):
 *   • _insertSilent(v)   — build a tree without animation (default: plain BST insert)
 *   • _afterInsert(path) — called after a value is attached (default: status only)
 *   • _afterDelete(chain)— called after a node is unlinked (default: status only)
 *
 * app/javascript/avl_tree.js uses all three: its AVLVisualizer extends this class,
 * overrides _insertSilent to rebalance, and overrides the hooks to retrace and
 * rotate. Search, drawing and animation are inherited, never duplicated.
 */

const MONO = 'Consolas, Monaco, monospace';

const THEME = {
  key: {
    base:    ['#454552', '#6c6c78', '#ececec'],
    compare: ['#0b6fb8', '#5ab4ff', '#ffffff'],
    moving:  ['#ffb000', '#ffd466', '#1a1a1a'],
    danger:  ['#d93636', '#ff8a8a', '#ffffff'],
    success: ['#00a854', '#5cffa8', '#ffffff'],
    left:    ['#1e6fb8', '#7cc4ff', '#ffffff'],
    merge:   ['#7a45b8', '#d2adff', '#ffffff'],
  },
  line: {
    base:   { stroke: '#5c5c6a', width: 2.5 },
    active: { stroke: '#39aaff', width: 4 },
    cut:    { stroke: '#ff5c5c', width: 3, dash: [6, 6] },
    fresh:  { stroke: '#2ee68a', width: 4 },
  },
  badge: {
    ok:  ['#1b1b22', '#55555f', '#b8b8c4'],
    bad: ['#4a1b1b', '#ff5c5c', '#ffb0b0'],
  },
  tone: {
    info:   ['#0a84d6', '#ffffff'],
    warn:   ['#ffb000', '#1a1a1a'],
    danger: ['#e53935', '#ffffff'],
    ok:     ['#00c864', '#06140c'],
    merge:  ['#8e5bd6', '#ffffff'],
  },
  text: { info: '#39aaff', ok: '#2ee68a', warn: '#ffb000', danger: '#ff5c5c', merge: '#c08bff' },
};

const EDGE_OPACITY = 0.9;
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const hOf = n => (n ? n.h : 0);
const fmtBf = bf => (bf > 0 ? `+${bf}` : String(bf));
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const fontFor = s => (s.length <= 2 ? 15 : s.length === 3 ? 13 : s.length === 4 ? 11 : 10);
const toward = (a, b, d) => {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  return { x: a.x + (dx / len) * d, y: a.y + (dy / len) * d };
};

export { THEME, hOf, fmtBf, plural, fontFor, toward, ease, MONO };

export class BSTVisualizer {
  constructor(container) {
    this.container = container;
    this.G = { col: 54, level: 88, r: 21, top: 132 };
    this.speed = 1;
    this.busy = false;
    this.uid = 0;
    this.onBusy = null;
    this.showMeta = true;
    this.root = null;
    this.nodeViews = new Map();   // node id -> view
    this.edgeViews = new Map();   // "parentId>childId" -> { line, pv, cv }
    this.dyingEdges = new Set();  // edges fading out (still follow their nodes)
    this.floating = new Set();    // node ids moved by hand (morph leaves them alone)
    this._initStage();
    this.reset();
  }

  // ───────────────────────────── overridable labels ─────────────────────────────

  _treeLabel() { return 'BST'; }

  _hudText() {
    return `${this._treeLabel()} tree  ·  ${plural(this._count(), 'node')}  ·  height ${hOf(this.root)}`;
  }

  _hintText() {
    return 'Empty tree — insert a value, or run a sequence like 10, 20, 30, 40, 50';
  }

  // ───────────────────────────── setup ─────────────────────────────

  _initStage() {
    const c = this.container;
    const panel = document.getElementById('info-panel');
    if (panel) panel.style.zIndex = '10';

    this.stage = new Konva.Stage({ container: c, width: c.offsetWidth, height: c.offsetHeight, draggable: true });
    this.layer = new Konva.Layer();
    this.stage.add(this.layer);

    this.hud = new Konva.Text({ x: 16, y: 14, fontSize: 13, fontFamily: MONO, fill: '#8a8a96' });
    this.hint = new Konva.Text({
      fontSize: 16, fill: '#7a7a86', align: 'center',
      text: this._hintText(),
    });
    this.world = new Konva.Group();
    this.edgeGroup = new Konva.Group();
    this.nodeGroup = new Konva.Group();
    this.fxGroup = new Konva.Group();
    this.world.add(this.edgeGroup, this.nodeGroup, this.fxGroup);
    this.outGroup = new Konva.Group();
    this.layer.add(this.hud, this.hint, this.world, this.outGroup);

    this.stage.on('dblclick dbltap', () => { this.stage.position({ x: 0, y: 0 }); this.layer.batchDraw(); });

    const onResize = () => this._resize();
    if (window.ResizeObserver) new ResizeObserver(onResize).observe(c);
    else window.addEventListener('resize', onResize);
  }

  reset() {
    this.root = null;
    this.floating.clear();
    [this.edgeGroup, this.nodeGroup, this.fxGroup, this.outGroup].forEach(g => g.destroyChildren());
    this.nodeViews.clear();
    this.edgeViews.clear();
    this.dyingEdges.clear();
    this._updateHud();
    this._resize();
  }

  _resize() {
    const c = this.container;
    this.stage.size({ width: c.offsetWidth, height: c.offsetHeight });
    this.hint.setAttrs({ x: 0, y: this.stage.height() / 2 - 10, width: this.stage.width() });
    this.hint.visible(!this.root);
    if (!this.busy) this._fitNow();
    this.layer.batchDraw();
  }

  _updateHud() {
    this.hud.text(this._hudText());
  }

  setShowMeta(on) {
    this.showMeta = on;
    this.nodeViews.forEach(v => v.meta && v.meta.visible(on));
    this.layer.batchDraw();
  }

  // ───────────────────────────── data helpers ─────────────────────────────

  _newNode(v) { return { id: `n${++this.uid}`, v, left: null, right: null, h: 1, bf: 0, parent: null }; }

  _recalc(n) {
    const hl = hOf(n.left), hr = hOf(n.right);
    n.h = 1 + Math.max(hl, hr);
    n.bf = hl - hr;
  }

  _count() { let c = 0; const w = n => { if (n) { c++; w(n.left); w(n.right); } }; w(this.root); return c; }

  _values() { const out = []; const w = n => { if (n) { w(n.left); out.push(n.v); w(n.right); } }; w(this.root); return out; }

  _collect(n) { const out = []; const w = m => { if (m) { out.push(m); w(m.left); w(m.right); } }; w(n); return out; }

  _recalcPath(n) {
    // Recompute h/bf for n and every ancestor up to the root.
    while (n) {
      this._recalc(n);
      n = n === this.root ? null : (n === n.parent ? null : null);
    }
  }

    // Plain BST insert used for silent (non-animated) tree building.
  // Subclasses override this — the AVL child re-balances while inserting.
  _insertSilent(v) {
    const ins = n => {
      if (!n) return this._newNode(v);
      if (v < n.v) n.left = ins(n.left);
      else if (v > n.v) n.right = ins(n.right);
      else return n;
      this._recalc(n);
      return n;
    };
    this.root = ins(this.root);
  }

  // ───────────────────────────── layout ─────────────────────────────

  _layout() {
    const { col, level, r } = this.G;
    const nodes = new Map();
    let i = 0, depth = 0;
    const walk = (n, d) => {
      if (!n) return;
      walk(n.left, d + 1);
      nodes.set(n.id, { node: n, x: i++ * col, y: d * level });
      depth = Math.max(depth, d);
      walk(n.right, d + 1);
    };
    walk(this.root, 0);
    const span = Math.max(0, (i - 1) * col);
    nodes.forEach(g => { g.x -= span / 2; });
    return { nodes, width: i ? span + 4 * r : 0, height: i ? depth * level + 2 * r + 24 : 0 };
  }

  _fitFor(L) {
    const sw = this.stage.width(), sh = this.stage.height();
    let s = Math.min(1, (sw - 60) / Math.max(L.width, 1), (sh - this.G.top - 130) / Math.max(L.height, 1));
    s = Math.max(0.3, s);
    return { x: sw / 2, y: this.G.top, s };
  }

  _fitNow() {
    const f = this._fitFor(this._layout());
    this.world.setAttrs({ x: f.x, y: f.y, scaleX: f.s, scaleY: f.s });
    this._refreshEdges();
  }

  _pos(n) {
    const v = this.nodeViews.get(n.id);
    if (v) return { x: v.group.x(), y: v.group.y() };
    const g = this._layout().nodes.get(n.id);
    return g ? { x: g.x, y: g.y } : { x: 0, y: 0 };
  }

  _rootPos() { return this.root ? this._pos(this.root) : { x: 0, y: 0 }; }

  // ───────────────────────────── shapes ─────────────────────────────

  _shape(value, withMeta = false) {
    const R = this.G.r;
    const [fill, stroke, tc] = THEME.key.base;
    const group = new Konva.Group();
    const circle = new Konva.Circle({
      radius: R, fill, stroke, strokeWidth: 2.5,
      shadowColor: 'black', shadowBlur: 8, shadowOpacity: 0.4, shadowOffset: { x: 0, y: 3 },
    });
    const str = String(value);
    const text = new Konva.Text({
      x: -R - 6, y: -R, width: 2 * R + 12, height: 2 * R, text: str,
      align: 'center', verticalAlign: 'middle', fontSize: fontFor(str), fontStyle: 'bold',
      fontFamily: MONO, fill: tc, listening: false,
    });
    group.add(circle, text);
    const v = { group, circle, text };
    if (withMeta) {
      v.meta = new Konva.Group({ visible: this.showMeta, listening: false });
      v.badge = new Konva.Group({ x: R * 0.9, y: -R * 0.95 });
      v.bfBg = new Konva.Rect({ height: 17, cornerRadius: 8.5, strokeWidth: 1.5 });
      v.bfText = new Konva.Text({ height: 17, fontSize: 11, fontStyle: 'bold', fontFamily: MONO, align: 'center', verticalAlign: 'middle' });
      v.badge.add(v.bfBg, v.bfText);
      v.hText = new Konva.Text({ x: -R, y: R + 4, width: 2 * R, align: 'center', fontSize: 10, fontFamily: MONO, fill: '#7a7a86' });
      v.meta.add(v.badge, v.hText);
      group.add(v.meta);
    }
    return v;
  }

  _makeNodeView(n, x, y) {
    const v = this._shape(n.v, true);
    v.group.position({ x, y });
    this.nodeGroup.add(v.group);
    this.nodeViews.set(n.id, v);
    this._paintMeta(n, v);
    return v;
  }

  // Draws the balance-factor badge and height label; returns true if anything changed.
  _paintMeta(n, v = this.nodeViews.get(n.id)) {
    if (!v || !v.meta) return false;
    const txt = fmtBf(n.bf), ht = `h=${n.h}`;
    const changed = v.bfText.text() !== txt || v.hText.text() !== ht;
    const w = Math.max(24, Math.ceil(v.bfText.measureSize(txt).width) + 12);
    const [bg, st, fg] = Math.abs(n.bf) > 1 ? THEME.badge.bad : THEME.badge.ok;
    v.bfBg.setAttrs({ x: -w / 2, y: -8.5, width: w, fill: bg, stroke: st });
    v.bfText.setAttrs({ x: -w / 2, y: -8.5, width: w, text: txt, fill: fg });
    v.hText.text(ht);
    return changed;
  }

  async _updateMeta(n) {
    const v = this.nodeViews.get(n.id);
    if (!this._paintMeta(n, v) || !this.showMeta) return;
    await this.tween(v.badge, { scaleX: 1.5, scaleY: 1.5 }, 0.15);
    await this.tween(v.badge, { scaleX: 1, scaleY: 1 }, 0.15);
  }

  _edgeKey(p, c) { return `${p.id}>${c.id}`; }

  _wantEdges() {
    const out = new Map();
    const walk = n => {
      if (!n) return;
      [n.left, n.right].forEach(c => { if (c) { out.set(this._edgeKey(n, c), { p: n, c }); walk(c); } });
    };
    walk(this.root);
    return out;
  }

  _edgePts(pv, cv) {
    const R = this.G.r;
    const px = pv.group.x(), py = pv.group.y(), cx = cv.group.x(), cy = cv.group.y();
    const dx = cx - px, dy = cy - py, d = Math.hypot(dx, dy);
    if (d < 2 * R) return [px, py, px, py];
    const ux = dx / d, uy = dy / d;
    return [px + ux * R, py + uy * R, cx - ux * R, cy - uy * R];
  }

  _makeEdge(pv, cv) {
    const line = new Konva.Line({
      points: this._edgePts(pv, cv), stroke: THEME.line.base.stroke, strokeWidth: THEME.line.base.width,
      lineCap: 'round', opacity: 0, listening: false,
    });
    this.edgeGroup.add(line);
    return { line, pv, cv };
  }

  _refreshEdges() {
    this.edgeViews.forEach(ev => ev.line.points(this._edgePts(ev.pv, ev.cv)));
    this.dyingEdges.forEach(ev => ev.line.points(this._edgePts(ev.pv, ev.cv)));
  }

  _label(text, x, y, tone = 'info', dir = 'down') {
    const [bg, fg] = THEME.tone[tone];
    const lbl = new Konva.Label({ x, y, opacity: 0, listening: false });
    lbl.add(new Konva.Tag({
      fill: bg, pointerDirection: dir, pointerWidth: 10, pointerLength: 7, cornerRadius: 6,
      shadowColor: 'black', shadowBlur: 6, shadowOpacity: 0.4,
    }));
    lbl.add(new Konva.Text({ text, padding: 6, fontSize: 13, fontStyle: 'bold', fontFamily: MONO, fill: fg }));
    this.fxGroup.add(lbl);
    this.tween(lbl, { opacity: 1 }, 0.2);
    return lbl;
  }

  _nodeLabel(n, text, tone) {
    const p = this._pos(n);
    return this._label(text, p.x, p.y - this.G.r - (this.showMeta ? 20 : 4), tone, 'down');
  }

  _dropLabel(lbl) {
    if (lbl) this.tween(lbl, { opacity: 0 }, 0.2).then(() => lbl.destroy());
  }

  // Dashed curved arrow showing where a node is about to travel.
  _pathArrow(a, b, bow, color) {
    const R = this.G.r;
    const c = { x: (a.x + b.x) / 2 + bow.x, y: (a.y + b.y) / 2 + bow.y };
    const p0 = toward(a, c, R + 3), p3 = toward(b, c, R + 5);
    const c1 = { x: p0.x + (c.x - p0.x) * 2 / 3, y: p0.y + (c.y - p0.y) * 2 / 3 };
    const c2 = { x: p3.x + (c.x - p3.x) * 2 / 3, y: p3.y + (c.y - p3.y) * 2 / 3 };
    const arrow = new Konva.Arrow({
      points: [p0.x, p0.y, c1.x, c1.y, c2.x, c2.y, p3.x, p3.y], bezier: true,
      stroke: color, fill: color, strokeWidth: 2.5, dash: [7, 6], pointerLength: 10, pointerWidth: 10,
      opacity: 0, listening: false,
    });
    this.fxGroup.add(arrow);
    this.tween(arrow, { opacity: 0.95 }, 0.25);
    return arrow;
  }

  status(title, detail = '', tone = 'info') {
    const el = document.getElementById('operation-details');
    if (!el) return;
    el.innerHTML =
      `<div style="color:${THEME.text[tone]};font-weight:700;margin-bottom:4px">${title}</div>` +
      (detail ? `<div style="font-size:0.85rem;line-height:1.45;opacity:0.9">${detail}</div>` : '');
  }

  // ───────────────────────────── animation primitives ─────────────────────────────

  _sec(s) { return s * this.speed; }

  pause(s) { return new Promise(r => setTimeout(r, this._sec(s) * 1000)); }

  tween(node, attrs, s, easing = Konva.Easings.EaseInOut) {
    const duration = this._sec(s);
    return new Promise(resolve => {
      if (!node) return resolve();
      if (duration <= 0.001 || !node.getLayer()) {
        node.setAttrs(attrs);
        this.layer.batchDraw();
        return resolve();
      }
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      const tw = new Konva.Tween({ node, duration, easing, ...attrs, onFinish: () => { tw.destroy(); finish(); } });
      tw.play();
      setTimeout(finish, duration * 1000 + 1000); // safety net if a node is destroyed mid-tween
    });
  }

  _animate(ms, frame) {
    return new Promise(resolve => {
      if (ms < 20) { frame(1); this.layer.batchDraw(); resolve(); return; }
      const anim = new Konva.Animation(f => {
        const p = Math.min(1, f.time / ms);
        frame(ease(p));
        if (p >= 1) { anim.stop(); resolve(); }
      }, this.layer);
      anim.start();
    });
  }

  _styleView(v, style, s = 0.25) {
    if (!v) return Promise.resolve();
    const [fill, stroke, text] = THEME.key[style];
    const attrs = { fill, stroke, strokeWidth: style === 'base' ? 2.5 : 3.5 };
    if (s === 0) { v.circle.setAttrs(attrs); v.text.fill(text); return Promise.resolve(); }
    return Promise.all([this.tween(v.circle, attrs, s), this.tween(v.text, { fill: text }, s)]);
  }

  nodeStyle(n, style, s = 0.25) { return n ? this._styleView(this.nodeViews.get(n.id), style, s) : Promise.resolve(); }

  subtreeStyle(n, style, s = 0.25) { return Promise.all(this._collect(n).map(m => this.nodeStyle(m, style, s))); }

  edgeStyle(p, c, style = 'active', s = 0.2) {
    const ev = p && c && this.edgeViews.get(this._edgeKey(p, c));
    if (!ev) return Promise.resolve();
    const S = THEME.line[style];
    ev.line.dash(S.dash || []);
    ev.line.dashEnabled(!!S.dash);
    return this.tween(ev.line, { stroke: S.stroke, strokeWidth: S.width }, s);
  }

  resetStyles(s = 0.3) {
    const jobs = [];
    this.nodeViews.forEach(v => jobs.push(this._styleView(v, 'base', s)));
    this.edgeViews.forEach(ev => {
      ev.line.dashEnabled(false);
      jobs.push(this.tween(ev.line, { stroke: THEME.line.base.stroke, strokeWidth: THEME.line.base.width }, s));
    });
    return Promise.all(jobs);
  }

  async _pulse(v) {
    if (!v) return;
    await this.tween(v.group, { scaleX: 1.3, scaleY: 1.3 }, 0.16);
    await this.tween(v.group, { scaleX: 1, scaleY: 1 }, 0.2);
  }

  async _flash(n) {
    const v = this.nodeViews.get(n.id);
    if (!v) return;
    for (let r = 0; r < 2; r++) {
      await this.tween(v.circle, { strokeWidth: 7 }, 0.12);
      await this.tween(v.circle, { strokeWidth: 3.5 }, 0.12);
    }
  }

  async _shake(group) {
    const x = group.x();
    for (const dx of [-7, 7, -5, 5, 0]) await this.tween(group, { x: x + dx }, 0.05);
  }

  async _probe(v, style) {
    const g = this._rootPos();
    const p = this._shape(v);
    p.group.setAttrs({ x: g.x, y: g.y - 80, scaleX: 0.01, scaleY: 0.01 });
    this.fxGroup.add(p.group);
    await this._styleView(p, style, 0);
    await this.tween(p.group, { y: g.y - 58, scaleX: 1, scaleY: 1 }, 0.35, Konva.Easings.BackEaseOut);
    return p;
  }

  _move(g, x1, y1, s1, o1, bow) {
    const m = { g, x0: g.x(), y0: g.y(), s0: g.scaleX(), o0: g.opacity(), x1, y1, s1, o1 };
    if (bow && Math.hypot(x1 - m.x0, y1 - m.y0) > 1) {
      m.cx = (m.x0 + x1) / 2 + bow.x;
      m.cy = (m.y0 + y1) / 2 + bow.y;
    }
    return m;
  }

  /**
   * Glide every node from where it is now to where the current data says it should be.
   * New nodes grow in, removed nodes shrink out, edges cross-fade and follow their nodes
   * every frame. opts.bow (Map id -> {x,y}) makes those nodes travel along an arc.
   */
  morph(s = 0.7, opts = {}) {
    const L = this._layout();
    const fit = this._fitFor(L);
    const moves = [];
    this.hint.visible(!this.root);
    this._updateHud();

    for (const [id, t] of L.nodes) {
      if (this.floating.has(id)) continue;
      let v = this.nodeViews.get(id);
      if (!v) {
        v = this._makeNodeView(t.node, t.x, t.y - 16);
        v.group.setAttrs({ scaleX: 0.01, scaleY: 0.01, opacity: 0 });
      }
      moves.push(this._move(v.group, t.x, t.y, 1, 1, opts.bow && opts.bow.get(id)));
    }
    for (const [id, v] of [...this.nodeViews]) {
      if (L.nodes.has(id) || this.floating.has(id)) continue;
      this.nodeViews.delete(id);
      const m = this._move(v.group, v.group.x(), v.group.y(), 0.01, 0);
      m.kill = true;
      moves.push(m);
    }

    const want = this._wantEdges();
    const fades = [];
    for (const [key, e] of want) {
      let ev = this.edgeViews.get(key);
      if (!ev) {
        const pv = this.nodeViews.get(e.p.id), cv = this.nodeViews.get(e.c.id);
        if (!pv || !cv) continue;
        ev = this._makeEdge(pv, cv);
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

    const w = this.world, W0 = { x: w.x(), y: w.y(), s: w.scaleX() };
    return this._animate(this._sec(s) * 1000, k => {
      for (const m of moves) {
        let x, y;
        if (m.cx !== undefined) {
          const a = (1 - k) * (1 - k), b = 2 * (1 - k) * k, c = k * k;
          x = a * m.x0 + b * m.cx + c * m.x1;
          y = a * m.y0 + b * m.cy + c * m.y1;
        } else {
          x = m.x0 + (m.x1 - m.x0) * k;
          y = m.y0 + (m.y1 - m.y0) * k;
        }
        const sc = m.s0 + (m.s1 - m.s0) * k;
        m.g.setAttrs({ x, y, scaleX: sc, scaleY: sc, opacity: m.o0 + (m.o1 - m.o0) * k });
      }
      for (const f of fades) f.line.opacity(f.o0 + (f.o1 - f.o0) * k);
      const ws = W0.s + (fit.s - W0.s) * k;
      w.setAttrs({ x: W0.x + (fit.x - W0.x) * k, y: W0.y + (fit.y - W0.y) * k, scaleX: ws, scaleY: ws });
      this._refreshEdges();
    }).then(() => {
      moves.forEach(m => { if (m.kill) m.g.destroy(); });
      fades.forEach(f => { if (f.kill) { f.line.destroy(); this.dyingEdges.delete(f.kill); } });
      this.layer.batchDraw();
    });
  }

  _run(fn) {
    if (this.busy) return Promise.resolve(false);
    this.busy = true;
    if (this.onBusy) this.onBusy(true);
    this.outGroup.destroyChildren();
    return (async () => {
      try {
        await fn();
      } catch (err) {
        console.error(err);
        this.status('Animation error', err.message, 'danger');
      } finally {
        this.fxGroup.destroyChildren();
        this.floating.clear();
        await this.resetStyles(0.25);
        await this.morph(0.3); // resync view with data
        this.busy = false;
        if (this.onBusy) this.onBusy(false);
      }
      return true;
    })();
  }

  // ───────────────────────────── walking down the tree ─────────────────────────────

  async _descend(v, probe, title) {
    const path = [];
    let node = this.root;
    while (node) {
      const g = this._pos(node);
      probe.group.moveToTop();
      await this.tween(probe.group, { x: g.x, y: g.y - 58 }, 0.4);
      await this.nodeStyle(node, 'compare', 0.2);

      if (v === node.v) {
        const lbl = this._label(`found ${v}`, g.x + this.G.r + 6, g.y - 58, 'ok', 'left');
        await this.nodeStyle(node, 'success');
        await this.pause(0.5);
        this._dropLabel(lbl);
        return { path, node, found: true };
      }

      const dir = v < node.v ? 'left' : 'right';
      const next = node[dir];
      const cmp = `${v} ${v < node.v ? '<' : '>'} ${node.v}`;
      this.status(title, `At ${node.v}: ${cmp}, so go ${dir}` + (next ? ` to ${next.v}.` : ' — that spot is empty.'));
      const lbl = this._label(`${cmp} → ${dir}`, g.x + this.G.r + 6, g.y - 58, 'info', 'left');
      if (next) await this.edgeStyle(node, next, 'active');
      await this.pause(0.55);
      this._dropLabel(lbl);
      this.nodeStyle(node, 'base');
      if (next) this.edgeStyle(node, next, 'base', 0.5);
      path.push(node);
      node = next;
    }
    return { path, node: null, found: false };
  }

  // ───────────────────────────── INSERT ─────────────────────────────

  insert(v) { return this._run(() => this._insertSteps(v)); }

  insertMany(values) {
    return this._run(async () => {
      for (const v of values) {
        await this._insertSteps(v);
        await this.resetStyles(0.2);
      }
      this.status(`✓ Inserted ${plural(values.length, 'value')}`,
        `Tree height is ${hOf(this.root)} for ${plural(this._count(), 'node')}.`, 'ok');
    });
  }

  async _insertSteps(v) {
    const title = `Insert ${v}`;
    const n = this._newNode(v);
    const start = this._rootPos();
    const view = this._makeNodeView(n, start.x, start.y - 80);
    view.meta.visible(false);
    view.group.setAttrs({ scaleX: 0.01, scaleY: 0.01 });
    view.group.moveToTop();
    this.floating.add(n.id);
    this._styleView(view, 'moving', 0);
    await this.tween(view.group, { y: start.y - 58, scaleX: 1, scaleY: 1 }, 0.4, Konva.Easings.BackEaseOut);

    if (!this.root) {
      this.status(title, `The tree is empty, so ${v} becomes the root. A single node has height 1 and balance 0.`);
      this.root = n;
      this.floating.delete(n.id);
      view.meta.visible(this.showMeta);
      await this.morph(0.6);
      await this.nodeStyle(n, 'success');
      this.status(`✓ Inserted ${v}`, 'The root is the only node.', 'ok');
      await this.pause(0.4);
      return;
    }

    this.status(title, 'Walk down like a normal BST: smaller keys go left, larger keys go right.');
    const { path, found } = await this._descend(v, view, title);

    if (found) {
      this.status(`${v} is already in the tree`, 'Keys are kept unique, so nothing is inserted.', 'danger');
      this._styleView(view, 'danger');
      await this._shake(view.group);
      await this.tween(view.group, { opacity: 0, scaleX: 0.01, scaleY: 0.01 }, 0.35);
      view.group.destroy();
      this.nodeViews.delete(n.id);
      this.floating.delete(n.id);
      return;
    }

    const parent = path[path.length - 1];
    const side = v < parent.v ? 'left' : 'right';
    this.status(`Attach ${v}`, `${v} becomes the ${side} child of ${parent.v}. A new node is always a leaf: height 1, balance 0.`);
    parent[side] = n;
    n.parent = parent;
    // Recompute h/bf up the tree — new leaf is 1/0, ancestors change.
    this._recalcPath(n);
    this.floating.delete(n.id);
    view.meta.visible(this.showMeta);
    await this.morph(0.65);
    await this.nodeStyle(n, 'success');
    await this.pause(0.3);
    this.nodeStyle(n, 'base');

    // Template-Method hook: the plain BST parent stops here,
    // the AVL child overrides this to retrace and rotate.
    await this._afterInsert(path, n);
    await this.pause(0.4);
  }

  async _afterInsert(path, n) {
    this.status(`✓ Inserted ${n.v}`,
      `Tree height is ${hOf(this.root)} for ${plural(this._count(), 'node')}.`, 'ok');
  }

  // ───────────────────────────── DELETE ─────────────────────────────

  delete(v) { return this._run(() => this._deleteSteps(v)); }

  async _deleteSteps(v) {
    const title = `Delete ${v}`;
    if (!this.root) { this.status(title, 'The tree is empty.', 'danger'); return; }
    this.status(title, `First find ${v} with a normal BST search.`);
    const probe = await this._probe(v, 'danger');
    const { path, node: z, found } = await this._descend(v, probe, title);

    if (!found) {
      this._styleView(probe, 'danger');
      await this._shake(probe.group);
      this.status(`✗ ${v} not found`, 'Nothing to delete.', 'danger');
      await this.tween(probe.group, { opacity: 0 }, 0.4);
      await this.pause(0.4);
      return;
    }

    const zv = this.nodeViews.get(z.id);
    await this.tween(probe.group, { x: zv.group.x(), y: zv.group.y(), opacity: 0 }, 0.35);
    probe.group.destroy();
    await this.nodeStyle(z, 'danger');
    await this._pulse(zv);

    const parent = path[path.length - 1] || null;
    let chain;
    if (z.left && z.right) {
      chain = await this._deleteTwoChildren(z, path);
    } else {
      const child = z.left || z.right;
      if (child) {
        this.status(`${v} has one child`,
          `Remove ${v} and let its only child ${child.v} — with its whole subtree — move up into the gap.`, 'danger');
        await this.subtreeStyle(child, 'left');
      } else {
        this.status(`${v} is a leaf`, 'A leaf can simply be removed.', 'danger');
      }
      await this.pause(0.6);
    await this.tween(zv.group, { scaleX: 0.01, scaleY: 0.01, opacity: 0 }, 0.4);
    this._replaceChild(parent, z, child);
    await this.morph(0.75);
    chain = path;
  }

  // Recompute h/bf up the tree after the node was removed/replaced.
  this._recalcPath(parent);

  await this.resetStyles(0.25);
    // Template-Method hook: the plain BST parent stops here,
    // the AVL child overrides this to retrace and rotate.
    await this._afterDelete(chain, v);
    await this.pause(0.4);
  }

  async _afterDelete(chain, v) {
    this.status(`✓ Deleted ${v}`,
      this.root ? `Tree height is ${hOf(this.root)}.` : 'The tree is now empty.', 'ok');
  }

  async _deleteTwoChildren(z, path) {
    this.status(`${z.v} has two children`,
      "It can't just disappear. Replace it with its <b>in-order successor</b> — the smallest key in its right subtree — so everything on the left stays smaller and everything on the right stays larger.", 'warn');
    await this.pause(0.8);

    const below = [];   // nodes between z and the successor
    let s = z.right;
    await this.edgeStyle(z, s, 'active');
    let lbl = this._nodeLabel(s, 'right once', 'info');
    await this.nodeStyle(s, 'compare', 0.2);
    await this.pause(0.45);
    this._dropLabel(lbl);
    while (s.left) {
      lbl = this._nodeLabel(s, 'then left', 'info');
      await this.edgeStyle(s, s.left, 'active');
      await this.pause(0.4);
      this._dropLabel(lbl);
      below.push(s);
      s = s.left;
      await this.nodeStyle(s, 'compare', 0.2);
    }

    // 1 — successor found
    const sv = this.nodeViews.get(s.id);
    await this.nodeStyle(s, 'moving');
    await this._pulse(sv);
    lbl = this._nodeLabel(s, `successor ${s.v}`, 'warn');
    this.status('Step 1 · Found the successor',
      `${s.v} is the smallest key larger than ${z.v}` +
      (s.right ? `. Its right child ${s.right.v} will slide up into its old spot.` : ' and it is a leaf.'), 'warn');
    await this.pause(0.8);
    this._dropLabel(lbl);

    // 2 — hollow out z
    const zv = this.nodeViews.get(z.id);
    this.status('Step 2 · Remove the key', `${z.v} is removed, leaving a hole that still holds its two subtrees together.`, 'danger');
    zv.meta.visible(false);
    zv.circle.dash([5, 4]);
    zv.circle.dashEnabled(true);
    await Promise.all([
      this.tween(zv.circle, { fill: 'rgba(0,0,0,0)', stroke: '#8a8a96', strokeWidth: 2 }, 0.4),
      this.tween(zv.text, { opacity: 0 }, 0.4),
    ]);
    await this.pause(0.4);

    // 3 — successor flies up into the hole
    const sParent = below.length ? below[below.length - 1] : z;
    this.status('Step 3 · Successor moves up',
      `${s.v} leaves its spot` + (s.right ? `, ${s.right.v} moves up to replace it,` : '') +
      ` and ${s.v} takes over ${z.v}'s place and both of its subtrees.`, 'warn');
    if (sParent !== z) { sParent.left = s.right; s.right = z.right; }
    s.left = z.left;
    s.h = z.h;   // inherits z's old height so retracing compares against the right value
    s.bf = z.bf;
    s.parent = path[path.length - 1];
    this._replaceChild(path[path.length - 1] || null, z, s);
    sv.group.moveToTop();
    await this.morph(0.95);
    this._paintMeta(s);
    await this.nodeStyle(s, 'success');
    await this.pause(0.4);
    // After the successor is moved up into z's spot, recompute heights/bf up the tree.
    let d = s.parent === undefined ? null : s;
    while (d) { this._recalc(d); d = d.parent; }
    return [...path, s, ...below];
  }

  // ───────────────────────────── SEARCH ─────────────────────────────

  search(v) {
    return this._run(async () => {
      const title = `Search ${v}`;
      if (!this.root) { this.status(title, 'The tree is empty.', 'danger'); return; }
      this.status(title, 'Start at the root: smaller → go left, larger → go right.');
      const probe = await this._probe(v, 'compare');
      const { path, node, found } = await this._descend(v, probe, title);

      if (found) {
        const nv = this.nodeViews.get(node.id);
        await this.tween(probe.group, { x: nv.group.x(), y: nv.group.y(), opacity: 0 }, 0.4);
        probe.group.destroy();
        await this._pulse(nv);
        this.status(`✓ Found ${v}`,
          `Found at depth ${path.length} after ${plural(path.length + 1, 'comparison')}.`, 'ok');
      } else {
        this._styleView(probe, 'danger');
        await this._shake(probe.group);
        this.status(`✗ ${v} not found`, `Fell off the tree after ${plural(path.length, 'comparison')}, so ${v} is not stored.`, 'danger');
        await this.tween(probe.group, { opacity: 0 }, 0.4);
      }
      await this.pause(0.8);
    });
  }

  // ───────────────────────────── TRAVERSALS ─────────────────────────────

  _chip(value) {
    const g = new Konva.Group();
    const str = String(value);
    const [fill, stroke] = THEME.key.success;
    g.add(new Konva.Circle({ radius: 16, fill, stroke, strokeWidth: 2, shadowColor: 'black', shadowBlur: 6, shadowOpacity: 0.4 }));
    g.add(new Konva.Text({
      x: -22, y: -16, width: 44, height: 32, text: str, align: 'center', verticalAlign: 'middle',
      fontSize: Math.min(13, fontFor(str)), fontStyle: 'bold', fontFamily: MONO, fill: '#ffffff',
    }));
    return g;
  }

  _outSlot(i) {
    const per = Math.max(1, Math.floor((this.stage.width() - 40) / 38));
    return { x: 32 + (i % per) * 38, y: 72 + Math.floor(i / per) * 38 };
  }

  traverse(kind) {
    const names = { inorder: 'In-order', preorder: 'Pre-order', postorder: 'Post-order', levelorder: 'Level-order' };
    const how = {
      inorder: 'left subtree → node → right subtree. On a BST this lists the keys in sorted order.',
      preorder: 'node → left subtree → right subtree. Useful for copying or serializing a tree.',
      postorder: 'left subtree → right subtree → node. Children are always finished before their parent.',
      levelorder: 'visit level by level from the top, left to right, using a queue (a BFS).',
    };
    return this._run(async () => {
      const title = `${names[kind]} traversal`;
      if (!this.root) { this.status(title, 'The tree is empty.', 'danger'); return; }
      const order = [];
      if (kind === 'levelorder') {
        const q = [this.root];
        while (q.length) { const n = q.shift(); order.push(n); if (n.left) q.push(n.left); if (n.right) q.push(n.right); }
      } else {
        const rec = n => {
          if (!n) return;
          if (kind === 'preorder') order.push(n);
          rec(n.left);
          if (kind === 'inorder') order.push(n);
          rec(n.right);
          if (kind === 'postorder') order.push(n);
        };
        rec(this.root);
      }

      this.outGroup.add(new Konva.Text({ x: 16, y: 38, text: 'OUTPUT', fontSize: 11, fontStyle: 'bold', fontFamily: MONO, fill: '#6c6c78', letterSpacing: 1 }));
      this.status(title, how[kind]);
      await this.pause(0.6);

      const out = [];
      for (let i = 0; i < order.length; i++) {
        const n = order[i], nv = this.nodeViews.get(n.id);
        await this.nodeStyle(n, 'compare', 0.2);
        await this._pulse(nv);
        const chip = this._chip(n.v);
        this.outGroup.add(chip);
        chip.scale({ x: this.world.scaleX(), y: this.world.scaleY() });
        chip.absolutePosition(nv.group.getAbsolutePosition());
        const slot = this._outSlot(i);
        await this.tween(chip, { x: slot.x, y: slot.y, scaleX: 1, scaleY: 1 }, 0.45);
        out.push(n.v);
        this.status(title, `${how[kind]}<br><br>Output: <b>${out.join(' → ')}</b>`);
        this.nodeStyle(n, 'success', 0.25);
      }
      this.status(`✓ ${title}`, `Output: <b>${out.join(' → ')}</b>`, 'ok');
      await this.pause(1);
    });
  }

  // ───────────────────────────── utilities ─────────────────────────────

  insertRandom() {
    const have = new Set(this._values());
    const free = [];
    for (let i = 1; i < 100; i++) if (!have.has(i)) free.push(i);
    if (!free.length) {
      this.status('No free values', 'Every value from 1 to 99 is already in the tree.', 'danger');
      return Promise.resolve(false);
    }
    return this.insert(free[Math.floor(Math.random() * free.length)]);
  }

  preload(values) {
    return this._run(async () => {
      this.reset();
      values.forEach(v => this._insertSilent(v));
      this.status('Preloaded sample data', `${values.length} keys inserted.`, 'ok');
      await this.morph(0.9);
    });
  }

  zoom(f) {
    const scale = this.stage.scaleX() * f;
    this.stage.scale({ x: scale, y: scale });
    this.layer.batchDraw();
  }
}
