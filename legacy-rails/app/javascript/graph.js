/*
 * graph.js — Graph algorithm visualizer in the same style as btree.js and avl_tree.js.
 *
 * Every algorithm is first run on a snapshot of the graph and recorded as a list of steps.
 * A step is a full picture of the state: the colour of every node and edge, the badge above
 * each node (distance, in-degree, discovery/finish time …) and the contents of the working
 * data structures (queue, stack, priority queue, edge list, output). Moving to a step tweens
 * everything from what is on screen to what the step describes:
 *
 *   • a glowing comet travels along the edge being examined,
 *   • nodes and edges cross-fade to their new colours,
 *   • chips in the top strip fly out of the node/edge they stand for and slide between rows
 *     (queue → visit order, priority queue → finalized, sorted edges → MST …),
 *   • for SCCs every arrow visibly flips when the graph is reversed.
 *
 * Because steps are snapshots you can play, pause, step back and forth, or scrub.
 * Self-contained: needs only Konva (no D3).
 */

const MONO = 'Consolas, Monaco, monospace';
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const hslHex = (h, s, l) => {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
};

// 12 well-separated colours for components / union-find sets: [fill, stroke]
const PALETTE = Array.from({ length: 12 }, (_, i) => {
  const h = (205 + i * 137.508) % 360;
  return [hslHex(h, 60, 38), hslHex(h, 95, 72)];
});

const THEME = {
  node: {
    base:     ['#2f2f39', '#6c6c78', '#ececec'],
    frontier: ['#0b6fb8', '#5ab4ff', '#ffffff'],
    current:  ['#ffb000', '#ffd466', '#1a1a1a'],
    visited:  ['#00a854', '#5cffa8', '#ffffff'],
    danger:   ['#d93636', '#ff8a8a', '#ffffff'],
    selected: ['#7a45b8', '#d2adff', '#ffffff'],
  },
  edge: {
    base:     { stroke: '#5c5c6a', width: 2.5, opacity: 0.9 },
    active:   { stroke: '#39aaff', width: 4.5, opacity: 1 },
    tree:     { stroke: '#2ee68a', width: 4.5, opacity: 1 },
    frontier: { stroke: '#ffb000', width: 3.5, opacity: 1, dash: [9, 6] },
    rejected: { stroke: '#ff5c5c', width: 3, opacity: 1, dash: [6, 6] },
    faded:    { stroke: '#5c5c6a', width: 2, opacity: 0.16 },
  },
  chip: {
    base:     ['#2b2b35', '#6c6c78', '#ececec'],
    frontier: ['#0b6fb8', '#5ab4ff', '#ffffff'],
    current:  ['#ffb000', '#ffd466', '#1a1a1a'],
    ok:       ['#00a854', '#5cffa8', '#ffffff'],
    dim:      ['#1d1d24', '#34343e', '#6c6c78'],
    danger:   ['#d93636', '#ff8a8a', '#ffffff'],
  },
  badge:    ['#0f1b27', '#39aaff', '#cfe8ff'],
  badgeHot: ['#ffb000', '#ffd466', '#1a1a1a'],
  text: { info: '#39aaff', ok: '#2ee68a', warn: '#ffb000', danger: '#ff5c5c', merge: '#c08bff' },
};

const SPEEDS = { turbo: 0.35, fast: 0.6, medium: 1, slow: 1.7 };

