/*
 * "Quiz me" for the graph page: multiple-choice questions computed from the graph on screen
 * (VisuAlgo-style training). Every answer comes from ./solve, which mirrors the animations;
 * distractors are the classic mistakes (DFS order for BFS, fewest hops for cheapest path,
 * Dijkstra's answer on a negative edge, an edge that closes a cycle, …).
 *
 * Pure TS with relative / type-only imports (runnable under tsx for the verification script).
 */
import type { QuizQuestion } from "@/lib/lesson";
import { makeGraph } from "./graphModel";
import * as S from "./solve";
import type { AlgoKey, GEdge, GNode, Graph } from "./types";

export type Rng = () => number;

export interface QuizInput {
  nodes: readonly GNode[];
  edges: readonly GEdge[];
  directed: boolean;
  weighted: boolean;
  startId: string | null;
}

export type QuizKind = "bfs" | "dfs" | "dist" | "mst" | "kruskalNext" | "topo" | "scc" | "degree";

/** A question plus what it was about (used by the verification script). */
export interface GraphQuizQuestion extends QuizQuestion {
  kind: QuizKind;
}

interface Ctx {
  G: Graph;
  s: string;
  rnd: Rng;
}

const ri = (rnd: Rng, n: number) => Math.floor(rnd() * n);
const pickOne = <T>(rnd: Rng, a: readonly T[]): T => a[ri(rnd, a.length)];

function shuffled<T>(a: readonly T[], rnd: Rng): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = ri(rnd, i + 1);
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/**
 * Assemble a question: the best `max` distinct distractors (in priority order), shuffled with
 * the right answer. Null when fewer than two distractors survive.
 */
function ask(
  kind: QuizKind, prompt: string, correct: string, wrong: readonly string[], explain: string, rnd: Rng, max = 3,
): GraphQuizQuestion | null {
  const seen = new Set([correct]);
  const ds: string[] = [];
  for (const w of wrong) {
    if (ds.length >= max) break;
    if (seen.has(w)) continue;
    seen.add(w);
    ds.push(w);
  }
  if (ds.length < 2) return null;
  const choices = shuffled([correct, ...ds], rnd);
  return { kind, prompt, choices, answer: choices.indexOf(correct), explain };
}

/** Numbers near n (for numeric distractors), closest first. */
const near = (n: number, lo = -Infinity) => [n + 1, n - 1, n + 2, n - 2, n + 3, n - 3].filter((x) => x >= lo);

const seq = (G: Graph, ids: readonly string[]) => ids.map(G.L).join(", ");
const arrow = (G: Graph, ids: readonly string[]) => ids.map(G.L).join(" → ");
const edgeText = (G: Graph, e: GEdge) => `${G.L(e.u)}${G.directed ? "→" : "–"}${G.L(e.v)}${G.weighted ? ` (${G.w(e)})` : ""}`;

/** Weight of the edge u → v (as the algorithms see it). */
const wOf = (G: Graph, u: string, v: string) => G.adj(u).find((a) => a.v === v)?.w ?? 0;

/** Swap two entries of a copy. */
const swapped = (a: readonly string[], i: number, j: number) => {
  const b = [...a];
  [b[i], b[j]] = [b[j], b[i]];
  return b;
};

/** BFS / DFS with neighbours tried in reverse label order — a classic "wrong convention" distractor. */
function reversedGraph(G: Graph): Graph {
  return { ...G, adj: (id) => [...G.adj(id)].reverse() };
}

// ───────────────────────────── question types ─────────────────────────────

