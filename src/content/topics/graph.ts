import { GRAPH_CODE } from "@/features/graph/code/implementations";
import type { TopicContent } from "../types";

/*
 * Graph algorithms: the /graph hub and one page per algorithm. Every worked example below uses
 * the exact graph that page opens with (see src/features/graph/topics.ts), and every number was
 * checked against the visualizer's own pure solvers (src/features/graph/solve.ts).
 */

const UPDATED = "2026-10-19";

/** Paragraphs and bullet blocks, separated by blank lines (TopicArticle's body markup). */
const body = (...blocks: string[]) => blocks.join("\n\n");
const list = (...items: string[]) => items.map((i) => `- ${i}`).join("\n");

const py = (source: string) => ({ language: "python" as const, source });

// ─────────────────────────────────── hub ───────────────────────────────────

const HUB: TopicContent = {
  path: "/graph",
  name: "Graph Algorithms",
  title: "Graph Algorithm Visualizer — BFS, Dijkstra, MST & More",
  h1: "Graph Algorithm Visualizer",
  description:
    "Interactive graph algorithm visualizer: draw or generate a graph and step through BFS, DFS, Dijkstra, Bellman-Ford, Kruskal, Prim, topological sort and SCCs.",
  keywords: [
    "graph algorithm visualizer",
    "graph algorithms",
    "graph traversal visualization",
    "shortest path visualizer",
    "minimum spanning tree visualizer",
    "adjacency list vs adjacency matrix",
    "which graph algorithm to use",
  ],
  question: "What are graph algorithms?",
  summary:
    "Graph algorithms answer questions about networks of **nodes** (vertices) joined by **edges**: what can be reached, what the cheapest route is, which links connect everything at the lowest total cost, and in what order dependent tasks can run. Eight classics cover most courses and interviews: BFS and DFS for exploring, Dijkstra and Bellman-Ford for shortest paths, Kruskal and Prim for minimum spanning trees, and topological sort and Kosaraju's algorithm for directed graphs.",
  sections: [
    {
      heading: "Graph basics: vertices, edges, direction and weight",
      body: body(
        "A graph G = (V, E) is a set of vertices joined by edges. Complexity is stated in terms of both: **V** is the number of nodes and **E** the number of edges, so O(V + E) means \"proportional to the size of the graph\".",
        list(
          "**Undirected** edges work both ways, like a friendship. **Directed** edges are arrows u → v, like a web link or \"course A is a prerequisite of course B\".",
          "**Weighted** edges carry a cost such as kilometres or minutes. In an **unweighted** graph every edge counts as 1, so the shortest path is the one with the fewest edges.",
          "A **cycle** is a path that returns to its start; a directed graph without one is a **DAG**. A graph is **sparse** when E is close to V and **dense** when E is close to V².",
        ),
      ),
    },
    {
      heading: "Adjacency list vs adjacency matrix",
      body: body(
        "An **adjacency matrix** is a V × V table whose cell [u][v] holds the edge weight. It answers \"is there an edge u → v?\" in O(1) but always costs O(V²) memory, and listing a node's neighbours means scanning a whole row.",
        "An **adjacency list** stores only the neighbours each node actually has: O(V + E) memory, and O(degree) to iterate a node's neighbours. Since nearly every algorithm here loops \"for each neighbour v of u\", a list keeps traversals at O(V + E) where a matrix makes them O(V²). Use a list unless the graph is dense or you need constant-time edge lookups. The Representation card beside the canvas shows both and highlights the row being scanned.",
      ),
    },
    {
      heading: "Which graph algorithm should I use?",
      body: body(
        list(
          "**Reach everything, or fewest edges in an unweighted graph** (grids, mazes, minimum moves) → breadth-first search (BFS).",
          "**Explore deeply, detect cycles, find connected components, backtrack** → depth-first search (DFS).",
          "**Cheapest path from one source, all weights ≥ 0** → Dijkstra's algorithm.",
          "**Cheapest path with negative weights, or detect a negative cycle** → Bellman-Ford.",
          "**Cheapest set of edges connecting every node** (cables, pipes, clustering) → a minimum spanning tree: Kruskal for sparse graphs, Prim for dense ones.",
          "**Order tasks that depend on each other** (build order, course schedule) → topological sort, which also reports a dependency cycle.",
          "**Groups of nodes that can all reach each other in a directed graph** → strongly connected components.",
        ),
        "Beyond this page: Floyd–Warshall for all-pairs shortest paths in O(V³), A* for a single target with a distance estimate, and max-flow for capacity problems.",
      ),
    },
    {
      heading: "How the algorithms relate",
      body: body(
        "The eight algorithms are two traversal patterns plus a few twists. **BFS** is Dijkstra with every edge costing 1: with equal weights, a FIFO queue already hands out nodes in order of distance. **Prim** has Dijkstra's exact skeleton, but its key is the weight of the single edge into the tree instead of the total path length.",
        "**Kruskal** sorts all edges and uses union-find to avoid cycles; **Bellman-Ford** is dynamic programming over the number of edges in a path. **Topological sort** has a BFS flavour (Kahn's algorithm) and a DFS flavour (reverse finishing order), and **Kosaraju's SCC algorithm** is two DFS passes, the second on the reversed graph. Learn BFS, DFS and the priority-queue loop well and the rest are small variations.",
      ),
    },
    {
      heading: "Using the visualizer",
      body: "Generate a graph or draw your own (**N** adds nodes, **E** connects them, click a weight to edit it), pick an algorithm and press **Run**. Every step is recorded, so you can step backwards and scrub the timeline while the code panel highlights the matching line.",
    },
  ],
  complexity: [
    { label: "BFS", time: "O(V + E)", space: "O(V)", note: "Each node is enqueued once; each adjacency list is scanned once." },
    { label: "DFS", time: "O(V + E)", space: "O(V)", note: "Each node is visited once; the recursion can be V levels deep." },
    { label: "Dijkstra (binary heap)", time: "O((V + E) log V)", space: "O(V + E)", note: "Every relaxation may push a heap entry costing O(log V)." },
    { label: "Bellman-Ford", time: "O(V · E)", space: "O(V)", note: "Up to V − 1 passes over every edge, plus one check pass." },
    { label: "Kruskal", time: "O(E log E)", space: "O(V + E)", note: "Sorting the edges dominates; union-find is nearly O(1) per edge." },
    { label: "Prim (binary heap)", time: "O(E log V)", space: "O(V + E)", note: "Each edge enters and leaves the heap at most once." },
    { label: "Topological sort (Kahn)", time: "O(V + E)", space: "O(V)", note: "Each node is output once; each edge lowers one in-degree once." },
    { label: "SCC (Kosaraju)", time: "O(V + E)", space: "O(V + E)", note: "Two DFS passes, plus a reversed copy of the graph." },
  ],
  faqs: [
    {
      q: "What is the difference between BFS and DFS?",
      a: "BFS explores level by level with a queue and finds fewest-edge paths in unweighted graphs. DFS goes as deep as possible with a stack (or recursion) and is the basis of cycle detection, topological sort and SCCs. Both run in O(V + E).",
    },
    {
      q: "When should I use Dijkstra instead of BFS?",
      a: "Use Dijkstra when edges have different non-negative weights. BFS minimizes the number of edges, which equals the cheapest cost only when every edge has the same weight.",
    },
    {
      q: "What is the difference between Kruskal's and Prim's algorithm?",
      a: "Both build a minimum spanning tree with the same total weight. Kruskal sorts all edges and merges trees with union-find, which suits sparse graphs; Prim grows one tree from a start node with a priority queue, which suits dense graphs.",
    },
    {
      q: "Should I use an adjacency list or an adjacency matrix?",
      a: "Use an adjacency list for most graphs: it takes O(V + E) memory and lets traversals run in O(V + E). An adjacency matrix (O(V²) memory) only pays off for dense graphs or when you need O(1) edge lookups.",
    },
    {
      q: "What is a DAG?",
      a: "A directed acyclic graph: every edge has a direction and no path leads back to where it started. DAGs are exactly the graphs that have a topological order, which is why they model dependencies and schedules.",
    },
  ],
  related: ["/graph/breadth-first-search", "/graph/dijkstra", "/graph/kruskal", "/graph/topological-sort", "/heap/priority-queue", "/stack-queue/queue"],
  updated: UPDATED,
};