const TOOL_HINTS = {
  move: 'Drag nodes to rearrange  ·  click a node to make it the start node',
  node: 'Click anywhere on the canvas to add a node',
  edge: 'Click a node, then another node, to connect them  ·  click a weight to change it',
  delete: 'Click a node or an edge to delete it',
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const fmtDist = d => (d === Infinity ? '∞' : String(d));
const signed = w => (w < 0 ? `(${w})` : String(w));
const isComp = s => typeof s === 'string' && /^c\d+$/.test(s);
const randW = () => 1 + Math.floor(Math.random() * 9);
const toward = (a, b, d) => {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  return { x: a.x + (dx / len) * d, y: a.y + (dy / len) * d };
};
// point on a cubic bezier given as a flat [x0,y0,x1,y1,x2,y2,x3,y3] array
const cubicAt = (p, t) => {
  const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return { x: a * p[0] + b * p[2] + c * p[4] + d * p[6], y: a * p[1] + b * p[3] + c * p[5] + d * p[7] };
};
const shuffle = a => {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

// ───────────────────────────── step recorder ─────────────────────────────

class Rec {
  constructor() {
    this.steps = [];
    this.nodes = {};    // node id -> style
    this.edges = {};    // edge id -> style
    this.badges = {};   // node id -> badge text
    this.rows = [];     // [{ title, items: [{ key, text, tone, node?, edge? }] }]
    this.transposed = false;
  }

  row(i, title, items = []) { this.rows[i] = { title, items }; }

  _find(key, remove) {
    for (const r of this.rows) {
      if (!r) continue;
      const j = r.items.findIndex(it => it.key === key);
      if (j >= 0) return remove ? r.items.splice(j, 1)[0] : r.items[j];
    }
    return null;
  }

  move(key, i, patch = {}) {
    const it = this._find(key, true);
    if (it) this.rows[i].items.push(Object.assign(it, patch));
  }

  tone(key, tone) {
    const it = this._find(key, false);
    if (it) it.tone = tone;
  }

  snap(title, detail, tone = 'info', extra = {}) {
    this.steps.push({
      title, detail, tone,
      nodes: { ...this.nodes }, edges: { ...this.edges }, badges: { ...this.badges },
      rows: this.rows.map(r => r && { title: r.title, items: r.items.map(it => ({ ...it })) }),
      transposed: this.transposed,
      ...extra,
    });
  }

  // style an edge for one snapshot only (e.g. "checked, but rejected")
  flash(edge, style, title, detail, tone, extra) {
    const had = Object.prototype.hasOwnProperty.call(this.edges, edge), old = this.edges[edge];
    this.edges[edge] = style;
    this.snap(title, detail, tone, extra);
    if (had) this.edges[edge] = old;
    else delete this.edges[edge];
  }
}

const nChip = (G, id, tone = 'base', text) => ({ key: `n${id}`, text: text ?? G.L(id), node: id, tone });
const hop = (edge, from, style) => ({ travel: { edge, from, style } });

// ───────────────────────────── algorithms ─────────────────────────────

function runBFS(G, s) {
  const R = new Rec(), L = G.L, seen = new Set([s]), dist = { [s]: 0 }, via = {}, order = [];
  R.nodes[s] = 'frontier';
  R.badges[s] = '0';
  R.row(0, 'QUEUE\nfront → back', [nChip(G, s, 'frontier')]);
  R.row(1, 'VISIT ORDER', []);
  R.snap(`Start BFS at ${L(s)}`,
    `${L(s)} goes into the queue at distance 0. BFS explores in waves — first everything 1 edge away, then 2 edges away, and so on. Badges show each node's distance in edges.`);
  const queue = [s];
  while (queue.length) {
    const u = queue.shift();
    order.push(u);
    R.nodes[u] = 'current';
    R.move(`n${u}`, 1, { tone: 'ok' });
    R.snap(`Dequeue ${L(u)}`, `Take ${L(u)} from the front of the queue and look at each of its neighbours.`);
    for (const { v, e } of G.adj(u)) {
      if (!G.directed && via[u] === e.id) continue; // the edge we arrived by
      if (!seen.has(v)) {
        seen.add(v);
        dist[v] = dist[u] + 1;
        via[v] = e.id;
        queue.push(v);
        R.nodes[v] = 'frontier';
        R.edges[e.id] = 'tree';
        R.badges[v] = String(dist[v]);
        R.rows[0].items.push(nChip(G, v, 'frontier'));
        R.snap(`Discover ${L(v)}`,
          `${L(v)} hasn't been seen yet → distance ${dist[v]}, reached from ${L(u)}. Add it to the back of the queue.`,
          'ok', hop(e.id, u, 'tree'));
      } else {
        R.flash(e.id, 'rejected', `${L(v)} already seen`,
          `${L(v)} is already ${order.includes(v) ? 'visited' : 'waiting in the queue'}, so skip it — BFS never adds a node twice.`,
          'warn', { ...hop(e.id, u, 'rejected'), hold: 0.3 });
      }
    }
    R.nodes[u] = 'visited';
  }
  const missed = G.nodes.filter(n => !seen.has(n.id)).map(n => n.label);
  R.snap('✓ BFS complete',
    `Visit order: <b>${order.map(L).join(' → ')}</b>. Green edges form the BFS tree — each one is part of a path with the fewest possible edges from ${L(s)}.` +
    (missed.length ? ` ${missed.join(', ')} can't be reached from ${L(s)}.` : ''), 'ok');
  return R.steps;
}

function runDFS(G, s) {
  const R = new Rec(), L = G.L, state = {}, disc = {}, order = [];
  let time = 0;
  R.row(0, 'CALL STACK\nbottom → top', []);
  R.row(1, 'FINISHED', []);
  R.snap(`Start DFS at ${L(s)}`,
    'Depth-first search follows one path as deep as it can, then backs up to the last node that still has an unexplored edge. The call stack is the current path; badges show discovery / finish times.');
  const visit = (u, via, from) => {
    state[u] = 1;
    disc[u] = ++time;
    order.push(u);
    R.nodes[u] = 'current';
    R.badges[u] = `${disc[u]}/–`;
    R.rows[0].items.push(nChip(G, u, 'current'));
    R.snap(`Visit ${L(u)}`,
      `Discovered at time ${disc[u]}. Push ${L(u)} onto the call stack and try its neighbours one by one.`,
      'info', via ? hop(via, from, 'tree') : {});
    for (const { v, e } of G.adj(u)) {
      if (!G.directed && e.id === via) continue;
      if (!state[v]) {
        R.edges[e.id] = 'tree';
        R.nodes[u] = 'frontier';
        R.tone(`n${u}`, 'frontier');
        visit(v, e.id, u);
        R.nodes[u] = 'current';
        R.tone(`n${u}`, 'current');
        R.snap(`Back to ${L(u)}`, `${L(v)} is finished, so return to ${L(u)} and carry on with its next neighbour.`,
          'info', hop(e.id, v, 'tree'));
      } else {
        const back = state[v] === 1;
        R.flash(e.id, 'rejected', `${L(v)} already visited`,
          back ? `${L(v)} is still on the call stack, so this edge leads back into the current path — a <b>back edge</b>. That means the graph has a cycle.`
               : `${L(v)} is already finished — nothing new down there, skip it.`,
          'warn', { ...hop(e.id, u, 'rejected'), hold: 0.35 });
      }
    }
    state[u] = 2;
    const fin = ++time;
    R.nodes[u] = 'visited';
    R.badges[u] = `${disc[u]}/${fin}`;
    R.move(`n${u}`, 1, { tone: 'ok' });
    R.snap(`Finish ${L(u)}`, `Every neighbour of ${L(u)} has been explored. It finishes at time ${fin} and is popped off the call stack.`, 'ok');
  };
  visit(s, null, null);
  const missed = G.nodes.length - order.length;
  R.snap('✓ DFS complete',
    `Discovery order: <b>${order.map(L).join(' → ')}</b>. Green edges form the DFS tree.` +
    (missed ? ` ${plural(missed, 'node')} can't be reached from ${L(s)}.` : ''), 'ok');
  return R.steps;
}

function runDijkstra(G, s) {
  const R = new Rec(), L = G.L, dist = {}, done = new Set(), via = {};
  G.nodes.forEach(n => { dist[n.id] = Infinity; R.badges[n.id] = '∞'; });
  dist[s] = 0;
  R.badges[s] = '0';
  R.nodes[s] = 'frontier';
  const queue = () => G.nodes
    .filter(n => !done.has(n.id) && dist[n.id] < Infinity)
    .sort((a, b) => dist[a.id] - dist[b.id] || a.label.localeCompare(b.label))
    .map(n => nChip(G, n.id, 'frontier', `${n.label}·${dist[n.id]}`));
  R.row(0, 'PRIORITY QUEUE\nsmallest first', queue());
  R.row(1, 'FINALIZED', []);
  R.snap(`Start Dijkstra at ${L(s)}`,
    `Every distance starts at ∞ except ${L(s)} = 0. Repeat: finalize the closest unfinished node, then <b>relax</b> its edges — check whether going through it gives a shorter path.` +
    (G.hasNeg ? '<br><b>Heads-up:</b> this graph has a negative edge. Dijkstra assumes weights ≥ 0, so watch for a wrong answer.' : ''),
    G.hasNeg ? 'warn' : 'info');
  for (;;) {
    const q = queue();
    if (!q.length) break;
    const u = q[0].node;
    done.add(u);
    R.nodes[u] = 'current';
    if (via[u]) R.edges[via[u]] = 'tree';
    R.rows[0].items = queue();
    R.rows[1].items.push(nChip(G, u, 'ok', `${L(u)}·${dist[u]}`));
    R.snap(`Finalize ${L(u)} = ${dist[u]}`,
      `${L(u)} has the smallest tentative distance in the queue` +
      (G.hasNeg ? ', so Dijkstra declares it final.' : '. With non-negative weights no other route can beat it, so it is final.'));
    for (const { v, e, w } of G.adj(u)) {
      const nd = dist[u] + w;
      if (done.has(v)) {
        if (nd < dist[v]) {
          R.flash(e.id, 'rejected', `${L(v)} is already final`,
            `${dist[u]} + ${signed(w)} = ${nd} would beat ${L(v)}'s ${dist[v]}, but Dijkstra never revisits a finalized node. <b>This is exactly why negative edges break Dijkstra.</b>`,
            'danger', hop(e.id, u, 'rejected'));
        }
        continue;
      }
      if (nd < dist[v]) {
        const old = dist[v];
        dist[v] = nd;
        if (via[v]) delete R.edges[via[v]];
        via[v] = e.id;
        R.edges[e.id] = 'frontier';
        R.nodes[v] = 'frontier';
        R.badges[v] = String(nd);
        R.rows[0].items = queue();
        R.snap(`Relax ${L(u)} → ${L(v)}`,
          `${dist[u]} + ${signed(w)} = <b>${nd}</b> < ${fmtDist(old)} — a shorter way to reach ${L(v)}. Update it` +
          (old < Infinity ? ' and drop its old route.' : '.'), 'ok', hop(e.id, u, 'frontier'));
      } else {
        R.flash(e.id, 'rejected', `Relax ${L(u)} → ${L(v)}`,
          `${dist[u]} + ${signed(w)} = ${nd} ≥ ${dist[v]} — not shorter, keep ${dist[v]}.`,
          'warn', { ...hop(e.id, u, 'rejected'), hold: 0.3 });
      }
    }
    R.nodes[u] = 'visited';
  }
  const unreached = G.nodes.filter(n => dist[n.id] === Infinity).map(n => n.label);
  R.snap('✓ Dijkstra complete',
    `Shortest distances from ${L(s)}: ${G.nodes.filter(n => n.id !== s).map(n => `${n.label} <b>${fmtDist(dist[n.id])}</b>`).join(' · ')}. Green edges form the shortest-path tree.` +
    (unreached.length ? ` ${unreached.join(', ')} can't be reached.` : '') +
    (G.hasNeg ? ' <b>Some of these may be wrong because of the negative edge — run Bellman-Ford to compare.</b>' : ''),
    G.hasNeg ? 'warn' : 'ok');
  return R.steps;
}

function runBellmanFord(G, s) {
  const R = new Rec(), L = G.L, n = G.nodes.length, dist = {}, via = {};
  const list = [];
  G.edges.forEach(e => {
    list.push({ e, a: e.u, b: e.v });
    if (!G.directed) list.push({ e, a: e.v, b: e.u });
  });
  list.sort((x, y) => L(x.a).localeCompare(L(y.a)) || L(x.b).localeCompare(L(y.b)));
  G.nodes.forEach(nd => { dist[nd.id] = Infinity; R.badges[nd.id] = '∞'; });
  dist[s] = 0;
  R.badges[s] = '0';
  R.nodes[s] = 'visited';
  const chips = () => R.rows[0].items;
  R.row(0, `EDGES\npass 1 of ${n - 1}`,
    list.map(x => ({ key: `d${x.e.id}:${x.a}`, text: `${L(x.a)}→${L(x.b)}`, edge: x.e.id, tone: 'base' })));
  R.row(1, '', []);
  R.snap('Start Bellman-Ford',
    `All distances start at ∞ except ${L(s)} = 0. Relax <b>every</b> edge in a fixed order, and repeat that pass up to ${n - 1} times (nodes − 1) — a shortest path never needs more edges than that.` +
    (G.directed ? '' : ' In an undirected graph each edge is tried in both directions.'));
  let stable = false;
  for (let p = 1; p < n && !stable; p++) {
    R.rows[0].title = `EDGES\npass ${p} of ${n - 1}`;
    chips().forEach(c => { c.tone = 'base'; });
    R.snap(`Pass ${p} of ${n - 1}`, 'Go through the whole edge list once. Edges starting at a node that is still ∞ are skipped.', 'info', { hold: 0.7 });
    let changed = false;
    list.forEach((x, j) => {
      const c = chips()[j], w = G.w(x.e);
      if (dist[x.a] === Infinity) { c.tone = 'dim'; return; }
      c.tone = 'current';
      const nd = dist[x.a] + w;
      if (nd < dist[x.b]) {
        const old = dist[x.b];
        dist[x.b] = nd;
        changed = true;
        if (via[x.b] && via[x.b] !== x.e.id) delete R.edges[via[x.b]];
        via[x.b] = x.e.id;
        R.edges[x.e.id] = 'frontier';
        R.nodes[x.b] = 'visited';
        R.badges[x.b] = String(nd);
        R.snap(`Relax ${L(x.a)} → ${L(x.b)}`,
          `${dist[x.a]} + ${signed(w)} = <b>${nd}</b> < ${fmtDist(old)} → update ${L(x.b)}.`, 'ok', hop(x.e.id, x.a, 'frontier'));
      } else {
        R.flash(x.e.id, 'rejected', `Relax ${L(x.a)} → ${L(x.b)}`,
          `${dist[x.a]} + ${signed(w)} = ${nd} ≥ ${fmtDist(dist[x.b])} → no change.`, 'warn',
          { ...hop(x.e.id, x.a, 'rejected'), hold: 0.25 });
      }
      c.tone = 'dim';
    });
    if (!changed) {
      stable = true;
      R.snap(`Pass ${p}: nothing changed`, 'No distance improved during a whole pass, so none ever will — stop early.', 'ok');
    }
  }
  if (!stable) {
    R.rows[0].title = 'EDGES\nextra check';
    chips().forEach(c => { c.tone = 'base'; });
    const j = list.findIndex(x => dist[x.a] < Infinity && dist[x.a] + G.w(x.e) < dist[x.b]);
    if (j >= 0) {
      const x = list[j];
      chips()[j].tone = 'danger';
      R.nodes[x.b] = 'danger';
      R.edges[x.e.id] = 'rejected';
      R.snap('✗ Negative cycle detected',
        `After ${n - 1} passes, ${L(x.a)} → ${L(x.b)} can <i>still</i> be improved (${dist[x.a]} + ${signed(G.w(x.e))} < ${dist[x.b]}). That only happens when a cycle has negative total weight — you could loop it forever, so shortest paths don't exist.` +
        (G.directed ? '' : ' In an undirected graph any negative edge is such a cycle: walk it back and forth.'),
        'danger', hop(x.e.id, x.a, 'rejected'));
      return R.steps;
    }
    R.snap('Extra check pass', `One more pass over all edges improves nothing, so there is no negative cycle.`, 'ok');
  }
  Object.values(via).forEach(id => { R.edges[id] = 'tree'; });
  R.rows[0].items = [];
  R.rows[0].title = 'EDGES';
  R.snap('✓ Bellman-Ford complete',
    `Shortest distances from ${L(s)}: ${G.nodes.filter(nd => nd.id !== s).map(nd => `${nd.label} <b>${fmtDist(dist[nd.id])}</b>`).join(' · ')}. Green edges form the shortest-path tree.`, 'ok');
  return R.steps;
}

function runKruskal(G) {
  const R = new Rec(), L = G.L, parent = {}, size = {}, color = {};
  const name = e => `${L(e.u)}–${L(e.v)}`;
  G.nodes.forEach((n, i) => { parent[n.id] = n.id; size[n.id] = 1; color[n.id] = i; R.nodes[n.id] = `c${i}`; });
  const find = x => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const sorted = [...G.edges].sort((a, b) => G.w(a) - G.w(b) || name(a).localeCompare(name(b)));
  R.row(0, 'EDGES\ncheapest first', sorted.map(e => ({ key: `e${e.id}`, text: `${name(e)}·${G.w(e)}`, edge: e.id, tone: 'base' })));
  R.row(1, 'MST', []);
  R.snap("Start Kruskal's algorithm",
    'Sort all edges by weight. Every node starts in its own set — shown by its own colour. Take edges cheapest-first and keep one only if it joins two <b>different</b> sets.');
  let total = 0, count = 0;
  for (const e of sorted) {
    if (count === G.nodes.length - 1) break;
    const a = find(e.u), b = find(e.v);
    R.tone(`e${e.id}`, 'current');
    R.edges[e.id] = 'active';
    R.snap(`Consider ${name(e)} (weight ${G.w(e)})`, `The cheapest edge left. Are ${L(e.u)} and ${L(e.v)} already in the same set (same colour)?`);
    if (a !== b) {
      const [big, small] = size[a] >= size[b] ? [a, b] : [b, a];
      parent[small] = big;
      size[big] += size[small];
      G.nodes.forEach(n => { if (find(n.id) === big) R.nodes[n.id] = `c${color[big]}`; });
      R.edges[e.id] = 'tree';
      total += G.w(e);
      count++;
      R.move(`e${e.id}`, 1, { tone: 'ok' });
      R.snap(`Add ${name(e)}`,
        `Different sets → no cycle. Keep the edge; the two sets merge into one colour. MST weight so far: <b>${total}</b>.`, 'ok');
    } else {
      R.edges[e.id] = 'rejected';
      R._find(`e${e.id}`, true);
      R.snap(`Skip ${name(e)}`, `${L(e.u)} and ${L(e.v)} are already connected — this edge would close a cycle.`, 'danger');
      R.edges[e.id] = 'faded';
    }
  }
  G.edges.forEach(e => { if (R.edges[e.id] !== 'tree') R.edges[e.id] = 'faded'; });
  R.rows[0].items = [];
  const full = count === G.nodes.length - 1;
  R.snap(full ? '✓ Minimum spanning tree found' : '✓ Minimum spanning forest',
    `${plural(count, 'edge')}, total weight <b>${total}</b>.` +
    (full ? ` A tree on ${G.nodes.length} nodes always has exactly ${G.nodes.length - 1} edges.`
          : ' The graph is disconnected, so each colour is its own tree.'), 'ok');
  return R.steps;
}

function runPrim(G, s) {
  const R = new Rec(), L = G.L, inT = new Set([s]);
  let total = 0;
  const byW = (a, b) => G.w(a) - G.w(b) || G.name(a).localeCompare(G.name(b));
  const crossing = () => G.edges.filter(e => inT.has(e.u) !== inT.has(e.v)).sort(byW);
  const chip = (e, tone) => {
    const a = inT.has(e.u) ? e.u : e.v;
    return { key: `e${e.id}`, text: `${L(a)}–${L(G.other(e, a))}·${G.w(e)}`, edge: e.id, tone };
  };
  const paint = cand => G.edges.forEach(e => {
    if (R.edges[e.id] === 'tree') return;
    if (cand.includes(e)) R.edges[e.id] = 'frontier';
    else if (inT.has(e.u) && inT.has(e.v)) R.edges[e.id] = 'faded';
    else delete R.edges[e.id];
  });
  R.nodes[s] = 'visited';
  R.row(0, 'CROSSING EDGES\ncheapest first', []);
  R.row(1, 'MST', []);
  R.snap(`Start Prim at ${L(s)}`, `The tree starts as just ${L(s)}. Each round, look at every edge that leaves the tree and add the cheapest one.`);
  while (inT.size < G.nodes.length) {
    const cand = crossing();
    paint(cand);
    R.rows[0].items = cand.map((e, j) => chip(e, j === 0 ? 'current' : 'base'));
    if (!cand.length) {
      R.snap('Graph is disconnected',
        `No edge leaves the tree, but ${plural(G.nodes.length - inT.size, 'node')} ${G.nodes.length - inT.size === 1 ? 'is' : 'are'} still outside. Prim can only span what is reachable from ${L(s)}.`, 'danger');
      break;
    }
    const best = cand[0], a = inT.has(best.u) ? best.u : best.v, b = G.other(best, a);
    R.edges[best.id] = 'active';
    R.snap(`Cheapest crossing edge: ${L(a)}–${L(b)}`,
      `${plural(cand.length, 'edge')} ${cand.length === 1 ? 'crosses' : 'cross'} from the tree to the outside (dashed). The lightest is ${L(a)}–${L(b)} with weight ${G.w(best)}.`);
    inT.add(b);
    total += G.w(best);
    R.nodes[b] = 'visited';
    R.edges[best.id] = 'tree';
    R.move(`e${best.id}`, 1, { tone: 'ok' });
    R.rows[0].items = R.rows[0].items.filter(it => { const e = G.edge(it.edge); return inT.has(e.u) !== inT.has(e.v); });
    paint(cand.filter(e => inT.has(e.u) !== inT.has(e.v)));
    R.snap(`Add ${L(b)}`, `${L(b)} joins the tree through ${L(a)}–${L(b)}. MST weight so far: <b>${total}</b>.`, 'ok', hop(best.id, a, 'tree'));
  }
  G.edges.forEach(e => { if (R.edges[e.id] !== 'tree') R.edges[e.id] = 'faded'; });
  R.rows[0].items = [];
  R.snap('✓ Prim complete', `The tree spans ${plural(inT.size, 'node')} with total weight <b>${total}</b>.`, 'ok');
  return R.steps;
}

function runTopo(G) {
  const R = new Rec(), L = G.L, indeg = {}, order = [];
  G.nodes.forEach(n => { indeg[n.id] = 0; });
  G.edges.forEach(e => { indeg[e.v]++; });
  G.nodes.forEach(n => { R.badges[n.id] = `in ${indeg[n.id]}`; });
  R.row(0, 'READY QUEUE\nin-degree 0', []);
  R.row(1, 'ORDER', []);
  R.snap("Start Kahn's algorithm", "Each badge counts a node's incoming edges — how many prerequisites it is still waiting for.");
  const queue = G.nodes.filter(n => indeg[n.id] === 0).map(n => n.id);
  queue.forEach(id => { R.nodes[id] = 'frontier'; R.rows[0].items.push(nChip(G, id, 'frontier')); });
  R.snap(queue.length ? `Ready: ${queue.map(L).join(', ')}` : 'Nothing is ready',
    queue.length ? 'These nodes have no incoming edges, so nothing has to come before them. They go into the queue.'
                 : 'Every node has an incoming edge, so there must be a cycle.',
    queue.length ? 'info' : 'danger');
  while (queue.length) {
    const u = queue.shift();
    order.push(u);
    R.nodes[u] = 'current';
    R.move(`n${u}`, 1, { tone: 'ok' });
    R.snap(`Output ${L(u)}`, `${L(u)} has no remaining prerequisites, so it goes next in the order. Now remove its outgoing edges.`);
    for (const { v, e } of G.adj(u)) {
      indeg[v]--;
      R.badges[v] = `in ${indeg[v]}`;
      R.edges[e.id] = 'faded';
      const ready = indeg[v] === 0;
      if (ready) { queue.push(v); R.nodes[v] = 'frontier'; R.rows[0].items.push(nChip(G, v, 'frontier')); }
      R.snap(`Remove ${L(u)} → ${L(v)}`,
        `${L(v)}'s in-degree drops to ${indeg[v]}` + (ready ? ' — no prerequisites left, so it joins the queue.' : '.'),
        ready ? 'ok' : 'info', hop(e.id, u, 'active'));
    }
    R.nodes[u] = 'visited';
  }
  if (order.length < G.nodes.length) {
    const left = G.nodes.filter(n => !order.includes(n.id));
    left.forEach(n => { R.nodes[n.id] = 'danger'; });
    G.edges.forEach(e => { if (!order.includes(e.u) && !order.includes(e.v)) R.edges[e.id] = 'rejected'; });
    R.snap('✗ Cycle detected',
      `${left.map(n => n.label).join(', ')} still have incoming edges, but none of them is ready. They are waiting on each other in a cycle, so no topological order exists.`, 'danger');
  } else {
    order.forEach((id, i) => { R.badges[id] = `#${i + 1}`; });
    G.edges.forEach(e => { R.edges[e.id] = 'tree'; });
    R.snap('✓ Topological order', `<b>${order.map(L).join(' → ')}</b> — every edge points from earlier to later in this list.`, 'ok');
  }
  return R.steps;
}

function runSCC(G) {
  const R = new Rec(), L = G.L, seen = new Set(), fin = [];
  R.row(0, 'CALL STACK\nbottom → top', []);
  R.row(1, 'FINISH STACK\nbottom → top', []);
  R.snap('Kosaraju · phase 1',
    'Run DFS from every unvisited node and record the order in which nodes <b>finish</b>. Whatever finishes last sits in a component that nothing else can reach.');
  const dfs1 = (u, via, from) => {
    seen.add(u);
    R.nodes[u] = 'current';
    R.rows[0].items.push(nChip(G, u, 'current'));
    R.snap(`Visit ${L(u)}`,
      via ? `Push ${L(u)} on the call stack and follow its outgoing edges.`
          : fin.length ? `Nothing unvisited is reachable any more, so start a new DFS from ${L(u)}.`
                       : `Start the first DFS at ${L(u)}.`,
      'info', via ? hop(via, from, 'tree') : {});
    for (const { v, e } of G.adj(u)) {
      if (seen.has(v)) continue;
      R.edges[e.id] = 'tree';
      R.nodes[u] = 'frontier';
      R.tone(`n${u}`, 'frontier');
      dfs1(v, e.id, u);
      R.nodes[u] = 'current';
      R.tone(`n${u}`, 'current');
    }
    fin.push(u);
    R.nodes[u] = 'visited';
    R.badges[u] = `#${fin.length}`;
    R.move(`n${u}`, 1, { tone: 'ok' });
    R.snap(`Finish ${L(u)} (#${fin.length})`, `${L(u)} has no unvisited neighbours left, so it finishes and goes on top of the finish stack.`, 'ok');
  };
  G.nodes.forEach(n => { if (!seen.has(n.id)) dfs1(n.id, null, null); });

  R.nodes = {};
  R.edges = {};
  R.transposed = true;
  R.row(0, 'FINISH STACK\npop from the right', R.rows[1].items.map(it => ({ ...it, tone: 'base' })));
  R.row(1, 'COMPONENTS', []);
  R.snap('Kosaraju · phase 2: reverse every edge',
    "Reversing all edges keeps each component intact, but edges <i>between</i> components now point the other way — so a DFS in the reversed graph can't leak out of its component.",
    'merge', { hold: 1.2 });
  const comp = {}, comps = [];
  for (let i = fin.length - 1; i >= 0; i--) {
    const u = fin[i];
    if (comp[u] !== undefined) continue;
    const c = comps.length, tag = `c${c}`, members = [];
    const dfs2 = (x, via, from) => {
      comp[x] = c;
      members.push(x);
      R.nodes[x] = tag;
      if (via) R.edges[via] = tag;
      R.move(`n${x}`, 1, { tone: tag });
      R.snap(via ? `Reach ${L(x)}` : `Pop ${L(x)} → component ${c + 1}`,
        via ? `A reversed edge leads from ${L(from)} to ${L(x)}, so ${L(x)} belongs to component ${c + 1}.`
            : `${L(x)} is the unassigned node with the latest finish time. A DFS from it in the reversed graph collects exactly one component.`,
        'merge', via ? hop(via, from, 'active') : {});
      for (const { v, e } of G.radj(x)) if (comp[v] === undefined) dfs2(v, e.id, x);
    };
    dfs2(u, null, null);
    comps.push(members);
    R.snap(`Component ${c + 1}: {${members.map(L).join(', ')}}`,
      members.length > 1 ? 'Every node in this group can reach every other one along the arrows.'
                         : `${L(u)} is on its own — no cycle passes through it.`, 'ok');
  }
  R.transposed = false;
  G.edges.forEach(e => { R.edges[e.id] = comp[e.u] === comp[e.v] ? `c${comp[e.u]}` : 'faded'; });
  R.snap(`✓ ${plural(comps.length, 'strongly connected component')}`,
    `Edges flipped back. Each colour is one SCC: ${comps.map(m => `{${m.map(L).join(', ')}}`).join('  ')}. Faded edges run between components and only go one way.`, 'ok');
  return R.steps;
}

const ALGOS = {
  bfs: { name: 'Breadth-First Search', start: true, run: runBFS, time: 'O(V + E)',
    info: 'Explores in waves using a <b>queue</b>. On an unweighted graph the BFS tree gives the path with the fewest edges to every node.' },
  dfs: { name: 'Depth-First Search', start: true, run: runDFS, time: 'O(V + E)',
    info: 'Dives deep along one path, then backtracks, using a <b>call stack</b>. Discovery / finish times power cycle detection, topological sort and SCCs.' },
  dijkstra: { name: "Dijkstra's Algorithm", start: true, run: runDijkstra, time: 'O((V + E) log V) with a heap',
    info: 'Shortest paths from one node when every weight is ≥ 0. Always finalizes the closest unfinished node from a <b>priority queue</b>.' },
  bellmanFord: { name: 'Bellman-Ford', start: true, run: runBellmanFord, time: 'O(V · E)',
    info: 'Shortest paths that also handle <b>negative weights</b>: relax every edge V − 1 times, then one extra pass detects negative cycles.' },
  kruskal: { name: "Kruskal's MST", needs: 'undirected', run: runKruskal, time: 'O(E log E)',
    info: 'Minimum spanning tree: take edges cheapest-first and skip any that would close a cycle. Colours show the <b>union-find</b> sets merging.' },
  prim: { name: "Prim's MST", needs: 'undirected', start: true, run: runPrim, time: 'O(E log V) with a heap',
    info: 'Minimum spanning tree grown from one node: always add the cheapest edge that leaves the tree.' },
  topo: { name: 'Topological Sort', needs: 'directed', run: runTopo, time: 'O(V + E)',
    info: "Kahn's algorithm: repeatedly output a node with no remaining incoming edges. Only works without cycles — try the <b>Random DAG</b> preset." },
  scc: { name: 'Strongly Connected Components', needs: 'directed', run: runSCC, time: 'O(V + E)',
    info: "Kosaraju's algorithm: DFS for finish order, reverse every edge, then DFS again in reverse finish order. Try the <b>Clusters</b> preset." },
};

// ───────────────────────────── layout & presets ─────────────────────────────

// Fruchterman–Reingold: nodes repel, edges pull, with a little gravity toward the centre.
function forceLayout(ids, pairs, W, H, init) {
  const n = ids.length, pos = new Map(), M = 70, cx = W / 2, cy = H / 2;
  ids.forEach((id, i) => {
    const p = init && init.get(id), a = (i / n) * Math.PI * 2 - Math.PI / 2;
    pos.set(id, p
      ? { x: p.x + (Math.random() - 0.5) * 4, y: p.y + (Math.random() - 0.5) * 4 }
      : { x: cx + Math.cos(a) * W * 0.32 + (Math.random() - 0.5) * 30, y: cy + Math.sin(a) * H * 0.34 + (Math.random() - 0.5) * 30 });
  });
  if (n < 2) return pos;
  const k = Math.sqrt(((W - 2 * M) * (H - 2 * M)) / n) * 0.7;
  let temp = W / 10;
  for (let it = 0; it < 400; it++) {
    const disp = new Map(ids.map(id => [id, { x: 0, y: 0 }]));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = pos.get(ids[i]), b = pos.get(ids[j]);
        let dx = a.x - b.x, dy = a.y - b.y;
        const d = Math.hypot(dx, dy) || 0.1, f = (k * k) / d;
        dx = (dx / d) * f; dy = (dy / d) * f;
        const da = disp.get(ids[i]), db = disp.get(ids[j]);
        da.x += dx; da.y += dy; db.x -= dx; db.y -= dy;
      }
    }
    pairs.forEach(([u, v]) => {
      const a = pos.get(u), b = pos.get(v);
      let dx = a.x - b.x, dy = a.y - b.y;
      const d = Math.hypot(dx, dy) || 0.1, f = (d * d) / k;
      dx = (dx / d) * f; dy = (dy / d) * f;
      const da = disp.get(u), db = disp.get(v);
      da.x -= dx; da.y -= dy; db.x += dx; db.y += dy;
    });
    ids.forEach(id => {
      const p = pos.get(id), D = disp.get(id);
      D.x += (cx - p.x) * 0.25;
      D.y += (cy - p.y) * 0.45;
      const len = Math.hypot(D.x, D.y) || 1, step = Math.min(len, temp);
      p.x = clamp(p.x + (D.x / len) * step, M, W - M);
      p.y = clamp(p.y + (D.y / len) * step, M - 10, H - M + 10);
    });
    temp = Math.max(0.5, temp * 0.985);
  }
  return pos;
}

