/*
 * btree.js — B-Tree visualizer that animates the *process*, not just the result.
 *
 * Every key is its own shape that can travel anywhere on the canvas; a node is only
 * the box drawn behind its keys. Each operation is broken into small data steps and,
 * after every step, morph() tweens all boxes, keys and edges from where they are now
 * to where the new layout puts them. Because keys keep their identity you actually
 * watch the median rise into the parent on a split, the separator drop down on a
 * merge, and keys rotate through the parent when a sibling lends one.
 *
 * Deletion rebalances bottom-up, so it stays correct for any order >= 3
 * (max = order - 1 keys, min = ceil(order / 2) - 1 keys for every non-root node).
 */

const THEME = {
  edge: '#5c5c6a',
  edgeActive: '#39aaff',
  node: {
    base:    ['#2b2b35', '#55555f'],
    visit:   ['#0f2f4a', '#39aaff'],
    danger:  ['#4a1b1b', '#ff5c5c'],
    donor:   ['#46380f', '#ffc53d'],
    success: ['#103a25', '#2ee68a'],
    merge:   ['#33204a', '#c08bff'],
    left:    ['#12304a', '#5ab4ff'],
    right:   ['#2f1b3d', '#c77ddb'],
  },
  key: {
    base:    ['#454552', '#6c6c78', '#ececec'],
    compare: ['#0b6fb8', '#5ab4ff', '#ffffff'],
    moving:  ['#ffb000', '#ffd466', '#1a1a1a'],
    danger:  ['#d93636', '#ff8a8a', '#ffffff'],
    success: ['#00a854', '#5cffa8', '#ffffff'],
    left:    ['#1e6fb8', '#7cc4ff', '#ffffff'],
    right:   ['#7b3a9c', '#dba4ec', '#ffffff'],
    merge:   ['#7a45b8', '#d2adff', '#ffffff'],
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
const fmtKeys = keys => `[${keys.filter(k => !k.ghost).map(k => k.v).join(', ')}]`;
const describe = node => (node.keys.length ? fmtKeys(node.keys) : 'an empty node');
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

class BTreeVisualizer {
  constructor(containerId, order = 3) {
    this.container = document.getElementById(containerId);
    this.G = { slot: 42, pad: 8, r: 17, nodeH: 44, levelGap: 96, gap: 26, top: 96 };
    this.speed = 1;
    this.busy = false;
    this.uid = 0;
    this.onBusy = null;
    this.nodeViews = new Map();  // node id -> { group, rect }
    this.keyViews = new Map();   // key id  -> { group, circle, text, ghost }
    this.edgeViews = new Map();  // child node id -> Konva.Line
    this.floating = new Set();   // key ids being moved by hand (morph leaves them alone)
    this._initStage();
    this.reset(order);
  }

  // ───────────────────────────── setup ─────────────────────────────

  _initStage() {
    const c = this.container;
    const panel = document.getElementById('info-panel');
    if (panel) panel.style.zIndex = '10';

    this.stage = new Konva.Stage({ container: c, width: c.offsetWidth, height: c.offsetHeight, draggable: true });
    this.layer = new Konva.Layer();
    this.stage.add(this.layer);

    this.hud = new Konva.Text({ x: 16, y: 14, fontSize: 13, fontFamily: 'Consolas, Monaco, monospace', fill: '#8a8a96' });
    this.hint = new Konva.Text({
      fontSize: 16, fill: '#7a7a86', align: 'center',
      text: 'Empty tree — type a value and press Push, or use Preload Data',
    });
    this.world = new Konva.Group();
    this.edgeGroup = new Konva.Group();
    this.nodeGroup = new Konva.Group();
    this.keyGroup = new Konva.Group();
    this.fxGroup = new Konva.Group();
    [this.edgeGroup, this.nodeGroup, this.keyGroup, this.fxGroup].forEach(g => this.world.add(g));
    [this.hud, this.hint, this.world].forEach(n => this.layer.add(n));

    // Only used while nodes are moved by hand (merge step 2); morph() tweens edges itself.
    this.edgeAnim = new Konva.Animation(() => this._refreshEdges(), this.layer);

    this.stage.on('dblclick dbltap', () => { this.stage.position({ x: 0, y: 0 }); this.layer.batchDraw(); });

    const onResize = () => this._resize();
    if (window.ResizeObserver) new ResizeObserver(onResize).observe(c);
    else window.addEventListener('resize', onResize);
  }

  reset(order = this.order) {
    this.order = order;
    this.maxKeys = order - 1;
    this.minKeys = Math.ceil(order / 2) - 1;
    this.root = this._newNode(true);
    this.floating.clear();
    [this.edgeGroup, this.nodeGroup, this.keyGroup, this.fxGroup].forEach(g => g.destroyChildren());
    this.nodeViews.clear();
    this.keyViews.clear();
    this.edgeViews.clear();
    this.hud.text(`order ${order}  ·  max ${plural(this.maxKeys, 'key')} per node  ·  min ${plural(this.minKeys, 'key')} (non-root)`);
    this._resize();
  }

  _resize() {
    const c = this.container;
    this.stage.size({ width: c.offsetWidth, height: c.offsetHeight });
    this.hint.setAttrs({ x: 0, y: this.stage.height() / 2 - 10, width: this.stage.width() });
    this.hint.visible(this._isEmpty());
    if (!this.busy) this._fitNow();
    this.layer.batchDraw();
  }

  // ───────────────────────────── data helpers ─────────────────────────────

  _newNode(leaf) { return { id: `n${++this.uid}`, leaf, keys: [], children: [] }; }
  _newKey(v) { return { id: `k${++this.uid}`, v }; }
  _ghostKey() { return { id: `g${++this.uid}`, v: null, ghost: true }; }
  _isEmpty() { return this.root.leaf && this.root.keys.length === 0; }

  _values() {
    const out = [];
    const walk = n => { n.keys.forEach(k => { if (!k.ghost) out.push(k.v); }); n.children.forEach(walk); };
    walk(this.root);
    return out;
  }

  _splitData(node, parent, idx, right = this._newNode(node.leaf)) {
    const mid = Math.floor(node.keys.length / 2);
    const med = node.keys[mid];
    right.keys = node.keys.slice(mid + 1);
    if (!node.leaf) {
      right.children = node.children.slice(mid + 1);
      node.children = node.children.slice(0, mid + 1);
    }
    node.keys = node.keys.slice(0, mid);
    let newRoot = null;
    if (parent) {
      parent.keys.splice(idx, 0, med);
      parent.children.splice(idx + 1, 0, right);
    } else {
      newRoot = this._newNode(false);
      newRoot.keys = [med];
      newRoot.children = [node, right];
      this.root = newRoot;
    }
    return { med, right, newRoot };
  }

  _mergeData(parent, i) {
    const L = parent.children[i], R = parent.children[i + 1], sep = parent.keys[i];
    L.keys.push(sep, ...R.keys);
    if (!L.leaf) L.children.push(...R.children);
    parent.keys.splice(i, 1);
    parent.children.splice(i + 1, 1);
  }

  _insertSilent(v) {
    const path = [];
    let node = this.root;
    for (;;) {
      let i = 0;
      while (i < node.keys.length && v > node.keys[i].v) i++;
      if (i < node.keys.length && node.keys[i].v === v) return;
      if (node.leaf) { node.keys.splice(i, 0, this._newKey(v)); break; }
      path.push({ node, idx: i });
      node = node.children[i];
    }
    let d = path.length;
    while (node.keys.length > this.maxKeys) {
      const up = d > 0 ? path[d - 1] : null;
      this._splitData(node, up ? up.node : null, up ? up.idx : 0);
      if (!up) break;
      node = up.node;
      d--;
    }
  }

  // ───────────────────────────── layout ─────────────────────────────

  _layout() {
    const { slot: S, pad, nodeH: H, levelGap: V, gap: GAP } = this.G;
    const nodes = new Map(), keys = new Map();
    if (this._isEmpty()) return { nodes, keys, width: 0, height: 0 };

    const nodeW = n => 2 * pad + Math.max(1, n.keys.length) * S;
    const span = new Map();
    const measure = n => {
      let w = nodeW(n);
      if (!n.leaf && n.children.length) {
        const kids = n.children.reduce((a, c) => a + measure(c), 0) + GAP * (n.children.length - 1);
        w = Math.max(w, kids);
      }
      span.set(n.id, w);
      return w;
    };
    const total = measure(this.root);
    let depth = 0;

    const place = (n, left, level) => {
      const w = nodeW(n), cx = left + span.get(n.id) / 2, x = cx - w / 2, y = level * V;
      depth = Math.max(depth, level);
      nodes.set(n.id, { node: n, x, y, w });
      n.keys.forEach((k, i) => keys.set(k.id, { key: k, x: x + pad + (i + 0.5) * S, y: y + H / 2 }));
      if (!n.leaf && n.children.length) {
        const kids = n.children.reduce((a, c) => a + span.get(c.id), 0) + GAP * (n.children.length - 1);
        let cl = cx - kids / 2;
        n.children.forEach(c => { place(c, cl, level + 1); cl += span.get(c.id) + GAP; });
      }
    };
    place(this.root, -total / 2, 0);
    return { nodes, keys, width: total, height: depth * V + H };
  }

  _fitFor(L) {
    const sw = this.stage.width(), sh = this.stage.height();
    let s = Math.min(1, (sw - 60) / Math.max(L.width, 1), (sh - this.G.top - 40) / Math.max(L.height, 1));
    s = Math.max(0.25, s);
    return { x: sw / 2, y: this.G.top, s };
  }

  _fitNow() {
    const f = this._fitFor(this._layout());
    this.world.setAttrs({ x: f.x, y: f.y, scaleX: f.s, scaleY: f.s });
  }

  _nodeGeo(node) {
    const v = this.nodeViews.get(node.id);
    if (v) {
      const x = v.group.x(), y = v.group.y(), w = v.rect.width();
      return { x, y, w, cx: x + w / 2 };
    }
    const g = this._layout().nodes.get(node.id);
    if (g) return { x: g.x, y: g.y, w: g.w, cx: g.x + g.w / 2 };
    const w = 2 * this.G.pad + this.G.slot;
    return { x: -w / 2, y: 0, w, cx: 0 };
  }

  // Edge from child pointer i of a parent (at px, py, width pw, n keys) to a child's top-centre.
  _edgePts(px, py, pw, n, i, cx, cy) {
    const sx = px + (n === 0 ? pw / 2 : this.G.pad + i * this.G.slot);
    const sy = py + this.G.nodeH;
    const my = (sy + cy) / 2;
    return [sx, sy, sx, my, cx, my, cx, cy];
  }

  _currentEdgePts(p, i, c) {
    const pv = this.nodeViews.get(p.id), cv = this.nodeViews.get(c.id);
    if (!pv || !cv) return null;
    return this._edgePts(pv.group.x(), pv.group.y(), pv.rect.width(), p.keys.length, i,
      cv.group.x() + cv.rect.width() / 2, cv.group.y());
  }

  _edgeTargets(L) {
    const out = new Map();
    const walk = p => {
      if (p.leaf) return;
      const pg = L.nodes.get(p.id);
      p.children.forEach((c, i) => {
        const cg = L.nodes.get(c.id);
        if (pg && cg) {
          out.set(c.id, { parent: p, child: c, i,
            pts: this._edgePts(pg.x, pg.y, pg.w, p.keys.length, i, cg.x + cg.w / 2, cg.y) });
        }
        walk(c);
      });
    };
    walk(this.root);
    return out;
  }

  _refreshEdges() {
    const walk = n => {
      if (n.leaf) return;
      n.children.forEach((c, i) => {
        const line = this.edgeViews.get(c.id), pts = this._currentEdgePts(n, i, c);
        if (line && pts) line.points(pts);
        walk(c);
      });
    };
    walk(this.root);
  }

  // ───────────────────────────── shapes ─────────────────────────────

  _keyShape(label, ghost = false) {
    const R = this.G.r;
    const group = new Konva.Group();
    const cfg = {
      radius: R, strokeWidth: 2,
      fill: ghost ? 'rgba(0,0,0,0)' : THEME.key.base[0],
      stroke: ghost ? '#8a8a96' : THEME.key.base[1],
      shadowColor: 'black', shadowBlur: ghost ? 0 : 6, shadowOpacity: 0.35,
    };
    if (ghost) cfg.dash = [4, 4];
    const circle = new Konva.Circle(cfg);
    const str = ghost ? '' : String(label);
    const text = new Konva.Text({
      x: -R - 6, y: -R, width: 2 * R + 12, height: 2 * R, text: str,
      align: 'center', verticalAlign: 'middle', fontSize: str.length > 3 ? 11 : 15, fontStyle: 'bold',
      fontFamily: 'Consolas, Monaco, monospace', fill: THEME.key.base[2], listening: false,
    });
    group.add(circle);
    group.add(text);
    return { group, circle, text, ghost };
  }

  _makeKeyView(k, x, y, scale = 1) {
    const v = this._keyShape(k.v, !!k.ghost);
    v.group.setAttrs({ x, y, scaleX: scale, scaleY: scale });
    this.keyGroup.add(v.group);
    this.keyViews.set(k.id, v);
    return v;
  }

  _makeNodeView(node, { x, y, w, opacity = 1 }) {
    const group = new Konva.Group({ x, y, opacity });
    const rect = new Konva.Rect({
      width: w, height: this.G.nodeH, cornerRadius: 10, strokeWidth: 2,
      fill: THEME.node.base[0], stroke: THEME.node.base[1],
      shadowColor: 'black', shadowBlur: 12, shadowOffset: { x: 0, y: 4 }, shadowOpacity: 0.45,
    });
    group.add(rect);
    this.nodeGroup.add(group);
    const v = { group, rect };
    this.nodeViews.set(node.id, v);
    return v;
  }

  _makeEdge(points) {
    const line = new Konva.Line({
      points, bezier: true, stroke: THEME.edge, strokeWidth: 2.5,
      lineCap: 'round', opacity: EDGE_OPACITY, listening: false,
    });
    this.edgeGroup.add(line);
    return line;
  }

  _label(text, x, y, tone = 'info', dir = 'down') {
    const [bg, fg] = THEME.tone[tone];
    const lbl = new Konva.Label({ x, y, opacity: 0, listening: false });
    lbl.add(new Konva.Tag({
      fill: bg, pointerDirection: dir, pointerWidth: 10, pointerLength: 7, cornerRadius: 6,
      shadowColor: 'black', shadowBlur: 6, shadowOpacity: 0.4,
    }));
    lbl.add(new Konva.Text({ text, padding: 6, fontSize: 13, fontStyle: 'bold', fontFamily: 'Consolas, Monaco, monospace', fill: fg }));
    this.fxGroup.add(lbl);
    this.tween(lbl, { opacity: 1 }, 0.2);
    return lbl;
  }

  _nodeLabel(node, text, tone) {
    const g = this._nodeGeo(node);
    return this._label(text, g.cx, g.y - 4, tone, 'down');
  }

  _dropLabel(lbl) {
    if (lbl) this.tween(lbl, { opacity: 0 }, 0.2).then(() => lbl.destroy());
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

  _rectStyle(rect, style, s = 0.25) {
    const [fill, stroke] = THEME.node[style];
    const attrs = { fill, stroke, strokeWidth: style === 'base' ? 2 : 3 };
    if (s === 0) { rect.setAttrs(attrs); return Promise.resolve(); }
    return this.tween(rect, attrs, s);
  }

  nodeStyle(node, style, s = 0.25) {
    const v = this.nodeViews.get(node.id);
    return v ? this._rectStyle(v.rect, style, s) : Promise.resolve();
  }

  _keyViewStyle(v, style, s = 0.25) {
    if (!v || v.ghost) return Promise.resolve();
    const [fill, stroke, text] = THEME.key[style];
    if (s === 0) { v.circle.setAttrs({ fill, stroke }); v.text.fill(text); return Promise.resolve(); }
    return Promise.all([this.tween(v.circle, { fill, stroke }, s), this.tween(v.text, { fill: text }, s)]);
  }

  keyStyle(k, style, s = 0.25) { return this._keyViewStyle(this.keyViews.get(k.id), style, s); }

  edgeStyle(child, on, s = 0.2) {
    const line = this.edgeViews.get(child.id);
    return line
      ? this.tween(line, { stroke: on ? THEME.edgeActive : THEME.edge, strokeWidth: on ? 4 : 2.5 }, s)
      : Promise.resolve();
  }

  resetStyles(s = 0.3) {
    const jobs = [];
    this.nodeViews.forEach(v => jobs.push(this._rectStyle(v.rect, 'base', s)));
    this.keyViews.forEach(v => jobs.push(this._keyViewStyle(v, 'base', s)));
    this.edgeViews.forEach(l => jobs.push(this.tween(l, { stroke: THEME.edge, strokeWidth: 2.5 }, s)));
    return Promise.all(jobs);
  }

  async _pulseKey(k) {
    const v = this.keyViews.get(k.id);
    if (!v) return;
    await this.tween(v.group, { scaleX: 1.35, scaleY: 1.35 }, 0.18);
    await this.tween(v.group, { scaleX: 1.1, scaleY: 1.1 }, 0.18);
  }

  async _flashNode(node) {
    const v = this.nodeViews.get(node.id);
    if (!v) return;
    for (let r = 0; r < 2; r++) {
      await this.tween(v.rect, { strokeWidth: 6 }, 0.12);
      await this.tween(v.rect, { strokeWidth: 3 }, 0.12);
    }
  }

  async _shake(group) {
    const x = group.x();
    for (const dx of [-7, 7, -5, 5, 0]) await this.tween(group, { x: x + dx }, 0.05);
  }

  _nudgeKey(k, dx, s) {
    const v = this.keyViews.get(k.id);
    return v ? this.tween(v.group, { x: v.group.x() + dx }, s) : Promise.resolve();
  }

  async _probe(v, style) {
    const g = this._nodeGeo(this.root);
    const p = this._keyShape(v);
    p.group.setAttrs({ x: g.cx, y: g.y - 64, scaleX: 0.01, scaleY: 0.01 });
    this.fxGroup.add(p.group);
    await this._keyViewStyle(p, style, 0);
    await this.tween(p.group, { y: g.y - 40, scaleX: 1, scaleY: 1 }, 0.35, Konva.Easings.BackEaseOut);
    return p;
  }

  /**
   * Tween every node box, key and edge from where it is now to where the current
   * data says it should be. New things fade/grow in, removed things fade/shrink out.
   */
  async morph(s = 0.7) {
    const L = this._layout();
    const fit = this._fitFor(L);
    const jobs = [];
    this.hint.visible(this._isEmpty());

    for (const [id, g] of L.nodes) {
      const v = this.nodeViews.get(id) || this._makeNodeView(g.node, { x: g.x, y: g.y - 14, w: g.w, opacity: 0 });
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
      const v = this.keyViews.get(id) || this._makeKeyView(g.key, g.x, g.y, 0.01);
      jobs.push(this.tween(v.group, { x: g.x, y: g.y, scaleX: 1, scaleY: 1, opacity: 1 }, s));
    }
    for (const [id, v] of [...this.keyViews]) {
      if (L.keys.has(id) || this.floating.has(id)) continue;
      this.keyViews.delete(id);
      jobs.push(this.tween(v.group, { scaleX: 0.01, scaleY: 0.01, opacity: 0 }, s * 0.6).then(() => v.group.destroy()));
    }

    const targets = this._edgeTargets(L);
    for (const [cid, t] of targets) {
      let line = this.edgeViews.get(cid);
      if (!line) {
        line = this._makeEdge(this._currentEdgePts(t.parent, t.i, t.child) || t.pts);
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
    await Promise.all(jobs);
  }

  _run(fn) {
    if (this.busy) return Promise.resolve(false);
    this.busy = true;
    if (this.onBusy) this.onBusy(true);
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
    for (;;) {
      const g = this._nodeGeo(node);
      probe.group.moveToTop();
      await this.tween(probe.group, { x: g.cx, y: g.y - 40 }, 0.45);
      await this.nodeStyle(node, 'visit', 0.2);

      const keys = node.keys;
      let i = 0;
      while (i < keys.length && v > keys[i].v) i++;

      if (i < keys.length && keys[i].v === v) {
        const lbl = this._label(`found ${v}`, g.cx + this.G.r + 6, g.y - 40, 'ok', 'left');
        await this.keyStyle(keys[i], 'success');
        await this.pause(0.5);
        this._dropLabel(lbl);
        return { path, node, idx: i, found: true };
      }
      if (node.leaf) return { path, node, idx: i, found: false };

      const lo = keys[i - 1], hi = keys[i];
      const cmp = !lo ? `${v} < ${hi.v}` : !hi ? `${v} > ${lo.v}` : `${lo.v} < ${v} < ${hi.v}`;
      const where = i === 0 ? 'leftmost child' : i === keys.length ? 'rightmost child' : `child #${i + 1}`;
      this.status(title, `At ${fmtKeys(keys)}: ${cmp}, so follow the pointer to the ${where}.`);
      const lbl = this._label(cmp, g.cx + this.G.r + 6, g.y - 40, 'info', 'left');
      await Promise.all([
        lo && this.keyStyle(lo, 'compare'),
        hi && this.keyStyle(hi, 'compare'),
        this.edgeStyle(node.children[i], true),
      ]);
      await this.pause(0.6);
      this._dropLabel(lbl);
      this.nodeStyle(node, 'base');
      if (lo) this.keyStyle(lo, 'base');
      if (hi) this.keyStyle(hi, 'base');
      this.edgeStyle(node.children[i], false, 0.6);

      path.push({ node, idx: i });
      node = node.children[i];
    }
  }

  // ───────────────────────────── INSERT ─────────────────────────────

  insert(v) {
    return this._run(async () => {
      const title = `Insert ${v}`;
      const k = this._newKey(v);
      const start = this._nodeGeo(this.root);
      const probe = this._makeKeyView(k, start.cx, start.y - 64, 0.01);
      probe.group.moveToTop();
      this.floating.add(k.id);
      this._keyViewStyle(probe, 'moving', 0);
      await this.tween(probe.group, { y: start.y - 40, scaleX: 1, scaleY: 1 }, 0.4, Konva.Easings.BackEaseOut);

      if (this._isEmpty()) {
        this.status(title, `The tree is empty, so ${v} becomes the only key of the root.`);
        this.root.keys.push(k);
        this.floating.delete(k.id);
        await this.morph(0.6);
        await this.keyStyle(k, 'success');
        this.status(`✓ Inserted ${v}`, 'The root is a leaf holding one key.', 'ok');
        await this.pause(0.5);
        return;
      }

      this.status(title, `Walk down from the root, comparing ${v} with each node's keys to choose a child.`);
      const { path, node, idx, found } = await this._descend(v, probe, title);

      if (found) {
        this.status(`${v} is already in the tree`, 'Keys are unique here, so nothing is inserted.', 'danger');
        this._keyViewStyle(probe, 'danger');
        await this._shake(probe.group);
        await this.tween(probe.group, { opacity: 0, scaleX: 0.01, scaleY: 0.01 }, 0.35);
        probe.group.destroy();
        this.keyViews.delete(k.id);
        this.floating.delete(k.id);
        return;
      }

      const room = node.keys.length < this.maxKeys;
      this.status(`Reached leaf ${fmtKeys(node.keys)}`,
        `${v} goes into position ${idx + 1}. ` +
        (room ? 'The leaf has room, so its keys simply slide apart.'
              : `The leaf already holds ${node.keys.length} keys (max ${this.maxKeys}), so it will overflow.`));
      node.keys.splice(idx, 0, k);
      this.floating.delete(k.id);
      this.nodeStyle(node, room ? 'visit' : 'danger');
      await this.morph(0.65);
      await this.keyStyle(k, 'success');
      await this.pause(0.4);

      let splits = 0, d = path.length, cur = node;
      while (cur.keys.length > this.maxKeys) {
        const up = d > 0 ? path[d - 1] : null;
        await this._split(cur, up ? up.node : null, up ? up.idx : 0, splits > 0);
        splits++;
        if (!up) break;
        cur = up.node;
        d--;
      }

      this.status(`✓ Inserted ${v}`,
        splits ? `${plural(splits, 'split')} kept every node within ${this.maxKeys} keys.` : 'No split was needed.', 'ok');
      await this.pause(0.4);
    });
  }

  async _split(node, parent, idx, cascaded = false) {
    const { slot: S, pad, nodeH: H } = this.G;
    const m = node.keys.length, mid = Math.floor(m / 2);
    const med = node.keys[mid];
    const leftKeys = node.keys.slice(0, mid), rightKeys = node.keys.slice(mid + 1);

    // 0 — show the overflow
    this.status(`Overflow in ${fmtKeys(node.keys)}`,
      (cascaded ? 'Receiving the median made this node overflow too — the split cascades upward. ' : '') +
      `It has ${m} keys but order ${this.order} allows at most ${this.maxKeys}, so it must split.`, 'danger');
    await this.nodeStyle(node, 'danger');
    const lbl = this._nodeLabel(node, `${m} keys > max ${this.maxKeys}`, 'danger');
    await this._flashNode(node);
    await this.pause(0.5);
    this._dropLabel(lbl);

    // 1 — pick the median, colour the two halves
    this.status('Split · Step 1: pick the median',
      `The middle key <b>${med.v}</b> will move up. ${fmtKeys(leftKeys)} stays here, ${fmtKeys(rightKeys)} moves to a new node.`, 'warn');
    await Promise.all([
      ...leftKeys.map(k => this.keyStyle(k, 'left')),
      ...rightKeys.map(k => this.keyStyle(k, 'right')),
      this.keyStyle(med, 'moving'),
    ]);
    await this._pulseKey(med);
    await this.pause(0.5);

    // 2 — the median rises out of the node
    const g = this._nodeGeo(node);
    const mv = this.keyViews.get(med.id);
    this.floating.add(med.id);
    mv.group.moveToTop();
    this.status('Split · Step 2: push the median up',
      parent ? `${med.v} leaves the node and heads for the parent ${fmtKeys(parent.keys)}.`
             : `This node is the root, so there is no parent — ${med.v} will become a new root above it.`, 'warn');
    await this.tween(mv.group, { y: g.y - 34, scaleX: 1.15, scaleY: 1.15 }, 0.6, Konva.Easings.BackEaseOut);

    // 3 — the box cracks into two halves (keys stay where they are)
    this.status('Split · Step 3: divide the node',
      `The node breaks into ${fmtKeys(leftKeys)} and a new node ${fmtKeys(rightKeys)}` +
      (node.leaf ? '.' : ', and the child pointers are shared out between them.'), 'warn');
    const right = this._newNode(node.leaf);
    const lv = this.nodeViews.get(node.id);
    const rv = this._makeNodeView(right, { x: g.x + (mid + 1) * S, y: g.y, w: 2 * pad + rightKeys.length * S, opacity: 0 });
    this._rectStyle(rv.rect, 'right', 0);
    const [lf, ls] = THEME.node.left;
    const nudge = 8;
    await Promise.all([
      this.tween(lv.rect, { width: 2 * pad + leftKeys.length * S, fill: lf, stroke: ls }, 0.45),
      this.tween(lv.group, { x: g.x - nudge }, 0.45),
      this.tween(rv.group, { x: g.x + (mid + 1) * S + nudge, opacity: 1 }, 0.45),
      ...leftKeys.map(k => this._nudgeKey(k, -nudge, 0.45)),
      ...rightKeys.map(k => this._nudgeKey(k, nudge, 0.45)),
    ]);
    await this.pause(0.3);

    // 4 — commit and let everything settle into the new layout
    const { newRoot } = this._splitData(node, parent, idx, right);
    if (newRoot) {
      const w0 = 2 * pad + S;
      const nv = this._makeNodeView(newRoot, { x: mv.group.x() - w0 / 2, y: mv.group.y() - H / 2, w: w0, opacity: 0 });
      this._rectStyle(nv.rect, 'success', 0);
    } else {
      this.nodeStyle(parent, 'visit');
    }
    this.floating.delete(med.id);
    this.status('Split · Step 4: re-link',
      newRoot ? `${med.v} becomes the new root with the two halves as its children — the tree grows one level taller.`
              : `${med.v} slots into the parent, which now points to both halves.`, 'ok');
    await this.morph(0.85);
    await Promise.all([this.nodeStyle(node, 'success'), this.nodeStyle(right, 'success'), this.keyStyle(med, 'success')]);
    await this.pause(0.5);
    await this.resetStyles(0.3);
  }

  // ───────────────────────────── SEARCH ─────────────────────────────

  search(v) {
    return this._run(async () => {
      const title = `Search ${v}`;
      if (this._isEmpty()) { this.status(title, 'The tree is empty.', 'danger'); return; }
      this.status(title, `Start at the root and compare ${v} with the keys of each node on the way down.`);
      const probe = await this._probe(v, 'compare');
      const { path, node, idx, found } = await this._descend(v, probe, title);

      if (found) {
        const kv = this.keyViews.get(node.keys[idx].id);
        await this.tween(probe.group, { x: kv.group.x(), y: kv.group.y(), opacity: 0 }, 0.4);
        probe.group.destroy();
        await Promise.all([this.nodeStyle(node, 'success'), this._pulseKey(node.keys[idx])]);
        this.status(`✓ Found ${v}`, `Found at depth ${path.length} after visiting ${plural(path.length + 1, 'node')}.`, 'ok');
      } else {
        this._keyViewStyle(probe, 'danger');
        await this.nodeStyle(node, 'danger');
        await this._shake(probe.group);
        this.status(`✗ ${v} not found`, `Reached leaf ${describe(node)} and ${v} is not in it, so it is nowhere in the tree.`, 'danger');
        await this.tween(probe.group, { opacity: 0 }, 0.4);
      }
      await this.pause(0.8);
    });
  }

  // ───────────────────────────── DELETE ─────────────────────────────

  delete(v) {
    return this._run(async () => {
      const title = `Delete ${v}`;
      if (this._isEmpty()) { this.status(title, 'The tree is empty.', 'danger'); return; }
      this.status(title, `First find ${v} by walking down from the root.`);
      const probe = await this._probe(v, 'danger');
      const res = await this._descend(v, probe, title);

      if (!res.found) {
        this._keyViewStyle(probe, 'danger');
        await this.nodeStyle(res.node, 'danger');
        await this._shake(probe.group);
        this.status(`✗ ${v} not found`, 'Nothing to delete.', 'danger');
        await this.tween(probe.group, { opacity: 0 }, 0.4);
        await this.pause(0.5);
        return;
      }

      const { node, idx } = res;
      const target = node.keys[idx];
      const tv = this.keyViews.get(target.id);
      await this.tween(probe.group, { x: tv.group.x(), y: tv.group.y(), opacity: 0 }, 0.35);
      probe.group.destroy();
      await this.keyStyle(target, 'danger');
      const path = res.path.slice();

      if (node.leaf) {
        this.status(`${v} is in a leaf`, 'A key in a leaf can be removed directly — take it out and close the gap.', 'danger');
        await this._pulseKey(target);
        await this.tween(tv.group, { scaleX: 0.01, scaleY: 0.01, opacity: 0 }, 0.4);
        tv.group.destroy();
        this.keyViews.delete(target.id);
        node.keys.splice(idx, 1);
        await this.morph(0.55);
      } else {
        await this._replaceWithPredecessor(node, idx, path);
      }

      await this._rebalance(path);
      if (!this.root.leaf && this.root.keys.length === 0) await this._collapseRoot();

      this.status(`✓ Deleted ${v}`, 'Every node is back within its key limits.', 'ok');
      await this.pause(0.4);
    });
  }

  async _replaceWithPredecessor(node, idx, path) {
    const target = node.keys[idx];
    this.status(`${target.v} is in an internal node`,
      "It separates two subtrees, so it can't just vanish. Replace it with its in-order predecessor: the largest key in its left subtree.", 'warn');
    await this.pause(0.6);

    path.push({ node, idx });
    await this.edgeStyle(node.children[idx], true);
    let cur = node.children[idx];
    while (!cur.leaf) {
      await this.nodeStyle(cur, 'visit', 0.2);
      const last = cur.children.length - 1;
      const lbl = this._nodeLabel(cur, 'go right-most', 'info');
      await this.edgeStyle(cur.children[last], true);
      await this.pause(0.45);
      this._dropLabel(lbl);
      path.push({ node: cur, idx: last });
      cur = cur.children[last];
    }

    const pred = cur.keys[cur.keys.length - 1];
    await this.nodeStyle(cur, 'visit', 0.2);
    await this.keyStyle(pred, 'moving');
    await this._pulseKey(pred);
    const lbl = this._nodeLabel(cur, `predecessor ${pred.v}`, 'warn');
    this.status('Step 1 · Find the predecessor', `${pred.v} is the largest key smaller than ${target.v}.`, 'warn');
    await this.pause(0.6);
    this._dropLabel(lbl);

    this.status('Step 2 · Remove the key', `${target.v} is removed, leaving an empty slot in its node.`, 'danger');
    node.keys[idx] = this._ghostKey();
    await this.morph(0.45);

    this.status('Step 3 · Predecessor moves up',
      `${pred.v} leaves its leaf and fills the empty slot — every key on the left is still smaller, every key on the right still larger.`, 'warn');
    cur.keys.pop();
    node.keys[idx] = pred;
    const pv = this.keyViews.get(pred.id);
    if (pv) pv.group.moveToTop();
    await this.morph(0.85);
    await this.keyStyle(pred, 'success');
    await this.pause(0.4);
    await this.resetStyles(0.3);
  }

  async _rebalance(path) {
    for (let d = path.length - 1; d >= 0; d--) {
      const { node: parent, idx } = path[d];
      if (parent.children[idx].keys.length >= this.minKeys) break;
      await this._fixUnderflow(parent, idx);
    }
  }

  async _fixUnderflow(parent, i) {
    const child = parent.children[i];
    const left = i > 0 ? parent.children[i - 1] : null;
    const right = i < parent.children.length - 1 ? parent.children[i + 1] : null;

    this.status(`Underflow in ${describe(child)}`,
      `Every node except the root needs at least ${plural(this.minKeys, 'key')}; this one has ${child.keys.length}. ` +
      'First try to borrow from a sibling, otherwise merge.', 'danger');
    await this.nodeStyle(child, 'danger');
    const lbl = this._nodeLabel(child, `${child.keys.length} < min ${this.minKeys}`, 'danger');
    await this._flashNode(child);
    await this.pause(0.5);
    this._dropLabel(lbl);

    if (left && left.keys.length > this.minKeys) return this._borrowFromLeft(parent, i);
    if (right && right.keys.length > this.minKeys) return this._borrowFromRight(parent, i);
    if (left) return this._merge(parent, i - 1, 'right');
    return this._merge(parent, i, 'left');
  }

  async _borrowFromLeft(parent, i) {
    const child = parent.children[i], sib = parent.children[i - 1];
    const sep = parent.keys[i - 1], donor = sib.keys[sib.keys.length - 1];

    this.status('Borrow from the left sibling',
      `${fmtKeys(sib.keys)} has ${sib.keys.length} keys — more than the minimum — so it can lend one. ` +
      `Keys rotate through the parent to keep everything in order: ${sep.v} comes down, ${donor.v} goes up.`, 'warn');
    await Promise.all([this.nodeStyle(sib, 'donor'), this.keyStyle(sep, 'moving'), this.keyStyle(donor, 'moving')]);
    const lbl = this._nodeLabel(sib, 'can lend', 'warn');
    await this.pause(0.8);
    this._dropLabel(lbl);

    this.status('Borrow · Step 1: separator moves down',
      `${sep.v} drops from the parent into the front of the underflowing node` +
      (child.leaf ? '.' : `, and ${donor.v}'s right-hand subtree moves across with it.`), 'warn');
    parent.keys[i - 1] = this._ghostKey();
    child.keys.unshift(sep);
    if (!child.leaf) child.children.unshift(sib.children.pop());
    this.keyViews.get(sep.id)?.group.moveToTop();
    await this.morph(0.75);

    this.status('Borrow · Step 2: sibling key moves up',
      `${donor.v} is the largest key of the left sibling, so it fills the gap in the parent.`, 'warn');
    sib.keys.pop();
    parent.keys[i - 1] = donor;
    this.keyViews.get(donor.id)?.group.moveToTop();
    await this.morph(0.75);

    await Promise.all([this.nodeStyle(child, 'success'), this.nodeStyle(sib, 'success')]);
    await this.pause(0.4);
    await this.resetStyles(0.3);
  }

  async _borrowFromRight(parent, i) {
    const child = parent.children[i], sib = parent.children[i + 1];
    const sep = parent.keys[i], donor = sib.keys[0];

    this.status('Borrow from the right sibling',
      `${fmtKeys(sib.keys)} has ${sib.keys.length} keys — more than the minimum — so it can lend one. ` +
      `Keys rotate through the parent: ${sep.v} comes down, ${donor.v} goes up.`, 'warn');
    await Promise.all([this.nodeStyle(sib, 'donor'), this.keyStyle(sep, 'moving'), this.keyStyle(donor, 'moving')]);
    const lbl = this._nodeLabel(sib, 'can lend', 'warn');
    await this.pause(0.8);
    this._dropLabel(lbl);

    this.status('Borrow · Step 1: separator moves down',
      `${sep.v} drops from the parent onto the end of the underflowing node.`, 'warn');
    parent.keys[i] = this._ghostKey();
    child.keys.push(sep);
    this.keyViews.get(sep.id)?.group.moveToTop();
    await this.morph(0.75);

    this.status('Borrow · Step 2: sibling key moves up',
      `${donor.v} is the smallest key of the right sibling, so it fills the gap in the parent` +
      (child.leaf ? '.' : `; its left-hand subtree moves across to the underflowing node.`), 'warn');
    sib.keys.shift();
    parent.keys[i] = donor;
    if (!child.leaf) child.children.push(sib.children.shift());
    this.keyViews.get(donor.id)?.group.moveToTop();
    await this.morph(0.75);

    await Promise.all([this.nodeStyle(child, 'success'), this.nodeStyle(sib, 'success')]);
    await this.pause(0.4);
    await this.resetStyles(0.3);
  }

  async _merge(parent, i, under) {
    const { slot: S, pad, nodeH: H } = this.G;
    const L = parent.children[i], R = parent.children[i + 1], sep = parent.keys[i];
    const lender = under === 'left' ? R : L;
    const nL = L.keys.length, total = nL + 1 + R.keys.length;

    this.status('Merge needed',
      `The sibling ${fmtKeys(lender.keys)} has only ${plural(lender.keys.length, 'key')} (the minimum), so it cannot lend. ` +
      `Instead the two nodes and their separator ${sep.v} merge into one node of ${total} keys (max ${this.maxKeys}).`, 'merge');
    await Promise.all([this.nodeStyle(lender, 'donor'), this.keyStyle(sep, 'moving')]);
    const lbl = this._nodeLabel(lender, "at minimum — can't lend", 'warn');
    await this.pause(0.9);
    this._dropLabel(lbl);

    const lv = this.nodeViews.get(L.id), rv = this.nodeViews.get(R.id), sv = this.keyViews.get(sep.id);
    const x0 = lv.group.x(), y0 = lv.group.y(), cy = y0 + H / 2;

    // 1 — separator comes down between the two nodes
    this.status('Merge · Step 1: pull the separator down',
      `${sep.v} sat between these two nodes in the parent. It comes down to join them.`, 'merge');
    this.floating.add(sep.id);
    sv.group.moveToTop();
    await this.tween(sv.group, { x: x0 + pad + (nL + 0.5) * S, y: cy, scaleX: 1.12, scaleY: 1.12 }, 0.75);

    // 2 — right node slides over so all keys line up in order
    this.status('Merge · Step 2: slide the nodes together',
      `The right node slides left so the keys line up in order: ${fmtKeys([...L.keys, sep, ...R.keys])}.`, 'merge');
    this.edgeAnim.start();
    await Promise.all([
      this.tween(rv.group, { x: x0 + (nL + 1) * S, y: y0 }, 0.6),
      ...R.keys.map((k, j) => this.tween(this.keyViews.get(k.id).group, { x: x0 + pad + (nL + 1 + j + 0.5) * S, y: cy }, 0.6)),
    ]);
    this.edgeAnim.stop();

    // 3 — fuse the two boxes into one
    this.status('Merge · Step 3: fuse',
      `The two nodes become one. The parent loses ${sep.v} and one child pointer.`, 'merge');
    this._mergeData(parent, i);
    this.floating.delete(sep.id);
    this.nodeViews.delete(R.id);
    const [mf, ms] = THEME.node.merge;
    await Promise.all([
      this.tween(lv.rect, { width: 2 * pad + L.keys.length * S, fill: mf, stroke: ms, strokeWidth: 3 }, 0.4),
      this.tween(rv.group, { opacity: 0 }, 0.4).then(() => rv.group.destroy()),
      ...L.keys.map(k => this.keyStyle(k, 'merge', 0.4)),
    ]);
    await this.pause(0.3);

    // 4 — everything settles into the new layout
    const parentShort = parent !== this.root && parent.keys.length < this.minKeys;
    this.status('Merge · Step 4: settle',
      `Merged node: ${fmtKeys(L.keys)}. Parent is now ${describe(parent)}` +
      (parentShort ? ' — below the minimum, so the fix continues one level up.' : '.'), 'merge');
    await this.morph(0.8);
    await this.nodeStyle(L, 'success');
    await this.pause(0.4);
    await this.resetStyles(0.3);
  }

  async _collapseRoot() {
    const old = this.root;
    this.status('Shrink the tree',
      'The root has no keys left, so its only child becomes the new root. This is the only way a B-tree gets shorter.', 'merge');
    await this.nodeStyle(old, 'danger');
    const lbl = this._nodeLabel(old, 'empty root', 'danger');
    await this.pause(0.6);
    this._dropLabel(lbl);
    this.root = old.children[0];
    await this.morph(0.8);
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
      this.reset(this.order);
      values.forEach(v => this._insertSilent(v));
      this.status('Preloaded sample data', `${values.length} keys in a B-tree of order ${this.order}.`, 'ok');
      await this.morph(0.9);
    });
  }
}

// ───────────────────────────── UI controller ─────────────────────────────

const SPEEDS = { fast: 0.5, medium: 1, slow: 1.8 };
const SAMPLE = [40, 20, 60, 10, 30, 50, 70, 5, 15, 25, 35, 45, 55, 65, 75];

function initBTreePage() {
  const $ = id => document.getElementById(id);
  const container = $('canvas-container');
  if (!container || container.dataset.btreeReady || typeof Konva === 'undefined') return;
  container.dataset.btreeReady = '1';

  const startOrder = Math.min(10, Math.max(3, parseInt($('order-input')?.value, 10) || 3));
  const viz = new BTreeVisualizer('canvas-container', startOrder);
  viz.speed = SPEEDS[$('animation-speed')?.value] ?? 1;
  viz.status('Ready', 'Push a value to watch it travel down the tree, or Preload Data for a sample tree.');

  const lockable = ['create-btn', 'insert-btn', 'search-btn', 'delete-btn', 'auto-insert-btn', 'preload-btn', 'clear-btn', 'order-input']
    .map($).filter(Boolean);
  viz.onBusy = busy => lockable.forEach(el => {
    el.disabled = busy;
    el.style.opacity = busy ? '0.45' : '';
    el.style.cursor = busy ? 'not-allowed' : '';
  });

  const input = $('value-input');
  const clearInput = () => { if (input) { input.value = ''; input.focus(); } };
  const readValue = () => {
    const raw = (input?.value || '').trim();
    const v = Number(raw);
    if (!raw || !Number.isInteger(v) || Math.abs(v) > 9999) {
      viz.status('Enter a whole number', 'Use a value between -9999 and 9999.', 'danger');
      input?.focus();
      return null;
    }
    return v;
  };
  const on = (id, fn) => $(id)?.addEventListener('click', fn);

  on('create-btn', () => {
    if (viz.busy) return;
    const order = parseInt($('order-input')?.value, 10);
    if (!(order >= 3 && order <= 10)) {
      viz.status('Invalid order', 'Pick an order between 3 and 10.', 'danger');
      return;
    }
    viz.reset(order);
    viz.status(`New B-tree of order ${order}`,
      `Each node holds at most ${order - 1} keys; every node except the root keeps at least ${Math.ceil(order / 2) - 1}.`, 'ok');
  });

  on('insert-btn', async () => {
    const v = readValue();
    if (v !== null && await viz.insert(v)) clearInput();
  });
  on('search-btn', () => {
    const v = readValue();
    if (v !== null) viz.search(v);
  });
  on('delete-btn', async () => {
    const v = readValue();
    if (v !== null && await viz.delete(v)) clearInput();
  });
  on('auto-insert-btn', () => viz.insertRandom());
  on('preload-btn', () => viz.preload(SAMPLE));
  on('clear-btn', () => {
    if (viz.busy) return;
    viz.reset(viz.order);
    viz.status('Tree cleared', `Empty B-tree of order ${viz.order}.`);
  });

  $('animation-speed')?.addEventListener('change', e => { viz.speed = SPEEDS[e.target.value] ?? 1; });
  input?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !viz.busy) $('insert-btn')?.click();
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initBTreePage);
else initBTreePage();
document.addEventListener('turbo:load', initBTreePage);
