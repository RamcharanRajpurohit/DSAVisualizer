/*
 * Guided lessons for the graph page (VisuAlgo e-Lecture style): one per algorithm plus a
 * general "graph basics" lesson. Every worked-example number below matches the demo graphs in
 * ./layout (checked by a scratchpad script). "Try it" actions are implemented in GraphVisualizer.
 */
import type { Lesson } from "@/lib/lesson";
import type { AlgoKey } from "./types";

export type LessonTopic = AlgoKey | "basics";

/** Every action id a lesson button can use (GraphVisualizer must implement all of them). */
export type GraphLessonAction =
  | "basics" | "lesson.bfs" | "lesson.dijkstra" | "lesson.kruskal" | "lesson.topo" | "lesson.scc"
  | "generate" | "directed.on" | "directed.off" | "weights.off" | "weights.on" | "repr.list" | "repr.matrix"
  | "tool.node" | "tool.edge" | "load.dag"
  | "bfs.run" | "bfs.unweighted" | "bfs.random"
  | "dfs.run" | "dfs.cycle"
  | "dijkstra.run" | "dijkstra.neg" | "bellman.neg" | "bellman.cycle"
  | "kruskal.default" | "kruskal.here" | "prim.default" | "prim.here"
  | "topo.demo" | "topo.dag" | "topo.cycle"
  | "scc.demo" | "scc.clusters";

const t = (label: string, action: GraphLessonAction) => ({ label, action });
const BASICS = t("Graph basics first", "basics");