// Dijkstra gets D and E wrong here; Bellman-Ford gets B 1, D 4, E 5.
const NEG_DEMO = {
  n: 5, directed: true, weighted: true,
  pos: [[130, 280], [420, 450], [420, 110], [690, 450], [880, 260]],
  edges: [[0, 1, 2], [0, 2, 5], [2, 1, -4], [1, 3, 3], [3, 4, 1], [2, 4, 8]],
  title: 'Negative edge demo',
  detail: 'C → B costs −4. Run <b>Dijkstra</b> from A and note D and E, then run <b>Bellman-Ford</b> and compare — the true distances are B 1, D 4, E 5.',
};

// ───────────────────────────── visualizer ─────────────────────────────

class GraphVisualizer {
  constructor(container) {
    this.container = container;
    this.R = 22;                    // node radius
    this.VW = 1000; this.VH = 560;  // virtual drawing area, scaled to fit the canvas
    this.TOP = 124;                 // space reserved for the HUD and data-structure strip
    this.speed = 1;
    this.directed = false;
    this.weighted = true;
    this.nodes = new Map();         // id -> { id, label, x, y }
    this.edges = new Map();         // id -> { id, u, v, w }
    this.uid = 0;
    this.startId = null;
    this.nodeViews = new Map();
    this.edgeViews = new Map();
    this.chipViews = new Map();
    this.tool = 'move';
    this.pending = null;            // first node picked with the edge tool
    this.reprMode = 'matrix';
    this.steps = [];
    this.idx = -1;
    this.target = -1;
    this.algoKey = null;
    this.epoch = 0;
    this.pumping = null;
    this.pumpEpoch = -1;
    this.playing = false;
    this.playToken = 0;
    this.flip = 0;                  // 0 = normal, 1 = every edge drawn reversed
    this.onChange = null;
    this._initStage();
  }