// ─────────────────────────────────── BFS ───────────────────────────────────

const BFS: TopicContent = {
  path: "/graph/breadth-first-search",
  parent: "/graph",
  name: "Breadth-First Search",
  title: "BFS Visualizer — Breadth-First Search Step by Step",
  h1: "BFS Visualizer — Breadth-First Search",
  description:
    "Breadth-first search explores a graph level by level with a queue and finds fewest-edge paths. Watch BFS run step by step, with code and O(V + E) analysis.",
  keywords: [
    "bfs visualizer",
    "breadth first search",
    "breadth-first search algorithm",
    "bfs graph traversal",
    "bfs shortest path unweighted graph",
    "bfs queue",
    "bfs time complexity",
  ],
  summary:
    "**Breadth-first search (BFS)** is a graph traversal that visits every node reachable from a start node in order of distance: first the start, then all of its neighbours, then their unvisited neighbours, and so on. It uses a **FIFO queue** and runs in **O(V + E)** time, and in an unweighted graph the first time BFS reaches a node is always along a path with the fewest possible edges.",
  steps: [
    "Mark the start node `s` as seen, set `dist[s] = 0` and put `s` in a queue.",
    "Dequeue the node `u` at the front of the queue.",
    "For each neighbour `v` of `u` that has not been seen: mark it seen, set `dist[v] = dist[u] + 1` and `parent[v] = u`, and enqueue it.",
    "Skip neighbours that were already seen — they are waiting in the queue or already done.",
    "Repeat until the queue is empty. Nodes that were never seen are unreachable from `s`.",
  ],
  sections: [
    {
      heading: "Why a queue gives shortest paths",
      body: body(
        "Think of ripples on a pond. The queue only ever holds nodes from two consecutive levels: those at distance d at the front, and the nodes at distance d + 1 they are discovering at the back. Because the queue is first-in, first-out, every node at distance d leaves before any node at distance d + 1.",
        "So when BFS discovers `v` from `u`, no shorter route to `v` can exist — it would have to pass through a node that was dequeued earlier, and that node would have discovered `v` first. This is why `dist[v]` is final the moment it is set, and why following `parent` pointers back from any node spells out a fewest-edge path.",
        "The argument relies on every edge costing the same. With weights, a route with more edges can be cheaper, and the FIFO queue no longer hands out nodes in order of cost. Dijkstra's algorithm fixes exactly that by replacing the queue with a priority queue.",
      ),
    },
    {
      heading: "Worked example",
      body: body(
        "The visualizer opens on a 7-node undirected graph with edges A–B, A–C, B–C, B–D, B–E, C–D, C–F, D–E, D–F, E–G and F–G (weights hidden — BFS ignores them). Neighbours are examined in alphabetical order. Starting from A:",
        list(
          "Dequeue **A**: discover B and C at distance 1. Queue: B, C.",
          "Dequeue **B**: A and C are already seen; discover D and E at distance 2. Queue: C, D, E.",
          "Dequeue **C**: A, B and D are seen; discover F at distance 2. Queue: D, E, F.",
          "Dequeue **D**: every neighbour is already seen. Dequeue **E**: discover G at distance 3.",
          "Dequeue **F** and **G**: nothing new. The queue is empty, so BFS stops.",
        ),
        "The visit order is A, B, C, D, E, F, G, and the levels are {A}, {B, C}, {D, E, F}, {G}. The tree edges A–B, A–C, B–D, B–E, C–F and E–G form the BFS tree, which gives a fewest-edge route to every node — for example A → B → E → G for G.",
      ),
    },
    {
      heading: "BFS vs DFS",
      body: body(
        "Both visit every node and edge once, so both are O(V + E). They differ in the frontier they keep and in what they are good for:",
        list(
          "**Order**: BFS visits by distance from the start; DFS follows one path as deep as it can, then backtracks.",
          "**Memory**: BFS holds a whole level at once — on a star-shaped graph that is V − 1 nodes. DFS holds only the current path, O(depth).",
          "**Answers**: BFS gives shortest paths in unweighted graphs and levels; DFS gives discovery and finish times, which power cycle detection, topological sort and strongly connected components.",
        ),
        "On the demo graph, DFS from A dives down the single chain A → B → C → D → E → G → F, six edges deep, while the BFS tree is only three levels deep.",
      ),
    },
    {
      heading: "Common mistakes",
      body: list(
        "**Marking nodes as visited when they are dequeued instead of enqueued.** A node can then enter the queue once per incoming edge, wasting up to O(E) queue space and risking an overwritten `dist`. Mark it the moment you enqueue it.",
        "**Using a list as the queue.** In Python `list.pop(0)` shifts every element, costing O(n) per dequeue; use `collections.deque`.",
        "**Using BFS for weighted shortest paths.** It returns the route with the fewest edges, not the lowest total weight.",
        "**Forgetting disconnected graphs.** One BFS only reaches the start's component. Loop over all nodes and start a new BFS from each unseen one — the number of starts is the number of connected components.",
        "**Scanning an adjacency matrix.** Finding neighbours by scanning a row makes BFS O(V²) instead of O(V + E).",
      ),
    },
    {
      heading: "Where BFS is used",
      body: body(
        list(
          "**Grids and mazes**: each cell is a node and each move an edge, so BFS finds the minimum number of moves (knight moves, robot paths, word ladder).",
          "**Multi-source BFS**: enqueue several starts at distance 0 to get the distance to the nearest source, as in \"rotting oranges\" or nearest-hospital maps.",
          "**Bipartite check**: colour nodes by level parity; an edge between two nodes of the same colour reveals an odd cycle.",
          "**0-1 BFS**: with weights of only 0 and 1, a double-ended queue (push 0-edges to the front) replaces Dijkstra.",
          "**Level-order traversal** of a tree is BFS on a tree.",
        ),
        "Outside interviews, BFS powers web crawlers, \"people within two hops\" features on social networks, broadcast in computer networks, and Cheney's copying garbage collector, which copies live objects in breadth-first order.",
      ),
    },
  ],
  complexity: [
    { label: "Adjacency list", time: "O(V + E)", space: "O(V)", note: "Every node is enqueued and dequeued once; every adjacency list is scanned once (twice per undirected edge)." },
    { label: "Adjacency matrix", time: "O(V²)", space: "O(V)", note: "Listing a node's neighbours means scanning its whole row of V cells." },
    { label: "Grid of R × C cells", time: "O(R · C)", space: "O(R · C)", note: "Each cell has at most 4 neighbours, so E = O(V)." },
  ],
  code: py(GRAPH_CODE.bfs.python),
  faqs: [
    {
      q: "Does BFS find the shortest path?",
      a: "Yes, in an unweighted graph (or one where every edge has the same weight): the first time BFS reaches a node is along a fewest-edge path. With different weights use Dijkstra's algorithm, or 0-1 BFS when weights are only 0 and 1.",
    },
    {
      q: "What data structure does BFS use?",
      a: "A first-in, first-out queue, plus a seen set or distance array. Replacing the queue with a stack turns the traversal into a depth-first order.",
    },
    {
      q: "What is the time complexity of BFS?",
      a: "O(V + E) with an adjacency list, because every node is dequeued once and every edge examined once (twice if undirected). With an adjacency matrix it is O(V²). The queue and seen set need O(V) extra space.",
    },
    {
      q: "Why mark a node as visited when it is enqueued, not dequeued?",
      a: "Marking on enqueue guarantees each node enters the queue exactly once, so the queue never exceeds V entries and `dist` is set once, on a shortest route. Marking on dequeue lets the same node be queued once per incoming edge.",
    },
    {
      q: "How do I count connected components with BFS?",
      a: "Loop over every node; whenever you meet one that has not been seen, start a new BFS from it and add one to the count. The total work is still O(V + E).",
    },
  ],
  related: ["/graph/depth-first-search", "/graph/dijkstra", "/graph/topological-sort", "/stack-queue/queue", "/bst/tree-traversals", "/graph"],
  updated: UPDATED,
};

// ─────────────────────────────────── DFS ───────────────────────────────────

