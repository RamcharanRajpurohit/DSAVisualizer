/*
 * Plain-text answers for the page's WebMCP tools (see agentTools.ts): graph descriptions,
 * algorithm results and shortest paths, all computed with the same pure solvers the quiz uses
 * (./solve), so an agent always gets the numbers the animation shows. Also validates the
 * graphs an agent asks to load.
 *
 * Pure TS with relative imports only (runnable under tsx for the scratchpad checks).
 */
import { ALGOS } from "./algorithms";
import { MAX_NODES, WEIGHT_MAX, WEIGHT_MIN, makeGraph } from "./graphModel";
import type { GraphSpec } from "./layout";
import * as S from "./solve";
import type { AlgoKey, GEdge, GNode, Graph } from "./types";

/** Strip the light markup (**bold**, `code`) from step text. */
export const plain = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1");

export const toGraph = (nodes: readonly GNode[], edges: readonly GEdge[], directed: boolean, weighted: boolean) =>
  makeGraph(nodes, edges, directed, weighted);

const join = (xs: readonly string[]) => (xs.length ? xs.join(", ") : "none");

function edgeText(G: Graph, e: GEdge) {
  return G.weighted ? `${G.name(e)} ${e.w}` : G.name(e);
}

function adjacency(G: Graph) {
  return G.nodes.map((n) => {
    const out = G.adj(n.id).map((a) => (G.weighted ? `${G.L(a.v)}(${a.e.w})` : G.L(a.v)));
    return `  ${n.label}: ${out.length ? out.join(", ") : "—"}`;
  });
}

/** A compact description of the whole graph: kind, nodes, edges and adjacency list. */
export function describeGraph(G: Graph, startId: string | null, extra?: string): string {
  const kind = `${G.directed ? "Directed" : "Undirected"}, ${G.weighted ? "weighted" : "unweighted"} graph`;
  const head = [
    `${kind} with ${G.nodes.length} node${G.nodes.length === 1 ? "" : "s"} and ${G.edges.length} edge${G.edges.length === 1 ? "" : "s"}.`,
  ];
  if (startId) head.push(`Start node: ${G.L(startId)}.`);
  if (extra) head.push(extra);
  if (!G.nodes.length) return `${head.join(" ")} The graph is empty.`;
  const lines = [
    head.join(" "),
    `Nodes: ${G.nodes.map((n) => n.label).join(" ")}`,
    `Edges: ${join(G.edges.map((e) => edgeText(G, e)))}`,
    `Adjacency list${G.directed ? " (outgoing)" : ""}:`,
    ...adjacency(G),
  ];
  if (G.hasNeg) lines.push("Note: some weights are negative — Dijkstra may be wrong here; Bellman-Ford handles them.");
  return lines.join("\n");
}

const route = (G: Graph, parent: Record<string, string>, id: string) => S.pathTo(parent, id).map(G.L).join(" → ");

function distanceLines(G: Graph, s: string, dist: Record<string, number>, parent: Record<string, string>) {
  const reach = G.nodes.filter((n) => Number.isFinite(dist[n.id] ?? Infinity));
  const lost = G.nodes.filter((n) => !Number.isFinite(dist[n.id] ?? Infinity)).map((n) => n.label);
  const out = [`Shortest distances from ${G.L(s)}: ${reach.map((n) => `${n.label} ${dist[n.id]}${n.id === s ? "" : ` (${route(G, parent, n.id)})`}`).join("; ")}.`];
  if (lost.length) out.push(`Unreachable from ${G.L(s)}: ${lost.join(", ")}.`);
  return out;
}

