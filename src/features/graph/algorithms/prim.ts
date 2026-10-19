import { Rec, hop, plural } from "../recorder";
import type { Chip, ChipTone, GEdge, Graph, GraphStep } from "../types";

export const PRIM_CODE = [
  "Prim(G, s):",
  "  tree ← {s}",
  "  while nodes remain outside:",
  "    C ← edges leaving the tree",
  "    if C is empty: disconnected",
  "    (a, b) ← cheapest edge in C",
  "    add b and (a, b) to tree",
  "  return tree",
];

export function runPrim(G: Graph, s: string): GraphStep[] {
  const R = new Rec();
  const L = G.L;
  const inT = new Set([s]);
  let total = 0;
  const cmp = (x: string, y: string) => (x < y ? -1 : x > y ? 1 : 0);
  const byW = (a: GEdge, b: GEdge) => G.w(a) - G.w(b) || cmp(G.name(a), G.name(b));
  const crossing = () => G.edges.filter((e) => inT.has(e.u) !== inT.has(e.v)).sort(byW);
  const chip = (e: GEdge, tone: ChipTone): Chip => {
    const a = inT.has(e.u) ? e.u : e.v;
    return { key: `e${e.id}`, text: `${L(a)}–${L(G.other(e, a))}·${G.w(e)}`, edge: e.id, tone };
  };
  const paint = (cand: GEdge[]) =>
    G.edges.forEach((e) => {
      if (R.edges[e.id] === "tree") return;
      if (cand.includes(e)) R.edges[e.id] = "frontier";
      else if (inT.has(e.u) && inT.has(e.v)) R.edges[e.id] = "faded";
      else delete R.edges[e.id];
    });

  R.nodes[s] = "visited";
  R.row(0, "CROSSING EDGES\ncheapest first", []);
  R.row(1, "MST", []);
  R.snap(`Start Prim at ${L(s)}`, `The tree starts as just ${L(s)}. Each round, look at every edge that leaves the tree and add the **cheapest** one.`, "info", {
    line: 2,
    vars: { s: L(s), "tree size": 1, crossing: null, cheapest: null, w: null, "MST weight": 0 },
  });

  while (inT.size < G.nodes.length) {
    const cand = crossing();
    paint(cand);
    R.rows[0].items = cand.map((e, j) => chip(e, j === 0 ? "current" : "base"));
    if (!cand.length) {
      const left = G.nodes.length - inT.size;
      R.snap(
        "Graph is disconnected",
        `No edge leaves the tree, but ${plural(left, "node")} ${left === 1 ? "is" : "are"} still outside. Prim can only span what is reachable from ${L(s)}.`,
        "danger",
        { line: [4, 5], vars: { s: L(s), "tree size": inT.size, crossing: 0, cheapest: null, w: null, "MST weight": total } },
      );
      break;
    }
    const best = cand[0];
    const a = inT.has(best.u) ? best.u : best.v;
    const b = G.other(best, a);
    R.edges[best.id] = "active";
    R.snap(
      `Cheapest crossing edge: ${L(a)}–${L(b)}`,
      `${plural(cand.length, "edge")} ${cand.length === 1 ? "crosses" : "cross"} from the tree to the outside (dashed). The lightest is ${L(a)}–${L(b)} with weight **${G.w(best)}**.`,
      "info",
      { line: [4, 6], vars: { s: L(s), "tree size": inT.size, crossing: cand.length, cheapest: `${L(a)}–${L(b)}`, w: G.w(best), "MST weight": total } },
    );
    inT.add(b);
    total += G.w(best);
    R.nodes[b] = "visited";
    R.edges[best.id] = "tree";
    R.move(`e${best.id}`, 1, { tone: "ok" });
    R.rows[0].items = R.rows[0].items.filter((it) => {
      const e = G.edge(it.edge as string);
      return inT.has(e.u) !== inT.has(e.v);
    });
    paint(cand.filter((e) => inT.has(e.u) !== inT.has(e.v)));
    R.snap(`Add ${L(b)}`, `${L(b)} joins the tree through ${L(a)}–${L(b)}. MST weight so far: **${total}**.`, "ok", {
      ...hop(best.id, a, "tree"),
      line: 7,
      vars: { s: L(s), "tree size": inT.size, crossing: cand.length, cheapest: `${L(a)}–${L(b)}`, w: G.w(best), "MST weight": total },
    });
  }

  G.edges.forEach((e) => {
    if (R.edges[e.id] !== "tree") R.edges[e.id] = "faded";
  });
  R.rows[0].items = [];
  R.snap("✓ Prim complete", `The tree spans ${plural(inT.size, "node")} with total weight **${total}**.`, "ok", {
    line: 8,
    vars: { s: L(s), "tree size": inT.size, crossing: null, cheapest: null, w: null, "MST weight": total },
  });
  return R.steps;
}