const DFS: TopicContent = {
  path: "/graph/depth-first-search",
  parent: "/graph",
  name: "Depth-First Search",
  title: "DFS Visualizer — Depth-First Search Step by Step",
  h1: "DFS Visualizer — Depth-First Search",
  description:
    "Depth-first search explores a graph by going as deep as possible, then backtracking. See DFS step by step with discovery and finish times, back edges and code.",
  keywords: [
    "dfs visualizer",
    "depth first search",
    "depth-first search algorithm",
    "dfs graph traversal",
    "dfs cycle detection",
    "dfs discovery and finish time",
    "dfs recursion stack",
  ],
  summary:
    "**Depth-first search (DFS)** is a graph traversal that follows one path as deep as it can, then backtracks to the most recent node that still has an unexplored edge. It uses recursion (the **call stack**) or an explicit stack and runs in **O(V + E)** time; the discovery and finish times it records are the basis of cycle detection, topological sorting and strongly connected components.",
  steps: [
    "Start a clock at `time = 0` and call `visit(s)` on the start node.",
    "In `visit(u)`, set `disc[u] = ++time` and push `u` onto the stack of nodes on the current path.",
    "For each neighbour `v` of `u`: if `v` is unvisited, call `visit(v)` — the edge u–v becomes a **tree edge**.",
    "If `v` is still on the stack, u–v is a **back edge** and closes a cycle; if `v` is already finished, skip it.",
    "When every neighbour is handled, set `fin[u] = ++time` and pop `u`: DFS backtracks to the node that called it.",
    "To cover a disconnected graph, start a new `visit` from every node that is still unvisited.",
  ],
  sections: [
    {
      heading: "How DFS backtracks",
      body: body(
        "Picture exploring a maze while unrolling a ball of thread: walk down a corridor until you hit a dead end or a room you have already seen, then wind the thread back to the last junction with an unexplored door. The thread is the **stack** — in a recursive implementation, the call stack itself.",
        "Only the current path needs to be remembered, so DFS uses O(depth) extra space, which is O(V) in the worst case (a graph shaped like a long path). That depth is also its main practical risk: Python's default recursion limit is 1000, so large graphs need `sys.setrecursionlimit` or an explicit stack. An iterative DFS that matches the recursive order pushes neighbours in reverse and marks a node visited when it is popped, not when it is pushed.",
      ),
    },
    {
      heading: "Worked example: discovery and finish times",
      body: body(
        "The page opens on the same 7-node undirected graph as the BFS page (edges A–B, A–C, B–C, B–D, B–E, C–D, C–F, D–E, D–F, E–G, F–G), with neighbours taken in alphabetical order. From A:",
        list(
          "A is discovered at time 1, B at 2, C at 3. C's neighbour A is still on the stack, so **C–A is a back edge** — it closes the triangle A–B–C.",
          "C goes on to D (4). D sees B on the stack (back edge D–B) and moves to E (5); E sees B (back edge E–B) and moves to G (6), and G moves to F (7).",
          "F's other neighbours C and D are both on the stack (back edges F–C and F–D). F has nowhere new to go, so it finishes at 8, then G at 9, E 10, D 11, C 12, B 13 and A 14.",
        ),
        "The visit order is A, B, C, D, E, G, F, and the DFS tree is a single path six edges deep — compare that with the three levels of the BFS tree on the same graph. There are 5 back edges, exactly E − (V − 1) = 11 − 6: in a connected undirected graph, every edge that is not in the DFS tree is a back edge and closes its own cycle.",
        "The times obey the **parenthesis property**: two intervals [disc, fin] are either nested or disjoint, and u is an ancestor of v exactly when u's interval contains v's — B's [2, 13] contains E's [5, 10].",
      ),
    },
    {
      heading: "Edge types and cycle detection",
      body: body(
        list(
          "**Tree edge**: leads to an unvisited node; together these form the DFS tree (or forest).",
          "**Back edge**: leads to an ancestor that is still on the stack. It is the only edge type that proves a cycle.",
          "**Forward and cross edges** (directed graphs only): lead to a node that has already finished — a descendant or a node in another branch. Neither closes a cycle.",
        ),
        "So a **directed** graph has a cycle exactly when DFS finds a back edge, which is why directed cycle detection tracks three states (unvisited, on the stack, finished) rather than a single visited flag. In an **undirected** graph every edge to an already visited node is a back edge, except the edge you just arrived on — skip the parent, or every edge will look like a cycle. Finish times matter too: reversed finish order of a DAG is a topological order, and Kosaraju's algorithm uses finish order to find strongly connected components.",
      ),
    },
    {
      heading: "Common mistakes",
      body: list(
        "**No parent check in undirected cycle detection**: the edge back to the parent is reported as a two-node cycle.",
        "**A single visited flag for directed cycle detection**: reaching a finished node through a cross edge is not a cycle; you need the on-stack (\"grey\") state.",
        "**Expecting shortest paths**: DFS finds a path, usually not the shortest one. Use BFS or Dijkstra for that.",
        "**Starting from one node only** on a disconnected graph, so whole components are never visited.",
        "**Stack overflow** on deep graphs — switch to an explicit stack.",
      ),
    },
    {
      heading: "Where DFS is used",
      body: body(
        "DFS is the workhorse behind many graph algorithms: cycle detection, topological sorting, strongly connected components (Kosaraju and Tarjan), bridges and articulation points (via low-link values), connected components and flood fill, and maze generation and solving. Preorder, inorder and postorder traversals of a binary tree are DFS on a tree, and backtracking search — N-queens, Sudoku, generating permutations — is DFS over an implicit tree of choices.",
        "Typical interview problems: number of islands, course schedule (is there a cycle?), clone a graph, all paths from source to target, and detecting a cycle in a directed graph.",
      ),
    },
  ],
  complexity: [
    { label: "Adjacency list", time: "O(V + E)", space: "O(V)", note: "Each node is visited once and each adjacency list scanned once." },
    { label: "Adjacency matrix", time: "O(V²)", space: "O(V)", note: "Listing a node's neighbours means scanning a row of V cells." },
    { label: "Path-shaped graph", time: "O(V + E)", space: "O(V)", note: "Recursion goes V levels deep — use an explicit stack for very deep graphs." },
  ],
  code: py(GRAPH_CODE.dfs.python),
  faqs: [
    {
      q: "Does DFS find the shortest path?",
      a: "No. DFS finds a path if one exists, but it follows whichever branch it meets first, so the path is usually not the shortest. Use BFS for unweighted graphs and Dijkstra for weighted ones.",
    },
    {
      q: "What data structure does DFS use?",
      a: "A stack: the call stack in a recursive implementation, or an explicit stack in an iterative one. It holds the current path from the start node.",
    },
    {
      q: "How does DFS detect a cycle?",
      a: "By finding a back edge — an edge to a node that is still on the current DFS path. In an undirected graph, ignore the edge leading back to the node you came from.",
    },
    {
      q: "What are discovery and finish times in DFS?",
      a: "The discovery time is when DFS first reaches a node; the finish time is when all of its descendants are done. Their intervals nest like parentheses, and sorting nodes by decreasing finish time gives a topological order of a DAG.",
    },
    {
      q: "Is DFS faster than BFS?",
      a: "Neither is asymptotically faster: both are O(V + E). DFS usually needs less memory on wide graphs, while BFS needs less on very deep ones; choose by the answer you need.",
    },
    {
      q: "Can DFS be implemented without recursion?",
      a: "Yes. Push the start node on an explicit stack; pop a node, skip it if it is already visited, otherwise mark it and push its unvisited neighbours (in reverse order to match the recursive order).",
    },
  ],
  related: ["/graph/breadth-first-search", "/graph/topological-sort", "/graph/strongly-connected-components", "/stack-queue/stack", "/bst/tree-traversals", "/graph"],
  updated: UPDATED,
};

// ───────────────────────────────── Dijkstra ─────────────────────────────────