/** Bellman-Ford's negative cycle, as labels in path order (first label repeated at the end), or null. */
function negativeCycle(G: Graph, s: string): string[] | null {
  const list = S.relaxList(G);
  const dist: Record<string, number> = {};
  const parent: Record<string, string> = {};
  G.nodes.forEach((n) => (dist[n.id] = Infinity));
  dist[s] = 0;
  let last: string | null = null;
  for (let pass = 0; pass < G.nodes.length; pass++) {
    last = null;
    for (const { e, a, b } of list) {
      if (dist[a] === Infinity) continue;
      if (dist[a] + G.w(e) < dist[b]) {
        dist[b] = dist[a] + G.w(e);
        parent[b] = a;
        last = b;
      }
    }
    if (last === null) return null;
  }
  if (last === null) return null;
  let x: string = last;
  for (let i = 0; i < G.nodes.length; i++) x = parent[x] ?? x;
  const cycle = [x];
  for (let y = parent[x]; y !== undefined && y !== x && cycle.length <= G.nodes.length; y = parent[y]) cycle.push(y);
  cycle.push(x);
  return cycle.reverse().map(G.L);
}

function cycleWeight(G: Graph, labels: readonly string[]) {
  let total = 0;
  for (let i = 0; i + 1 < labels.length; i++) {
    const from = G.nodes.find((n) => n.label === labels[i]);
    const step = from && G.adj(from.id).filter((a) => G.L(a.v) === labels[i + 1]);
    if (!step?.length) return null;
    total += Math.min(...step.map((a) => a.w));
  }
  return total;
}

/** The result of running `key` from `s`, as a few lines of plain text. */
export function algorithmResult(G: Graph, key: AlgoKey, s: string): string {
  const L = G.L;
  const unweightedNote = G.weighted ? "" : " (unweighted: every edge costs 1)";
  switch (key) {
    case "bfs": {
      const r = S.bfs(G, s);
      const levels: string[][] = [];
      r.order.forEach((id) => (levels[r.dist[id]] ??= []).push(L(id)));
      const lost = G.nodes.filter((n) => r.dist[n.id] === undefined).map((n) => n.label);
      const out = [
        `BFS from ${L(s)} visits ${r.order.length} of ${G.nodes.length} nodes in this order: ${r.order.map(L).join(", ")}.`,
        `Levels (fewest edges from ${L(s)}): ${levels.map((l, d) => `${d}: ${l.join(" ")}`).join(" | ")}.`,
        `BFS tree edges: ${join(r.order.filter((id) => r.parent[id] !== undefined).map((id) => `${L(r.parent[id])}→${L(id)}`))}.`,
      ];
      if (lost.length) out.push(`Not reachable from ${L(s)}: ${lost.join(", ")}.`);
      return out.join("\n");
    }
    case "dfs": {
      const r = S.dfs(G, s);
      const arrow = G.directed ? "→" : "–";
      const lost = G.nodes.filter((n) => r.disc[n.id] === undefined).map((n) => n.label);
      const out = [
        `DFS from ${L(s)} visits (discovery order): ${r.order.map(L).join(", ")}.`,
        `Discovery/finish times: ${r.order.map((id) => `${L(id)} ${r.disc[id]}/${r.fin[id]}`).join(", ")}.`,
        r.back.length
          ? `Back edges (each closes a cycle): ${r.back.map(([u, v]) => `${L(u)}${arrow}${L(v)}`).join(", ")}.`
          : `No back edges: no cycle is reachable from ${L(s)}.`,
      ];
      if (lost.length) out.push(`Not reached from ${L(s)}: ${lost.join(", ")}.`);
      return out.join("\n");
    }
    case "dijkstra": {
      const r = S.dijkstra(G, s);
      const out = [`Dijkstra from ${L(s)}${unweightedNote} finalizes nodes in this order: ${r.order.map(L).join(", ")}.`, ...distanceLines(G, s, r.dist, r.parent)];
      if (G.hasNeg) out.push("Warning: the graph has negative edge weights, so these distances may be wrong — run bellman_ford instead.");
      return out.join("\n");
    }
    case "bellmanFord": {
      const r = S.bellmanFord(G, s);
      if (r.negCycle) {
        const cyc = negativeCycle(G, s);
        const w = cyc ? cycleWeight(G, cyc) : null;
        return (
          `Bellman-Ford from ${L(s)}: a negative cycle is reachable` +
          (cyc ? ` (${cyc.join(" → ")}${w !== null ? `, total weight ${w}` : ""})` : "") +
          ", so shortest paths are undefined — every lap around it makes them cheaper."
        );
      }
      return [`Bellman-Ford from ${L(s)}${unweightedNote}: no negative cycle is reachable.`, ...distanceLines(G, s, r.dist, r.parent)].join("\n");
    }
    case "kruskal": {
      const r = S.kruskal(G);
      const skipped = r.seq.filter((x) => !x.take).map((x) => edgeText(G, x.e));
      const trees = G.nodes.length - r.taken.length;
      const out = [
        `Kruskal's minimum spanning ${trees > 1 ? "forest" : "tree"}${unweightedNote}: total weight ${r.total}, ${r.taken.length} edges taken in this order: ${join(r.taken.map((e) => edgeText(G, e)))}.`,
        `Skipped because they would close a cycle: ${join(skipped)}.`,
      ];
      if (trees > 1) out.push(`The graph is disconnected, so the result is a forest of ${trees} trees, not a single spanning tree.`);
      return out.join("\n");
    }
    case "prim": {
      const r = S.prim(G, s);
      const out = [
        `Prim's minimum spanning tree from ${L(s)}${unweightedNote}: total weight ${r.total}, edges added in this order: ${join(r.taken.map((e) => edgeText(G, e)))}.`,
      ];
      if (r.size < G.nodes.length) out.push(`The graph is disconnected: only the ${r.size} nodes connected to ${L(s)} are spanned.`);
      return out.join("\n");
    }
    case "topo": {
      const r = S.kahn(G);
      if (!r.cycle) return `Topological order (Kahn's algorithm): ${r.order.map(L).join(", ")}. Every edge points forward in this order.`;
      const placed = new Set(r.order);
      const stuck = G.nodes.filter((n) => !placed.has(n.id)).map((n) => n.label);
      return (
        `No topological order exists: the graph has a cycle. Kahn's algorithm output ${join(r.order.map(L))} and then got stuck; ` +
        `the remaining nodes (${stuck.join(", ")}) lie on a cycle or depend on one.`
      );
    }
    case "scc": {
      const r = S.scc(G);
      const groups = r.comps.map((c) => `{${c.map(L).sort().join(", ")}}`);
      const links = new Set<string>();
      G.edges.forEach((e) => {
        const a = r.comp[e.u];
        const b = r.comp[e.v];
        if (a !== b) links.add(`${groups[a]} → ${groups[b]}`);
      });
      return [
        `${r.comps.length} strongly connected component${r.comps.length === 1 ? "" : "s"} (Kosaraju): ${groups.join(", ")}.`,
        `Edges between components (the condensation DAG): ${join([...links])}.`,
      ].join("\n");
    }
  }
}

