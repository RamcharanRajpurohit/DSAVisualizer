import { Rec, hop, nChip } from "../recorder";
import type { Graph, GraphStep } from "../types";

export const TOPO_CODE = [
  "Kahn(G):",
  "  indeg[v] ← # incoming edges",
  "  Q ← nodes with indeg = 0",
  "  while Q not empty:",
  "    u ← Q.dequeue(); output u",
  "    for each edge u → v:",
  "      indeg[v] ← indeg[v] − 1",
  "      if indeg[v] = 0: Q.add(v)",
  "  if |order| < |V|: cycle!",
  "  return order",
];

export function runTopo(G: Graph): GraphStep[] {
  const R = new Rec();
  const L = G.L;
  const indeg: Record<string, number> = {};
  const order: string[] = [];
  G.nodes.forEach((n) => (indeg[n.id] = 0));
  G.edges.forEach((e) => indeg[e.v]++);
  G.nodes.forEach((n) => (R.badges[n.id] = `in ${indeg[n.id]}`));
  const queue = G.nodes.filter((n) => indeg[n.id] === 0).map((n) => n.id);
  const qText = () => (queue.length ? queue.map(L).join(" ") : "∅");

  R.row(0, "READY QUEUE\nin-degree 0", []);
  R.row(1, "ORDER", []);
  R.snap("Start Kahn's algorithm", "Each badge counts a node's incoming edges — how many prerequisites it is still waiting for.", "info", {
    line: 2,
    vars: { u: null, v: null, "indeg[v]": null, Q: "∅", output: 0 },
  });

  queue.forEach((id) => {
    R.nodes[id] = "frontier";
    R.rows[0].items.push(nChip(G, id, "frontier"));
  });
  R.snap(
    queue.length ? `Ready: ${queue.map(L).join(", ")}` : "Nothing is ready",
    queue.length
      ? "These nodes have no incoming edges, so nothing has to come before them. They go into the queue."
      : "Every node has an incoming edge, so there must be a **cycle**.",
    queue.length ? "info" : "danger",
    { line: 3, vars: { u: null, v: null, "indeg[v]": null, Q: qText(), output: 0 } },
  );

  while (queue.length) {
    const u = queue.shift() as string;
    order.push(u);
    R.nodes[u] = "current";
    R.move(`n${u}`, 1, { tone: "ok" });
    R.snap(`Output ${L(u)}`, `${L(u)} has no remaining prerequisites, so it goes next in the order. Now remove its outgoing edges.`, "info", {
      line: [4, 5],
      vars: { u: L(u), v: null, "indeg[v]": null, Q: qText(), output: order.length },
    });
    for (const { v, e } of G.adj(u)) {
      indeg[v]--;
      R.badges[v] = `in ${indeg[v]}`;
      R.edges[e.id] = "faded";
      const ready = indeg[v] === 0;
      if (ready) {
        queue.push(v);
        R.nodes[v] = "frontier";
        R.rows[0].items.push(nChip(G, v, "frontier"));
      }
      R.snap(
        `Remove ${L(u)} → ${L(v)}`,
        `${L(v)}'s in-degree drops to **${indeg[v]}**` + (ready ? " — no prerequisites left, so it joins the queue." : "."),
        ready ? "ok" : "info",
        { ...hop(e.id, u, "active"), line: ready ? [6, 7, 8] : [6, 7], vars: { u: L(u), v: L(v), "indeg[v]": indeg[v], Q: qText(), output: order.length } },
      );
    }
    R.nodes[u] = "visited";
  }

  if (order.length < G.nodes.length) {
    const left = G.nodes.filter((n) => !order.includes(n.id));
    left.forEach((n) => (R.nodes[n.id] = "danger"));
    G.edges.forEach((e) => {
      if (!order.includes(e.u) && !order.includes(e.v)) R.edges[e.id] = "rejected";
    });
    R.snap(
      "✗ Cycle detected",
      `${left.map((n) => n.label).join(", ")} still have incoming edges, but none of them is ready. They are waiting on each other in a **cycle**, so no topological order exists.`,
      "danger",
      { line: 9, vars: { u: null, v: null, "indeg[v]": null, Q: "∅", output: order.length } },
    );
  } else {
    order.forEach((id, i) => (R.badges[id] = `#${i + 1}`));
    G.edges.forEach((e) => (R.edges[e.id] = "tree"));
    R.snap("✓ Topological order", `**${order.map(L).join(" → ")}** — every edge points from earlier to later in this list.`, "ok", {
      line: 10,
      vars: { u: null, v: null, "indeg[v]": null, Q: "∅", output: order.length },
    });
  }
  return R.steps;
}