const DIJKSTRA: TopicContent = {
  path: "/graph/dijkstra",
  parent: "/graph",
  name: "Dijkstra's Algorithm",
  title: "Dijkstra's Algorithm Visualizer — Shortest Paths",
  h1: "Dijkstra's Algorithm Visualizer",
  description:
    "Dijkstra's algorithm finds the shortest paths from one node in a graph with non-negative weights. Watch every relaxation step by step, with heap-based code.",
  keywords: [
    "dijkstra visualizer",
    "dijkstra's algorithm",
    "dijkstra shortest path",
    "dijkstra algorithm step by step",
    "dijkstra priority queue",
    "dijkstra negative weights",
    "dijkstra time complexity",
  ],
  summary:
    "**Dijkstra's algorithm** finds the shortest path from one source node to every other node in a graph whose edge weights are all **non-negative**. It repeatedly finalizes the unfinished node with the smallest tentative distance, taken from a **priority queue**, and relaxes that node's edges; with a binary heap it runs in **O((V + E) log V)** time.",
  steps: [
    "Set `dist[s] = 0` and every other `dist[v] = ∞`, and push `(0, s)` into a min-priority queue.",
    "Pop the entry with the smallest distance. If its node `u` is already finalized, the entry is stale — skip it.",
    "Finalize `u`: its distance can no longer improve.",
    "**Relax** each edge u → v with weight w: if `dist[u] + w < dist[v]`, set `dist[v] = dist[u] + w`, `parent[v] = u` and push `(dist[v], v)`.",
    "Repeat until the queue is empty, then follow `parent` pointers back from any node to read its shortest path.",
  ],
  sections: [
    {
      heading: "Why the greedy choice is safe",
      body: body(
        "Suppose `u` is the unfinished node with the smallest tentative distance d. Any other route to `u` has to leave the finalized set through some unfinished node x, and dist[x] ≥ d because u was the smallest. Every edge after that adds a non-negative amount, so the detour costs at least d. Therefore d is final, and Dijkstra never has to revisit a node.",
        "That one sentence — \"edges can only add\" — is the whole proof, and it is exactly what breaks when an edge is negative. It also shows how Dijkstra generalizes BFS: when every weight is 1, nodes come out of the priority queue in the same order a FIFO queue would produce.",
      ),
    },
    {
      heading: "Worked example",
      body: body(
        "The page opens on a 7-node undirected graph: A–B 4, A–C 2, B–C 1, B–D 5, B–E 9, C–D 8, C–F 10, D–E 3, D–F 2, E–G 1, F–G 6. From A:",
        list(
          "Finalize **A** (0): B = 4, C = 2.",
          "Finalize **C** (2): B improves from 4 to 3 through C; D = 10, F = 12.",
          "Finalize **B** (3): D improves from 10 to 8; E = 12.",
          "Finalize **D** (8): E improves from 12 to 11 and F from 12 to 10.",
          "Finalize **F** (10): G = 16. Finalize **E** (11): G improves to 12. Finalize **G** (12).",
        ),
        "Final distances: A 0, B 3, C 2, D 8, E 11, F 10, G 12. The cheapest route to G is A → C → B → D → E → G — five edges — while the three-edge route A → B → E → G costs 14. Fewest edges is not cheapest, which is precisely why BFS is not enough for weighted graphs.",
      ),
    },
    {
      heading: "Why Dijkstra fails with negative weights",
      body: body(
        "Take the directed graph A → B 2, A → C 5, C → B −4, B → D 3, D → E 1, C → E 8 (the Negative edge demo preset). Dijkstra finalizes B at distance 2 before it ever expands C, so the cheaper route A → C → B (5 − 4 = 1) arrives too late; D and E inherit the error and come out as 5 and 6 instead of 4 and 5. Bellman-Ford gets all of them right.",
        "Adding a constant to every weight to make them positive does not help: it penalizes paths with more edges, so the shortest path can change. Johnson's algorithm reweights correctly using potentials computed by Bellman-Ford, and on a DAG you can relax edges in topological order, which handles negative weights in O(V + E).",
      ),
    },
    {
      heading: "Implementation choices",
      body: list(
        "**Binary heap with lazy deletion** (the code below): push a new entry whenever a distance improves and skip stale entries when they are popped. O((V + E) log V) time; the heap can hold up to E entries.",
        "**Indexed heap with decrease-key**: the same time bound with at most V entries, at the cost of more code.",
        "**Plain array**: scan all nodes for the minimum each round — O(V²) total, which beats a heap on dense graphs where E ≈ V².",
        "**Fibonacci heap**: O(E + V log V) in theory, rarely faster in practice.",
        "**Single target**: stop as soon as the target is popped; A* goes further by adding a distance estimate to the key.",
      ),
    },
    {
      heading: "Common mistakes and where it is used",
      body: body(
        list(
          "**Finalizing a node when it is pushed** rather than when it is popped — the first distance found is often not the shortest (B was first reached at 4, but its real distance is 3).",
          "**Not skipping stale heap entries**, so finalized nodes are expanded again.",
          "**Overflow** in C++ or Java when computing `INF + w`; guard unreachable nodes or use a large-but-safe infinity.",
          "**Running it on negative weights** and trusting the result.",
        ),
        "Dijkstra (often with A* or contraction hierarchies on top) is behind road navigation, link-state routing protocols such as OSPF and IS-IS, and game path-finding. Interview favourites include network delay time, path with minimum effort, and swim in rising water, where grid cells are the nodes.",
      ),
    },
  ],
  complexity: [
    { label: "Binary heap (this code)", time: "O((V + E) log V)", space: "O(V + E)", note: "Each relaxation may push a heap entry; every push and pop costs O(log V)." },
    { label: "Array, no heap", time: "O(V²)", space: "O(V)", note: "V rounds, each scanning every node for the minimum — best for dense graphs." },
    { label: "Fibonacci heap", time: "O(E + V log V)", space: "O(V)", note: "Decrease-key is O(1) amortized; the constant factors are high." },
  ],
  code: py(GRAPH_CODE.dijkstra.python),
  faqs: [
    {
      q: "Does Dijkstra's algorithm work with negative weights?",
      a: "No. It finalizes nodes greedily, so a negative edge discovered later cannot correct a distance that is already final. Use Bellman-Ford for graphs with negative weights.",
    },
    {
      q: "Is Dijkstra's algorithm greedy?",
      a: "Yes. It always finalizes the closest unfinished node, and with non-negative weights that local choice is provably optimal.",
    },
    {
      q: "What is the time complexity of Dijkstra's algorithm?",
      a: "O((V + E) log V) with a binary heap, O(V²) with a simple array (better for dense graphs), and O(E + V log V) with a Fibonacci heap.",
    },
    {
      q: "What is the difference between Dijkstra and BFS?",
      a: "BFS uses a FIFO queue and minimizes the number of edges; Dijkstra uses a priority queue and minimizes total weight. With every weight equal to 1 they produce the same distances.",
    },
    {
      q: "Does Dijkstra work on undirected graphs?",
      a: "Yes — each undirected edge acts as two directed edges with the same weight. The weights must still be non-negative.",
    },
  ],
  related: ["/graph/bellman-ford", "/graph/breadth-first-search", "/graph/prim", "/heap/priority-queue", "/graph"],
  updated: UPDATED,
};

// ─────────────────────────────── Bellman-Ford ───────────────────────────────