function qTraversal(kind: "bfs" | "dfs", { G, s, rnd }: Ctx): GraphQuizQuestion | null {
  const bfs = S.bfs(G, s);
  const dfs = S.dfs(G, s);
  const order = kind === "bfs" ? bfs.order : dfs.order;
  if (order.length < 3) return null;
  const other = kind === "bfs" ? dfs.order : bfs.order;
  const rev = kind === "bfs" ? S.bfs(reversedGraph(G), s).order : S.dfs(reversedGraph(G), s).order;
  const alpha = [s, ...order.filter((x) => x !== s).sort((a, b) => (G.L(a) < G.L(b) ? -1 : 1))];
  const swaps: string[][] = [];
  for (let i = 1; i + 1 < order.length; i++) swaps.push(swapped(order, i, i + 1));
  const wrong = [other, rev, ...shuffled(swaps, rnd), alpha].map((o) => seq(G, o));

  const name = kind === "bfs" ? "breadth-first search (BFS)" : "depth-first search (DFS)";
  const prompt =
    `A ${name} starts at **${G.L(s)}** and tries neighbours in alphabetical order` +
    `${G.directed ? ", following arrow directions" : ""}. In which order are the nodes visited?`;
  let explain: string;
  if (kind === "bfs") {
    const levels: string[][] = [];
    order.forEach((id) => (levels[bfs.dist[id]] ??= []).push(G.L(id)));
    explain = `BFS visits in waves of distance: ${levels.map((l, d) => `${d} edge${d === 1 ? "" : "s"}: ${l.join(" ")}`).join(" · ")}.`;
  } else {
    explain = `DFS goes as deep as it can before backing up: discovery order **${arrow(G, order)}**. (${seq(G, other)} would be the BFS order.)`;
  }
  return ask(kind, prompt, seq(G, order), wrong, explain, rnd);
}

function qDist({ G, s, rnd }: Ctx): GraphQuizQuestion | null {
  const hops = S.bfs(G, s);
  let dist: Record<string, number>;
  let parent: Record<string, string>;
  let algo: string;
  if (!G.weighted) {
    dist = hops.dist;
    parent = hops.parent;
    algo = "BFS";
  } else if (G.hasNeg) {
    const bf = S.bellmanFord(G, s);
    if (bf.negCycle) return null;
    dist = bf.dist;
    parent = bf.parent;
    algo = "Bellman-Ford";
  } else {
    const dj = S.dijkstra(G, s);
    dist = dj.dist;
    parent = dj.parent;
    algo = "Dijkstra";
  }
  const reach = G.nodes.map((n) => n.id).filter((id) => id !== s && dist[id] !== undefined && dist[id] < Infinity);
  if (!reach.length) return null;
  // Prefer targets where the answer isn't just the direct edge.
  const direct = (t: string) => G.adj(s).find((a) => a.v === t);
  const deep = reach.filter((t) => {
    const dir = direct(t);
    return (hops.dist[t] ?? 0) >= 2 || (dir !== undefined && dir.w !== dist[t]);
  });
  const t = pickOne(rnd, deep.length ? deep : reach);
  const d = dist[t];
  const path = S.pathTo(parent, t);

  const wrong: number[] = [];
  if (G.weighted) {
    // The path with the fewest edges is not always the cheapest one.
    const hp = S.pathTo(hops.parent, t);
    wrong.push(hp.slice(1).reduce((sum, v, i) => sum + wOf(G, hp[i], v), 0));
    const dir = direct(t);
    if (dir) wrong.push(dir.w);
    if (G.hasNeg) wrong.push(S.dijkstra(G, s).dist[t]);
    wrong.push(hops.dist[t]);
  }
  wrong.push(...near(d, G.hasNeg ? -Infinity : Math.max(1, hops.dist[t])));
  const show = (x: number) => (x === Infinity ? "∞" : String(x));
  const prompt = G.weighted
    ? `What is the length of the **shortest path** from **${G.L(s)}** to **${G.L(t)}**${G.directed ? " (following the arrows)" : ""}?`
    : `How many edges are on the **shortest path** from **${G.L(s)}** to **${G.L(t)}**${G.directed ? " (following the arrows)" : ""}?`;
  const route = G.weighted
    ? `${arrow(G, path)}: ${path
        .slice(1)
        .map((v, i) => wOf(G, path[i], v))
        .map((w, i) => (i && w < 0 ? `(${w})` : String(w)))
        .join(" + ")} = **${d}**`
    : `${arrow(G, path)} — **${d}** edge${d === 1 ? "" : "s"}`;
  const note = G.hasNeg ? " Dijkstra can get this wrong because of the negative edge — Bellman-Ford can't." : "";
  return ask("dist", prompt, show(d), wrong.filter((x) => x !== d).map(show), `${algo}: ${route}.${note}`, rnd);
}