/** Shortest path between two nodes with the right algorithm for the graph (BFS / Dijkstra / Bellman-Ford). */
export function shortestPath(G: Graph, from: string, to: string): string {
  const [a, b] = [G.L(from), G.L(to)];
  if (from === to) return `${a} → ${a}: the path is just ${a} (cost 0).`;
  if (!G.weighted) {
    const r = S.bfs(G, from);
    if (r.dist[to] === undefined) return `${b} is not reachable from ${a}.`;
    return `Shortest path ${a} → ${b}: ${route(G, r.parent, to)} (${r.dist[to]} edge${r.dist[to] === 1 ? "" : "s"}; found with BFS because the graph is unweighted).`;
  }
  if (G.hasNeg) {
    const r = S.bellmanFord(G, from);
    if (r.negCycle) return `Undefined: a negative cycle is reachable from ${a}, so paths can get cheaper forever (found with Bellman-Ford).`;
    if (!Number.isFinite(r.dist[to])) return `${b} is not reachable from ${a}.`;
    const path = S.pathTo(r.parent, to);
    return `Shortest path ${a} → ${b}: ${path.map(G.L).join(" → ")} (cost ${r.dist[to]}, ${path.length - 1} edges; found with Bellman-Ford because some weights are negative).`;
  }
  const r = S.dijkstra(G, from);
  if (!Number.isFinite(r.dist[to])) return `${b} is not reachable from ${a}.`;
  const path = S.pathTo(r.parent, to);
  return `Shortest path ${a} → ${b}: ${path.map(G.L).join(" → ")} (cost ${r.dist[to]}, ${path.length - 1} edges; found with Dijkstra).`;
}

