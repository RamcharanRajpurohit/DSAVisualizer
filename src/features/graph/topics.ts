/*
 * Topic pages (/graph/<slug>): which algorithm each page opens with and the graph it is shown on.
 * Every graph has fixed positions, so the page renders the same picture on every visit (and the
 * worked examples in src/content/topics/graph.ts describe exactly this graph). A share link in
 * the URL still wins over these presets.
 *
 * Pure TS with relative imports only.
 */
import { LETTERS, byLabel } from "./graphModel";
import { DEFAULT_GRAPH, NEG_DEMO, SCC_DEMO, TOPO_DEMO, type GraphSpec } from "./layout";
import type { AlgoKey, GEdge, GNode, PresetKind, Status } from "./types";

/** URL slug under /graph → algorithm. */
export const GRAPH_TOPIC_ALGOS: Readonly<Record<string, AlgoKey>> = {
  "breadth-first-search": "bfs",
  "depth-first-search": "dfs",
  dijkstra: "dijkstra",
  "bellman-ford": "bellmanFord",
  kruskal: "kruskal",
  prim: "prim",
  "topological-sort": "topo",
  "strongly-connected-components": "scc",
};

const ready = "Ready — press Run";

/** The graph each algorithm's page opens with. */
export const TOPIC_GRAPHS: Readonly<Record<AlgoKey, GraphSpec>> = {
  bfs: {
    ...DEFAULT_GRAPH,
    weighted: false,
    title: ready,
    detail: "An unweighted graph: BFS finds the fewest-edge route from **A** to every node. Press **Run**, or click a node to start there.",
  },
  dfs: {
    ...DEFAULT_GRAPH,
    weighted: false,
    title: ready,
    detail: "Press **Run** to watch DFS dive from **A** and backtrack. Badges show discovery / finish times.",
  },
  dijkstra: DEFAULT_GRAPH,
  bellmanFord: {
    ...NEG_DEMO,
    title: ready,
    detail: "C → B costs **−4**. Press **Run** to watch Bellman-Ford relax every edge, pass by pass.",
  },
  kruskal: {
    ...DEFAULT_GRAPH,
    title: ready,
    detail: "Press **Run** to watch Kruskal take the cheapest edges that don't close a cycle.",
  },
  prim: {
    ...DEFAULT_GRAPH,
    title: ready,
    detail: "Press **Run** to watch Prim grow a tree from **A**, always adding the cheapest edge leaving it.",
  },
  topo: TOPO_DEMO,
  scc: SCC_DEMO,
};

/** Which algorithm a generator preset is built to show off. */
export const PRESET_ALGO: Readonly<Partial<Record<PresetKind, AlgoKey>>> = { dag: "topo", scc: "scc", negative: "bellmanFord" };

/** The graph a page opens with: the topic's preset, or the Dijkstra example on the hub. */
export const initialGraph = (algorithm?: AlgoKey): GraphSpec => (algorithm ? TOPIC_GRAPHS[algorithm] : DEFAULT_GRAPH);

export interface GraphPreview {
  nodes: GNode[];
  edges: GEdge[];
  directed: boolean;
  weighted: boolean;
  status: Status;
}

function buildPreview(spec: GraphSpec): GraphPreview {
  const label = (i: number) => spec.labels?.[i] ?? LETTERS[i];
  return {
    nodes: Array.from({ length: spec.n }, (_, i) => ({ id: `p${i}`, label: label(i) })).sort((a, b) => byLabel(a.label, b.label)),
    edges: spec.edges.map(([u, v, w], j) => ({ id: `pe${j}`, u: `p${u}`, v: `p${v}`, w: w ?? 1 })),
    directed: !!spec.directed,
    weighted: spec.weighted ?? true,
    status: { title: spec.title, detail: spec.detail, tone: "ok" },
  };
}

const PREVIEWS = new Map<GraphSpec, GraphPreview>([DEFAULT_GRAPH, ...Object.values(TOPIC_GRAPHS)].map((g) => [g, buildPreview(g)]));

/**
 * What the side panels show before the canvas engine has loaded: the same nodes, edges and
 * status the engine will show once it has built `spec`. Server-rendered, so the panels don't
 * jump (no layout shift) when the engine takes over.
 */
export const graphPreview = (spec: GraphSpec): GraphPreview => PREVIEWS.get(spec) ?? buildPreview(spec);