const BELLMAN_FORD: TopicContent = {
  path: "/graph/bellman-ford",
  parent: "/graph",
  name: "Bellman-Ford Algorithm",
  title: "Bellman-Ford Visualizer — Negative Weights & Cycles",
  h1: "Bellman-Ford Algorithm Visualizer",
  description:
    "Bellman-Ford finds shortest paths even with negative edge weights and detects negative cycles. Watch each relaxation pass step by step, with O(V·E) code.",
  keywords: [
    "bellman ford visualizer",
    "bellman-ford algorithm",
    "bellman ford negative cycle detection",
    "shortest path with negative weights",
    "bellman ford vs dijkstra",
    "bellman ford time complexity",
  ],
  summary:
    "The **Bellman-Ford algorithm** computes shortest paths from one source node in a weighted directed graph, even when some edge weights are **negative**. It relaxes every edge V − 1 times, which is enough for every shortest path to settle, and if one extra pass can still improve a distance, a **negative cycle** is reachable. It runs in **O(V · E)** time.",
  steps: [
    "Set `dist[s] = 0` and every other distance to ∞.",
    "Repeat V − 1 times: for every edge u → v with weight w, if `dist[u] + w < dist[v]`, lower `dist[v]` and set `parent[v] = u`.",
    "If a whole pass changes nothing, stop early — every distance is already final.",
    "Run one more pass over all edges. If any edge can still be relaxed, a negative cycle is reachable from `s` and shortest paths are undefined.",
    "Otherwise `dist` holds the shortest distances; follow `parent` pointers to rebuild each path.",
  ],
  sections: [
    {
      heading: "Why V − 1 passes are enough",
      body: body(
        "After pass k, `dist[v]` is at most the cost of the cheapest path from s to v that uses **at most k edges**. A shortest path never repeats a node (if there is no negative cycle, a repeated loop would not make it cheaper), so it has at most V − 1 edges — and after V − 1 passes every such path has been fully relaxed, edge by edge.",
        "This is dynamic programming over the number of edges. The order of the edges inside a pass only changes how fast the distances converge — a lucky order can finish in a single pass — never the final answer.",
      ),
    },
    {
      heading: "Worked example with a negative edge",
      body: body(
        "The page opens on the directed graph A → B 2, A → C 5, C → B −4, B → D 3, D → E 1, C → E 8. Each pass relaxes the edges in the order A → B, A → C, B → D, C → B, C → E, D → E:",
        list(
          "**Pass 1**: B = 2, C = 5, D = 5 (through B). Then C → B gives 5 − 4 = 1, so B drops to 1. E becomes 13 through C, then 6 through D.",
          "**Pass 2**: B → D now gives 1 + 3 = 4 (D: 5 → 4), and D → E gives 5 (E: 6 → 5).",
          "**Pass 3**: nothing changes, so the algorithm stops after 3 of the allowed V − 1 = 4 passes.",
        ),
        "Result: B 1 via A → C → B, C 5, D 4, E 5. Dijkstra on the same graph finalizes B at 2 too early and reports D = 5 and E = 6 — run both in the visualizer and compare.",
      ),
    },
    {
      heading: "Negative cycles",
      body: body(
        "A **negative cycle** is a cycle whose weights add up to less than zero, such as B → C → D → B with weights −2, 3 and −3 (total −2). Every lap makes the route cheaper, so nodes reachable through it have no shortest path at all. Bellman-Ford detects this because after V − 1 passes some edge on the cycle can still be relaxed.",
        "To print the cycle, take a node relaxed in the extra pass, follow `parent` pointers V times to be sure you are inside the cycle, then follow them until you return to the same node. Only cycles reachable from s are detected; to find any negative cycle, add a virtual source with a 0-weight edge to every node. In an undirected graph one negative edge is already a negative cycle (u → v → u), so Bellman-Ford is really a directed-graph algorithm.",
      ),
    },
    {
      heading: "Bellman-Ford vs Dijkstra",
      body: list(
        "**Weights**: Bellman-Ford accepts any weights; Dijkstra needs every weight ≥ 0.",
        "**Speed**: O(V · E) versus O((V + E) log V) — on large graphs Dijkstra is dramatically faster.",
        "**Negative cycles**: Bellman-Ford detects them; Dijkstra silently gives wrong answers.",
        "**Structure**: Bellman-Ford just loops over an edge list, which makes it easy to distribute: its \"tell your neighbours your distance\" rule is the basis of distance-vector routing (RIP), while Dijkstra underlies link-state routing (OSPF).",
        "**SPFA**, a queue-based variant that only re-relaxes edges out of nodes whose distance changed, is often faster on average but has the same O(V · E) worst case.",
      ),
    },
    {
      heading: "Common mistakes and uses",
      body: body(
        list(
          "**Relaxing from unreachable nodes**: in C++ or Java, `INF + w` with a negative w looks like an improvement (or overflows). Skip edges whose source distance is still infinite.",
          "**Skipping the extra pass**, so negative cycles go unnoticed and the distances are garbage.",
          "**Using it on undirected graphs with negative edges**, where every negative edge is a cycle.",
        ),
        "Real uses: currency arbitrage (weight each exchange by −log(rate); a negative cycle is a profitable loop), systems of difference constraints (x_j − x_i ≤ w), Johnson's all-pairs algorithm, and the interview problem \"cheapest flights within K stops\", which runs K + 1 passes using a copy of the previous pass's distances.",
      ),
    },
  ],
  complexity: [
    { label: "Worst case", time: "O(V · E)", space: "O(V)", note: "V − 1 passes over all E edges, plus one check pass." },
    { label: "Best case (early exit)", time: "O(E)", space: "O(V)", note: "If the first pass settles every distance, the second changes nothing and the loop stops." },
    { label: "Dense graph", time: "O(V³)", space: "O(V)", note: "E can be close to V², so the worst case becomes cubic." },
  ],
  code: py(GRAPH_CODE.bellmanFord.python),
  faqs: [
    {
      q: "Why does Bellman-Ford run V − 1 times?",
      a: "A shortest path without cycles has at most V − 1 edges, and each pass extends the correctly computed paths by at least one edge. After V − 1 passes every shortest path is complete.",
    },
    {
      q: "Can Bellman-Ford handle negative weights?",
      a: "Yes, as long as no negative cycle is reachable from the source — and if one is, Bellman-Ford reports it instead of returning wrong distances.",
    },
    {
      q: "How does Bellman-Ford detect a negative cycle?",
      a: "It runs one extra pass after the V − 1 normal ones. If any edge can still lower a distance, the distances never settle, which only happens when a reachable negative cycle exists.",
    },
    {
      q: "Is Bellman-Ford greedy or dynamic programming?",
      a: "Dynamic programming: after pass k it knows the cheapest path to every node using at most k edges, building each answer from the previous pass.",
    },
    {
      q: "When should I use Bellman-Ford instead of Dijkstra?",
      a: "When the graph has negative edge weights or you need to detect negative cycles. With only non-negative weights, Dijkstra gives the same answer much faster.",
    },
  ],
  related: ["/graph/dijkstra", "/graph/topological-sort", "/graph/breadth-first-search", "/graph"],
  updated: UPDATED,
};

// ───────────────────────────────── Kruskal ─────────────────────────────────

