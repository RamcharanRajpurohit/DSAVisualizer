import { Rec, plural } from "../recorder";
import type { GEdge, Graph, GraphStep } from "../types";

export const KRUSKAL_CODE = [
  "Kruskal(G):",
  "  sort edges by weight",
  "  make each node its own set",
  "  for each (u, v, w) in order:",
  "    if find(u) ≠ find(v):",
  "      union(u, v); take (u, v)",
  "    else: skip — closes a cycle",
  "  return MST",
];

export function runKruskal(G: Graph): GraphStep[] {
  const R = new Rec();
  const L = G.L;
  const parent: Record<string, string> = {};
  const size: Record<string, number> = {};
  const color: Record<string, number> = {};
  const name = (e: GEdge) => `${L(e.u)}–${L(e.v)}`;

  G.nodes.forEach((n, i) => {
    parent[n.id] = n.id;
    size[n.id] = 1;
    color[n.id] = i;
    R.nodes[n.id] = `c${i}`;
  });
  const find = (x: string): string => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const sorted = [...G.edges].sort((a, b) => G.w(a) - G.w(b) || (name(a) < name(b) ? -1 : name(a) > name(b) ? 1 : 0));

  R.row(0, "EDGES\ncheapest first", sorted.map((e) => ({ key: `e${e.id}`, text: `${name(e)}·${G.w(e)}`, edge: e.id, tone: "base" as const })));
  R.row(1, "MST", []);
  R.snap(
    "Start Kruskal's algorithm",
    "Sort all edges by weight. Every node starts in its own set — shown by its own colour. Take edges cheapest-first and keep one only if it joins two **different** sets.",
    "info",
    { line: [2, 3], vars: { edge: null, w: null, "find(u)": null, "find(v)": null, "MST weight": 0, "MST edges": 0 } },
  );

  let total = 0;
  let count = 0;
  for (const e of sorted) {
    if (count === G.nodes.length - 1) break;
    const a = find(e.u);
    const b = find(e.v);
    const vars = { edge: name(e), w: G.w(e), "find(u)": L(a), "find(v)": L(b), "MST weight": total, "MST edges": count };
    R.tone(`e${e.id}`, "current");
    R.edges[e.id] = "active";
    R.snap(`Consider ${name(e)} (weight ${G.w(e)})`, `The cheapest edge left. Are ${L(e.u)} and ${L(e.v)} already in the same set (same colour)?`, "info", {
      line: [4, 5],
      vars,
    });
    if (a !== b) {
      const [big, small] = size[a] >= size[b] ? [a, b] : [b, a];
      parent[small] = big;
      size[big] += size[small];
      G.nodes.forEach((n) => {
        if (find(n.id) === big) R.nodes[n.id] = `c${color[big]}`;
      });
      R.edges[e.id] = "tree";
      total += G.w(e);
      count++;
      R.move(`e${e.id}`, 1, { tone: "ok" });
      R.snap(`Add ${name(e)}`, `Different sets → no cycle. Keep the edge; the two sets merge into one colour. MST weight so far: **${total}**.`, "ok", {
        line: 6,
        vars: { ...vars, "MST weight": total, "MST edges": count },
      });
    } else {
      R.edges[e.id] = "rejected";
      R.remove(`e${e.id}`);
      R.snap(`Skip ${name(e)}`, `${L(e.u)} and ${L(e.v)} are already connected — this edge would close a **cycle**.`, "danger", { line: 7, vars });
      R.edges[e.id] = "faded";
    }
  }

  G.edges.forEach((e) => {
    if (R.edges[e.id] !== "tree") R.edges[e.id] = "faded";
  });
  R.rows[0].items = [];
  const full = count === G.nodes.length - 1;
  R.snap(
    full ? "✓ Minimum spanning tree found" : "✓ Minimum spanning forest",
    `${plural(count, "edge")}, total weight **${total}**.` +
      (full ? ` A tree on ${G.nodes.length} nodes always has exactly ${G.nodes.length - 1} edges.` : " The graph is disconnected, so each colour is its own tree."),
    "ok",
    { line: 8, vars: { edge: null, w: null, "find(u)": null, "find(v)": null, "MST weight": total, "MST edges": count } },
  );
  return R.steps;
}