function qMst({ G, rnd }: Ctx): GraphQuizQuestion | null {
  if (G.directed || !G.weighted || G.nodes.length < 3 || G.edges.length < 3) return null;
  const k = S.kruskal(G);
  if (k.taken.length < 2) return null;
  const forest = k.taken.length < G.nodes.length - 1;
  // Plausible wrong totals: a BFS spanning tree, the k cheapest edges ignoring cycles, near misses.
  const bfsTree = (() => {
    let sum = 0;
    const seen = new Set<string>();
    G.nodes.forEach((n) => {
      if (seen.has(n.id)) return;
      const b = S.bfs(G, n.id);
      b.order.forEach((id) => {
        seen.add(id);
        if (b.parent[id] !== undefined) sum += wOf(G, b.parent[id], id);
      });
    });
    return sum;
  })();
  const cheapest = [...G.edges].map((e) => G.w(e)).sort((a, b) => a - b).slice(0, k.taken.length).reduce((a, b) => a + b, 0);
  const spread = Math.max(1, Math.min(...k.taken.slice(1).map((e, i) => Math.abs(G.w(e) - G.w(k.taken[i]))).filter((x) => x > 0), 3));
  const wrong = [bfsTree, cheapest, k.total + spread, k.total - spread, ...near(k.total)].filter((x) => x !== k.total).map(String);
  const skip = k.seq.find((x) => !x.take);
  const kept = k.taken.map((e) => G.w(e));
  return ask(
    "mst",
    `What is the total weight of a **minimum spanning ${forest ? "forest" : "tree"}** of this graph?`,
    String(k.total),
    wrong,
    `Kruskal keeps ${k.taken.length} edges cheapest-first: ${kept.map((w) => (w < 0 ? `(${w})` : w)).join(" + ")} = **${k.total}**.` +
      (skip ? ` It skips edges like ${edgeText(G, skip.e)} that would close a cycle.` : ""),
    rnd,
  );
}

function qKruskalNext({ G, rnd }: Ctx): GraphQuizQuestion | null {
  if (G.directed || !G.weighted || G.edges.length < 3) return null;
  const k = S.kruskal(G);
  if (k.taken.length < 2) return null;
  const i = 1 + ri(rnd, k.taken.length - 1); // ask about the 2nd … last accepted edge
  const done = k.taken.slice(0, i);
  const next = k.taken[i];
  // Which nodes are already connected by the edges taken so far?
  const parent: Record<string, string> = {};
  G.nodes.forEach((n) => (parent[n.id] = n.id));
  const find = (x: string): string => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  done.forEach((e) => (parent[find(e.u)] = find(e.v)));
  const closes = (e: GEdge) => find(e.u) === find(e.v);
  const rest = k.sorted.filter((e) => !done.includes(e) && e !== next);
  const cycleTraps = rest.filter((e) => closes(e) && G.w(e) <= G.w(next));
  // An edge as cheap as the right one that doesn't close a cycle would only lose on the tie-break — leave it out.
  const pricier = rest.filter((e) => !closes(e) && G.w(e) > G.w(next));
  const wrong = [...shuffled(cycleTraps, rnd), ...pricier, ...rest.filter((e) => closes(e) && G.w(e) > G.w(next))].map((e) => edgeText(G, e));
  const trap = cycleTraps[0];
  return ask(
    "kruskalNext",
    `Kruskal's algorithm has already taken **${done.map((e) => edgeText(G, e)).join(", ")}**. Which edge does it add next?`,
    edgeText(G, next),
    wrong,
    `${edgeText(G, next)} is the cheapest edge that joins two different trees.` +
      (trap ? ` ${edgeText(G, trap)} is no more expensive, but ${G.L(trap.u)} and ${G.L(trap.v)} are already connected — it would close a cycle.` : ""),
    rnd,
  );
}