const KRUSKAL: TopicContent = {
  path: "/graph/kruskal",
  parent: "/graph",
  name: "Kruskal's Algorithm",
  title: "Kruskal's Algorithm Visualizer — Minimum Spanning Tree",
  h1: "Kruskal's Algorithm Visualizer",
  description:
    "Kruskal's algorithm builds a minimum spanning tree by adding the cheapest edges that don't form a cycle, using union-find. Watch it step by step, with code.",
  keywords: [
    "kruskal visualizer",
    "kruskal's algorithm",
    "minimum spanning tree",
    "kruskal algorithm step by step",
    "union find kruskal",
    "kruskal vs prim",
    "mst visualizer",
  ],
  summary:
    "**Kruskal's algorithm** finds a **minimum spanning tree (MST)** — the cheapest set of edges that connects every node of a weighted, undirected graph without forming a cycle. It sorts the edges by weight and adds each one unless its endpoints are already connected, which a **union-find** structure checks in nearly constant time. It runs in **O(E log E)** time, dominated by the sort.",
  steps: [
    "Sort all edges by weight, cheapest first.",
    "Put every node in its own set: a forest of V one-node trees.",
    "Take the next edge (u, v). If `find(u) ≠ find(v)`, it joins two different trees: add it to the MST and `union` the two sets.",
    "If `find(u) = find(v)`, u and v are already connected, so the edge would close a cycle — skip it.",
    "Stop once the MST has V − 1 edges. If the edges run out first, the graph is disconnected and the result is a minimum spanning forest.",
  ],
  sections: [
    {
      heading: "Why the cheapest safe edge is always right",
      body: body(
        "The proof rests on the **cut property**: split the nodes into any two groups, and the cheapest edge crossing between them belongs to some minimum spanning tree. When Kruskal accepts (u, v), look at the cut that separates u's current tree from everything else. Every cheaper edge has already been processed: those taken lie inside trees, and those skipped joined nodes of one tree, so none of them crosses this cut. (u, v) is the cheapest crossing edge, so taking it is safe.",
        "The mirror image is the **cycle property**: the most expensive edge on any cycle is never needed, which is exactly the kind of edge Kruskal skips.",
      ),
    },
    {
      heading: "Worked example",
      body: body(
        "The page opens on a 7-node graph whose 11 edges, sorted, are: B–C 1, E–G 1, A–C 2, D–F 2, D–E 3, A–B 4, B–D 5, F–G 6, C–D 8, B–E 9, C–F 10. Ties are broken alphabetically.",
        list(
          "Take **B–C 1**, **E–G 1**, **A–C 2**, **D–F 2** and **D–E 3** — each joins two different sets. Two trees remain: {A, B, C} and {D, E, F, G}.",
          "**A–B 4**: A and B are already in the same set, so this edge would close the triangle A–B–C. Skip it.",
          "**B–D 5** joins the two trees. The MST now has 6 = V − 1 edges, so Kruskal stops without even looking at F–G, C–D, B–E or C–F.",
        ),
        "Total weight: 1 + 1 + 2 + 2 + 3 + 5 = **14**. In the visualizer each union-find set has its own colour, so you can watch the forest merge into one tree.",
      ),
    },
    {
      heading: "Union-find, the engine inside Kruskal",
      body: body(
        "Union-find (a disjoint-set forest) keeps a parent pointer per node; the root of a node's tree identifies its set. Two small optimizations make it extremely fast: **path compression** (during `find`, point every visited node straight at the root) and **union by size or rank** (hang the smaller tree under the larger). Together they give an amortized cost of O(α(V)) per operation, where α is the inverse Ackermann function — at most 4 for any input that fits in the universe.",
        "Without them a single `find` can take O(V), and checking cycles with a fresh DFS for every edge would make Kruskal O(E · V).",
      ),
    },
    {
      heading: "Kruskal vs Prim",
      body: list(
        "**Same answer**: both find a spanning tree of minimum total weight. When all weights are distinct the MST is unique; with ties they may pick different edges of equal total weight.",
        "**Kruskal** works globally on a sorted edge list and merges a forest. It is ideal for sparse graphs, for edges that arrive already sorted, and it produces a minimum spanning forest of a disconnected graph for free.",
        "**Prim** grows one tree from a start node using a priority queue of crossing edges: O(E log V) with a binary heap, or O(V²) with a plain array, which wins on dense graphs.",
        "Since E ≤ V², log E ≤ 2 log V, so O(E log E) and O(E log V) are the same class.",
      ),
    },
    {
      heading: "Common mistakes and uses",
      body: body(
        list(
          "**Running it on a directed graph.** MSTs are defined for undirected graphs; the directed version (minimum arborescence) needs the Chu–Liu/Edmonds algorithm.",
          "**Not checking connectivity.** If fewer than V − 1 edges were taken, there is no spanning tree.",
          "**Worrying about negative weights.** They are fine: only the relative order of the weights matters. For a maximum spanning tree, sort in descending order.",
        ),
        "Uses: designing networks of cables, pipes or roads with minimum total length; single-linkage clustering (stop when k sets remain, which is the same as deleting the k − 1 heaviest MST edges); the MST-based 2-approximation for metric travelling salesman; and graph-based image segmentation.",
      ),
    },
  ],
  complexity: [
    { label: "Sort the edges", time: "O(E log E)", space: "O(E)", note: "The dominant cost; skip it if the edges are already sorted." },
    { label: "Union-find operations", time: "O(E · α(V))", space: "O(V)", note: "α(V) ≤ 4 in practice, so this part is effectively linear." },
    { label: "Total", time: "O(E log E) = O(E log V)", space: "O(V + E)", note: "log E ≤ 2 log V because E ≤ V²." },
  ],
  code: py(GRAPH_CODE.kruskal.python),
  faqs: [
    {
      q: "What is a minimum spanning tree?",
      a: "A set of V − 1 edges that connects every node of a connected, weighted, undirected graph with no cycles and the smallest possible total weight.",
    },
    {
      q: "Why does Kruskal's algorithm use union-find?",
      a: "To check in near-constant time whether an edge's endpoints are already connected. If they are, adding the edge would create a cycle, so it is skipped.",
    },
    {
      q: "Is Kruskal's algorithm greedy?",
      a: "Yes: it always takes the cheapest remaining edge that does not form a cycle, and the cut property proves that this greedy choice always leads to a minimum spanning tree.",
    },
    {
      q: "Does Kruskal's algorithm work with negative edge weights?",
      a: "Yes. Kruskal only compares weights with each other, so negative values are handled exactly like positive ones.",
    },
    {
      q: "Is the minimum spanning tree unique?",
      a: "It is unique when all edge weights are distinct. With equal weights there can be several different MSTs, all with the same total weight.",
    },
  ],
  related: ["/graph/prim", "/graph/dijkstra", "/sorting", "/graph"],
  updated: UPDATED,
};

// ─────────────────────────────────── Prim ───────────────────────────────────

const PRIM: TopicContent = {
  path: "/graph/prim",
  parent: "/graph",
  name: "Prim's Algorithm",
  title: "Prim's Algorithm Visualizer — Minimum Spanning Tree",
  h1: "Prim's Algorithm Visualizer",
  description:
    "Prim's algorithm grows a minimum spanning tree from one node by always adding the cheapest edge leaving the tree. Watch it step by step, with heap-based code.",
  keywords: [
    "prim visualizer",
    "prim's algorithm",
    "prim's algorithm minimum spanning tree",
    "prim algorithm step by step",
    "prim vs kruskal",
    "prim priority queue",
    "prim time complexity",
  ],
  summary:
    "**Prim's algorithm** builds a **minimum spanning tree** of a weighted, undirected graph by growing a single tree from a start node: at every step it adds the cheapest edge that connects a node inside the tree to a node outside it. With a binary-heap priority queue it runs in **O(E log V)** time; with a plain array it runs in O(V²), which is better for dense graphs.",
  steps: [
    "Start the tree with one node `s` and push all of its edges into a min-priority queue.",
    "Pop the cheapest edge. If its far end is already in the tree, discard it — it no longer leaves the tree.",
    "Otherwise add the edge and its far end `b` to the tree.",
    "Push every edge from `b` to a node that is still outside the tree.",
    "Repeat until all V nodes are in the tree. If the queue empties first, the graph is disconnected and only the start's component is spanned.",
  ],
  sections: [
    {
      heading: "Why the cheapest crossing edge is safe",
      body: body(
        "At every moment the nodes are split into two groups: the tree and the rest. By the **cut property**, the cheapest edge crossing that split belongs to some minimum spanning tree, so adding it can never be a mistake. Prim simply applies this rule V − 1 times, each time to the cut between the growing tree and the remaining nodes.",
        "Because the tree is always connected, Prim never needs union-find: an edge can only close a cycle if both of its ends are already in the tree, and those edges are exactly the ones it discards.",
      ),
    },
    {
      heading: "Worked example",
      body: body(
        "The page opens on a 7-node graph: A–B 4, A–C 2, B–C 1, B–D 5, B–E 9, C–D 8, C–F 10, D–E 3, D–F 2, E–G 1, F–G 6. Starting from A:",
        list(
          "Tree {A}. Crossing edges: A–C 2, A–B 4. Take **A–C 2**.",
          "Tree {A, C}. Crossing: B–C 1, A–B 4, C–D 8, C–F 10. Take **B–C 1**.",
          "Tree {A, B, C}. A–B now lies inside the tree. Crossing: B–D 5, C–D 8, B–E 9, C–F 10. Take **B–D 5**.",
          "Tree {A, B, C, D}. Now D–F 2 and D–E 3 cross the cut: take **D–F 2**, then **D–E 3**, then **E–G 1**.",
        ),
        "The result — A–C, B–C, B–D, D–F, D–E, E–G with total weight **14** — is the same tree Kruskal finds, built in a different order. Notice that Prim takes B–D 5 before the cheaper D–F 2 and E–G 1: it only ever sees edges that touch its own tree.",
      ),
    },
    {
      heading: "Prim vs Dijkstra: same skeleton, different key",
      body: body(
        "Both algorithms pop the \"closest\" outside node from a priority queue and then update its neighbours. The only difference is what \"closest\" means. Dijkstra's key is the total distance from the source, `dist[u] + w`; Prim's key is the weight of the single edge that would attach the node to the tree, `w`.",
        "That small change builds different trees. In a triangle with A–B 3, A–C 3 and B–C 2, Dijkstra from A keeps A–B and A–C (each node is 3 away from A, total weight 6), while Prim keeps B–C and one of the 3-edges (total weight 5). A shortest-path tree minimizes each node's distance to the root; a minimum spanning tree minimizes the sum of all edges.",
      ),
    },
    {
      heading: "Implementation choices",
      body: list(
        "**Lazy heap of edges** (the code below): push edges as nodes join and discard stale ones when popped. Each edge is pushed at most once, so it runs in O(E log E) = O(E log V).",
        "**Eager version with an indexed heap**: keep, for each outside node, only its cheapest connecting edge and lower it with decrease-key. Same bound, at most V heap entries.",
        "**Array version**: keep `key[v]` for every outside node and scan for the minimum each round — O(V²) with no heap at all, which is optimal for dense graphs such as all-pairs distances between points.",
        "The visualizer rescans every crossing edge each round so you can see them all highlighted; that is slower, but the chosen edges are identical.",
      ),
    },
    {
      heading: "Common mistakes and uses",
      body: body(
        list(
          "**Using Dijkstra's key** (`dist[u] + w`) and getting a shortest-path tree instead of an MST.",
          "**Forgetting to discard stale edges** whose far end is already in the tree, which creates cycles.",
          "**Disconnected graphs**: Prim only spans the start node's component. Restart from an unreached node to build a spanning forest.",
          "**Directed graphs**: MSTs are defined for undirected graphs only.",
        ),
        "Prim shines on dense graphs: building a minimum network between points where every pair can be connected, clustering, and randomized Prim is a classic maze generator. Any start node gives a spanning tree of the same minimum total weight.",
      ),
    },
  ],
  complexity: [
    { label: "Binary heap (this code)", time: "O(E log V)", space: "O(V + E)", note: "Each edge enters and leaves the heap at most once; heap operations cost O(log E) = O(log V)." },
    { label: "Array (dense graphs)", time: "O(V²)", space: "O(V)", note: "Scan the cheapest connecting edge of every outside node each round — no heap needed." },
    { label: "Fibonacci heap", time: "O(E + V log V)", space: "O(V)", note: "Decrease-key is O(1) amortized." },
  ],
  code: py(GRAPH_CODE.prim.python),
  faqs: [
    {
      q: "What is the difference between Prim's and Kruskal's algorithm?",
      a: "Prim grows one connected tree from a start node, always adding the cheapest edge leaving it; Kruskal sorts all edges and merges a forest with union-find. Both produce a minimum spanning tree of the same total weight.",
    },
    {
      q: "Does Prim's algorithm work with negative edge weights?",
      a: "Yes. The cut property only depends on comparing weights, so negative edges are handled correctly.",
    },
    {
      q: "Why does Prim's algorithm need a start node?",
      a: "Because it grows a single tree outward from one node. Any start node works: the edges may be added in a different order, but the total weight of the result is always the minimum.",
    },
    {
      q: "Is Prim's algorithm the same as Dijkstra's?",
      a: "No. They share the priority-queue loop, but Prim ranks nodes by the weight of one connecting edge while Dijkstra ranks them by total distance from the source, so they build different trees.",
    },
    {
      q: "What is the time complexity of Prim's algorithm?",
      a: "O(E log V) with a binary heap, O(V²) with an adjacency matrix and a plain array, and O(E + V log V) with a Fibonacci heap.",
    },
  ],
  related: ["/graph/kruskal", "/graph/dijkstra", "/heap/priority-queue", "/graph"],
  updated: UPDATED,
};

