import { Rec, fmtDist, hop, signed } from "../recorder";
import type { GEdge, Graph, GraphStep } from "../types";

export const BELLMAN_FORD_CODE = [
  "BellmanFord(G, s):",
  "  dist[·] ← ∞;  dist[s] ← 0",
  "  repeat V − 1 times:",
  "    changed ← false",
  "    for each edge (u, v, w):",
  "      if dist[u] + w < dist[v]:",
  "        dist[v] ← dist[u] + w",
  "        changed ← true",
  "    if not changed: stop early",
  "  for each edge (u, v, w):",
  "    if it still relaxes: cycle!",
  "  return dist",
];

interface Directed {
  e: GEdge;
  a: string;
  b: string;
}

export function runBellmanFord(G: Graph, s: string): GraphStep[] {
  const R = new Rec();
  const L = G.L;
  const n = G.nodes.length;
  const dist: Record<string, number> = {};
  const via: Record<string, string> = {};
  const list: Directed[] = [];
  G.edges.forEach((e) => {
    list.push({ e, a: e.u, b: e.v });
    if (!G.directed) list.push({ e, a: e.v, b: e.u });
  });
  const cmp = (x: string, y: string) => (x < y ? -1 : x > y ? 1 : 0);
  list.sort((x, y) => cmp(L(x.a), L(y.a)) || cmp(L(x.b), L(y.b)));

  G.nodes.forEach((nd) => {
    dist[nd.id] = Infinity;
    R.badges[nd.id] = "∞";
  });
  dist[s] = 0;
  R.badges[s] = "0";
  R.nodes[s] = "visited";
  const passes = Math.max(0, n - 1);

  const chips = () => R.rows[0].items;
  R.row(
    0,
    `EDGES\npass 1 of ${passes}`,
    list.map((x) => ({ key: `d${x.e.id}:${x.a}`, text: `${L(x.a)}→${L(x.b)}`, edge: x.e.id, tone: "base" as const })),
  );
  R.row(1, "", []);
  R.snap(
    "Start Bellman-Ford",
    `All distances start at ∞ except ${L(s)} = 0. Relax **every** edge in a fixed order, and repeat that pass up to ${passes} times (nodes − 1) — a shortest path never needs more edges than that.` +
      (G.directed ? "" : "\nIn an undirected graph each edge is tried in both directions."),
    "info",
    { line: 2, vars: { s: L(s), pass: 0, u: null, v: null, w: null, "dist[u] + w": null, "dist[v]": null, changed: null } },
  );

  let stable = false;
  for (let p = 1; p < n && !stable; p++) {
    R.rows[0].title = `EDGES\npass ${p} of ${passes}`;
    chips().forEach((c) => (c.tone = "base"));
    R.snap(`Pass ${p} of ${passes}`, "Go through the whole edge list once. Edges starting at a node that is still ∞ are skipped.", "info", {
      hold: 1.3,
      line: [3, 4],
      vars: { s: L(s), pass: p, u: null, v: null, w: null, "dist[u] + w": null, "dist[v]": null, changed: false },
    });
    let changed = false;
    list.forEach((x, j) => {
      const c = chips()[j];
      const w = G.w(x.e);
      if (dist[x.a] === Infinity) {
        c.tone = "dim";
        return;
      }
      c.tone = "current";
      const nd = dist[x.a] + w;
      const base = { s: L(s), pass: p, u: L(x.a), v: L(x.b), w, "dist[u] + w": nd, "dist[v]": dist[x.b] };
      if (nd < dist[x.b]) {
        const old = dist[x.b];
        dist[x.b] = nd;
        changed = true;
        if (via[x.b] && via[x.b] !== x.e.id) delete R.edges[via[x.b]];
        via[x.b] = x.e.id;
        R.edges[x.e.id] = "frontier";
        R.nodes[x.b] = "visited";
        R.badges[x.b] = String(nd);
        R.snap(`Relax ${L(x.a)} → ${L(x.b)}`, `${dist[x.a]} + ${signed(w)} = **${nd}** < ${fmtDist(old)} → update ${L(x.b)}.`, "ok", {
          ...hop(x.e.id, x.a, "frontier"),
          line: [5, 6, 7, 8],
          vars: { ...base, "dist[v]": nd, changed },
        });
      } else {
        R.flash(x.e.id, "rejected", `Relax ${L(x.a)} → ${L(x.b)}`, `${dist[x.a]} + ${signed(w)} = ${nd} ≥ ${fmtDist(dist[x.b])} → no change.`, "warn", {
          ...hop(x.e.id, x.a, "rejected"),
          hold: 0.45,
          line: [5, 6],
          vars: { ...base, changed },
        });
      }
      c.tone = "dim";
    });
    if (!changed) {
      stable = true;
      R.snap(`Pass ${p}: nothing changed`, "No distance improved during a whole pass, so none ever will — **stop early**.", "ok", {
        line: 9,
        vars: { s: L(s), pass: p, u: null, v: null, w: null, "dist[u] + w": null, "dist[v]": null, changed: false },
      });
    }
  }

  if (!stable && n > 1) {
    R.rows[0].title = "EDGES\nextra check";
    chips().forEach((c) => (c.tone = "base"));
    const j = list.findIndex((x) => dist[x.a] < Infinity && dist[x.a] + G.w(x.e) < dist[x.b]);
    if (j >= 0) {
      const x = list[j];
      chips()[j].tone = "danger";
      R.nodes[x.b] = "danger";
      R.edges[x.e.id] = "rejected";
      R.snap(
        "✗ Negative cycle detected",
        `After ${passes} passes, ${L(x.a)} → ${L(x.b)} can **still** be improved (${dist[x.a]} + ${signed(G.w(x.e))} < ${dist[x.b]}). That only happens when a cycle has negative total weight — you could loop it forever, so shortest paths don't exist.` +
          (G.directed ? "" : "\nIn an undirected graph any negative edge is such a cycle: walk it back and forth."),
        "danger",
        {
          ...hop(x.e.id, x.a, "rejected"),
          line: [10, 11],
          vars: { s: L(s), pass: "extra", u: L(x.a), v: L(x.b), w: G.w(x.e), "dist[u] + w": dist[x.a] + G.w(x.e), "dist[v]": dist[x.b], changed: true },
        },
      );
      return R.steps;
    }
    R.snap("Extra check pass", "One more pass over all edges improves nothing, so there is **no negative cycle**.", "ok", {
      line: 10,
      vars: { s: L(s), pass: "extra", u: null, v: null, w: null, "dist[u] + w": null, "dist[v]": null, changed: false },
    });
  }

  Object.values(via).forEach((id) => (R.edges[id] = "tree"));
  R.rows[0].items = [];
  R.rows[0].title = "EDGES";
  R.snap(
    "✓ Bellman-Ford complete",
    `Shortest distances from ${L(s)}: ${G.nodes
      .filter((nd) => nd.id !== s)
      .map((nd) => `${nd.label} **${fmtDist(dist[nd.id])}**`)
      .join(" · ")}. Green edges form the shortest-path tree.`,
    "ok",
    { line: 12, vars: { s: L(s), reached: G.nodes.filter((nd) => dist[nd.id] < Infinity).length } },
  );
  return R.steps;
}
