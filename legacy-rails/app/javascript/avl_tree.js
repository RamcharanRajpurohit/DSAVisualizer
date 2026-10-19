/*
 * avl_tree.js — AVLVisualizer extends BSTVisualizer.
 *
 * Inheritance in action: search, the walk-down animation, node/edge drawing, the
 * morph engine, insert/delete skeletons and traversals are all INHERITED from the
 * parent class (app/javascript/bst_visualizer.js) — nothing here duplicates them.
 *
 * This subclass only states what makes an AVL tree different from a plain BST:
 *   • _insertSilent — overridden: inserts while rotating, so silent builds stay balanced
 *   • _afterInsert  — overridden: retraces the path, rotates any unbalanced node
 *   • _afterDelete  — overridden: same rebalancing after a deletion
 *   • _retrace / _rebalanceAt / _rotate — the AVL-only machinery (LL/RR/LR/RL cases)
 *   • demo() — scripted rotation demos
 *
 * Rotations play out in phases:
 *   1. retrace upward, recomputing height and balance factor at every ancestor
 *   2. spot the unbalanced node z and name the case (LL / RR / LR / RL)
 *   3. mark z, the pivot y and the subtree T2 that has to change parents
 *   4. cut T2 loose and draw the path each node is about to travel
 *   5. swing y up and z down along those paths; T2 re-hangs under z
 *   6. update the heights of z and y
 */

import { BSTVisualizer, THEME, hOf, fmtBf } from 'bst_visualizer';

const DEMOS = {
  LL:  { title: 'Left-Left case', base: [50, 30, 70, 20, 40], op: 'insert', value: 10,
         intro: 'Inserting 10 makes the left side two levels taller than the right. One <b>right rotation</b> at 50 fixes it — watch 40 (T2) change parents.' },
  RR:  { title: 'Right-Right case', base: [30, 20, 50, 40, 60], op: 'insert', value: 70,
         intro: 'Inserting 70 makes the right side too tall. One <b>left rotation</b> at 30 fixes it — watch 40 (T2) change parents.' },
  LR:  { title: 'Left-Right case', base: [50, 30, 70, 20, 40], op: 'insert', value: 35,
         intro: 'Inserting 35 creates a zig-zag (left, then right). First a <b>left rotation</b> at 30 straightens it, then a <b>right rotation</b> at 50.' },
  RL:  { title: 'Right-Left case', base: [30, 20, 60, 50, 70], op: 'insert', value: 55,
         intro: 'Inserting 55 creates a zig-zag (right, then left). First a <b>right rotation</b> at 60, then a <b>left rotation</b> at 30.' },
  DEL: { title: 'Delete → rotation', base: [30, 20, 40, 10, 25], op: 'delete', value: 40,
         intro: 'Deleting 40 leaves 30 left-heavy. A <b>right rotation</b> at 30 rebalances it, and 25 changes parents.' },
};

class AVLVisualizer extends BSTVisualizer {
  // ───────────────────── overridden labels ─────────────────────

  _treeLabel() { return 'AVL'; }

  _hudText() { return `${super._hudText()}  ·  balanced when every |bf| ≤ 1`; }

  _hintText() {
    return 'Empty tree — insert a value, run a sequence, or pick a Rotation Demo';
  }

  // ───────────────────── AVL-only data machinery ─────────────────────

  // pure data rotation (used by silent inserts and the animated version)
  _rotData(z, dir) {
    const y = dir === 'right' ? z.left : z.right;
    if (dir === 'right') { z.left = y.right; y.right = z; }
    else { z.right = y.left; y.left = z; }
    this._recalc(z);
    this._recalc(y);
    return y;
  }

  // Overridden: like the parent's plain BST insert, but re-balances with rotations
  // so the tree can never grow taller than ~1.44·log₂(n).
  _insertSilent(v) {
    const ins = n => {
      if (!n) return this._newNode(v);
      if (v < n.v) n.left = ins(n.left);
      else if (v > n.v) n.right = ins(n.right);
      else return n;
      this._recalc(n);
      if (n.bf > 1) { if (n.left.bf < 0) n.left = this._rotData(n.left, 'left'); return this._rotData(n, 'right'); }
      if (n.bf < -1) { if (n.right.bf > 0) n.right = this._rotData(n.right, 'right'); return this._rotData(n, 'left'); }
      return n;
    };
    this.root = ins(this.root);
  }

