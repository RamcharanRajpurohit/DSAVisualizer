import { Rec, hop, nChip, plural } from "../recorder";
import type { CompTag, Graph, GraphStep } from "../types";

export const SCC_CODE = [
  "Kosaraju(G):",
  "  for each unvisited u: dfs1(u)",
  "  Gᵀ ← reverse every edge",
  "  for u in reverse finish order:",
  "    if u unassigned: dfs2(u, c++)",
  "  return components",
  "",
  "dfs1(u):",
  "  mark u visited",
  "  for u → v unvisited: dfs1(v)",
  "  push u on the finish stack",
  "",
  "dfs2(x, c):      // in Gᵀ",
  "  comp[x] ← c",
  "  for x → y in Gᵀ, y unassigned:",
  "    dfs2(y, c)",
];

export function runSCC(G: Graph): GraphStep[] {
  const R = new Rec();
  const L = G.L;
  const seen = new Set<string>();
  const fin: string[] = [];

  R.row(0, "CALL STACK\nbottom → top", []);
  R.row(1, "FINISH STACK\nbottom → top", []);
  R.snap(
    "Kosaraju · phase 1",
    "Run DFS from every unvisited node and record the order in which nodes **finish**. Whatever finishes last sits in a component that nothing else can reach.",
    "info",
    { line: 2, vars: { phase: 1, u: null, finished: 0, components: 0 } },
  );

  const dfs1 = (u: string, via: string | null, from: string | null) => {
    seen.add(u);
    R.nodes[u] = "current";
    R.rows[0].items.push(nChip(G, u, "current"));
    R.snap(
      `Visit ${L(u)}`,
      via ? `Push ${L(u)} on the call stack and follow its outgoing edges.` : fin.length ? `Nothing unvisited is reachable any more, so start a new DFS from ${L(u)}.` : `Start the first DFS at ${L(u)}.`,
      "info",
      { ...(via && from ? hop(via, from, "tree") : {}), line: via ? [9, 10] : [2, 9], vars: { phase: 1, u: L(u), finished: fin.length, components: 0 } },
    );
    for (const { v, e } of G.adj(u)) {
      if (seen.has(v)) continue;
      R.edges[e.id] = "tree";
      R.nodes[u] = "frontier";
      R.tone(`n${u}`, "frontier");
      dfs1(v, e.id, u);
      R.nodes[u] = "current";
      R.tone(`n${u}`, "current");
    }
    fin.push(u);
    R.nodes[u] = "visited";
    R.badges[u] = `#${fin.length}`;
    R.move(`n${u}`, 1, { tone: "ok" });
    R.snap(`Finish ${L(u)} (#${fin.length})`, `${L(u)} has no unvisited neighbours left, so it finishes and goes on top of the **finish stack**.`, "ok", {
      line: 11,
      vars: { phase: 1, u: L(u), finished: fin.length, components: 0 },
    });
  };
  G.nodes.forEach((n) => {
    if (!seen.has(n.id)) dfs1(n.id, null, null);
  });

  R.nodes = {};
  R.edges = {};
  R.transposed = true;
  R.row(0, "FINISH STACK\npop from the right", R.rows[1].items.map((it) => ({ ...it, tone: "base" as const })));
  R.row(1, "COMPONENTS", []);
  R.snap(
    "Kosaraju · phase 2: reverse every edge",
    "Reversing all edges keeps each component intact, but edges **between** components now point the other way — so a DFS in the reversed graph can't leak out of its component.",
    "merge",
    { hold: 2.2, line: 3, vars: { phase: 2, u: null, finished: fin.length, components: 0 } },
  );

  const comp: Record<string, number> = {};
  const comps: string[][] = [];
  for (let i = fin.length - 1; i >= 0; i--) {
    const u = fin[i];
    if (comp[u] !== undefined) continue;
    const c = comps.length;
    const tag: CompTag = `c${c}`;
    const members: string[] = [];
    const dfs2 = (x: string, via: string | null, from: string | null) => {
      comp[x] = c;
      members.push(x);
      R.nodes[x] = tag;
      if (via) R.edges[via] = tag;
      R.move(`n${x}`, 1, { tone: tag });
      R.snap(
        via && from ? `Reach ${L(x)}` : `Pop ${L(x)} → component ${c + 1}`,
        via && from
          ? `A reversed edge leads from ${L(from)} to ${L(x)}, so ${L(x)} belongs to component ${c + 1}.`
          : `${L(x)} is the unassigned node with the latest finish time. A DFS from it in the reversed graph collects exactly one component.`,
        "merge",
        { ...(via && from ? hop(via, from, "active") : {}), line: via ? [14, 15, 16] : [4, 5, 14], vars: { phase: 2, u: L(x), finished: fin.length, components: c + 1 } },
      );
      for (const { v, e } of G.radj(x)) if (comp[v] === undefined) dfs2(v, e.id, x);
    };
    dfs2(u, null, null);
    comps.push(members);
    R.snap(
      `Component ${c + 1}: {${members.map(L).join(", ")}}`,
      members.length > 1 ? "Every node in this group can reach every other one along the arrows." : `${L(u)} is on its own — no cycle passes through it.`,
      "ok",
      { line: 5, vars: { phase: 2, u: L(u), finished: fin.length, components: c + 1 } },
    );
  }

  R.transposed = false;
  G.edges.forEach((e) => (R.edges[e.id] = comp[e.u] === comp[e.v] ? `c${comp[e.u]}` : "faded"));
  R.snap(
    `✓ ${plural(comps.length, "strongly connected component")}`,
    `Edges flipped back. Each colour is one SCC: ${comps.map((m) => `{${m.map(L).join(", ")}}`).join("  ")}. Faded edges run between components and only go one way.`,
    "ok",
    { line: 6, vars: { phase: "done", u: null, finished: fin.length, components: comps.length } },
  );
  return R.steps;
}