// ───────────────────────────── Topological sort ─────────────────────────────

const TOPO: TopicContent = {
  path: "/graph/topological-sort",
  parent: "/graph",
  name: "Topological Sort",
  title: "Topological Sort Visualizer — Kahn's Algorithm",
  h1: "Topological Sort Visualizer",
  description:
    "A topological sort orders the nodes of a DAG so every edge points forward. Watch Kahn's algorithm step by step, see why cycles block it, and get the code.",
  keywords: [
    "topological sort visualizer",
    "topological sort",
    "kahn's algorithm",
    "topological ordering of a dag",
    "topological sort cycle detection",
    "topological sort dfs",
    "course schedule topological sort",
  ],
  summary:
    "A **topological sort** of a directed graph lists its nodes so that every edge u → v has u before v — for example, an order in which to take courses so that every prerequisite comes first. One exists exactly when the graph is a **DAG** (it has no directed cycle). **Kahn's algorithm** builds it in **O(V + E)** time by repeatedly removing a node with no remaining incoming edges, and reports a cycle if it gets stuck.",
  steps: [
    "Count the **in-degree** of every node: how many edges point into it.",
    "Put every node with in-degree 0 into a queue — nothing has to come before them.",
    "Dequeue a node `u` and append it to the order.",
    "For each edge u → v, decrement `indeg[v]`; when it reaches 0, all of v's prerequisites are placed, so enqueue `v`.",
    "Repeat until the queue is empty. If fewer than V nodes were output, the rest lie on or behind a cycle and no topological order exists.",
  ],
  sections: [
    {
      heading: "Intuition: peel off nodes with no prerequisites",
      body: body(
        "A node with in-degree 0 depends on nothing, so it can safely go first. Remove it together with its outgoing edges and you are left with a smaller DAG — which again has at least one node with in-degree 0. (If every node had an incoming edge, you could walk backwards along those edges forever, and in a finite graph that walk must eventually repeat a node: a cycle.) Repeating the peel produces a complete order.",
        "Kahn's algorithm does the peeling without actually deleting anything: it just decrements in-degree counters and keeps a queue of nodes whose counter has reached 0.",
      ),
    },
    {
      heading: "Worked example",
      body: body(
        "The page opens on a DAG of prerequisites: F → A, F → C, B → C, A → D, C → D, D → E, B → G, G → E. The in-degrees are A 1, B 0, C 2, D 2, E 2, F 0, G 1.",
        list(
          "The queue starts with **B** and **F** (ties are taken alphabetically).",
          "Output **B**: C drops to 1 and G to 0, so G joins the queue.",
          "Output **F**: A and C both drop to 0 and join the queue.",
          "Output **G** (E drops to 1), then **A** (D drops to 1), then **C** (D drops to 0 and joins).",
          "Output **D** (E drops to 0), then **E**.",
        ),
        "The order is **B, F, G, A, C, D, E**, and every arrow points from left to right. It is not the only valid answer — F, B, A, C, D, G, E works too. A DAG has a unique topological order only when it contains a path through all of its nodes, in which case the queue never holds more than one node.",
      ),
    },
    {
      heading: "Cycles: when no order exists",
      body: body(
        "Take the directed graph A → B, B → C, C → D, D → B, A → E, E → D: Kahn's algorithm outputs A and E, then stops: B, C and D each keep an incoming edge from inside the cycle B → C → D → B, so none of their counters ever reaches 0.",
        "That makes \"did we output all V nodes?\" a free cycle detector, and it is the standard answer to questions like \"can all the courses be finished?\". Nodes that are not on a cycle but depend on one are also left out, because their prerequisites are never completed.",
      ),
    },
    {
      heading: "The DFS alternative",
      body: body(
        "Topological order can also come from depth-first search: run DFS over every node, append each node to a list when it **finishes**, and reverse the list. It works because for every edge u → v in a DAG, v finishes before u. If DFS meets a back edge (a node still on the stack), there is a cycle.",
        "Both versions are O(V + E). Kahn's algorithm is iterative (no recursion limits), detects cycles naturally, and can return the lexicographically smallest order if you swap its queue for a min-heap. The DFS version is shorter if you already have a DFS, and it is the first half of Kosaraju's SCC algorithm.",
      ),
    },
    {
      heading: "Where topological sorting is used",
      body: body(
        list(
          "**Build systems and package managers**: compile or install every dependency before the things that need it (make, Bazel, npm, apt).",
          "**Spreadsheets** recalculate cells in topological order of their formulas; data pipelines such as Airflow run task DAGs.",
          "**Scheduling**: course plans, project tasks and the critical path method, where the longest path through the DAG gives the minimum project duration.",
          "**Dynamic programming on DAGs**: relaxing edges in topological order gives shortest or longest paths in O(V + E), even with negative weights.",
        ),
        "Interview classics: Course Schedule I and II, Alien Dictionary, Parallel Courses (the number of BFS \"layers\" is the minimum number of semesters), and Sequence Reconstruction.",
      ),
    },
  ],
  complexity: [
    { label: "Kahn's algorithm", time: "O(V + E)", space: "O(V)", note: "Each node is enqueued once and each edge lowers one in-degree once." },
    { label: "DFS (reverse finish order)", time: "O(V + E)", space: "O(V)", note: "One DFS over every node and edge." },
    { label: "Lexicographically smallest order", time: "O(V log V + E)", space: "O(V)", note: "Replace the queue with a min-heap." },
  ],
  code: py(GRAPH_CODE.topo.python),
  faqs: [
    {
      q: "Can a graph with a cycle be topologically sorted?",
      a: "No. Nodes on a cycle would each have to come before the others. Kahn's algorithm detects this when it outputs fewer than V nodes.",
    },
    {
      q: "Is the topological order unique?",
      a: "Usually not: whenever two nodes are ready at the same time, either can go first. The order is unique only if the DAG has a path that visits every node.",
    },
    {
      q: "What is the time complexity of topological sort?",
      a: "O(V + E) for both Kahn's algorithm and the DFS version, with O(V) extra space.",
    },
    {
      q: "Should I use Kahn's algorithm or DFS for topological sort?",
      a: "Kahn's algorithm is iterative, reports cycles directly and makes it easy to choose among ready nodes (for example, the smallest first). The DFS version is shorter if you already have DFS code. Both are O(V + E).",
    },
    {
      q: "Does topological sort work on undirected graphs?",
      a: "No. An undirected edge has no direction to respect, and any undirected edge already forms a two-way dependency. Topological order is defined for directed acyclic graphs only.",
    },
  ],
  related: ["/graph/depth-first-search", "/graph/strongly-connected-components", "/graph/breadth-first-search", "/graph/bellman-ford", "/graph"],
  updated: UPDATED,
};