  // ───────────────────────────── setup ─────────────────────────────

  _initStage() {
    const c = this.container;
    const panel = document.getElementById('info-panel');
    if (panel) panel.style.zIndex = '10';

    this.stage = new Konva.Stage({ container: c, width: c.offsetWidth, height: c.offsetHeight });
    this.layer = new Konva.Layer();
    this.stage.add(this.layer);

    this.hud = new Konva.Text({ x: 16, y: 14, fontSize: 13, fontFamily: MONO, fill: '#8a8a96', listening: false });
    this.toolHint = new Konva.Text({ x: 16, y: 50, fontSize: 13, fill: '#6c6c78', listening: false, text: TOOL_HINTS.move });
    this.hint = new Konva.Text({
      fontSize: 16, fill: '#7a7a86', align: 'center', listening: false,
      text: 'Empty graph — press Generate, or pick the Node tool and click here',
    });
    this.rowTitles = [0, 1].map(i => new Konva.Text({
      x: 16, y: this._rowY(i) - 15, width: 108, height: 30, fontSize: 10, fontStyle: 'bold', fontFamily: MONO,
      fill: '#6c6c78', lineHeight: 1.3, verticalAlign: 'middle', visible: false, listening: false,
    }));
    this.world = new Konva.Group();
    this.edgeGroup = new Konva.Group();
    this.labelGroup = new Konva.Group();
    this.rubber = new Konva.Line({ stroke: '#c08bff', strokeWidth: 2.5, dash: [8, 6], lineCap: 'round', visible: false, listening: false });
    this.nodeGroup = new Konva.Group();
    this.fxGroup = new Konva.Group({ listening: false });
    this.world.add(this.edgeGroup, this.labelGroup, this.rubber, this.nodeGroup, this.fxGroup);
    this.chipGroup = new Konva.Group({ listening: false });
    this.measure = new Konva.Text({ fontSize: 13, fontStyle: 'bold', fontFamily: MONO });
    this.layer.add(this.hud, this.toolHint, this.hint, ...this.rowTitles, this.world, this.chipGroup);

    this.stage.on('click tap', e => {
      if (e.evt && e.evt.button === 2) return;
      if (e.target === this.stage) this._backgroundClick();
    });
    this.stage.on('mousemove touchmove', () => this._moveRubber());

    const onResize = () => this._resize();
    if (window.ResizeObserver) new ResizeObserver(onResize).observe(c);
    else window.addEventListener('resize', onResize);
    this._resize();
    this._updateHud();
  }

  _rowY(i) { return 58 + i * 38; }

  _resize() {
    const c = this.container;
    this.stage.size({ width: c.offsetWidth, height: c.offsetHeight });
    this.hint.setAttrs({ x: 0, y: this.stage.height() / 2, width: this.stage.width() });
    this.hint.visible(this.nodes.size === 0);
    this._fit();
    const st = this.steps[this.idx];
    this._renderRows(st ? st.rows : [], 0);
    this.layer.batchDraw();
  }

  _fit() {
    const sw = this.stage.width(), sh = this.stage.height(), top = this.TOP, bottom = 12;
    const s = clamp(Math.min((sw - 24) / this.VW, (sh - top - bottom) / this.VH), 0.3, 1.35);
    this.world.setAttrs({
      scaleX: s, scaleY: s,
      x: (sw - this.VW * s) / 2,
      y: top + Math.max(0, (sh - top - bottom - this.VH * s) / 2),
    });
  }

  _toolCursor() { return this.tool === 'node' ? 'copy' : this.tool === 'edge' && this.pending ? 'crosshair' : ''; }
  _setCursor(c) { this.stage.container().style.cursor = c || this._toolCursor(); }

  sortedNodes() { return [...this.nodes.values()].sort((a, b) => a.label.localeCompare(b.label)); }

  _updateHud() {
    const s = this.nodes.get(this.startId);
    this.hud.text(`${plural(this.nodes.size, 'node')}  ·  ${plural(this.edges.size, 'edge')}  ·  ${this.directed ? 'directed' : 'undirected'}  ·  ${this.weighted ? 'weighted' : 'unweighted'}` +
      (s ? `  ·  start ${s.label}` : ''));
  }

  status(title, detail = '', tone = 'info') {
    const el = document.getElementById('operation-details');
    if (!el) return;
    el.innerHTML =
      `<div style="color:${THEME.text[tone] || THEME.text.info};font-weight:700;margin-bottom:4px">${title}</div>` +
      (detail ? `<div style="font-size:0.85rem;line-height:1.45;opacity:0.9">${detail}</div>` : '');
  }

  _syncUI() { if (this.onChange) this.onChange(); }

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

  // ───────────────────────────── colours ─────────────────────────────

  _nodeColors(state) {
    if (isComp(state)) { const p = PALETTE[+state.slice(1) % PALETTE.length]; return [p[0], p[1], '#ffffff']; }
    return THEME.node[state] || THEME.node.base;
  }

  _edgeStyle(state) {
    if (isComp(state)) return { stroke: PALETTE[+state.slice(1) % PALETTE.length][1], width: 4, opacity: 1 };
    return THEME.edge[state] || THEME.edge.base;
  }

  _chipColors(tone) {
    if (isComp(tone)) { const p = PALETTE[+tone.slice(1) % PALETTE.length]; return [p[0], p[1], '#ffffff']; }
    return THEME.chip[tone] || THEME.chip.base;
  }

  // ───────────────────────────── node & edge views ─────────────────────────────

  _makeNodeView(n) {
    const R = this.R, [fill, stroke, tc] = THEME.node.base;
    const group = new Konva.Group({ x: n.x, y: n.y, draggable: true });
    const ring = new Konva.Circle({ radius: R + 7, stroke: '#00f2ff', strokeWidth: 2, dash: [5, 4], opacity: 0, listening: false });
    const circle = new Konva.Circle({
      radius: R, fill, stroke, strokeWidth: 2.5,
      shadowColor: 'black', shadowBlur: 10, shadowOpacity: 0.45, shadowOffset: { x: 0, y: 3 },
    });
    const text = new Konva.Text({
      x: -R, y: -R, width: 2 * R, height: 2 * R, text: n.label, align: 'center', verticalAlign: 'middle',
      fontSize: 17, fontStyle: 'bold', fontFamily: MONO, fill: tc, listening: false,
    });
    const badge = new Konva.Group({ y: -R - 15, opacity: 0, listening: false });
    const badgeBg = new Konva.Rect({ y: -10, height: 20, cornerRadius: 10, fill: THEME.badge[0], stroke: THEME.badge[1], strokeWidth: 1.5 });
    const badgeText = new Konva.Text({
      y: -10, height: 20, fontSize: 12, fontStyle: 'bold', fontFamily: MONO,
      fill: THEME.badge[2], align: 'center', verticalAlign: 'middle',
    });
    badge.add(badgeBg, badgeText);
    group.add(ring, circle, text, badge);
    this.nodeGroup.add(group);
    const v = { group, ring, circle, text, badge, badgeBg, badgeText, state: null, badgeShown: false };
    this.nodeViews.set(n.id, v);

    group.on('dragstart', () => { group.moveToTop(); this._setCursor('grabbing'); });
    group.on('dragmove', () => {
      group.position({ x: clamp(group.x(), 26, this.VW - 26), y: clamp(group.y(), 26, this.VH - 26) });
      n.x = group.x();
      n.y = group.y();
      this._refreshEdges(n.id);
      this._moveRubber();
    });
    group.on('dragend', () => this._setCursor(null));
    group.on('click tap', ev => { ev.cancelBubble = true; this._nodeClick(n.id); });
    group.on('mouseenter', () => {
      this._setCursor(this.tool === 'delete' ? 'pointer' : this.tool === 'edge' ? 'crosshair' : 'grab');
      if (this.tool === 'delete') this.tween(circle, { stroke: '#ff5c5c', strokeWidth: 4 }, 0.12);
    });
    group.on('mouseleave', () => {
      this._setCursor(null);
      if (this.tool === 'delete' && this.nodeViews.get(n.id) === v) this._styleNode(n.id, v.state, 0.12);
    });
    return v;
  }