export const GRAPH_LESSONS: Record<LessonTopic, Lesson> = {
  basics: {
    id: "graph.basics",
    title: "Graph basics",
    slides: [
      {
        title: "What is a graph?",
        body: "A graph is a set of **nodes** (vertices) joined by **edges**. Road maps, friendships, web links and task dependencies are all graphs.",
        tryIt: [t("Generate a random graph", "generate")],
      },
      {
        title: "Directed or undirected",
        body: "In an **undirected** graph an edge works both ways, like a two-way street. In a **directed** graph each edge is an arrow you may only follow forwards.",
        tryIt: [t("Make it directed", "directed.on"), t("Make it undirected", "directed.off")],
      },
      {
        title: "Weighted or unweighted",
        body: "A **weight** is the cost of using an edge: distance, time or price. Without weights every edge counts as 1, so the shortest path is simply the one with the fewest edges.",
        tryIt: [t("Hide the weights", "weights.off"), t("Show the weights", "weights.on")],
      },
      {
        title: "Storing a graph",
        body: "An **adjacency matrix** is a V × V table: O(1) edge lookup, but O(V²) memory. An **adjacency list** stores only each node's neighbours — O(V + E) memory, the usual choice. Both are shown in the Representation card.",
        tryIt: [t("Show the adjacency list", "repr.list"), t("Show the matrix", "repr.matrix")],
      },
      {
        title: "Degree, paths and cycles",
        body: "A node's **degree** counts its edges; with arrows we split it into **in-degree** and **out-degree**. A **cycle** is a path that returns to its start, and a directed graph without one is a **DAG**.",
        tryIt: [t("Load a DAG", "load.dag")],
      },
      {
        title: "Build your own",
        body: "Press **N** and click the canvas to add nodes, then **E** and click two nodes to connect them. Click a weight label to change it.",
        tryIt: [t("Node tool", "tool.node"), t("Edge tool", "tool.edge")],
      },
      {
        title: "Which algorithm when?",
        body: "Explore everything: **BFS** or **DFS**. Cheapest route: **Dijkstra**, or **Bellman-Ford** with negative weights. Cheapest network: **Kruskal** / **Prim**; task order: **topological sort**.",
        tryIt: [t("BFS lesson", "lesson.bfs"), t("Dijkstra lesson", "lesson.dijkstra"), t("MST lesson", "lesson.kruskal"), t("Topological sort lesson", "lesson.topo")],
      },
    ],
  },

  bfs: {
    id: "graph.bfs",
    title: "Breadth-first search",
    slides: [
      {
        title: "Ripples on a pond",
        body: "BFS explores in waves: first every node 1 edge away, then 2 edges away, and so on. A **queue** (first in, first out) keeps the waves in order.",
        tryIt: [t("Run BFS from A", "bfs.run"), BASICS],
      },
      {
        title: "How it works",
        body: "Dequeue the front node **u** and look at each neighbour. An unseen neighbour gets `dist[u] + 1` and joins the back of the queue; a seen one is skipped.",
      },
      {
        title: "Worked example",
        body: "From A the waves are **A**, then **B C** (1 edge), then **D E F** (2), then **G** (3). So the visit order is A B C D E F G, and the green edges form the BFS tree.",
        tryIt: [t("Run BFS from A", "bfs.run")],
      },
      {
        title: "Shortest paths without weights",
        body: "A node's BFS distance is the **fewest edges** needed to reach it. With weights that is no longer the cheapest route — that's Dijkstra's job.",
        tryIt: [t("Hide weights and run BFS", "bfs.unweighted"), t("Dijkstra lesson", "lesson.dijkstra")],
      },
      {
        title: "Complexity",
        body: "Each node is enqueued once and each adjacency list is scanned once: **O(V + E)** with an adjacency list, O(V²) with a matrix. The queue and `seen` set need O(V) extra space.",
      },
      {
        title: "Pitfalls & interview tips",
        body: "Mark a node as seen when you **enqueue** it, or it can enter the queue twice. Use a real queue (`deque`) — `list.pop(0)` costs O(n). Classics: shortest path in a maze or grid, word ladder, level-order traversal.",
      },
      {
        title: "In real life",
        body: "\"People within 2 hops\" on social networks, web crawlers and network broadcasts all spread outward like BFS.",
        tryIt: [t("BFS on a random graph", "bfs.random")],
      },
    ],
  },

  dfs: {
    id: "graph.dfs",
    title: "Depth-first search",
    slides: [
      {
        title: "Exploring a maze",
        body: "DFS follows one corridor until it hits a dead end, then backs up to the last junction with an unexplored way. The **call stack** remembers the current path.",
        tryIt: [t("Run DFS from A", "dfs.run"), BASICS],
      },
      {
        title: "How it works",
        body: "`visit(u)` stamps a **discovery** time, then visits each unvisited neighbour. When they are all done, u **finishes** — the badges show disc/fin.",
      },
      {
        title: "Worked example",
        body: "From A, DFS dives A → B → C → D → E → G → F before it ever backs up. Discovery order **A B C D E G F** — BFS would give A B C D E F G.",
        tryIt: [t("Run DFS from A", "dfs.run")],
      },
      {
        title: "Back edges = cycles",
        body: "A neighbour that is still **on the stack** is an ancestor, so that edge is a **back edge**. A directed graph has a cycle exactly when DFS finds one.",
        tryIt: [t("Find the cycle B → C → D", "dfs.cycle")],
      },
      {
        title: "Complexity",
        body: "Every node is visited once and every adjacency list scanned once: **O(V + E)**. The recursion can go V levels deep on a long path.",
      },
      {
        title: "Pitfalls & interview tips",
        body: "In an undirected graph the edge back to your parent is not a cycle. Deep graphs can overflow the recursion limit — switch to an explicit stack. Classics: counting islands, cycle detection, backtracking.",
      },
      {
        title: "Built on DFS",
        body: "Finish times power **topological sort** and **Kosaraju's SCC** algorithm. Garbage collectors and dependency resolvers use DFS too.",
        tryIt: [t("SCC lesson", "lesson.scc")],
      },
    ],
  },

  dijkstra: {
    id: "graph.dijkstra",
    title: "Dijkstra's algorithm",
    slides: [
      {
        title: "Cheapest routes",
        body: "Dijkstra finds the cheapest path from one node to every other when no weight is negative. It settles nodes in order of distance, closest first.",
        tryIt: [t("Run Dijkstra from A", "dijkstra.run"), BASICS],
      },
      {
        title: "How it works",
        body: "Keep tentative distances in a **min-priority queue**. Extract the smallest — that distance is final — then **relax** its edges: if `dist[u] + w < dist[v]`, lower dist[v].",
      },
      {
        title: "Worked example",
        body: "From A, C is finalized at 2, so B improves 4 → 3 through C. Later D (8) improves F 12 → 10 and E 12 → 11. Final: B 3, C 2, D 8, E 11, F 10, G 12.",
        tryIt: [t("Run Dijkstra from A", "dijkstra.run")],
      },
      {
        title: "Why it's correct",
        body: "Any other route to the extracted node must leave the finished set through a node that is at least as far. With weights ≥ 0 the rest of that route can't make it cheaper.",
      },
      {
        title: "Negative edges break it",
        body: "A negative edge can make a finished node cheaper later, but Dijkstra never looks back. In the demo it says D 5 and E 6; the truth is D 4 and E 5.",
        tryIt: [t("Run Dijkstra on the demo", "dijkstra.neg"), t("Then Bellman-Ford", "bellman.neg")],
      },
      {
        title: "Complexity",
        body: "With a binary heap every push and pop costs O(log V): **O((V + E) log V)** in total. A plain array scan gives O(V²), which wins on very dense graphs.",
      },
      {
        title: "Pitfalls & interview tips",
        body: "Most heaps have no decrease-key: push a new entry and **skip stale ones** when popped. Real uses: GPS and network routing; A* is Dijkstra plus a distance-to-goal estimate.",
      },
    ],
  },

  bellmanFord: {
    id: "graph.bellmanFord",
    title: "Bellman-Ford",
    slides: [
      {
        title: "Brute force that works",
        body: "Bellman-Ford relaxes **every** edge, again and again. It is slower than Dijkstra, but it handles negative weights and detects negative cycles.",
        tryIt: [t("Run it on the negative-edge demo", "bellman.neg"), BASICS],
      },
      {
        title: "Why V − 1 passes",
        body: "A shortest path visits each node at most once, so it has at most V − 1 edges. Pass k fixes every shortest path made of k edges.",
      },
      {
        title: "Worked example",
        body: "In the demo, C → B costs −4. Bellman-Ford finds B 1 (A → C → B), D 4 and E 5, where Dijkstra reports 2, 5 and 6.",
        tryIt: [t("Dijkstra first", "dijkstra.neg"), t("Then Bellman-Ford", "bellman.neg")],
      },
      {
        title: "Negative cycles",
        body: "If an edge still relaxes after V − 1 passes, some cycle has a negative total. Then no shortest path exists — you could loop forever.",
        tryIt: [t("Load a negative cycle", "bellman.cycle")],
      },
      {
        title: "Complexity",
        body: "Up to V − 1 passes over E edges: **O(V · E)**. If a whole pass changes nothing, stop early.",
      },
      {
        title: "Pitfalls & interview tips",
        body: "Skip edges whose start is still ∞ — with an integer 'infinity', ∞ + w overflows. An undirected negative edge is already a negative cycle. Classics: currency arbitrage, cheapest flight within K stops.",
      },
      {
        title: "In real life",
        body: "Distance-vector routing protocols such as **RIP** are a distributed Bellman-Ford. Each router only talks to its neighbours, pass after pass.",
      },
    ],
  },

  kruskal: {
    id: "graph.kruskal",
    title: "Kruskal's minimum spanning tree",
    slides: [
      {
        title: "Minimum spanning tree",
        body: "A **spanning tree** connects all V nodes with V − 1 edges and no cycle. The **minimum** one has the smallest total weight — the cheapest way to wire everything up.",
        tryIt: [t("Run Kruskal", "kruskal.default"), BASICS],
      },
      {
        title: "How Kruskal works",
        body: "Walk the edges from cheapest to most expensive. Take an edge if its ends are in **different trees**; skip it if they're already connected.",
      },
      {
        title: "Union-find",
        body: "Each tree is a set in a **union-find** structure — one colour per set on the canvas. `find` returns a set's root, `union` merges two sets; both are almost O(1).",
      },
      {
        title: "Worked example",
        body: "On the starter graph Kruskal takes B–C 1, E–G 1, A–C 2, D–F 2, D–E 3, skips A–B 4 (cycle), then takes B–D 5. Total **14**.",
        tryIt: [t("Run Kruskal", "kruskal.default")],
      },
      {
        title: "Kruskal vs Prim",
        body: "Both find a minimum spanning tree with the same total weight. Kruskal grows a forest of many small trees; Prim grows one tree from a start node.",
        tryIt: [t("Kruskal on this graph", "kruskal.here"), t("Prim on the same graph", "prim.here")],
      },
      {
        title: "Complexity",
        body: "Sorting dominates: **O(E log E)**. Union-find adds O(E · α(V)), and α is at most 4 in practice.",
      },
      {
        title: "Pitfalls & interview tips",
        body: "MSTs are for **undirected** graphs; a disconnected graph gives a spanning **forest**. Negative weights are fine. Uses: network and cable design, clustering (stop early to keep k groups).",
      },
    ],
  },

  prim: {
    id: "graph.prim",
    title: "Prim's minimum spanning tree",
    slides: [
      {
        title: "Grow one tree",
        body: "Prim starts from one node and grows a single tree. Each round it adds the **cheapest edge leaving the tree**.",
        tryIt: [t("Run Prim from A", "prim.default"), BASICS],
      },
      {
        title: "How it works",
        body: "Keep the edges that cross from the tree to the outside in a **min-heap**. Pop the cheapest; if its far end is already in the tree, discard it, otherwise add that node and push its edges.",
      },
      {
        title: "Why it's safe",
        body: "Any spanning tree must cross the cut between tree and non-tree nodes. Swapping in the cheapest crossing edge never makes it heavier — the **cut property**.",
      },
      {
        title: "Worked example",
        body: "From A: A–C 2, B–C 1, B–D 5, D–F 2, D–E 3, E–G 1. Total **14** — the same as Kruskal, reached in a different order.",
        tryIt: [t("Run Prim from A", "prim.default")],
      },
      {
        title: "Prim vs Kruskal",
        body: "Prim keeps one connected tree; Kruskal merges many small ones. Prim's O(V²) array version suits dense graphs; Kruskal suits sparse graphs given as edge lists.",
        tryIt: [t("Prim on this graph", "prim.here"), t("Kruskal on the same graph", "kruskal.here")],
      },
      {
        title: "Complexity",
        body: "With a binary heap: **O(E log V)**. With a matrix and a plain array: O(V²), good for very dense graphs.",
      },
      {
        title: "Pitfalls",
        body: "Only nodes reachable from the start get spanned. The heap may hold stale edges whose far end already joined — skip them when popped.",
      },
    ],
  },

  topo: {
    id: "graph.topo",
    title: "Topological sort",
    slides: [
      {
        title: "Prerequisites first",
        body: "A topological order lists nodes so that every arrow points forward — prerequisites first. It exists exactly when the graph has **no cycle** (a DAG).",
        tryIt: [t("Sort the prerequisites demo", "topo.demo"), BASICS],
      },
      {
        title: "Kahn's algorithm",
        body: "Count each node's incoming edges (**in-degree**). Repeatedly output a node with in-degree 0 and remove its outgoing edges; nodes that drop to 0 join the queue.",
      },
      {
        title: "Worked example",
        body: "B and F have no prerequisites. Output B (G becomes ready), then F (A and C ready), then G, A, C, D, E: **B F G A C D E**.",
        tryIt: [t("Run it", "topo.demo")],
      },
      {
        title: "Detecting cycles",
        body: "If the queue empties before every node is output, the rest wait on each other in a cycle. So Kahn's algorithm doubles as a cycle detector.",
        tryIt: [t("Try a graph with a cycle", "topo.cycle")],
      },
      {
        title: "Complexity",
        body: "Each node enters the queue once and each edge is removed once: **O(V + E)** time, O(V) extra space.",
      },
      {
        title: "Pitfalls & interview tips",
        body: "The order is usually **not unique** — any ready node may go next. Reversed DFS finish order is another way to get one. Classic: \"Course Schedule\".",
        tryIt: [t("Generate a DAG and sort it", "topo.dag")],
      },
      {
        title: "In real life",
        body: "Build systems, package managers, spreadsheet recalculation and course planners all sort their dependency graphs this way.",
      },
    ],
  },

  scc: {
    id: "graph.scc",
    title: "Strongly connected components",
    slides: [
      {
        title: "Groups that reach each other",
        body: "In a directed graph, an **SCC** is a group where every node can reach every other along the arrows. Shrink each SCC to one node and what's left is a DAG.",
        tryIt: [t("Find the 3 clusters", "scc.demo"), BASICS],
      },
      {
        title: "Phase 1: finish order",
        body: "Run DFS over the whole graph and record when each node **finishes**. The node that finishes last lies in a component nothing else can reach.",
      },
      {
        title: "Phase 2: reverse the edges",
        body: "Reverse every arrow (the **transpose**). Components stay intact but the bridges flip, so a DFS from the latest finisher can't leak into another component.",
      },
      {
        title: "Worked example",
        body: "Phase 1 finishes H G F E D C B A. In the reversed graph, DFS from A collects {A, C, B}, from D {D, E}, from F {F, H, G}: **3 SCCs**.",
        tryIt: [t("Run Kosaraju", "scc.demo")],
      },
      {
        title: "Complexity",
        body: "Two DFS passes plus building the transpose: **O(V + E)** time and space.",
      },
      {
        title: "Pitfalls & interview tips",
        body: "Phase 2 must use **reverse finish order** on the **reversed** graph, or components merge. Tarjan's algorithm finds SCCs in a single DFS.",
        tryIt: [t("Generate clusters and find SCCs", "scc.clusters")],
      },
      {
        title: "In real life",
        body: "SCCs reveal circular dependencies between modules, groups of web pages that all link to each other, and power 2-SAT solvers.",
      },
    ],
  },
};
