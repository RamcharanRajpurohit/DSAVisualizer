/*
 * Plain (non-recording) versions of every algorithm the page animates. The quiz uses them to
 * compute answers about the graph on screen. They follow the recorders' conventions exactly —
 * neighbours in label order, ties broken by label, the same edge orders — so an answer always
 * matches what the animation shows. A scratchpad script checks them against the recorders.
 *
 * Pure TS with relative imports only (runnable under tsx).
 */
import type { GEdge, Graph } from "./types";

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function bfs(G: Graph, s: string) {
  const dist: Record<string, number> = { [s]: 0 };
  const parent: Record<string, string> = {};
  const order: string[] = [];
  const queue = [s];
  for (let head = 0; head < queue.length; head++) {
    const u = queue[head];
    order.push(u);
    for (const { v } of G.adj(u)) {
      if (dist[v] !== undefined) continue;
      dist[v] = dist[u] + 1;
      parent[v] = u;
      queue.push(v);
    }
  }
  return { dist, parent, order };
}

/** Recursive DFS from s. `back` lists back edges [u, v] (the edge to the parent is skipped when undirected). */
export function dfs(G: Graph, s: string) {
  const disc: Record<string, number> = {};
  const fin: Record<string, number> = {};
  const order: string[] = [];
  const back: [string, string][] = [];
  const onStack = new Set<string>();
  let time = 0;
  const visit = (u: string, via: string | null) => {
    disc[u] = ++time;
    order.push(u);
    onStack.add(u);
    for (const { v, e } of G.adj(u)) {
      if (!G.directed && e.id === via) continue;
      if (disc[v] === undefined) visit(v, e.id);
      else if (onStack.has(v)) back.push([u, v]);
    }
    onStack.delete(u);
    fin[u] = ++time;
  };
  visit(s, null);
  return { disc, fin, order, back };
}

/** Dijkstra exactly as animated (even with negative edges, where it may be wrong). */
export function dijkstra(G: Graph, s: string) {
  const dist: Record<string, number> = {};
  const parent: Record<string, string> = {};
  const done = new Set<string>();
  const order: string[] = [];
  G.nodes.forEach((n) => (dist[n.id] = Infinity));
  dist[s] = 0;
  for (;;) {
    let u: string | null = null;
    for (const n of G.nodes) if (!done.has(n.id) && dist[n.id] < Infinity && (u === null || dist[n.id] < dist[u])) u = n.id;
    if (u === null) break;
    done.add(u);
    order.push(u);
    for (const { v, w } of G.adj(u)) {
      if (done.has(v)) continue;
      if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        parent[v] = u;
      }
    }
  }
  return { dist, parent, order };
}

/** Bellman-Ford's edge list: every edge (both ways when undirected), sorted by (from, to) label. */
export function relaxList(G: Graph) {
  const list: { e: GEdge; a: string; b: string }[] = [];
  G.edges.forEach((e) => {
    list.push({ e, a: e.u, b: e.v });
    if (!G.directed) list.push({ e, a: e.v, b: e.u });
  });
  return list.sort((x, y) => cmp(G.L(x.a), G.L(y.a)) || cmp(G.L(x.b), G.L(y.b)));
}

export function bellmanFord(G: Graph, s: string) {
  const n = G.nodes.length;
  const list = relaxList(G);
  const dist: Record<string, number> = {};
  const parent: Record<string, string> = {};
  G.nodes.forEach((x) => (dist[x.id] = Infinity));
  dist[s] = 0;
  let stable = false;
  for (let p = 1; p < n && !stable; p++) {
    let changed = false;
    for (const { e, a, b } of list) {
      if (dist[a] === Infinity) continue;
      const nd = dist[a] + G.w(e);
      if (nd < dist[b]) {
        dist[b] = nd;
        parent[b] = a;
        changed = true;
      }
    }
    if (!changed) stable = true;
  }
  const negCycle = !stable && n > 1 && list.some(({ e, a, b }) => dist[a] < Infinity && dist[a] + G.w(e) < dist[b]);
  return { dist, parent, negCycle };
}