  _makeEdgeView(e) {
    const B = THEME.edge.base;
    const line = new Konva.Arrow({
      points: [0, 0, 0, 0, 0, 0, 0, 0], bezier: true, stroke: B.stroke, fill: B.stroke, strokeWidth: B.width,
      opacity: B.opacity, pointerLength: this.directed ? 11 : 0, pointerWidth: this.directed ? 10 : 0,
      lineCap: 'round', lineJoin: 'round', hitStrokeWidth: 16,
    });
    const label = new Konva.Group({ opacity: this.weighted ? 1 : 0, listening: this.weighted });
    const lbg = new Konva.Rect({ height: 20, cornerRadius: 10, stroke: '#55555f', strokeWidth: 1.5, shadowColor: 'black', shadowBlur: 4, shadowOpacity: 0.4 });
    const ltext = new Konva.Text({ height: 20, fontSize: 12, fontStyle: 'bold', fontFamily: MONO, align: 'center', verticalAlign: 'middle' });
    label.add(lbg, ltext);
    this.edgeGroup.add(line);
    this.labelGroup.add(label);
    const v = { line, label, lbg, ltext, state: null };
    this.edgeViews.set(e.id, v);

    const enter = () => {
      this._setCursor(this.tool === 'delete' || this.weighted ? 'pointer' : null);
      if (this.tool === 'delete') this.tween(line, { stroke: '#ff5c5c', fill: '#ff5c5c', strokeWidth: 5 }, 0.12);
    };
    const leave = () => {
      this._setCursor(null);
      if (this.tool === 'delete' && this.edgeViews.get(e.id) === v) this._styleEdge(e.id, v.state, 0.12);
    };
    [line, label].forEach(sh => { sh.on('mouseenter', enter); sh.on('mouseleave', leave); });
    line.on('click tap', ev => { ev.cancelBubble = true; this._edgeClick(e.id, false); });
    label.on('click tap', ev => { ev.cancelBubble = true; this._edgeClick(e.id, true); });
    this._setWeightText(e);
    this._placeEdge(e);
    return v;
  }

  _setWeightText(e) {
    const v = this.edgeViews.get(e.id);
    if (!v) return;
    const s = String(e.w), w = Math.max(22, Math.ceil(v.ltext.measureSize(s).width) + 12);
    v.lbg.setAttrs({ x: -w / 2, y: -10, width: w, fill: e.w < 0 ? '#3a1414' : '#16161c' });
    v.ltext.setAttrs({ x: -w / 2, y: -10, width: w, text: s, fill: e.w < 0 ? '#ff9a9a' : '#d6d6e0' });
  }

  _npos(id) {
    const v = this.nodeViews.get(id);
    return v ? { x: v.group.x(), y: v.group.y() } : this.nodes.get(id);
  }

  _bend(e) {
    if (!this.directed) return 0;
    for (const f of this.edges.values()) if (f.u === e.v && f.v === e.u) return 26;
    return 0;
  }

  // Cubic bezier from the edge of u's circle to the edge of v's circle, bowed when a reverse edge exists.
  _edgePts(e) {
    const A = this._npos(e.u), B = this._npos(e.v), R = this.R;
    const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1, bend = this._bend(e);
    const Q = { x: (A.x + B.x) / 2 - (dy / d) * bend * 2, y: (A.y + B.y) / 2 + (dx / d) * bend * 2 };
    const p0 = toward(A, Q, R + 1), p3 = toward(B, Q, R + 2);
    const c1 = { x: lerp(p0.x, Q.x, 2 / 3), y: lerp(p0.y, Q.y, 2 / 3) };
    const c2 = { x: lerp(p3.x, Q.x, 2 / 3), y: lerp(p3.y, Q.y, 2 / 3) };
    const pts = [p0.x, p0.y, c1.x, c1.y, c2.x, c2.y, p3.x, p3.y];
    if (!this.flip) return pts;
    const rev = [p3.x, p3.y, c2.x, c2.y, c1.x, c1.y, p0.x, p0.y];
    return pts.map((x, i) => lerp(x, rev[i], this.flip));
  }

  _placeEdge(e) {
    const v = this.edgeViews.get(e.id);
    if (!v) return;
    const pts = this._edgePts(e);
    v.line.points(pts);
    v.label.position(cubicAt(pts, 0.5));
  }

  _refreshEdges(nodeId) {
    this.edges.forEach(e => { if (!nodeId || e.u === nodeId || e.v === nodeId) this._placeEdge(e); });
  }

  // Tween every edge from its current shape to its target shape (new edges grow out of their tail).
  _reshapeEdges(s = 0.45) {
    const moves = [];
    this.edges.forEach(e => {
      const v = this.edgeViews.get(e.id);
      if (!v) return;
      const to = this._edgePts(e);
      moves.push({ v, from: v.line.points().slice(), to, lf: v.label.position(), lt: cubicAt(to, 0.5) });
    });
    const pl = this.directed ? 11 : 0, pw = this.directed ? 10 : 0;
    this.edgeViews.forEach(v => this.tween(v.line, { pointerLength: pl, pointerWidth: pw }, s));
    return this._animate(this._sec(s) * 1000, k => moves.forEach(m => {
      m.v.line.points(m.from.map((x, i) => lerp(x, m.to[i], k)));
      m.v.label.position({ x: lerp(m.lf.x, m.lt.x, k), y: lerp(m.lf.y, m.lt.y, k) });
    })).then(() => this._refreshEdges());
  }

  _growEdge(e, delayMs) {
    const v = this.edgeViews.get(e.id);
    if (!v) return;
    const p = this._edgePts(e);
    v.line.points([p[0], p[1], p[0], p[1], p[0], p[1], p[0], p[1]]);
    v.label.opacity(0);
    setTimeout(() => {
      if (this.edgeViews.get(e.id) !== v) return;
      this._animate(this._sec(0.45) * 1000, k => {
        const t = this._edgePts(e);
        v.line.points(t.map((x, i) => lerp(t[i % 2], x, k)));
      }).then(() => {
        if (this.edgeViews.get(e.id) !== v) return;
        this._placeEdge(e);
        if (this.weighted && !v.state) this.tween(v.label, { opacity: 1 }, 0.25);
      });
    }, delayMs);
  }

  // ───────────────────────────── styling ─────────────────────────────

  _styleNode(id, state, s = 0.25) {
    const v = this.nodeViews.get(id);
    if (!v) return Promise.resolve();
    v.state = state || null;
    const [fill, stroke, tc] = this._nodeColors(state);
    const attrs = { fill, stroke, strokeWidth: state ? 3.5 : 2.5 };
    if (s === 0) { v.circle.setAttrs(attrs); v.text.fill(tc); return Promise.resolve(); }
    return Promise.all([this.tween(v.circle, attrs, s), this.tween(v.text, { fill: tc }, s)]);
  }

  _styleEdge(id, state, s = 0.25) {
    const v = this.edgeViews.get(id);
    if (!v) return Promise.resolve();
    v.state = state || null;
    const S = this._edgeStyle(state);
    v.line.dash(S.dash || []);
    v.line.dashEnabled(!!S.dash);
    const lo = !this.weighted ? 0 : state === 'faded' ? 0.3 : 1;
    return Promise.all([
      this.tween(v.line, { stroke: S.stroke, fill: S.stroke, strokeWidth: S.width, opacity: S.opacity }, s),
      this.tween(v.lbg, { stroke: state && state !== 'faded' ? S.stroke : '#55555f' }, s),
      this.tween(v.label, { opacity: lo }, s),
    ]);
  }

  _paintBadge(v, text) {
    const w = Math.max(24, Math.ceil(v.badgeText.measureSize(text).width) + 14);
    v.badgeBg.setAttrs({ x: -w / 2, width: w });
    v.badgeText.setAttrs({ x: -w / 2, width: w, text });
  }

  _setBadge(id, text, animate, s) {
    const v = this.nodeViews.get(id);
    if (!v) return Promise.resolve();
    const show = text !== undefined && text !== null;
    const jobs = [];
    if (show && v.badgeText.text() !== text) {
      const wasShown = v.badgeShown;
      this._paintBadge(v, text);
      if (animate && wasShown) jobs.push(this._flashBadge(v));
    }
    v.badgeShown = show;
    jobs.push(this.tween(v.badge, { opacity: show ? 1 : 0 }, s));
    return Promise.all(jobs);
  }

  async _flashBadge(v) {
    const [hf, hs, ht] = THEME.badgeHot, [bf, bs, bt] = THEME.badge;
    await Promise.all([
      this.tween(v.badge, { scaleX: 1.45, scaleY: 1.45 }, 0.16),
      this.tween(v.badgeBg, { fill: hf, stroke: hs }, 0.16),
      this.tween(v.badgeText, { fill: ht }, 0.16),
    ]);
    await this.pause(0.2);
    await Promise.all([
      this.tween(v.badge, { scaleX: 1, scaleY: 1 }, 0.25),
      this.tween(v.badgeBg, { fill: bf, stroke: bs }, 0.25),
      this.tween(v.badgeText, { fill: bt }, 0.25),
    ]);
  }

  async _pulseNode(id) {
    const v = this.nodeViews.get(id);
    if (!v) return;
    await this.tween(v.group, { scaleX: 1.22, scaleY: 1.22 }, 0.16);
    await this.tween(v.group, { scaleX: 1, scaleY: 1 }, 0.22);
  }

  async _flashEdge(id) {
    const v = this.edgeViews.get(id);
    if (!v) return;
    await this.tween(v.line, { strokeWidth: 7, stroke: '#ffb000', fill: '#ffb000' }, 0.15);
    await this._styleEdge(id, v.state, 0.3);
  }

  _paintStart() {
    this.nodeViews.forEach((v, id) => this.tween(v.ring, { opacity: id === this.startId ? 1 : 0 }, 0.25));
  }

  // ───────────────────────────── data-structure chips ─────────────────────────────

  _chipWidth(text) { return Math.max(30, Math.ceil(this.measure.measureSize(text).width) + 18); }

  _makeChip(it) {
    const g = new Konva.Group({ opacity: 0 });
    const rect = new Konva.Rect({ y: -14, height: 28, cornerRadius: 8, strokeWidth: 2, shadowColor: 'black', shadowBlur: 6, shadowOpacity: 0.35 });
    const text = new Konva.Text({ y: -14, height: 28, fontSize: 13, fontStyle: 'bold', fontFamily: MONO, align: 'center', verticalAlign: 'middle' });
    g.add(rect, text);
    this.chipGroup.add(g);
    const v = { g, rect, text, str: null };
    const [f, s, t] = this._chipColors(it.tone);
    rect.setAttrs({ fill: f, stroke: s });
    text.fill(t);
    this._setChipText(v, it.text);
    return v;
  }

  _setChipText(v, str) {
    if (v.str === str) return;
    v.str = str;
    const w = this._chipWidth(str);
    v.rect.setAttrs({ x: -w / 2, width: w });
    v.text.setAttrs({ x: -w / 2, width: w, text: str });
  }

  // where a chip comes from / returns to: the node or edge it stands for
  _anchor(it) {
    if (!it) return null;
    if (it.node && this.nodeViews.has(it.node)) return this.nodeViews.get(it.node).group.getAbsolutePosition();
    if (it.edge && this.edgeViews.has(it.edge)) return this.edgeViews.get(it.edge).label.getAbsolutePosition();
    return null;
  }