function qTopo({ G, rnd }: Ctx): GraphQuizQuestion | null {
  if (!G.directed || G.nodes.length < 3 || G.edges.length < 2) return null;
  const kahn = S.kahn(G);
  const n = G.nodes.length;
  if (kahn.cycle) {
    const out = kahn.order.length;
    const stuck = G.nodes.filter((x) => !kahn.order.includes(x.id)).map((x) => x.label);
    return ask(
      "topo",
      "Kahn's algorithm (repeatedly output a node with in-degree 0) runs on this graph. How many nodes does it output before it gets stuck?",
      String(out),
      [n, ...near(out, 0).filter((x) => x <= n), 0].map(String),
      `It outputs ${out ? seq(G, kahn.order) : "nothing"} and then ${stuck.join(", ")} still wait on each other — they are on or behind a **cycle**, so no topological order exists.`,
      rnd,
    );
  }
  // A random valid order: Kahn's algorithm picking any ready node.
  const indeg: Record<string, number> = {};
  G.nodes.forEach((x) => (indeg[x.id] = 0));
  G.edges.forEach((e) => indeg[e.v]++);
  const ready = G.nodes.filter((x) => indeg[x.id] === 0).map((x) => x.id);
  const valid: string[] = [];
  while (ready.length) {
    const u = ready.splice(ri(rnd, ready.length), 1)[0];
    valid.push(u);
    for (const { v } of G.adj(u)) if (--indeg[v] === 0) ready.push(v);
  }
  // Invalid orders: swap the two ends of an edge.
  const pos = new Map(valid.map((id, i) => [id, i]));
  const broken = shuffled(G.edges, rnd).map((e) => swapped(valid, pos.get(e.u) as number, pos.get(e.v) as number));
  const invalid = broken.filter((o) => S.backwardEdge(G, o));

  if (rnd() < 0.5 && invalid.length) {
    // "Is this a valid topological order?" — Yes / No (with a specific edge) / No (cycle).
    const show = rnd() < 0.5 ? valid : invalid[0];
    const bad = S.backwardEdge(G, show);
    const sp = new Map(show.map((id, i) => [id, i]));
    const fine = G.edges.filter((e) => (sp.get(e.u) as number) < (sp.get(e.v) as number));
    const claim = (e: GEdge) => `No — ${G.L(e.u)}→${G.L(e.v)} points backwards`;
    const yes = "Yes — every edge points forward";
    const cyc = "No — the graph has a cycle";
    const correct = bad ? claim(bad) : yes;
    const wrongEdge = fine.length ? claim(pickOne(rnd, fine)) : null;
    const wrong = [bad ? yes : null, wrongEdge, cyc].filter((x): x is string => !!x);
    return ask(
      "topo",
      `Is **${seq(G, show)}** a valid topological order of this graph?`,
      correct,
      wrong,
      bad
        ? `${G.L(bad.u)} must come before ${G.L(bad.v)} (edge ${G.L(bad.u)}→${G.L(bad.v)}), but the list has it after. A valid order: ${seq(G, valid)}.`
        : "Every edge goes from an earlier node in the list to a later one, so it is valid (topological orders are often not unique).",
      rnd,
    );
  }
  const bad = invalid.map((o) => seq(G, o));
  const explainBad = invalid[0] ? S.backwardEdge(G, invalid[0]) : null;
  return ask(
    "topo",
    "Which of these is a valid **topological order** (every arrow points from an earlier node to a later one)?",
    seq(G, valid),
    bad,
    `In ${seq(G, valid)} every edge points forward.` +
      (explainBad ? ` e.g. ${seq(G, invalid[0])} breaks ${G.L(explainBad.u)}→${G.L(explainBad.v)}.` : ""),
    rnd,
  );
}