  // ───────────────────── overridden Template-Method hooks ─────────────────────

  // The parent attached the new node; the AVL child walks back up and rebalances.
  async _afterInsert(path, n) {
    await this._retrace(path);
    this.status(`✓ Inserted ${n.v}`,
      `Tree height is ${hOf(this.root)} and every balance factor is between −1 and +1.`, 'ok');
  }

  // The parent unlinked the node; the AVL child walks back up and rebalances.
  async _afterDelete(chain, v) {
    if (this.root) await this._retrace(chain);
    this.status(`✓ Deleted ${v}`,
      this.root ? `Tree height is ${hOf(this.root)} and every node is balanced again.` : 'The tree is now empty.', 'ok');
  }

  // ───────────────────── REBALANCING ─────────────────────

  // chain = nodes from the root down to the lowest node whose subtree changed
  async _retrace(chain) {
    if (!chain.length) return;
    this.status('Retrace to the root',
      'Walk back up the path. At each node recompute <b>height = 1 + max(h(left), h(right))</b> and <b>balance = h(left) − h(right)</b>.');
    await this.pause(0.5);

    for (let i = chain.length - 1; i >= 0; i--) {
      const n = chain[i], parent = i > 0 ? chain[i - 1] : null;
      const oldH = n.h;
      const hl = hOf(n.left), hr = hOf(n.right);
      this._recalc(n);
      const bad = Math.abs(n.bf) > 1;

      await this.nodeStyle(n, bad ? 'danger' : 'compare', 0.2);
      const lbl = this._nodeLabel(n, `h ${n.h} · bf ${fmtBf(n.bf)}`, bad ? 'danger' : 'info');
      this.status(`Check ${n.v}`,
        `height = 1 + max(${hl}, ${hr}) = <b>${n.h}</b>, balance = ${hl} − ${hr} = <b>${fmtBf(n.bf)}</b>` +
        (bad ? ' — outside −1…+1, so this node is <b>unbalanced</b> and needs a rotation.' : ' — within −1…+1, fine.'),
        bad ? 'danger' : 'info');
      await this._updateMeta(n);
      await this.pause(bad ? 0.8 : 0.45);
      this._dropLabel(lbl);

      let top = n;
      if (bad) top = await this._rebalanceAt(n, parent);
      else this.nodeStyle(n, 'base');

      if (top.h === oldH) {
        if (i > 0) {
          this.status(`Subtree height unchanged (${top.h})`,
            `The subtree rooted at ${top.v} is exactly as tall as before, so nothing above it can change — stop retracing.`, 'ok');
          await this.pause(0.7);
        }
        break;
      }
    }
  }

  async _rebalanceAt(z, parent) {
    const leftHeavy = z.bf > 1;
    const y = leftHeavy ? z.left : z.right;
    const zigzag = leftHeavy ? y.bf < 0 : y.bf > 0;
    const kase = leftHeavy ? (zigzag ? 'LR' : 'LL') : (zigzag ? 'RL' : 'RR');
    const names = { LL: 'Left-Left', RR: 'Right-Right', LR: 'Left-Right', RL: 'Right-Left' };
    const heavy = leftHeavy ? 'left' : 'right';
    const x = zigzag ? (leftHeavy ? y.right : y.left) : (leftHeavy ? y.left : y.right);
    const lean = y.bf === 0 ? 'is even' : y.bf > 0 ? 'leans left' : 'leans right';
    const fix = zigzag
      ? `first a <b>${leftHeavy ? 'left' : 'right'} rotation at ${y.v}</b> to straighten the bend, then a <b>${leftHeavy ? 'right' : 'left'} rotation at ${z.v}</b>`
      : `a single <b>${leftHeavy ? 'right' : 'left'} rotation at ${z.v}</b>`;

    this.status(`${names[kase]} case at ${z.v}`,
      `${z.v} is ${heavy}-heavy (bf ${fmtBf(z.bf)}) and its ${heavy} child ${y.v} ${lean} (bf ${fmtBf(y.bf)})` +
      (zigzag ? ' — the heavy path zig-zags.' : ' — the heavy path is a straight line.') + ` Fix: ${fix}.`, 'danger');
    await Promise.all([this.nodeStyle(z, 'danger'), this.nodeStyle(y, 'moving'), x && this.nodeStyle(x, 'left')]);
    const lbl = this._nodeLabel(z, `${kase} case`, 'danger');
    await this._flash(z);
    await this.pause(1.1);
    this._dropLabel(lbl);

    if (zigzag) {
      await this._rotate(y, leftHeavy ? 'left' : 'right', z, `${kase} · step 1 of 2`);
      this.status(`Now it is a straight ${leftHeavy ? 'Left-Left' : 'Right-Right'} line`,
        `One more rotation at ${z.v} finishes the job.`, 'warn');
      await this.pause(0.7);
    }
    return this._rotate(z, leftHeavy ? 'right' : 'left', parent, zigzag ? `${kase} · step 2 of 2` : `${kase} case`);
  }