  _chipSlots(rows) {
    const slots = new Map(), x0 = 132, xMax = this.stage.width() - 16, gap = 6;
    rows.forEach((r, ri) => {
      if (!r || !r.items.length) return;
      const ws = r.items.map(it => this._chipWidth(it.text));
      const centers = [];
      let acc = 0;
      ws.forEach(w => { centers.push(acc + w / 2); acc += w + gap; });
      const first = ws[0] / 2, last = ws[ws.length - 1] / 2;
      const natural = centers[centers.length - 1] - first;
      const room = Math.max(0, xMax - x0 - first - last);
      const k = natural > room && natural > 0 ? room / natural : 1;
      r.items.forEach((it, j) => slots.set(it.key, { x: x0 + first + (centers[j] - first) * k, y: this._rowY(ri) }));
    });
    return slots;
  }

  _renderRows(rows, s) {
    rows = rows || [];
    const jobs = [];
    this.rowTitles.forEach((t, i) => {
      const r = rows[i];
      t.visible(!!(r && r.title));
      if (r) t.text(r.title);
    });
    this.toolHint.visible(!rows.length);
    const slots = this._chipSlots(rows), want = new Map();
    rows.forEach(r => r && r.items.forEach(it => want.set(it.key, it)));

    want.forEach((it, key) => {
      let v = this.chipViews.get(key);
      const slot = slots.get(key);
      if (!v) {
        v = this._makeChip(it);
        this.chipViews.set(key, v);
        const a = this._anchor(it);
        v.g.setAttrs(a ? { x: a.x, y: a.y, scaleX: 0.4, scaleY: 0.4 } : { x: slot.x, y: slot.y - 18 });
      } else if (Math.abs(v.g.y() - slot.y) > 1) {
        v.g.moveToTop(); // switching rows — keep it above its neighbours while it slides
      }
      v.item = it;
      this._setChipText(v, it.text);
      const [f, st, tc] = this._chipColors(it.tone);
      jobs.push(
        this.tween(v.g, { x: slot.x, y: slot.y, scaleX: 1, scaleY: 1, opacity: 1 }, s),
        this.tween(v.rect, { fill: f, stroke: st }, s),
        this.tween(v.text, { fill: tc }, s),
      );
    });

    [...this.chipViews].forEach(([key, v]) => {
      if (want.has(key)) return;
      this.chipViews.delete(key);
      const a = this._anchor(v.item);
      jobs.push(this.tween(v.g, a ? { x: a.x, y: a.y, scaleX: 0.3, scaleY: 0.3, opacity: 0 } : { y: v.g.y() - 18, opacity: 0 }, s)
        .then(() => v.g.destroy()));
    });
    return Promise.all(jobs);
  }

// ───────────────────────────── running algorithms ─────────────────────────────

  _snapshot() {
    const nodes = this.sortedNodes().map(n => ({ id: n.id, label: n.label }));
    const byId = new Map(nodes.map(n => [n.id, n]));
    const edges = [...this.edges.values()].map(e => ({ ...e }));
    const eById = new Map(edges.map(e => [e.id, e]));
    const { directed, weighted } = this;
    const w = e => (weighted ? e.w : 1);
    const L = id => byId.get(id).label;
    const adj = new Map(nodes.map(n => [n.id, []])), radj = new Map(nodes.map(n => [n.id, []]));
    edges.forEach(e => {
      adj.get(e.u).push({ v: e.v, e, w: w(e) });
      radj.get(e.v).push({ v: e.u, e, w: w(e) });
      if (!directed) adj.get(e.v).push({ v: e.u, e, w: w(e) });
    });
    const byLabel = (a, b) => L(a.v).localeCompare(L(b.v));
    adj.forEach(l => l.sort(byLabel));
    radj.forEach(l => l.sort(byLabel));
    return {
      directed, weighted, nodes, edges, w, L,
      adj: id => adj.get(id),
      radj: id => radj.get(id),
      edge: id => eById.get(id),
      other: (e, id) => (e.u === id ? e.v : e.u),
      name: e => `${L(e.u)}${directed ? '→' : '–'}${L(e.v)}`,
      hasNeg: weighted && edges.some(e => e.w < 0),
    };
  }

  run(key) {
    const A = ALGOS[key];
    if (!A) return;
    if (!this.nodes.size) { this.status('Nothing to run', 'Add some nodes first, or press Generate.', 'danger'); return; }
    if (A.needs === 'directed' && !this.directed) {
      this.status(`${A.name} needs a directed graph`,
        `Switch on <b>Directed</b>, or generate ${key === 'topo' ? 'a <b>Random DAG</b>' : 'the <b>Clusters</b> preset'}.`, 'danger');
      return;
    }
    if (A.needs === 'undirected' && this.directed) {
      this.status(`${A.name} needs an undirected graph`, 'A minimum spanning tree is defined for undirected graphs — switch off <b>Directed</b>.', 'danger');
      return;
    }
    this._cancelPending();
    this.stopAlgorithm(true);
    if (!this.nodes.has(this.startId)) this.startId = this.sortedNodes()[0].id;
    this.algoKey = key;
    const steps = this.steps = A.run(this._snapshot(), this.startId);
    this.idx = -1;
    this.target = -1;
    this._syncUI();
    this.goto(0).then(() => { if (this.steps === steps) this.play(); });
  }

  stopAlgorithm(silent = false) {
    this.epoch++;
    this.playToken++;
    this.playing = false;
    const had = this.steps.length > 0;
    this.steps = [];
    this.idx = -1;
    this.target = -1;
    if (had) {
      this.fxGroup.destroyChildren();
      this.nodeViews.forEach((v, id) => { this._styleNode(id, null, 0.3); this._setBadge(id, null, false, 0.3); });
      this.edgeViews.forEach((v, id) => this._styleEdge(id, null, 0.3));
      this._renderRows([], 0.35);
      if (this.flip) this._animateFlip(0, 0.35);
      this._renderRepr(null);
      if (!silent) this.status('Stopped', 'Back to editing. Pick an algorithm and press Run.');
    }
    this._syncUI();
  }

  // Animate toward step i. Rapid clicks just move the target; the pump catches up.
  goto(i) {
    if (!this.steps.length) return Promise.resolve();
    this.target = clamp(i, 0, this.steps.length - 1);
    if (this.pumping && this.pumpEpoch === this.epoch) return this.pumping;
    const epoch = this.pumpEpoch = this.epoch;
    const p = (this.pumping || Promise.resolve())
      .then(async () => {
        while (this.epoch === epoch && this.target !== this.idx) {
          await this._apply(this.target, this.target === this.idx + 1, epoch);
        }
      })
      .catch(err => { console.error(err); this.status('Animation error', err.message, 'danger'); })
      .finally(() => { if (this.pumping === p) this.pumping = null; this._syncUI(); });
    this.pumping = p;
    return p;
  }

  async _apply(i, forward, epoch) {
    const step = this.steps[i];
    if (!step) return;
    this.idx = i;
    this._syncUI();
    this.status(step.title, step.detail, step.tone);
    this._renderRepr(step);

    if (forward && step.travel) {
      await this._travel(step.travel);
      if (epoch !== this.epoch) return;
    }
    if (!!step.transposed !== this.flip > 0.5) {
      await this._animateFlip(step.transposed ? 1 : 0, forward ? 0.9 : 0.35);
      if (epoch !== this.epoch) return;
    }

    const s = forward ? 0.4 : 0.22, jobs = [];
    this.nodeViews.forEach((v, id) => {
      const st = step.nodes[id];
      if (forward && st === 'current' && v.state !== 'current') jobs.push(this._pulseNode(id));
      jobs.push(this._styleNode(id, st, s), this._setBadge(id, step.badges[id], forward, s));
    });
    this.edgeViews.forEach((v, id) => jobs.push(this._styleEdge(id, step.edges[id], s)));
    jobs.push(this._renderRows(step.rows, forward ? 0.55 : 0.28));
    await Promise.all(jobs);
  }

  // A glowing comet runs along the edge, starting at `from`.
  async _travel({ edge, from, style = 'active' }) {
    const e = this.edges.get(edge), v = this.edgeViews.get(edge);
    if (!e || !v) return;
    let p = v.line.points().slice();
    const tail = this.flip > 0.5 ? e.v : e.u;
    if (from !== tail) p = [p[6], p[7], p[4], p[5], p[2], p[3], p[0], p[1]];
    const color = this._edgeStyle(style).stroke;
    const trail = new Konva.Line({
      stroke: color, strokeWidth: 6, lineCap: 'round', lineJoin: 'round', opacity: 0.95,
      shadowColor: color, shadowBlur: 14, shadowOpacity: 0.9, listening: false,
    });
    const head = new Konva.Circle({ radius: 6, fill: '#ffffff', shadowColor: color, shadowBlur: 18, shadowOpacity: 1, listening: false });
    this.fxGroup.add(trail, head);
    await this._animate(this._sec(0.5) * 1000, k => {
      const out = [];
      for (let j = 0; j <= 24; j++) { const q = cubicAt(p, (j / 24) * k); out.push(q.x, q.y); }
      trail.points(out);
      head.position(cubicAt(p, k));
    });
    this.tween(trail, { opacity: 0 }, 0.35).then(() => trail.destroy());
    this.tween(head, { opacity: 0, scaleX: 2.2, scaleY: 2.2 }, 0.3).then(() => head.destroy());
  }

  // Every arrow shrinks to its midpoint and regrows pointing the other way.
  _animateFlip(to, s) {
    const from = this.flip;
    return this._animate(this._sec(s) * 1000, k => {
      this.flip = lerp(from, to, k);
      const h = Math.abs(1 - 2 * this.flip);
      this.edgeViews.forEach(v => { v.line.pointerLength(11 * h); v.line.pointerWidth(10 * h); });
      this._refreshEdges();
    }).then(() => {
      this.flip = to;
      this.edgeViews.forEach(v => { v.line.pointerLength(this.directed ? 11 : 0); v.line.pointerWidth(this.directed ? 10 : 0); });
      this._refreshEdges();
    });
  }

  async play() {
    if (!this.steps.length || this.playing) return;
    const token = ++this.playToken;
    this.playing = true;
    this._syncUI();
    if (this.idx >= this.steps.length - 1) await this.goto(0);
    while (this.playToken === token && this.idx < this.steps.length - 1) {
      await this.goto(this.idx + 1);
      if (this.playToken !== token) break;
      const st = this.steps[this.idx];
      if (this.idx < this.steps.length - 1) await this.pause(st && st.hold != null ? st.hold : 0.55);
    }
    if (this.playToken === token) { this.playing = false; this._syncUI(); }
  }

  pausePlay() {
    if (!this.playing) return;
    this.playToken++;
    this.playing = false;
    this._syncUI();
  }

  // ───────────────────────────── editing ─────────────────────────────

  setTool(t) {
    this.tool = t;
    this._cancelPending();
    this.toolHint.text(TOOL_HINTS[t] || '');
    this._setCursor(null);
    this.layer.batchDraw();
  }

  _backgroundClick() {
    if (this.tool === 'edge') { this._cancelPending(); return; }
    if (this.tool !== 'node') return;
    const p = this.stage.getPointerPosition();
    if (!p || p.y < this.TOP - 8) return;
    const q = this.world.getAbsoluteTransform().copy().invert().point(p);
    const x = clamp(q.x, 30, this.VW - 30), y = clamp(q.y, 30, this.VH - 30);
    for (const n of this.nodes.values()) if (Math.hypot(n.x - x, n.y - y) < this.R * 2 + 8) return;
    const n = this.addNode(x, y);
    if (n) this.status(`Added node ${n.label}`, 'Switch to the Edge tool to connect it to other nodes.', 'ok');
  }