/** Kruskal: every edge in the order considered, whether it was taken, and the resulting forest. */
export function kruskal(G: Graph) {
  const name = (e: GEdge) => `${G.L(e.u)}–${G.L(e.v)}`;
  const sorted = [...G.edges].sort((a, b) => G.w(a) - G.w(b) || cmp(name(a), name(b)));
  const parent: Record<string, string> = {};
  const size: Record<string, number> = {};
  G.nodes.forEach((n) => {
    parent[n.id] = n.id;
    size[n.id] = 1;
  });
  const find = (x: string): string => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const seq: { e: GEdge; take: boolean }[] = [];
  const taken: GEdge[] = [];
  let total = 0;
  for (const e of sorted) {
    if (taken.length === G.nodes.length - 1) break;
    const a = find(e.u);
    const b = find(e.v);
    if (a !== b) {
      const [big, small] = size[a] >= size[b] ? [a, b] : [b, a];
      parent[small] = big;
      size[big] += size[small];
      taken.push(e);
      total += G.w(e);
      seq.push({ e, take: true });
    } else seq.push({ e, take: false });
  }
  return { sorted, seq, taken, total };
}

/** Prim from s (cheapest crossing edge each round, ties by edge name). */
export function prim(G: Graph, s: string) {
  const inT = new Set([s]);
  const taken: GEdge[] = [];
  let total = 0;
  const byW = (a: GEdge, b: GEdge) => G.w(a) - G.w(b) || cmp(G.name(a), G.name(b));
  while (inT.size < G.nodes.length) {
    const cand = G.edges.filter((e) => inT.has(e.u) !== inT.has(e.v)).sort(byW);
    if (!cand.length) break;
    const best = cand[0];
    inT.add(inT.has(best.u) ? best.v : best.u);
    taken.push(best);
    total += G.w(best);
  }
  return { taken, total, size: inT.size };
}

/** Kahn's algorithm. `order` is partial when there is a cycle. */
export function kahn(G: Graph) {
  const indeg: Record<string, number> = {};
  G.nodes.forEach((n) => (indeg[n.id] = 0));
  G.edges.forEach((e) => indeg[e.v]++);
  const queue = G.nodes.filter((n) => indeg[n.id] === 0).map((n) => n.id);
  const order: string[] = [];
  for (let head = 0; head < queue.length; head++) {
    const u = queue[head];
    order.push(u);
    for (const { v } of G.adj(u)) if (--indeg[v] === 0) queue.push(v);
  }
  return { order, cycle: order.length < G.nodes.length };
}

/** Kosaraju. comp[id] = component number in discovery order (0, 1, …). */
export function scc(G: Graph) {
  const seen = new Set<string>();
  const fin: string[] = [];
  const dfs1 = (u: string) => {
    seen.add(u);
    for (const { v } of G.adj(u)) if (!seen.has(v)) dfs1(v);
    fin.push(u);
  };
  G.nodes.forEach((n) => {
    if (!seen.has(n.id)) dfs1(n.id);
  });
  const comp: Record<string, number> = {};
  const comps: string[][] = [];
  for (let i = fin.length - 1; i >= 0; i--) {
    if (comp[fin[i]] !== undefined) continue;
    const c = comps.length;
    const members: string[] = [];
    const dfs2 = (x: string) => {
      comp[x] = c;
      members.push(x);
      for (const { v } of G.radj(x)) if (comp[v] === undefined) dfs2(v);
    };
    dfs2(fin[i]);
    comps.push(members);
  }
  return { comp, comps };
}

/** Number of connected components when arrow directions are ignored. */
export function weakComponents(G: Graph) {
  const parent: Record<string, string> = {};
  G.nodes.forEach((n) => (parent[n.id] = n.id));
  const find = (x: string): string => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  let count = G.nodes.length;
  G.edges.forEach((e) => {
    const a = find(e.u);
    const b = find(e.v);
    if (a !== b) {
      parent[a] = b;
      count--;
    }
  });
  return count;
}

export function degrees(G: Graph, id: string) {
  const out = G.edges.filter((e) => e.u === id).length;
  const inn = G.edges.filter((e) => e.v === id).length;
  return { in: inn, out, total: inn + out };
}

/** Does every edge point forward in `order`? Returns the first edge that points backwards, or null. */
export function backwardEdge(G: Graph, order: readonly string[]): GEdge | null {
  const pos = new Map(order.map((id, i) => [id, i]));
  return G.edges.find((e) => (pos.get(e.u) ?? -1) > (pos.get(e.v) ?? -1)) ?? null;
}

/** Walk parent pointers back from `t` to the source. */
export function pathTo(parent: Record<string, string>, t: string): string[] {
  const path = [t];
  const guard = new Set([t]);
  let x = t;
  while (parent[x] !== undefined && !guard.has(parent[x])) {
    x = parent[x];
    guard.add(x);
    path.unshift(x);
  }
  return path;
}