// ──────────────────────── Strongly connected components ────────────────────────

const SCC: TopicContent = {
  path: "/graph/strongly-connected-components",
  parent: "/graph",
  name: "Strongly Connected Components",
  question: "What are strongly connected components?",
  title: "Strongly Connected Components Visualizer — Kosaraju",
  h1: "Strongly Connected Components Visualizer",
  description:
    "Strongly connected components are groups of nodes in a directed graph that can all reach each other. Watch Kosaraju's algorithm find them step by step.",
  keywords: [
    "strongly connected components",
    "scc visualizer",
    "kosaraju's algorithm",
    "kosaraju algorithm step by step",
    "tarjan's algorithm scc",
    "condensation graph",
  ],
  summary:
    "A **strongly connected component (SCC)** of a directed graph is a maximal group of nodes in which every node can reach every other one by following the arrows. Every directed graph splits into SCCs in exactly one way, and shrinking each SCC to a single node leaves a DAG. **Kosaraju's algorithm** finds them in **O(V + E)** with two depth-first searches: one on the graph to get the finish order, and one on the reversed graph in reverse finish order.",
  steps: [
    "Run DFS over the whole graph and push each node onto a stack when it **finishes**.",
    "Build the **transpose** graph Gᵀ by reversing every edge.",
    "Take nodes in reverse finish order (the last to finish first). If a node has no component yet, start a DFS from it in Gᵀ.",
    "Every node that this DFS reaches belongs to one new component.",
    "Continue until every node has a component number.",
  ],
  sections: [
    {
      heading: "Why reversing the edges works",
      body: body(
        "Collapse every SCC into a single node and you get the **condensation**, which is always a DAG (if two components could reach each other, they would be one component). The key lemma: if an edge leads from component C to component C′, then some node of C finishes later in the first DFS than every node of C′. So the node that finishes last overall lies in a **source** component — one that no other component can reach.",
        "Reversing every edge turns that source into a **sink**: a DFS started from it in Gᵀ cannot escape, so it collects exactly that one component. Mark it as done, take the next unassigned node in reverse finish order, which lies in a source of what remains, and repeat. Each second-pass search peels off exactly one SCC.",
      ),
    },
    {
      heading: "Worked example",
      body: body(
        "The page opens on three clusters joined by one-way bridges: A → B, B → C, C → A, C → D, D → E, E → D, E → F, F → G, G → H, H → F.",
        list(
          "**Pass 1**: DFS from A runs A → B → C → D → E → F → G → H. Nodes finish in the order H, G, F, E, D, C, B, A, so A finishes last.",
          "**Reverse every edge.** The bridge C → D becomes D → C, so a search starting at A can no longer cross it.",
          "**Pass 2** from A in Gᵀ reaches C and B: component **{A, B, C}**. The next unassigned node in reverse finish order is D, which reaches E: **{D, E}**. Finally F reaches H and G: **{F, G, H}**.",
        ),
        "The condensation is the chain {A, B, C} → {D, E} → {F, G, H}: inside a cluster you can go anywhere, but once you cross a one-way bridge there is no way back.",
      ),
    },
    {
      heading: "Kosaraju vs Tarjan",
      body: body(
        "**Tarjan's algorithm** finds the same components with a single DFS. It gives every node a discovery index and a **low-link** value — the smallest index it can reach, through its subtree and one more edge, among nodes still on the stack — and keeps visited nodes on a stack; when a node's low-link equals its own index, it is the root of an SCC and everything above it on the stack is popped off as one component. Tarjan needs no transposed graph, so it uses less memory and is usually faster in practice, and it outputs components in reverse topological order.",
        "**Kosaraju's algorithm** is easier to understand and to get right: two plain DFS passes and an edge reversal. Both run in O(V + E). The same low-link idea also finds bridges and articulation points in undirected graphs.",
      ),
    },
    {
      heading: "Common mistakes",
      body: list(
        "**Running the second pass on the original graph** instead of the transpose: the search leaks across bridges and merges components.",
        "**Using discovery order or plain finish order** instead of reverse finish order for the second pass.",
        "**Confusing SCCs with weakly connected components**, which ignore edge direction and can be found with plain BFS or union-find.",
        "**Deep recursion** on large graphs: both passes may need an explicit stack.",
        "**Forgetting single nodes**: a node on no cycle is an SCC by itself, so in a DAG every node is its own component.",
      ),
    },
    {
      heading: "Where SCCs are used",
      body: list(
        "**2-SAT**: build the implication graph; the formula is satisfiable exactly when no variable x shares an SCC with ¬x.",
        "**Dependency analysis**: every SCC with more than one node is a circular dependency between modules or packages, and mutually recursive functions form SCCs of a program's call graph.",
        "**Condensation + DP**: collapsing SCCs turns any directed graph into a DAG, so topological sort and DAG dynamic programming can run on it.",
        "**Network analysis**: the web graph's famous \"bow-tie\" shape has a giant SCC at its core; SCCs also reveal groups of accounts that all follow each other.",
        "**Model checking and deadlock detection**: cycles of states or of processes waiting on each other appear as non-trivial SCCs.",
      ),
    },
  ],
  complexity: [
    { label: "Kosaraju (two DFS passes)", time: "O(V + E)", space: "O(V + E)", note: "Each pass visits every node and edge once; the reversed graph needs its own adjacency lists." },
    { label: "Tarjan (one DFS)", time: "O(V + E)", space: "O(V)", note: "Low-link values replace the second pass and the transposed graph." },
    { label: "Build the condensation", time: "O(V + E)", space: "O(V + E)", note: "One more pass over the edges, keeping those between different components." },
  ],
  code: py(GRAPH_CODE.scc.python),
  faqs: [
    {
      q: "What is the difference between strongly and weakly connected components?",
      a: "In a strongly connected component every node can reach every other node following edge directions. A weakly connected component only requires a connection when directions are ignored.",
    },
    {
      q: "Why does Kosaraju's algorithm reverse the graph?",
      a: "Reversing the edges turns the component that finished last into a sink, so a DFS started there in the reversed graph stays inside that one component instead of leaking into components downstream.",
    },
    {
      q: "Kosaraju or Tarjan — which is better?",
      a: "Both are O(V + E). Tarjan uses one DFS and no transposed graph, so it is usually faster and lighter; Kosaraju is simpler to understand and implement correctly.",
    },
    {
      q: "Is a single node a strongly connected component?",
      a: "Yes. A node that lies on no cycle forms an SCC on its own, which is why every node of a DAG is its own component.",
    },
    {
      q: "What is a condensation graph?",
      a: "The graph you get by shrinking each SCC to a single node and keeping the edges between different components. It is always a DAG, so it can be topologically sorted.",
    },
  ],
  related: ["/graph/depth-first-search", "/graph/topological-sort", "/graph/breadth-first-search", "/graph"],
  updated: UPDATED,
};

export const GRAPH_TOPICS: TopicContent[] = [HUB, BFS, DFS, DIJKSTRA, BELLMAN_FORD, KRUSKAL, PRIM, TOPO, SCC];