  _nodeClick(id) {
    if (!this.nodes.has(id)) return;
    if (this.tool === 'delete') { this.removeNode(id); return; }
    if (this.tool === 'edge') {
      if (!this.pending) {
        this.pending = id;
        this._styleNode(id, 'selected', 0.15);
        this.rubber.visible(true);
        this._moveRubber();
        this._setCursor(null);
        this.status(`Connect ${this.nodes.get(id).label} to…`, 'Click the node the edge should go to. Click empty space or press Esc to cancel.');
        return;
      }
      const from = this.pending;
      this._cancelPending();
      if (from !== id) this.addEdge(from, id);
      return;
    }
    if (!this.steps.length) this.setStart(id); // while an algorithm runs, clicks only drag
  }

  _edgeClick(id, onLabel) {
    if (!this.edges.has(id) || this.pending) return;
    if (this.tool === 'delete') { this.removeEdge(id); return; }
    if (this.weighted && (onLabel || this.tool === 'edge')) this.editWeight(id);
  }

  _cancelPending() {
    if (!this.pending) return;
    const id = this.pending, st = this.steps[this.idx];
    this.pending = null;
    this.rubber.visible(false);
    this._styleNode(id, st ? st.nodes[id] : null, 0.15);
    this._setCursor(null);
    this.layer.batchDraw();
  }

  _moveRubber() {
    if (!this.pending) return;
    const p = this.stage.getPointerPosition(), a = this._npos(this.pending);
    if (!p || !a) return;
    const q = this.world.getAbsoluteTransform().copy().invert().point(p);
    const d = Math.hypot(q.x - a.x, q.y - a.y) || 1;
    this.rubber.points([a.x + ((q.x - a.x) / d) * this.R, a.y + ((q.y - a.y) / d) * this.R, q.x, q.y]);
    this.layer.batchDraw();
  }

  addNode(x, y) {
    if (this.nodes.size >= LETTERS.length) {
      this.status('Node limit reached', `This visualizer supports up to ${LETTERS.length} nodes (A–Z).`, 'danger');
      return null;
    }
    this.stopAlgorithm(true);
    const used = new Set([...this.nodes.values()].map(n => n.label));
    const n = { id: `n${++this.uid}`, label: LETTERS.find(l => !used.has(l)), x, y };
    this.nodes.set(n.id, n);
    const v = this._makeNodeView(n);
    v.group.scale({ x: 0.01, y: 0.01 });
    this.tween(v.group, { scaleX: 1, scaleY: 1 }, 0.45, Konva.Easings.BackEaseOut);
    if (!this.startId) this.startId = n.id;
    this._graphChanged();
    return n;
  }

  addEdge(u, v, w = randW()) {
    if (u === v || !this.nodes.has(u) || !this.nodes.has(v)) return null;
    const L = id => this.nodes.get(id).label;
    const dup = [...this.edges.values()].find(e => (e.u === u && e.v === v) || (!this.directed && e.u === v && e.v === u));
    if (dup) {
      this.status('That edge already exists', `${L(u)} and ${L(v)} are already connected.`, 'warn');
      this._flashEdge(dup.id);
      return null;
    }
    this.stopAlgorithm(true);
    const e = { id: `e${++this.uid}`, u, v, w };
    this.edges.set(e.id, e);
    const view = this._makeEdgeView(e);
    const p = this._edgePts(e);
    view.line.points([p[0], p[1], p[0], p[1], p[0], p[1], p[0], p[1]]);
    view.label.opacity(0);
    this._reshapeEdges(0.45).then(() => {
      if (this.weighted && this.edgeViews.get(e.id) === view) this.tween(view.label, { opacity: 1 }, 0.25);
    });
    this._graphChanged();
    this.status(`Added edge ${L(u)}${this.directed ? ' → ' : ' – '}${L(v)}`,
      this.weighted ? `Weight ${w}. Click the weight label to change it.` : '', 'ok');
    return e;
  }

  _dropEdge(id) {
    const v = this.edgeViews.get(id);
    this.edges.delete(id);
    this.edgeViews.delete(id);
    if (!v) return;
    v.line.listening(false);
    v.label.listening(false);
    this.tween(v.line, { opacity: 0 }, 0.3).then(() => v.line.destroy());
    this.tween(v.label, { opacity: 0 }, 0.3).then(() => v.label.destroy());
  }

  removeNode(id) {
    const n = this.nodes.get(id);
    if (!n) return;
    this.stopAlgorithm(true);
    [...this.edges.values()].filter(e => e.u === id || e.v === id).forEach(e => this._dropEdge(e.id));
    const v = this.nodeViews.get(id);
    this.nodes.delete(id);
    this.nodeViews.delete(id);
    if (v) {
      v.group.listening(false);
      this.tween(v.group, { scaleX: 0.01, scaleY: 0.01, opacity: 0 }, 0.3).then(() => v.group.destroy());
    }
    if (this.startId === id) this.startId = this.sortedNodes()[0]?.id || null;
    this._reshapeEdges(0.35);
    this._graphChanged();
    this.status(`Deleted node ${n.label}`, 'Its edges were removed too.', 'danger');
  }

  removeEdge(id) {
    const e = this.edges.get(id);
    if (!e) return;
    const L = x => this.nodes.get(x).label;
    this.stopAlgorithm(true);
    this._dropEdge(id);
    this._reshapeEdges(0.35);
    this._graphChanged();
    this.status(`Deleted edge ${L(e.u)}${this.directed ? ' → ' : ' – '}${L(e.v)}`, '', 'danger');
  }

  editWeight(id) {
    const e = this.edges.get(id);
    if (!e) return;
    const L = x => this.nodes.get(x).label;
    const raw = window.prompt(`Weight of edge ${L(e.u)}${this.directed ? ' → ' : ' – '}${L(e.v)} (whole number, -99 … 99):`, String(e.w));
    if (raw === null) return;
    const txt = raw.trim().replace('−', '-'), w = Number(txt);
    if (!txt || !Number.isInteger(w) || Math.abs(w) > 99) {
      this.status('Invalid weight', 'Use a whole number between -99 and 99.', 'danger');
      return;
    }
    this.stopAlgorithm(true);
    e.w = w;
    this._setWeightText(e);
    const v = this.edgeViews.get(id);
    (async () => {
      await this.tween(v.label, { scaleX: 1.4, scaleY: 1.4 }, 0.15);
      await this.tween(v.label, { scaleX: 1, scaleY: 1 }, 0.2);
    })();
    this._graphChanged();
    this.status(`Weight set to ${w}`,
      w < 0 ? 'Negative weight! Dijkstra can give wrong answers now — Bellman-Ford handles it and can detect negative cycles.' : '',
      w < 0 ? 'warn' : 'ok');
  }

  setStart(id) {
    const n = this.nodes.get(id);
    if (!n) return;
    const changed = id !== this.startId;
    this.startId = id;
    if (changed && this.steps.length && ALGOS[this.algoKey]?.start) this.stopAlgorithm(true);
    this._paintStart();
    this._updateHud();
    this._syncUI();
    this.layer.batchDraw();
    if (!this.steps.length) {
      this.status(`Start node: ${n.label}`, 'BFS, DFS, Dijkstra, Bellman-Ford and Prim will begin here. Press Run.', 'ok');
    }
  }

  setDirected(on) {
    if (on === this.directed) return;
    this.stopAlgorithm(true);
    this._cancelPending();
    this.directed = on;
    let dropped = 0;
    if (!on) {
      const seen = new Set();
      [...this.edges.values()].forEach(e => {
        const k = [e.u, e.v].sort().join('|');
        if (seen.has(k)) { this._dropEdge(e.id); dropped++; } else seen.add(k);
      });
    }
    this._reshapeEdges(0.5);
    this._graphChanged();
    this.status(on ? 'Directed graph' : 'Undirected graph',
      on ? 'Each edge now points from the node it was drawn from. It can only be followed in the direction of its arrow.'
         : 'Edges now work both ways.' + (dropped ? ` ${plural(dropped, 'duplicate edge')} (the reverse of another edge) removed.` : ''), 'ok');
  }

  setWeighted(on) {
    if (on === this.weighted) return;
    this.stopAlgorithm(true);
    this.weighted = on;
    this.edgeViews.forEach(v => { v.label.listening(on); this.tween(v.label, { opacity: on ? 1 : 0 }, 0.3); });
    this._graphChanged();
    this.status(on ? 'Weighted graph' : 'Unweighted graph',
      on ? 'Each edge has a cost. Click a weight to change it.' : 'Every edge now counts as 1.', 'ok');
  }

  _clearViews() {
    this.nodeViews.forEach(v => {
      v.group.listening(false);
      this.tween(v.group, { opacity: 0, scaleX: 0.4, scaleY: 0.4 }, 0.2).then(() => v.group.destroy());
    });
    this.edgeViews.forEach(v => {
      v.line.listening(false);
      v.label.listening(false);
      this.tween(v.line, { opacity: 0 }, 0.2).then(() => v.line.destroy());
      this.tween(v.label, { opacity: 0 }, 0.2).then(() => v.label.destroy());
    });
    this.nodes.clear();
    this.edges.clear();
    this.nodeViews.clear();
    this.edgeViews.clear();
    this.startId = null;
  }

  clear() {
    this.stopAlgorithm(true);
    this._cancelPending();
    this._clearViews();
    this._graphChanged();
    this.status('Graph cleared', 'Pick the Node tool and click the canvas to add nodes, or press Generate.');
  }

  _randomSpec(kind, n) {
    const rnd = k => Math.floor(Math.random() * k);
    const edges = [], seen = new Set();
    const directed = kind === 'dag' || kind === 'scc' ? true : this.directed;
    const add = (a, b) => {
      if (a === b) return false;
      const k = directed ? `${a}>${b}` : `${Math.min(a, b)}-${Math.max(a, b)}`;
      if (seen.has(k) || (directed && kind !== 'scc' && seen.has(`${b}>${a}`))) return false;
      seen.add(k);
      edges.push([a, b]);
      return true;
    };
    if (kind === 'dag') {
      const order = shuffle([...Array(n).keys()]);
      for (let i = 1; i < n; i++) add(order[rnd(i)], order[i]);
      for (let t = 0; edges.length < Math.round(n * 1.4) && t < 300; t++) {
        const i = rnd(n), j = rnd(n);
        if (i !== j) add(order[Math.min(i, j)], order[Math.max(i, j)]);
      }
      return { n, directed: true, edges, title: 'Random DAG',
        detail: 'Every edge points "forward" in some hidden order, so there are no cycles — perfect for Topological Sort.' };
    }
    if (kind === 'scc') {
      const g = n >= 8 ? 3 : 2, groups = Array.from({ length: g }, () => []);
      shuffle([...Array(n).keys()]).forEach((id, i) => groups[i % g].push(id));
      groups.forEach(m => {
        if (m.length > 1) for (let i = 0; i < m.length; i++) add(m[i], m[(i + 1) % m.length]);
        if (m.length > 3) add(m[0], m[2]);
      });
      for (let i = 0; i + 1 < g; i++) add(groups[i][rnd(groups[i].length)], groups[i + 1][rnd(groups[i + 1].length)]);
      if (g === 3) add(groups[0][rnd(groups[0].length)], groups[2][rnd(groups[2].length)]);
      return { n, directed: true, edges, title: 'Clustered graph',
        detail: `${g} tightly knit groups joined by one-way bridges — run Strongly Connected Components to find them.` };
    }
    for (let i = 1; i < n; i++) { const j = rnd(i); if (directed && Math.random() < 0.5) add(i, j); else add(j, i); }
    for (let t = 0; edges.length < Math.round(n * 1.45) && t < 300; t++) add(rnd(n), rnd(n));
    return { n, edges, title: 'Random connected graph',
      detail: `${n} nodes, all linked together${directed ? ' (if you ignore arrow directions)' : ''}. Pick an algorithm and press Run.` };
  }

