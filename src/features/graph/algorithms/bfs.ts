import { Rec, hop, nChip } from "../recorder";
import type { Graph, GraphStep } from "../types";

export const BFS_CODE = [
  "BFS(G, s):",
  "  dist[s] ← 0;  seen ← {s}",
  "  queue ← [s]",
  "  while queue not empty:",
  "    u ← queue.dequeue()",
  "    for each neighbour v of u:",
  "      if v ∉ seen:",
  "        dist[v] ← dist[u] + 1",
  "        seen.add(v); queue.add(v)",
  "      else: skip v",
  "  return dist",
];

export function runBFS(G: Graph, s: string): GraphStep[] {
  const R = new Rec();
  const L = G.L;
  const seen = new Set([s]);
  const dist: Record<string, number> = { [s]: 0 };
  const via: Record<string, string> = {};
  const order: string[] = [];
  const queue = [s];
  const qText = () => (queue.length ? queue.map(L).join(" ") : "∅");

  R.nodes[s] = "frontier";
  R.badges[s] = "0";
  R.row(0, "QUEUE\nfront → back", [nChip(G, s, "frontier")]);
  R.row(1, "VISIT ORDER", []);
  R.snap(
    `Start BFS at ${L(s)}`,
    `${L(s)} goes into the queue at distance 0. BFS explores in waves — first everything 1 edge away, then 2 edges away, and so on. Badges show each node's distance in edges.`,
    "info",
    { line: [2, 3], vars: { s: L(s), u: null, v: null, "dist[v]": null, queue: qText() } },
  );

  while (queue.length) {
    const u = queue.shift() as string;
    order.push(u);
    R.nodes[u] = "current";
    R.move(`n${u}`, 1, { tone: "ok" });
    R.snap(`Dequeue ${L(u)}`, `Take ${L(u)} from the front of the queue and look at each of its neighbours.`, "info", {
      line: [4, 5],
      vars: { s: L(s), u: L(u), v: null, "dist[u]": dist[u], queue: qText() },
    });
    for (const { v, e } of G.adj(u)) {
      if (!G.directed && via[u] === e.id) continue; // the edge we arrived by
      if (!seen.has(v)) {
        seen.add(v);
        dist[v] = dist[u] + 1;
        via[v] = e.id;
        queue.push(v);
        R.nodes[v] = "frontier";
        R.edges[e.id] = "tree";
        R.badges[v] = String(dist[v]);
        R.rows[0].items.push(nChip(G, v, "frontier"));
        R.snap(
          `Discover ${L(v)}`,
          `${L(v)} hasn't been seen yet → distance **${dist[v]}**, reached from ${L(u)}. Add it to the back of the queue.`,
          "ok",
          { ...hop(e.id, u, "tree"), line: [7, 8, 9], vars: { s: L(s), u: L(u), v: L(v), "dist[u]": dist[u], "dist[v]": dist[v], queue: qText() } },
        );
      } else {
        R.flash(
          e.id,
          "rejected",
          `${L(v)} already seen`,
          `${L(v)} is already ${order.includes(v) ? "visited" : "waiting in the queue"}, so skip it — BFS never adds a node twice.`,
          "warn",
          { ...hop(e.id, u, "rejected"), hold: 0.55, line: [7, 10], vars: { s: L(s), u: L(u), v: L(v), "dist[u]": dist[u], "dist[v]": dist[v], queue: qText() } },
        );
      }
    }
    R.nodes[u] = "visited";
  }

  const missed = G.nodes.filter((n) => !seen.has(n.id)).map((n) => n.label);
  R.snap(
    "✓ BFS complete",
    `Visit order: **${order.map(L).join(" → ")}**. Green edges form the BFS tree — each one is part of a path with the fewest possible edges from ${L(s)}.` +
      (missed.length ? `\n${missed.join(", ")} can't be reached from ${L(s)}.` : ""),
    "ok",
    { line: 11, vars: { s: L(s), visited: order.length, unreachable: missed.length } },
  );
  return R.steps;
}