  async _rotate(z, dir, parent, tag) {
    const R = dir === 'right';
    const y = R ? z.left : z.right;
    const t2 = R ? y.right : y.left;
    const Dir = R ? 'Right' : 'Left';
    const inner = R ? 'right' : 'left', outer = R ? 'left' : 'right';

    // 1 — roles
    this.status(`${tag} · ${Dir} rotation at ${z.v}`,
      `<b>${y.v}</b> (the pivot) moves up into ${z.v}'s place and <b>${z.v}</b> drops down to become its ${inner} child.` +
      (t2 ? ` ${y.v}'s ${inner} subtree <b>T2 (${t2.v})</b> is handed over to become ${z.v}'s new ${outer} child.`
          : ` ${y.v} has no ${inner} subtree, so nothing else changes hands.`), 'warn');
    await Promise.all([this.nodeStyle(z, 'danger'), this.nodeStyle(y, 'moving'), t2 && this.subtreeStyle(t2, 'merge')]);
    const labels = [this._nodeLabel(z, 'z', 'danger'), this._nodeLabel(y, 'pivot y', 'warn')];
    if (t2) labels.push(this._nodeLabel(t2, 'T2', 'merge'));
    await this.pause(1.0);

    // 2 — cut T2 loose
    if (t2) {
      this.status(`${tag} · Detach T2`,
        `Cut the link ${y.v} → ${t2.v}. Every key in T2 lies between ${Math.min(y.v, z.v)} and ${Math.max(y.v, z.v)}, so it can hang under ${z.v} instead.`, 'merge');
      await this.edgeStyle(y, t2, 'cut', 0.3);
      await this.pause(0.7);
    }
    labels.forEach(l => this._dropLabel(l));

    // 3 — commit the new links
    const pz = this._pos(z), py = this._pos(y);
    if (R) { z.left = t2; y.right = z; } else { z.right = t2; y.left = z; }
    this._replaceChild(parent, z, y);
    this._recalc(z);
    this._recalc(y);

    // 4 — show where each node is heading
    const L = this._layout();
    const tz = L.nodes.get(z.id), ty = L.nodes.get(y.id);
    const cx = (pz.x + py.x) / 2, cy = (pz.y + py.y) / 2;
    const bowFor = (a, b) => {
      const mx = (a.x + b.x) / 2 - cx, my = (a.y + b.y) / 2 - cy, d = Math.hypot(mx, my) || 1;
      const k = 0.45 * Math.hypot(b.x - a.x, b.y - a.y);
      return { x: (mx / d) * k, y: (my / d) * k };
    };
    const bz = bowFor(pz, tz), by = bowFor(py, ty);
    this.status(`${tag} · Rotate`,
      `${y.v} swings up, ${z.v} swings down to the ${inner}` + (t2 ? `, and T2 re-hangs under ${z.v}` : '') +
      '. Notice the left-to-right order of the keys never changes — only the parent/child links do.', 'warn');
    const arrows = [this._pathArrow(pz, tz, bz, THEME.text.danger), this._pathArrow(py, ty, by, THEME.text.warn)];
    await this.pause(0.7);

    // 5 — swing everything into place along the arcs
    const bow = new Map();
    this._collect(z).forEach(n => bow.set(n.id, bz));
    this._collect(y).forEach(n => { if (!bow.has(n.id)) bow.set(n.id, by); });
    await this.morph(1.0, { bow });
    arrows.forEach(a => this._dropLabel(a));

    // 6 — T2 re-attached, heights updated
    if (t2) await this.edgeStyle(z, t2, 'fresh', 0.3);
    await Promise.all([this._updateMeta(z), this._updateMeta(y)]);
    await Promise.all([this.nodeStyle(z, 'success'), this.nodeStyle(y, 'success')]);
    this.status(`${tag} · Done`,
      `${y.v} now roots this subtree. ${z.v}: height ${z.h}, bf ${fmtBf(z.bf)} · ${y.v}: height ${y.h}, bf ${fmtBf(y.bf)}.`, 'ok');
    await this.pause(0.8);
    await this.resetStyles(0.3);
    return y;
  }

