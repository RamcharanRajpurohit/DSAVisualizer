import { Rec, fmtDist, hop, nChip, signed } from "../recorder";
import type { Graph, GraphStep } from "../types";

export const DIJKSTRA_CODE = [
  "Dijkstra(G, s):",
  "  dist[·] ← ∞;  dist[s] ← 0",
  "  PQ ← {s}   // min-heap",
  "  while PQ not empty:",
  "    u ← PQ.extractMin()",
  "    for each edge (u, v, w):",
  "      if v is final: skip",
  "      if dist[u] + w < dist[v]:",
  "        dist[v] ← dist[u] + w",
  "        PQ.update(v, dist[v])",
  "  return dist",
];

export function runDijkstra(G: Graph, s: string): GraphStep[] {
  const R = new Rec();
  const L = G.L;
  const dist: Record<string, number> = {};
  const done = new Set<string>();
  const via: Record<string, string> = {};

  G.nodes.forEach((n) => {
    dist[n.id] = Infinity;
    R.badges[n.id] = "∞";
  });
  dist[s] = 0;
  R.badges[s] = "0";
  R.nodes[s] = "frontier";

  const queue = () =>
    G.nodes
      .filter((n) => !done.has(n.id) && dist[n.id] < Infinity)
      .sort((a, b) => dist[a.id] - dist[b.id] || (a.label < b.label ? -1 : 1))
      .map((n) => nChip(G, n.id, "frontier", `${n.label}·${dist[n.id]}`));

  R.row(0, "PRIORITY QUEUE\nsmallest first", queue());
  R.row(1, "FINALIZED", []);
  R.snap(
    `Start Dijkstra at ${L(s)}`,
    `Every distance starts at ∞ except ${L(s)} = 0. ` +
      (G.hasNeg
        ? "**Heads-up:** a negative edge can make Dijkstra's answer wrong."
        : "Repeatedly finalize the closest node, then **relax** its edges."),
    G.hasNeg ? "warn" : "info",
    { line: [2, 3], vars: { s: L(s), u: null, v: null, w: null, "dist[u]": null, "dist[v]": null, "dist[u] + w": null } },
  );

  for (;;) {
    const q = queue();
    if (!q.length) break;
    const u = q[0].node as string;
    done.add(u);
    R.nodes[u] = "current";
    if (via[u]) R.edges[via[u]] = "tree";
    R.rows[0].items = queue();
    R.rows[1].items.push(nChip(G, u, "ok", `${L(u)}·${dist[u]}`));
    R.snap(
      `Finalize ${L(u)} = ${dist[u]}`,
      `${L(u)} has the smallest tentative distance in the queue` +
        (G.hasNeg ? ", so Dijkstra declares it final." : ". With non-negative weights no other route can beat it, so it is **final**."),
      "info",
      { line: [4, 5], vars: { s: L(s), u: L(u), v: null, w: null, "dist[u]": dist[u], "dist[v]": null, "dist[u] + w": null } },
    );
    for (const { v, e, w } of G.adj(u)) {
      const nd = dist[u] + w;
      const vars = { s: L(s), u: L(u), v: L(v), w, "dist[u]": dist[u], "dist[v]": dist[v], "dist[u] + w": nd };
      if (done.has(v)) {
        if (nd < dist[v]) {
          R.flash(
            e.id,
            "rejected",
            `${L(v)} is already final`,
            `${dist[u]} + ${signed(w)} = ${nd} would beat ${L(v)}'s ${dist[v]}, but Dijkstra never revisits a finalized node. **This is exactly why negative edges break Dijkstra.**`,
            "danger",
            { ...hop(e.id, u, "rejected"), line: 7, vars },
          );
        }
        continue;
      }
      if (nd < dist[v]) {
        const old = dist[v];
        dist[v] = nd;
        if (via[v]) delete R.edges[via[v]];
        via[v] = e.id;
        R.edges[e.id] = "frontier";
        R.nodes[v] = "frontier";
        R.badges[v] = String(nd);
        R.rows[0].items = queue();
        R.snap(
          `Relax ${L(u)} → ${L(v)}`,
          `${dist[u]} + ${signed(w)} = **${nd}** < ${fmtDist(old)} — a shorter way to reach ${L(v)}. Update it` +
            (old < Infinity ? " and drop its old route." : "."),
          "ok",
          { ...hop(e.id, u, "frontier"), line: [8, 9, 10], vars: { ...vars, "dist[v]": nd } },
        );
      } else {
        R.flash(e.id, "rejected", `Relax ${L(u)} → ${L(v)}`, `${dist[u]} + ${signed(w)} = ${nd} ≥ ${dist[v]} — not shorter, keep ${dist[v]}.`, "warn", {
          ...hop(e.id, u, "rejected"),
          hold: 0.55,
          line: 8,
          vars,
        });
      }
    }
    R.nodes[u] = "visited";
  }

  const unreached = G.nodes.filter((n) => dist[n.id] === Infinity).map((n) => n.label);
  R.snap(
    "✓ Dijkstra complete",
    `Shortest distances from ${L(s)}: ${G.nodes
      .filter((n) => n.id !== s)
      .map((n) => `${n.label} **${fmtDist(dist[n.id])}**`)
      .join(" · ")}${unreached.length ? ` (${unreached.join(", ")} unreachable)` : ""}. ` +
      (G.hasNeg ? "**The negative edge may have fooled it — compare with Bellman-Ford.**" : "Green edges form the shortest-path tree."),
    G.hasNeg ? "warn" : "ok",
    { line: 11, vars: { s: L(s), finalized: done.size, unreachable: unreached.length } },
  );
  return R.steps;
}

