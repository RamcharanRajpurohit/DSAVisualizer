import type { AlgoKey, Graph, GraphStep, PresetKind } from "../types";
import { BELLMAN_FORD_CODE, runBellmanFord } from "./bellmanFord";
import { BFS_CODE, runBFS } from "./bfs";
import { DFS_CODE, runDFS } from "./dfs";
import { DIJKSTRA_CODE, runDijkstra } from "./dijkstra";
import { KRUSKAL_CODE, runKruskal } from "./kruskal";
import { PRIM_CODE, runPrim } from "./prim";
import { SCC_CODE, runSCC } from "./scc";
import { TOPO_CODE, runTopo } from "./topo";

export interface AlgoComplexityRow {
  op: string;
  best?: string;
  avg?: string;
  worst: string;
  space?: string;
}

export type AlgoGroup = "Traversal" | "Shortest paths" | "Minimum spanning tree" | "Directed graphs";

export interface AlgoDef {
  key: AlgoKey;
  name: string;
  /** Option label in the algorithm picker. */
  label: string;
  group: AlgoGroup;
  /** Short description; supports **bold**. */
  info: string;
  time: string;
  space: string;
  /** The graph kind the algorithm is defined for. */
  needs?: "directed" | "undirected";
  /** Whether a start node is used. */
  start: boolean;
  /** Preset that shows the algorithm off best. */
  preset?: PresetKind;
  code: readonly string[];
  complexity: readonly AlgoComplexityRow[];
  complexityNote?: string;
  run(G: Graph, start: string): GraphStep[];
}