  // ───────────────────── scripted rotation demos ─────────────────────

  demo(kind) {
    const D = DEMOS[kind];
    if (!D) return Promise.resolve(false);
    return this._run(async () => {
      this.reset();
      D.base.forEach(v => this._insertSilent(v));
      this.status(`Demo · ${D.title}`, D.intro, 'merge');
      await this.morph(0.8);
      await this.pause(1.6);
      if (D.op === 'insert') await this._insertSteps(D.value);
      else await this._deleteSteps(D.value);
    });
  }
}

// ───────────────────────────── UI controller ─────────────────────────────

const SPEEDS = { fast: 0.5, medium: 1, slow: 1.8 };
const SAMPLE = [50, 25, 75, 12, 37, 62, 87, 6, 18, 31, 43];
let activeAVL = null;

function initAVLPage() {
  const $ = id => document.getElementById(id);
  const container = $('avl-canvas');
  if (!container || typeof Konva === 'undefined') return;
  if (activeAVL && activeAVL.container === container) return;
  container.querySelectorAll('.konvajs-content').forEach(el => el.remove()); // stale Turbo snapshot

  const viz = activeAVL = new AVLVisualizer(container);
  viz.speed = SPEEDS[$('animation-speed')?.value] ?? 1;
  viz.setShowMeta($('meta-toggle')?.checked ?? true);
  viz.status('Ready', 'Insert values one by one, run a sequence like 10, 20, 30, 40, 50, or pick a Rotation Demo to watch each rebalancing case step by step.');

  const lockable = ['insert-btn', 'search-btn', 'delete-btn', 'array-btn', 'demo-btn', 'traverse-btn', 'auto-insert-btn', 'preload-btn', 'clear-btn']
    .map($).filter(Boolean);
  viz.onBusy = busy => lockable.forEach(el => {
    el.disabled = busy;
    el.style.opacity = busy ? '0.45' : '';
    el.style.cursor = busy ? 'not-allowed' : '';
  });

  const input = $('value-input');
  const okValue = v => Number.isInteger(v) && v >= -999 && v <= 9999;
  const readValue = () => {
    const raw = (input?.value || '').trim();
    const v = Number(raw);
    if (!raw || !okValue(v)) {
      viz.status('Enter a whole number', 'Use a value between -999 and 9999.', 'danger');
      input?.focus();
      return null;
    }
    return v;
  };
  const clearInput = () => { if (input) { input.value = ''; input.focus(); } };
  const on = (id, fn) => $(id)?.addEventListener('click', fn);

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
  on('array-btn', async () => {
    const el = $('array-input');
    const vals = (el?.value || '').split(/[\s,;]+/).filter(Boolean).map(Number);
    if (!vals.length || !vals.every(okValue)) {
      viz.status('Enter whole numbers', 'Separate values with commas or spaces, e.g. 10, 20, 30, 40, 50.', 'danger');
      el?.focus();
      return;
    }
    if (vals.length > 30) {
      viz.status('Too many values', 'Run at most 30 values at a time.', 'danger');
      return;
    }
    if (await viz.insertMany(vals) && el) el.value = '';
  });
  on('demo-btn', () => viz.demo($('demo-select')?.value || 'LL'));
  on('traverse-btn', () => viz.traverse($('traversal-select')?.value || 'inorder'));
  on('auto-insert-btn', () => viz.insertRandom());
  on('preload-btn', () => viz.preload(SAMPLE));
  on('clear-btn', () => {
    if (viz.busy) return;
    viz.reset();
    viz.status('Tree cleared', 'Empty AVL tree.');
  });

  $('meta-toggle')?.addEventListener('change', e => viz.setShowMeta(e.target.checked));
  $('animation-speed')?.addEventListener('change', e => { viz.speed = SPEEDS[e.target.value] ?? 1; });
  input?.addEventListener('keydown', e => { if (e.key === 'Enter' && !viz.busy) $('insert-btn')?.click(); });
  $('array-input')?.addEventListener('keydown', e => { if (e.key === 'Enter' && !viz.busy) $('array-btn')?.click(); });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAVLPage);
else initAVLPage();
document.addEventListener('turbo:load', initAVLPage);