  generate(kind = 'random', count = 7) {
    this.stopAlgorithm(true);
    this._cancelPending();
    this._clearViews();
    const spec = kind === 'negative' ? NEG_DEMO : this._randomSpec(kind, clamp(count | 0 || 7, 3, 12));
    if (spec.directed !== undefined) this.directed = spec.directed;
    if (spec.weighted !== undefined) this.weighted = spec.weighted;

    const ids = [];
    for (let i = 0; i < spec.n; i++) {
      const n = { id: `n${++this.uid}`, label: LETTERS[i], x: 0, y: 0 };
      this.nodes.set(n.id, n);
      ids.push(n.id);
    }
    const pos = spec.pos
      ? new Map(ids.map((id, i) => [id, { x: spec.pos[i][0], y: spec.pos[i][1] }]))
      : forceLayout(ids, spec.edges.map(([a, b]) => [ids[a], ids[b]]), this.VW, this.VH);

    const stagger = this._sec(0.06) * 1000;
    ids.forEach((id, i) => {
      const n = this.nodes.get(id), p = pos.get(id);
      n.x = p.x;
      n.y = p.y;
      const v = this._makeNodeView(n);
      v.group.scale({ x: 0.01, y: 0.01 });
      setTimeout(() => this.tween(v.group, { scaleX: 1, scaleY: 1 }, 0.45, Konva.Easings.BackEaseOut), stagger * i);
    });
    const edgeStart = stagger * ids.length + 150;
    spec.edges.forEach(([a, b, w], j) => {
      const e = { id: `e${++this.uid}`, u: ids[a], v: ids[b], w: w ?? randW() };
      this.edges.set(e.id, e);
      this._makeEdgeView(e);
      this._growEdge(e, edgeStart + this._sec(0.05) * 1000 * j);
    });
    this.startId = ids[0];
    this._graphChanged();
    this.status(spec.title, spec.detail, 'ok');
  }

  arrange() {
    if (this.nodes.size < 2) return Promise.resolve();
    const ids = [...this.nodes.keys()];
    const init = new Map(ids.map(id => [id, { ...this._npos(id) }]));
    const pos = forceLayout(ids, [...this.edges.values()].map(e => [e.u, e.v]), this.VW, this.VH, init);
    const moves = ids.map(id => {
      const v = this.nodeViews.get(id);
      return { n: this.nodes.get(id), g: v.group, x0: v.group.x(), y0: v.group.y(), p: pos.get(id) };
    });
    if (!this.steps.length) this.status('Auto-arrange', 'Nodes push each other apart while edges pull their ends together, until everything settles.');
    return this._animate(this._sec(0.9) * 1000, k => {
      moves.forEach(m => {
        m.g.position({ x: lerp(m.x0, m.p.x, k), y: lerp(m.y0, m.p.y, k) });
        m.n.x = m.g.x();
        m.n.y = m.g.y();
      });
      this._refreshEdges();
    });
  }

  _graphChanged() {
    if (this.steps.length) this.stopAlgorithm(true);
    this.hint.visible(this.nodes.size === 0);
    this._updateHud();
    this._paintStart();
    this._renderRepr(null);
    this._syncUI();
    this.layer.batchDraw();
  }

  // ───────────────────────────── adjacency matrix / list ─────────────────────────────

  _renderRepr(step) {
    const el = document.getElementById('repr-view');
    if (!el) return;
    const nodes = this.sortedNodes();
    if (!nodes.length) { el.innerHTML = '<p class="repr-empty">Add some nodes to see how the graph is stored in memory.</p>'; return; }
    const st = step === undefined ? this.steps[this.idx] : step;
    const focus = st ? Object.keys(st.nodes).find(id => st.nodes[id] === 'current') : null;
    const hot = st && st.travel ? st.travel.edge : null;
    const link = new Map();
    this.edges.forEach(e => {
      link.set(`${e.u}>${e.v}`, e);
      if (!this.directed) link.set(`${e.v}>${e.u}`, e);
    });

    if (this.reprMode === 'list') {
      el.innerHTML = nodes.map(a => {
        const items = nodes
          .map(b => ({ b, e: link.get(`${a.id}>${b.id}`) }))
          .filter(x => x.e)
          .map(({ b, e }) => `<span class="adj-item${e.id === hot ? ' hot' : ''}">${b.label}${this.weighted ? `<sub>${e.w}</sub>` : ''}</span>`)
          .join('');
        return `<div class="adj-row${a.id === focus ? ' focus' : ''}"><b>${a.label}</b> → ${items || '<span class="repr-empty">none</span>'}</div>`;
      }).join('') +
        `<p class="repr-note">${this.directed ? this.edges.size : 2 * this.edges.size} list entries · O(V + E) space</p>`;
      return;
    }

    let h = '<table><tr><th></th>' + nodes.map(n => `<th>${n.label}</th>`).join('') + '</tr>';
    nodes.forEach(a => {
      h += `<tr${a.id === focus ? ' class="focus"' : ''}><th>${a.label}</th>`;
      nodes.forEach(b => {
        const e = link.get(`${a.id}>${b.id}`);
        h += `<td class="${e ? 'on' : ''}${e && e.id === hot ? ' hot' : ''}">${e ? (this.weighted ? e.w : 1) : 0}</td>`;
      });
      h += '</tr>';
    });
    el.innerHTML = h + `</table><p class="repr-note">${this.directed ? 'row = from · column = to' : 'undirected → symmetric'} · O(V²) space</p>`;
  }
}

// ───────────────────────────── UI controller ─────────────────────────────

let activeGraph = null;
let keysBound = false;

function bindKeys() {
  if (keysBound) return;
  keysBound = true;
  document.addEventListener('keydown', e => {
    const viz = activeGraph;
    if (!viz || !document.body.contains(viz.container)) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (['input', 'select', 'textarea'].includes(tag) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); viz.pausePlay(); viz.goto(viz.idx + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); viz.pausePlay(); viz.goto(viz.idx - 1); }
    else if (e.key === ' ') { e.preventDefault(); if (viz.steps.length) (viz.playing ? viz.pausePlay() : viz.play()); }
    else if (e.key === 'Escape') { if (viz.pending) viz._cancelPending(); else viz.stopAlgorithm(); }
    else {
      const t = { v: 'move', n: 'node', e: 'edge', d: 'delete' }[e.key.toLowerCase()];
      if (t && viz.ui) viz.ui.setTool(t);
    }
  });
}

function initGraphPage() {
  const $ = id => document.getElementById(id);
  const container = $('graph-canvas');
  if (!container || typeof Konva === 'undefined') return;
  if (activeGraph && activeGraph.container === container) return;
  container.querySelectorAll('.konvajs-content').forEach(el => el.remove()); // stale Turbo snapshot

  const viz = activeGraph = new GraphVisualizer(container);
  viz.speed = SPEEDS[$('animation-speed')?.value] ?? 1;
  viz.directed = !!$('directed-toggle')?.checked;
  viz.weighted = $('weighted-toggle') ? $('weighted-toggle').checked : true;

  const algoSel = $('algorithm-select'), startSel = $('start-select'), slider = $('step-slider');
  let sliding = false;

  const renderInfo = () => {
    const el = $('algo-info'), key = algoSel?.value, A = ALGOS[key];
    if (!el || !A) return;
    let warn = '';
    if (A.needs === 'directed' && !viz.directed) {
      warn = `Needs a directed graph — switch on <b>Directed</b> or generate ${key === 'topo' ? 'a <b>Random DAG</b>' : '<b>Clusters</b>'}.`;
    }
    if (A.needs === 'undirected' && viz.directed) warn = 'Works on undirected graphs — switch off <b>Directed</b>.';
    el.innerHTML = `${A.info}<br><b>Time:</b> ${A.time}` +
      (A.start ? '' : '<br><i>Uses the whole graph — no start node needed.</i>') +
      (warn ? `<span class="warn">${warn}</span>` : '');
  };

  const setDisabled = (id, dis) => { const el = $(id); if (el) el.disabled = dis; };

  const sync = () => {
    const has = viz.steps.length > 0, last = viz.steps.length - 1, i = Math.max(viz.idx, 0);
    const counter = $('step-counter');
    if (counter) counter.textContent = has ? `Step ${i + 1} of ${viz.steps.length} · ${ALGOS[viz.algoKey].name}` : 'No algorithm running';
    if (slider) {
      slider.max = String(Math.max(0, last));
      if (!sliding) slider.value = String(i);
      slider.disabled = !has;
    }
    setDisabled('first-btn', !has || viz.idx <= 0);
    setDisabled('prev-btn', !has || viz.idx <= 0);
    setDisabled('next-btn', !has || viz.idx >= last);
    setDisabled('play-btn', !has);
    setDisabled('stop-btn', !has);
    const pb = $('play-btn');
    if (pb) pb.innerHTML = viz.playing ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
    if ($('directed-toggle')) $('directed-toggle').checked = viz.directed;
    if ($('weighted-toggle')) $('weighted-toggle').checked = viz.weighted;
    if (startSel) {
      const nodes = viz.sortedNodes(), sig = nodes.map(n => n.id + n.label).join();
      if (startSel.dataset.sig !== sig) {
        startSel.innerHTML = nodes.map(n => `<option value="${n.id}">Start: ${n.label}</option>`).join('') || '<option value="">No nodes</option>';
        startSel.dataset.sig = sig;
      }
      if (viz.startId) startSel.value = viz.startId;
      startSel.disabled = !nodes.length;
    }
    renderInfo();
  };

  const setTool = t => {
    viz.setTool(t);
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.toggle('active', b.dataset.tool === t));
  };

  viz.onChange = sync;
  viz.ui = { setTool, sync };

  const on = (id, ev, fn) => $(id)?.addEventListener(ev, fn);
  document.querySelectorAll('.tool-btn').forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));
  on('directed-toggle', 'change', e => viz.setDirected(e.target.checked));
  on('weighted-toggle', 'change', e => viz.setWeighted(e.target.checked));
  on('generate-btn', 'click', () => viz.generate($('preset-select')?.value || 'random', parseInt($('node-count')?.value, 10) || 7));
  on('arrange-btn', 'click', () => viz.arrange());
  on('clear-btn', 'click', () => viz.clear());
  on('algorithm-select', 'change', renderInfo);
  on('start-select', 'change', e => viz.setStart(e.target.value));
  on('run-btn', 'click', () => viz.run(algoSel?.value || 'bfs'));
  on('play-btn', 'click', () => (viz.playing ? viz.pausePlay() : viz.play()));
  on('next-btn', 'click', () => { viz.pausePlay(); viz.goto(viz.idx + 1); });
  on('prev-btn', 'click', () => { viz.pausePlay(); viz.goto(viz.idx - 1); });
  on('first-btn', 'click', () => { viz.pausePlay(); viz.goto(0); });
  on('stop-btn', 'click', () => viz.stopAlgorithm());
  on('step-slider', 'pointerdown', () => { sliding = true; });
  on('step-slider', 'pointerup', () => { sliding = false; });
  on('step-slider', 'input', e => { viz.pausePlay(); viz.goto(parseInt(e.target.value, 10)); });
  on('animation-speed', 'change', e => { viz.speed = SPEEDS[e.target.value] ?? 1; });
  document.querySelectorAll('.repr-tab').forEach(b => b.addEventListener('click', () => {
    viz.reprMode = b.dataset.repr;
    document.querySelectorAll('.repr-tab').forEach(x => x.classList.toggle('active', x === b));
    viz._renderRepr();
  }));
  bindKeys();

  viz.generate($('preset-select')?.value || 'random', parseInt($('node-count')?.value, 10) || 7);
  viz.status('Ready',
    'Pick an algorithm and press <b>Run</b>. Use the Edit tools to build your own graph — with the Move tool, click a node to choose where algorithms start.');
  sync();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initGraphPage);
else initGraphPage();
document.addEventListener('turbo:load', initGraphPage);