export const ALGOS: Record<AlgoKey, AlgoDef> = {
  bfs: {
    key: "bfs",
    name: "Breadth-First Search",
    label: "Breadth-First Search (BFS)",
    group: "Traversal",
    start: true,
    time: "O(V + E)",
    space: "O(V)",
    info: "Explores in waves using a **queue**. On an unweighted graph the BFS tree gives the path with the fewest edges to every node.",
    code: BFS_CODE,
    complexity: [
      { op: "Adjacency list", worst: "O(V + E)", space: "O(V)" },
      { op: "Adjacency matrix", worst: "O(V²)", space: "O(V)" },
    ],
    complexityNote: "Every node is enqueued at most once and every edge is looked at once (twice when undirected).",
    run: runBFS,
  },
  dfs: {
    key: "dfs",
    name: "Depth-First Search",
    label: "Depth-First Search (DFS)",
    group: "Traversal",
    start: true,
    time: "O(V + E)",
    space: "O(V)",
    info: "Dives deep along one path, then backtracks, using a **call stack**. Discovery / finish times power cycle detection, topological sort and SCCs.",
    code: DFS_CODE,
    complexity: [
      { op: "Adjacency list", worst: "O(V + E)", space: "O(V)" },
      { op: "Adjacency matrix", worst: "O(V²)", space: "O(V)" },
    ],
    complexityNote: "The recursion depth (call stack) can reach V on a long path.",
    run: runDFS,
  },
  dijkstra: {
    key: "dijkstra",
    name: "Dijkstra's Algorithm",
    label: "Dijkstra",
    group: "Shortest paths",
    start: true,
    time: "O((V + E) log V)",
    space: "O(V)",
    info: "Shortest paths from one node when every weight is ≥ 0. Always finalizes the closest unfinished node from a **priority queue**.",
    code: DIJKSTRA_CODE,
    complexity: [
      { op: "Binary heap", worst: "O((V + E) log V)", space: "O(V)" },
      { op: "Plain array", worst: "O(V²)", space: "O(V)" },
      { op: "Fibonacci heap", worst: "O(E + V log V)", space: "O(V)" },
    ],
    complexityNote: "Wrong answers are possible with negative edge weights — try the Negative edge demo preset.",
    run: runDijkstra,
  },
  bellmanFord: {
    key: "bellmanFord",
    name: "Bellman-Ford",
    label: "Bellman-Ford",
    group: "Shortest paths",
    start: true,
    time: "O(V · E)",
    space: "O(V)",
    preset: "negative",
    info: "Shortest paths that also handle **negative weights**: relax every edge V − 1 times, then one extra pass detects negative cycles.",
    code: BELLMAN_FORD_CODE,
    complexity: [{ op: "Relaxation passes", best: "O(E)", worst: "O(V · E)", space: "O(V)" }],
    complexityNote: "Best case: the first pass already finds every distance and the second pass changes nothing (early exit).",
    run: runBellmanFord,
  },
  kruskal: {
    key: "kruskal",
    name: "Kruskal's MST",
    label: "Kruskal (MST)",
    group: "Minimum spanning tree",
    needs: "undirected",
    start: false,
    time: "O(E log E)",
    space: "O(V + E)",
    info: "Minimum spanning tree: take edges cheapest-first and skip any that would close a cycle. Colours show the **union-find** sets merging.",
    code: KRUSKAL_CODE,
    complexity: [
      { op: "Sort edges", worst: "O(E log E)", space: "O(E)" },
      { op: "Union-find ops", worst: "O(E · α(V))", space: "O(V)" },
    ],
    complexityNote: "α is the inverse Ackermann function — at most 4 for any realistic input, so sorting dominates.",
    run: (G) => runKruskal(G),
  },
  prim: {
    key: "prim",
    name: "Prim's MST",
    label: "Prim (MST)",
    group: "Minimum spanning tree",
    needs: "undirected",
    start: true,
    time: "O(E log V)",
    space: "O(V + E)",
    info: "Minimum spanning tree grown from one node: always add the **cheapest edge that leaves the tree**.",
    code: PRIM_CODE,
    complexity: [
      { op: "Binary heap", worst: "O(E log V)", space: "O(V + E)" },
      { op: "Plain array", worst: "O(V²)", space: "O(V)" },
    ],
    complexityNote: "This visualizer rescans the crossing edges each round for clarity; a heap makes that cheap.",
    run: runPrim,
  },
  topo: {
    key: "topo",
    name: "Topological Sort",
    label: "Topological Sort (Kahn)",
    group: "Directed graphs",
    needs: "directed",
    start: false,
    time: "O(V + E)",
    space: "O(V)",
    preset: "dag",
    info: "Kahn's algorithm: repeatedly output a node with no remaining incoming edges. Only works without cycles — try the **Random DAG** preset.",
    code: TOPO_CODE,
    complexity: [{ op: "Kahn's algorithm", worst: "O(V + E)", space: "O(V)" }],
    complexityNote: "Each node enters the queue once and each edge is removed once.",
    run: (G) => runTopo(G),
  },
  scc: {
    key: "scc",
    name: "Strongly Connected Components",
    label: "SCCs (Kosaraju)",
    group: "Directed graphs",
    needs: "directed",
    start: false,
    time: "O(V + E)",
    space: "O(V + E)",
    preset: "scc",
    info: "Kosaraju's algorithm: DFS for finish order, **reverse every edge**, then DFS again in reverse finish order. Try the **Clusters** preset.",
    code: SCC_CODE,
    complexity: [
      { op: "Two DFS passes", worst: "O(V + E)", space: "O(V)" },
      { op: "Build transpose", worst: "O(V + E)", space: "O(V + E)" },
    ],
    run: (G) => runSCC(G),
  },
};

export const ALGO_ORDER: readonly AlgoKey[] = ["bfs", "dfs", "dijkstra", "bellmanFord", "kruskal", "prim", "topo", "scc"];

export const ALGO_GROUPS: readonly AlgoGroup[] = ["Traversal", "Shortest paths", "Minimum spanning tree", "Directed graphs"];

/** Friendly reason the algorithm can't run on this kind of graph, or null. */
export function needsWarning(algo: AlgoDef, directed: boolean): string | null {
  if (algo.needs === "directed" && !directed) {
    return `Needs a directed graph — switch on **Directed** or generate ${algo.key === "topo" ? "a **Random DAG**" : "the **Clusters** preset"}.`;
  }
  if (algo.needs === "undirected" && directed) {
    return "A minimum spanning tree is defined for undirected graphs — switch off **Directed**.";
  }
  return null;
}