function qScc({ G, rnd }: Ctx): GraphQuizQuestion | null {
  if (!G.directed || G.nodes.length < 3) return null;
  const { comps } = S.scc(G);
  const c = comps.length;
  const weak = S.weakComponents(G);
  return ask(
    "scc",
    "How many **strongly connected components** does this directed graph have?",
    String(c),
    [weak, G.nodes.length, ...near(c, 1)].map(String),
    `Kosaraju finds ${comps.map((m) => `{${m.map(G.L).join(", ")}}`).join(" ")}. Inside each group every node can reach every other along the arrows.`,
    rnd,
  );
}

function qDegree({ G, rnd }: Ctx): GraphQuizQuestion | null {
  if (G.nodes.length < 2) return null;
  const busy = G.nodes.filter((n) => S.degrees(G, n.id).total > 0);
  const x = pickOne(rnd, busy.length ? busy : G.nodes).id;
  const d = S.degrees(G, x);
  const touching = G.edges.filter((e) => e.u === x || e.v === x);
  if (!G.directed) {
    return ask(
      "degree",
      `What is the **degree** of node **${G.L(x)}**?`,
      String(d.total),
      [...near(d.total, 0), d.total * 2].map(String),
      d.total
        ? `${G.L(x)} touches ${touching.map((e) => `${G.L(e.u)}–${G.L(e.v)}`).join(", ")}: **${d.total}** edge${d.total === 1 ? "" : "s"}.`
        : `${G.L(x)} has no edges, so its degree is 0.`,
      rnd,
    );
  }
  const inn = rnd() < 0.5;
  const val = inn ? d.in : d.out;
  const list = touching.filter((e) => (inn ? e.v === x : e.u === x)).map((e) => `${G.L(e.u)}→${G.L(e.v)}`);
  return ask(
    "degree",
    `What is the **${inn ? "in" : "out"}-degree** of node **${G.L(x)}**?`,
    String(val),
    [inn ? d.out : d.in, d.total, ...near(val, 0)].map(String),
    `${inn ? "In-degree counts arrows pointing into" : "Out-degree counts arrows leaving"} ${G.L(x)}: ${list.length ? list.join(", ") : "none"} → **${val}**.`,
    rnd,
  );
}

const GEN: Record<QuizKind, (c: Ctx) => GraphQuizQuestion | null> = {
  bfs: (c) => qTraversal("bfs", c),
  dfs: (c) => qTraversal("dfs", c),
  dist: qDist,
  mst: qMst,
  kruskalNext: qKruskalNext,
  topo: qTopo,
  scc: qScc,
  degree: qDegree,
};

const ALL: readonly QuizKind[] = ["bfs", "dfs", "dist", "mst", "kruskalNext", "topo", "scc", "degree"];

/** Question types that fit each algorithm (asked more often while it is selected). */
const PREFER: Record<AlgoKey, readonly QuizKind[]> = {
  bfs: ["bfs", "dist"],
  dfs: ["dfs"],
  dijkstra: ["dist"],
  bellmanFord: ["dist"],
  kruskal: ["kruskalNext", "mst"],
  prim: ["mst"],
  topo: ["topo"],
  scc: ["scc"],
};

/** A question about the graph on screen, or null when it is empty. `only` forces one type. */
export function graphQuiz(input: QuizInput, algo: AlgoKey, rnd: Rng = Math.random, only?: QuizKind): GraphQuizQuestion | null {
  if (!input.nodes.length) return null;
  const G = makeGraph(input.nodes, input.edges, input.directed, input.weighted);
  const s = input.startId && G.nodes.some((n) => n.id === input.startId) ? input.startId : G.nodes[0].id;
  const ctx: Ctx = { G, s, rnd };
  if (only) return GEN[only](ctx);
  const pref = PREFER[algo];
  const order = rnd() < 0.6 ? [...shuffled(pref, rnd), ...shuffled(ALL.filter((k) => !pref.includes(k)), rnd)] : shuffled(ALL, rnd);
  for (const k of order) {
    const q = GEN[k](ctx);
    if (q) return q;
  }
  return null;
}