// ───────────────────────────── loading a graph ─────────────────────────────

export interface GraphInput {
  directed?: unknown;
  weighted?: unknown;
  nodes?: unknown;
  edges?: unknown;
  start?: unknown;
}

const LABEL_RE = /^[A-Z]$/;
const label = (v: unknown) => (typeof v === "string" ? v.trim().toUpperCase() : "");
export const MAX_AGENT_EDGES = 200;

/** Validate a load_graph request; returns the spec to build or a friendly error message. */
export function specFromInput(input: GraphInput): GraphSpec | string {
  if (typeof input.directed !== "boolean") return "Error: `directed` must be true or false.";
  if (typeof input.weighted !== "boolean") return "Error: `weighted` must be true or false.";
  if (!Array.isArray(input.nodes) || input.nodes.length < 1 || input.nodes.length > MAX_NODES) {
    return `Error: \`nodes\` must be a list of 1–${MAX_NODES} labels (single letters A–Z).`;
  }
  const labels: string[] = [];
  for (const raw of input.nodes) {
    const l = label(raw);
    if (!LABEL_RE.test(l)) return `Error: node label ${JSON.stringify(raw)} is not a single letter A–Z.`;
    if (labels.includes(l)) return `Error: node ${l} is listed twice.`;
    labels.push(l);
  }
  const index = new Map(labels.map((l, i) => [l, i]));
  const rawEdges = input.edges ?? [];
  if (!Array.isArray(rawEdges) || rawEdges.length > MAX_AGENT_EDGES) return `Error: \`edges\` must be a list of at most ${MAX_AGENT_EDGES} edges.`;
  const edges: [number, number, number][] = [];
  const seen = new Set<string>();
  for (const raw of rawEdges) {
    if (!raw || typeof raw !== "object") return "Error: each edge must be an object {from, to, weight}.";
    const { from, to, weight } = raw as Record<string, unknown>;
    const [a, b] = [label(from), label(to)];
    const u = index.get(a);
    const v = index.get(b);
    if (u === undefined || v === undefined) return `Error: edge ${JSON.stringify(raw)} uses a node that is not in \`nodes\`.`;
    if (u === v) return `Error: self-loop ${a}–${a} is not supported.`;
    const w = weight === undefined || weight === null ? 1 : weight;
    if (typeof w !== "number" || !Number.isInteger(w) || w < WEIGHT_MIN || w > WEIGHT_MAX) {
      return `Error: the weight of ${a}–${b} must be a whole number from ${WEIGHT_MIN} to ${WEIGHT_MAX}.`;
    }
    const key = input.directed ? `${a}>${b}` : [a, b].sort().join("-");
    if (seen.has(key)) return `Error: edge ${a}${input.directed ? "→" : "–"}${b} is listed twice${input.directed ? "" : " (undirected edges work both ways)"}.`;
    seen.add(key);
    edges.push([u, v, w]);
  }
  let start = 0;
  if (input.start !== undefined && input.start !== null && input.start !== "") {
    const s = index.get(label(input.start));
    if (s === undefined) return `Error: start node ${JSON.stringify(input.start)} is not in \`nodes\`.`;
    start = s;
  }
  return {
    n: labels.length,
    labels,
    edges,
    directed: input.directed,
    weighted: input.weighted,
    start,
    title: "Graph loaded",
    detail: `A ${input.directed ? "directed" : "undirected"}, ${input.weighted ? "weighted" : "unweighted"} graph with ${labels.length} nodes and ${edges.length} edges. Pick an algorithm and press **Run**.`,
  };
}

/** Labels in use, for error messages. */
export const labelsOf = (G: Graph) => G.nodes.map((n) => n.label).join(", ") || "none";

/** "BFS" for tool output. */
export const algoName = (key: AlgoKey) => ALGOS[key].name;
