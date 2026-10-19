/*
 * Real, runnable implementations of every graph algorithm the page animates — Python, C++17,
 * Java and JavaScript — on an adjacency-list graph keyed by node label ("A", "B", …), written
 * with the SAME structure and names as the pseudocode (dist, seen, queue, disc / fin, PQ,
 * finalized, changed, find / union, tree / C, indeg / Q / order, dfs1 / dfs2 / comp …).
 *
 * Conventions shared with the animation: neighbour lists are in label order, Dijkstra's heap
 * breaks distance ties by label, Kruskal's sort is stable. With those inputs every snippet
 * produces exactly the numbers the canvas shows.
 *
 * Verified by a scratchpad harness that runs each snippet (python3, node, g++ -std=c++17,
 * javac + java) on random graphs and compares with the step recorders.
 * No `${` and no backticks inside the snippets, so the text stays literal.
 */
import type { CodeLang } from "@/components/visualizer";
import type { AlgoKey } from "../types";

type Snippets = Record<CodeLang, string>;

const trim = (s: string) => s.replace(/^\n/, "");

// ───────────────────────────────── BFS ─────────────────────────────────

const BFS: Snippets = {
  python: `
from collections import deque


def bfs(graph, s):
    """graph: {node: [neighbours]}. Returns dist[v] = fewest edges from s to v."""
    dist = {s: 0}
    seen = {s}
    queue = deque([s])
    while queue:                        # while queue not empty
        u = queue.popleft()             # u <- queue.dequeue()
        for v in graph[u]:              # each neighbour v of u
            if v not in seen:
                dist[v] = dist[u] + 1
                seen.add(v)
                queue.append(v)
            # else: v was already seen - skip it
    return dist
`,
  cpp: `
#include <map>
#include <queue>
#include <set>
#include <string>
#include <vector>
using namespace std;

using Graph = map<string, vector<string>>;  // node -> neighbours

// Returns dist[v] = fewest edges from s to v (reachable nodes only).
map<string, int> bfs(const Graph& graph, const string& s) {
    map<string, int> dist{{s, 0}};
    set<string> seen{s};
    queue<string> q;                         // the queue
    q.push(s);
    while (!q.empty()) {
        string u = q.front();                // u <- queue.dequeue()
        q.pop();
        for (const string& v : graph.at(u)) {
            if (!seen.count(v)) {
                dist[v] = dist[u] + 1;
                seen.insert(v);
                q.push(v);
            }
            // else: v was already seen - skip it
        }
    }
    return dist;
}
`,
  java: `
import java.util.*;

class BFS {
    // graph: node -> neighbours. Returns dist[v] = fewest edges from s to v.
    static Map<String, Integer> bfs(Map<String, List<String>> graph, String s) {
        Map<String, Integer> dist = new HashMap<>(Map.of(s, 0));
        Set<String> seen = new HashSet<>(Set.of(s));
        Queue<String> queue = new ArrayDeque<>(List.of(s));
        while (!queue.isEmpty()) {
            String u = queue.poll();             // u <- queue.dequeue()
            for (String v : graph.get(u)) {
                if (!seen.contains(v)) {
                    dist.put(v, dist.get(u) + 1);
                    seen.add(v);
                    queue.add(v);
                }
                // else: v was already seen - skip it
            }
        }
        return dist;
    }
}
`,
  javascript: `
// graph: { node: [neighbours] }. Returns dist[v] = fewest edges from s to v.
function bfs(graph, s) {
  const dist = { [s]: 0 };
  const seen = new Set([s]);
  const queue = [s];
  let head = 0;                      // queue[head] is the front
  while (head < queue.length) {      // while queue not empty
    const u = queue[head++];         // u <- queue.dequeue()
    for (const v of graph[u]) {
      if (!seen.has(v)) {
        dist[v] = dist[u] + 1;
        seen.add(v);
        queue.push(v);
      }
      // else: v was already seen - skip it
    }
  }
  return dist;
}
`,
};

// ───────────────────────────────── DFS ─────────────────────────────────

const DFS: Snippets = {
  python: `
def dfs(graph, s):
    """graph: {node: [neighbours]}. Returns discovery / finish times and back edges.
    (Undirected graph: the edge back to u's parent also shows up as a back edge.)"""
    disc, fin = {}, {}
    on_stack = set()                     # nodes on the current call stack
    back_edges = []
    time = 0

    def visit(u):
        nonlocal time
        time += 1
        disc[u] = time
        on_stack.add(u)                  # push u
        for v in graph[u]:
            if v not in disc:            # v is unvisited
                visit(v)                 # tree edge
            elif v in on_stack:          # v is an ancestor of u
                back_edges.append((u, v))  # back edge: a cycle
            # else: v is finished - skip it
        time += 1
        fin[u] = time
        on_stack.remove(u)               # pop u

    visit(s)
    return disc, fin, back_edges
`,
  cpp: `
#include <map>
#include <set>
#include <string>
#include <utility>
#include <vector>
using namespace std;

using Graph = map<string, vector<string>>;  // node -> neighbours

// DFS d(graph, s) fills d.disc, d.fin and d.backEdges.
// (Undirected graph: the edge back to u's parent also shows up as a back edge.)
struct DFS {
    const Graph& graph;
    map<string, int> disc, fin;              // discovery / finish times
    set<string> onStack;                     // nodes on the current call stack
    vector<pair<string, string>> backEdges;
    int time = 0;

    DFS(const Graph& g, const string& s) : graph(g) { visit(s); }

    void visit(const string& u) {
        disc[u] = ++time;
        onStack.insert(u);                   // push u
        for (const string& v : graph.at(u)) {
            if (!disc.count(v)) {
                visit(v);                    // unvisited: tree edge
            } else if (onStack.count(v)) {
                backEdges.push_back({u, v}); // back edge: a cycle
            }
            // else: v is finished - skip it
        }
        fin[u] = ++time;
        onStack.erase(u);                    // pop u
    }
};
`,
  java: `
import java.util.*;

// new DFS(graph, s) fills disc, fin and backEdges.
// (Undirected graph: the edge back to u's parent also shows up as a back edge.)
class DFS {
    final Map<String, List<String>> graph;
    final Map<String, Integer> disc = new HashMap<>(), fin = new HashMap<>();
    final Set<String> onStack = new HashSet<>();       // nodes on the current call stack
    final List<String[]> backEdges = new ArrayList<>();
    int time = 0;

    DFS(Map<String, List<String>> graph, String s) {
        this.graph = graph;
        visit(s);
    }

    void visit(String u) {
        disc.put(u, ++time);
        onStack.add(u);                                // push u
        for (String v : graph.get(u)) {
            if (!disc.containsKey(v)) {
                visit(v);                              // unvisited: tree edge
            } else if (onStack.contains(v)) {
                backEdges.add(new String[] {u, v});    // back edge: a cycle
            }
            // else: v is finished - skip it
        }
        fin.put(u, ++time);
        onStack.remove(u);                             // pop u
    }
}
`,
  javascript: `
// graph: { node: [neighbours] }. Returns discovery / finish times and back edges.
// (Undirected graph: the edge back to u's parent also shows up as a back edge.)
function dfs(graph, s) {
  const disc = {}, fin = {};
  const onStack = new Set();         // nodes on the current call stack
  const backEdges = [];
  let time = 0;

  function visit(u) {
    disc[u] = ++time;
    onStack.add(u);                  // push u
    for (const v of graph[u]) {
      if (!(v in disc)) {
        visit(v);                    // unvisited: tree edge
      } else if (onStack.has(v)) {
        backEdges.push([u, v]);      // back edge: a cycle
      }
      // else: v is finished - skip it
    }
    fin[u] = ++time;
    onStack.delete(u);               // pop u
  }

  visit(s);
  return { disc, fin, backEdges };
}
`,
};

// ─────────────────────────── shared JS min-heap ───────────────────────────

const JS_HEAP = `
// A small binary min-heap of arrays, compared element by element.
class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  peek() { return this.a[0]; }
  less(i, j) {
    const x = this.a[i], y = this.a[j];
    for (let k = 0; k < x.length; k++) if (x[k] !== y[k]) return x[k] < y[k];
    return false;
  }
  swap(i, j) { [this.a[i], this.a[j]] = [this.a[j], this.a[i]]; }
  push(item) {
    this.a.push(item);
    for (let i = this.a.length - 1; i > 0; ) {      // sift up
      const p = (i - 1) >> 1;
      if (!this.less(i, p)) break;
      this.swap(i, p);
      i = p;
    }
  }
  pop() {
    const top = this.a[0], last = this.a.pop();
    if (this.a.length) {
      this.a[0] = last;
      for (let i = 0; ; ) {                           // sift down
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < this.a.length && this.less(l, m)) m = l;
        if (r < this.a.length && this.less(r, m)) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }
}
`;

// ─────────────────────────────── Dijkstra ───────────────────────────────

const DIJKSTRA: Snippets = {
  python: `
import heapq
import math


def dijkstra(graph, s):
    """graph: {node: [(neighbour, weight)]}, weights >= 0.
    Returns dist (math.inf = unreachable)."""
    dist = {v: math.inf for v in graph}
    dist[s] = 0
    finalized = set()
    pq = [(0, s)]                          # min-heap of (dist, node)
    while pq:
        _, u = heapq.heappop(pq)           # u <- PQ.extractMin()
        if u in finalized:
            continue                       # stale entry: u is already final
        finalized.add(u)
        for v, w in graph[u]:              # each edge (u, v, w)
            if v in finalized:
                continue                   # v is final: skip
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                heapq.heappush(pq, (dist[v], v))  # PQ.update: push the smaller key
    return dist
`,
  cpp: `
#include <climits>
#include <functional>
#include <map>
#include <queue>
#include <set>
#include <string>
#include <utility>
#include <vector>
using namespace std;

using WGraph = map<string, vector<pair<string, int>>>;  // node -> (neighbour, weight)
const long long INF = LLONG_MAX;

// Weights >= 0. Returns dist (INF = unreachable).
map<string, long long> dijkstra(const WGraph& graph, const string& s) {
    map<string, long long> dist;
    for (const auto& entry : graph) dist[entry.first] = INF;
    dist[s] = 0;
    set<string> finalized;
    // min-heap of (dist, node): smallest distance on top
    priority_queue<pair<long long, string>, vector<pair<long long, string>>, greater<>> pq;
    pq.push({0, s});
    while (!pq.empty()) {
        string u = pq.top().second;        // u <- PQ.extractMin()
        pq.pop();
        if (finalized.count(u)) continue;  // stale entry: u is already final
        finalized.insert(u);
        for (const auto& [v, w] : graph.at(u)) {
            if (finalized.count(v)) continue;  // v is final: skip
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                pq.push({dist[v], v});     // PQ.update: push the smaller key
            }
        }
    }
    return dist;
}
`,
  java: `
import java.util.*;

class Dijkstra {
    record Edge(String to, int w) {}
    record Item(long dist, String node) {}               // a priority-queue entry

    // graph: node -> edges, weights >= 0. Returns dist (Long.MAX_VALUE = unreachable).
    static Map<String, Long> dijkstra(Map<String, List<Edge>> graph, String s) {
        Map<String, Long> dist = new HashMap<>();
        for (String v : graph.keySet()) dist.put(v, Long.MAX_VALUE);
        dist.put(s, 0L);
        Set<String> finalized = new HashSet<>();
        PriorityQueue<Item> pq = new PriorityQueue<>(    // min-heap by distance
            Comparator.comparingLong(Item::dist).thenComparing(Item::node));
        pq.add(new Item(0, s));
        while (!pq.isEmpty()) {
            String u = pq.poll().node();                 // u <- PQ.extractMin()
            if (!finalized.add(u)) continue;             // stale entry: u is already final
            for (Edge e : graph.get(u)) {
                String v = e.to();
                if (finalized.contains(v)) continue;     // v is final: skip
                long nd = dist.get(u) + e.w();           // dist[u] + w
                if (nd < dist.get(v)) {
                    dist.put(v, nd);
                    pq.add(new Item(nd, v));             // PQ.update: push the smaller key
                }
            }
        }
        return dist;
    }
}
`,
  javascript:
    JS_HEAP +
    `
// graph: { node: [[neighbour, weight], ...] }, weights >= 0.
// Returns dist (Infinity = unreachable).
function dijkstra(graph, s) {
  const dist = {};
  for (const v in graph) dist[v] = Infinity;
  dist[s] = 0;
  const finalized = new Set();
  const pq = new MinHeap();          // min-heap of [dist, node]
  pq.push([0, s]);
  while (pq.size) {
    const [, u] = pq.pop();          // u <- PQ.extractMin()
    if (finalized.has(u)) continue;  // stale entry: u is already final
    finalized.add(u);
    for (const [v, w] of graph[u]) {
      if (finalized.has(v)) continue;  // v is final: skip
      if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        pq.push([dist[v], v]);       // PQ.update: push the smaller key
      }
    }
  }
  return dist;
}
`,
};

// ───────────────────────────── Bellman-Ford ─────────────────────────────

const BELLMAN_FORD: Snippets = {
  python: `
import math


def bellman_ford(nodes, edges, s):
    """edges: [(u, v, w)] - list both directions for an undirected graph.
    Returns dist, or None if a negative cycle is reachable from s."""
    dist = {v: math.inf for v in nodes}
    dist[s] = 0
    for _ in range(len(nodes) - 1):        # repeat V - 1 times
        changed = False
        for u, v, w in edges:
            if dist[u] + w < dist[v]:      # inf + w stays inf
                dist[v] = dist[u] + w
                changed = True
        if not changed:
            break                          # stop early
    for u, v, w in edges:                  # one extra pass
        if dist[u] + w < dist[v]:
            return None                    # still relaxes: negative cycle!
    return dist
`,
  cpp: `
#include <climits>
#include <map>
#include <optional>
#include <string>
#include <vector>
using namespace std;

struct Edge { string u, v; int w; };
const long long INF = LLONG_MAX;

// edges: list both directions for an undirected graph.
// Returns dist, or nullopt if a negative cycle is reachable from s.
optional<map<string, long long>> bellmanFord(const vector<string>& nodes, const vector<Edge>& edges, const string& s) {
    map<string, long long> dist;
    for (const string& v : nodes) dist[v] = INF;
    dist[s] = 0;
    for (size_t i = 1; i < nodes.size(); i++) {      // repeat V - 1 times
        bool changed = false;
        for (const auto& [u, v, w] : edges) {
            if (dist[u] != INF && dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                changed = true;
            }
        }
        if (!changed) break;                         // stop early
    }
    for (const auto& [u, v, w] : edges)              // one extra pass
        if (dist[u] != INF && dist[u] + w < dist[v])
            return nullopt;                          // still relaxes: negative cycle!
    return dist;
}
`,
  java: `
import java.util.*;

class BellmanFord {
    record Edge(String u, String v, int w) {}

    // edges: list both directions for an undirected graph.
    // Returns dist, or null if a negative cycle is reachable from s.
    static Map<String, Long> bellmanFord(List<String> nodes, List<Edge> edges, String s) {
        final long INF = Long.MAX_VALUE;
        Map<String, Long> dist = new HashMap<>();
        for (String v : nodes) dist.put(v, INF);
        dist.put(s, 0L);
        for (int i = 1; i < nodes.size(); i++) {         // repeat V - 1 times
            boolean changed = false;
            for (Edge e : edges) {
                long du = dist.get(e.u());
                if (du != INF && du + e.w() < dist.get(e.v())) {
                    dist.put(e.v(), du + e.w());
                    changed = true;
                }
            }
            if (!changed) break;                         // stop early
        }
        for (Edge e : edges) {                           // one extra pass
            long du = dist.get(e.u());
            if (du != INF && du + e.w() < dist.get(e.v()))
                return null;                             // still relaxes: negative cycle!
        }
        return dist;
    }
}
`,
  javascript: `
// edges: [[u, v, w], ...] - list both directions for an undirected graph.
// Returns dist, or null if a negative cycle is reachable from s.
function bellmanFord(nodes, edges, s) {
  const dist = {};
  for (const v of nodes) dist[v] = Infinity;
  dist[s] = 0;
  for (let i = 1; i < nodes.length; i++) {   // repeat V - 1 times
    let changed = false;
    for (const [u, v, w] of edges) {
      if (dist[u] + w < dist[v]) {           // Infinity + w stays Infinity
        dist[v] = dist[u] + w;
        changed = true;
      }
    }
    if (!changed) break;                     // stop early
  }
  for (const [u, v, w] of edges) {           // one extra pass
    if (dist[u] + w < dist[v]) return null;  // still relaxes: negative cycle!
  }
  return dist;
}
`,
};

// ─────────────────────────────── Kruskal ───────────────────────────────

const KRUSKAL: Snippets = {
  python: `
def kruskal(nodes, edges):
    """edges: [(u, v, w)] of an undirected graph. Returns (mst, total weight)."""
    edges = sorted(edges, key=lambda e: e[2])   # sort edges by weight (stable)
    parent = {v: v for v in nodes}              # each node is its own set
    size = {v: 1 for v in nodes}

    def find(x):                                # root of x's set
        if parent[x] != x:
            parent[x] = find(parent[x])         # path compression
        return parent[x]

    def union(a, b):                            # union by size
        if size[a] < size[b]:
            a, b = b, a
        parent[b] = a
        size[a] += size[b]

    mst, total = [], 0
    for u, v, w in edges:
        ru, rv = find(u), find(v)
        if ru != rv:
            union(ru, rv)
            mst.append((u, v, w))               # take (u, v)
            total += w
        # else: skip - (u, v) would close a cycle
    return mst, total
`,
  cpp: `
#include <algorithm>
#include <map>
#include <string>
#include <utility>
#include <vector>
using namespace std;

struct Edge { string u, v; int w; };

struct UnionFind {
    map<string, string> parent;
    map<string, int> size;
    string find(const string& x) {           // root of x's set
        if (parent[x] != x) parent[x] = find(parent[x]);  // path compression
        return parent[x];
    }
    void unite(string a, string b) {         // union by size
        if (size[a] < size[b]) swap(a, b);
        parent[b] = a;
        size[a] += size[b];
    }
};

// Undirected edges. Returns (mst, total weight).
pair<vector<Edge>, long long> kruskal(const vector<string>& nodes, vector<Edge> edges) {
    stable_sort(edges.begin(), edges.end(),  // sort edges by weight
                [](const Edge& a, const Edge& b) { return a.w < b.w; });
    UnionFind uf;
    for (const string& v : nodes) {          // each node is its own set
        uf.parent[v] = v;
        uf.size[v] = 1;
    }
    vector<Edge> mst;
    long long total = 0;
    for (const Edge& e : edges) {
        string ru = uf.find(e.u), rv = uf.find(e.v);
        if (ru != rv) {
            uf.unite(ru, rv);
            mst.push_back(e);                // take (u, v)
            total += e.w;
        }
        // else: skip - e would close a cycle
    }
    return {mst, total};
}
`,
  java: `
import java.util.*;

// new Kruskal(nodes, edges) fills mst and total.
class Kruskal {
    record Edge(String u, String v, int w) {}

    final Map<String, String> parent = new HashMap<>();
    final Map<String, Integer> size = new HashMap<>();
    final List<Edge> mst = new ArrayList<>();
    long total = 0;

    Kruskal(List<String> nodes, List<Edge> edges) {
        List<Edge> sorted = new ArrayList<>(edges);
        sorted.sort(Comparator.comparingInt(Edge::w));    // sort edges by weight (stable)
        for (String v : nodes) {                          // each node is its own set
            parent.put(v, v);
            size.put(v, 1);
        }
        for (Edge e : sorted) {
            String ru = find(e.u()), rv = find(e.v());
            if (!ru.equals(rv)) {
                union(ru, rv);
                mst.add(e);                               // take (u, v)
                total += e.w();
            }
            // else: skip - e would close a cycle
        }
    }

    String find(String x) {                               // root of x's set
        if (!parent.get(x).equals(x)) parent.put(x, find(parent.get(x)));  // path compression
        return parent.get(x);
    }

    void union(String a, String b) {                      // union by size
        if (size.get(a) < size.get(b)) { String t = a; a = b; b = t; }
        parent.put(b, a);
        size.put(a, size.get(a) + size.get(b));
    }
}
`,
  javascript: `
// edges: [[u, v, w], ...] of an undirected graph. Returns { mst, total }.
function kruskal(nodes, edges) {
  const sorted = [...edges].sort((a, b) => a[2] - b[2]);  // sort edges by weight (stable)
  const parent = {}, size = {};
  for (const v of nodes) {           // each node is its own set
    parent[v] = v;
    size[v] = 1;
  }
  const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));  // path compression
  const union = (a, b) => {          // union by size
    if (size[a] < size[b]) [a, b] = [b, a];
    parent[b] = a;
    size[a] += size[b];
  };

  const mst = [];
  let total = 0;
  for (const [u, v, w] of sorted) {
    const ru = find(u), rv = find(v);
    if (ru !== rv) {
      union(ru, rv);
      mst.push([u, v, w]);           // take (u, v)
      total += w;
    }
    // else: skip - (u, v) would close a cycle
  }
  return { mst, total };
}
`,
};

// ───────────────────────────────── Prim ─────────────────────────────────

const PRIM: Snippets = {
  python: `
import heapq


def prim(graph, s):
    """graph: {node: [(neighbour, weight)]} (undirected). Returns (mst, total weight)."""
    tree = {s}
    mst, total = [], 0
    C = [(w, s, v) for v, w in graph[s]]   # edges leaving the tree: a min-heap
    heapq.heapify(C)
    while len(tree) < len(graph):          # while nodes remain outside
        while C and C[0][2] in tree:       # drop edges that no longer leave the tree
            heapq.heappop(C)
        if not C:
            break                          # C is empty: disconnected
        w, a, b = heapq.heappop(C)         # cheapest edge in C
        tree.add(b)                        # add b and (a, b) to the tree
        mst.append((a, b, w))
        total += w
        for v, wv in graph[b]:
            if v not in tree:
                heapq.heappush(C, (wv, b, v))
    return mst, total
`,
  cpp: `
#include <functional>
#include <map>
#include <queue>
#include <set>
#include <string>
#include <tuple>
#include <utility>
#include <vector>
using namespace std;

using WGraph = map<string, vector<pair<string, int>>>;  // node -> (neighbour, weight)
struct Edge { string a, b; int w; };

// Undirected graph. Returns (mst, total weight).
pair<vector<Edge>, long long> prim(const WGraph& graph, const string& s) {
    set<string> tree{s};
    vector<Edge> mst;
    long long total = 0;
    using Cand = tuple<int, string, string>;            // (w, a, b): a in the tree
    priority_queue<Cand, vector<Cand>, greater<>> C;    // edges leaving the tree: a min-heap
    for (const auto& [v, w] : graph.at(s)) C.push({w, s, v});
    while (tree.size() < graph.size()) {                // while nodes remain outside
        while (!C.empty() && tree.count(get<2>(C.top())))
            C.pop();                                    // no longer leaves the tree
        if (C.empty()) break;                           // C is empty: disconnected
        auto [w, a, b] = C.top();                       // cheapest edge in C
        C.pop();
        tree.insert(b);                                 // add b and (a, b) to the tree
        mst.push_back({a, b, w});
        total += w;
        for (const auto& [v, wv] : graph.at(b))
            if (!tree.count(v)) C.push({wv, b, v});
    }
    return {mst, total};
}
`,
  java: `
import java.util.*;

class Prim {
    record Edge(String to, int w) {}
    record Cand(int w, String a, String b) {}     // edge a - b with a in the tree

    // graph: node -> edges (undirected). Returns the MST edges (sum their w for the total).
    static List<Cand> prim(Map<String, List<Edge>> graph, String s) {
        Set<String> tree = new HashSet<>(Set.of(s));
        List<Cand> mst = new ArrayList<>();
        PriorityQueue<Cand> C = new PriorityQueue<>(Comparator.comparingInt(Cand::w));  // edges leaving the tree
        for (Edge e : graph.get(s)) C.add(new Cand(e.w(), s, e.to()));
        while (tree.size() < graph.size()) {                      // while nodes remain outside
            while (!C.isEmpty() && tree.contains(C.peek().b()))
                C.poll();                                         // no longer leaves the tree
            if (C.isEmpty()) break;                               // C is empty: disconnected
            Cand best = C.poll();                                 // cheapest edge in C
            tree.add(best.b());                                   // add b and (a, b) to the tree
            mst.add(best);
            for (Edge e : graph.get(best.b()))
                if (!tree.contains(e.to())) C.add(new Cand(e.w(), best.b(), e.to()));
        }
        return mst;
    }
}
`,
  javascript:
    JS_HEAP +
    `
// graph: { node: [[neighbour, weight], ...] } (undirected). Returns { mst, total }.
function prim(graph, s) {
  const tree = new Set([s]);
  const mst = [];
  let total = 0;
  const C = new MinHeap();           // edges leaving the tree: [w, a, b]
  for (const [v, w] of graph[s]) C.push([w, s, v]);
  const n = Object.keys(graph).length;
  while (tree.size < n) {            // while nodes remain outside
    while (C.size && tree.has(C.peek()[2])) C.pop();  // no longer leaves the tree
    if (!C.size) break;              // C is empty: disconnected
    const [w, a, b] = C.pop();       // cheapest edge in C
    tree.add(b);                     // add b and (a, b) to the tree
    mst.push([a, b, w]);
    total += w;
    for (const [v, wv] of graph[b]) if (!tree.has(v)) C.push([wv, b, v]);
  }
  return { mst, total };
}
`,
};

// ───────────────────────────── Topological sort ─────────────────────────────

const TOPO: Snippets = {
  python: `
from collections import deque


def topo_sort(graph):
    """Kahn's algorithm. graph: {node: [successors]}.
    Returns a topological order, or None if there is a cycle."""
    indeg = {v: 0 for v in graph}
    for u in graph:
        for v in graph[u]:
            indeg[v] += 1                  # count incoming edges
    Q = deque(v for v in graph if indeg[v] == 0)
    order = []
    while Q:
        u = Q.popleft()                    # u <- Q.dequeue()
        order.append(u)                    # output u
        for v in graph[u]:                 # each edge u -> v
            indeg[v] -= 1
            if indeg[v] == 0:
                Q.append(v)
    if len(order) < len(graph):
        return None                        # cycle!
    return order
`,
  cpp: `
#include <map>
#include <optional>
#include <queue>
#include <string>
#include <vector>
using namespace std;

using Graph = map<string, vector<string>>;  // node -> successors

// Kahn's algorithm: a topological order, or nullopt if there is a cycle.
optional<vector<string>> topoSort(const Graph& graph) {
    map<string, int> indeg;
    for (const auto& entry : graph) indeg[entry.first] = 0;
    for (const auto& [u, out] : graph)
        for (const string& v : out) indeg[v]++;    // count incoming edges
    queue<string> Q;
    for (const auto& [v, d] : indeg)
        if (d == 0) Q.push(v);
    vector<string> order;
    while (!Q.empty()) {
        string u = Q.front();                      // u <- Q.dequeue()
        Q.pop();
        order.push_back(u);                        // output u
        for (const string& v : graph.at(u)) {      // each edge u -> v
            indeg[v]--;
            if (indeg[v] == 0) Q.push(v);
        }
    }
    if (order.size() < graph.size()) return nullopt;  // cycle!
    return order;
}
`,
  java: `
import java.util.*;

class TopoSort {
    // Kahn's algorithm. graph: node -> successors.
    // Returns a topological order, or null if there is a cycle.
    static List<String> topoSort(Map<String, List<String>> graph) {
        Map<String, Integer> indeg = new HashMap<>();
        for (String v : graph.keySet()) indeg.put(v, 0);
        for (String u : graph.keySet())
            for (String v : graph.get(u)) indeg.merge(v, 1, Integer::sum);  // count incoming edges
        Deque<String> Q = new ArrayDeque<>();
        for (String v : graph.keySet()) if (indeg.get(v) == 0) Q.add(v);
        List<String> order = new ArrayList<>();
        while (!Q.isEmpty()) {
            String u = Q.poll();                       // u <- Q.dequeue()
            order.add(u);                              // output u
            for (String v : graph.get(u)) {            // each edge u -> v
                indeg.merge(v, -1, Integer::sum);
                if (indeg.get(v) == 0) Q.add(v);
            }
        }
        if (order.size() < graph.size()) return null;  // cycle!
        return order;
    }
}
`,
  javascript: `
// Kahn's algorithm. graph: { node: [successors] }.
// Returns a topological order, or null if there is a cycle.
function topoSort(graph) {
  const indeg = {};
  for (const v in graph) indeg[v] = 0;
  for (const u in graph) for (const v of graph[u]) indeg[v]++;  // count incoming edges
  const Q = Object.keys(graph).filter((v) => indeg[v] === 0);
  const order = [];
  let head = 0;                      // Q[head] is the front
  while (head < Q.length) {          // while Q not empty
    const u = Q[head++];             // u <- Q.dequeue()
    order.push(u);                   // output u
    for (const v of graph[u]) {      // each edge u -> v
      indeg[v]--;
      if (indeg[v] === 0) Q.push(v);
    }
  }
  if (order.length < Object.keys(graph).length) return null;  // cycle!
  return order;
}
`,
};

// ───────────────────────────── Kosaraju SCC ─────────────────────────────

const SCC: Snippets = {
  python: `
def kosaraju(graph):
    """graph: {node: [successors]}. Returns comp[v] = component number (0, 1, ...)."""
    visited, finish = set(), []            # finish: the finish stack

    def dfs1(u):
        visited.add(u)                     # mark u visited
        for v in graph[u]:
            if v not in visited:
                dfs1(v)
        finish.append(u)                   # push u on the finish stack

    for u in graph:
        if u not in visited:
            dfs1(u)

    gt = {v: [] for v in graph}            # G^T: reverse every edge
    for u in graph:
        for v in graph[u]:
            gt[v].append(u)

    comp = {}

    def dfs2(x, c):                        # in G^T
        comp[x] = c
        for y in gt[x]:
            if y not in comp:
                dfs2(y, c)

    c = 0
    for u in reversed(finish):             # reverse finish order
        if u not in comp:
            dfs2(u, c)
            c += 1
    return comp
`,
  cpp: `
#include <map>
#include <set>
#include <string>
#include <vector>
using namespace std;

using Graph = map<string, vector<string>>;  // node -> successors

// Kosaraju k(graph) fills k.comp (node -> component number) and k.count.
struct Kosaraju {
    const Graph& graph;
    Graph gt;                                // G^T: every edge reversed
    set<string> visited;
    vector<string> finish;                   // the finish stack
    map<string, int> comp;
    int count = 0;

    explicit Kosaraju(const Graph& g) : graph(g) {
        for (const auto& entry : graph)
            if (!visited.count(entry.first)) dfs1(entry.first);
        for (const auto& entry : graph) gt[entry.first] = {};
        for (const auto& [u, out] : graph)   // reverse every edge
            for (const string& v : out) gt[v].push_back(u);
        for (auto it = finish.rbegin(); it != finish.rend(); ++it)  // reverse finish order
            if (!comp.count(*it)) dfs2(*it, count++);
    }

    void dfs1(const string& u) {
        visited.insert(u);                   // mark u visited
        for (const string& v : graph.at(u))
            if (!visited.count(v)) dfs1(v);
        finish.push_back(u);                 // push u on the finish stack
    }

    void dfs2(const string& x, int c) {      // in G^T
        comp[x] = c;
        for (const string& y : gt[x])
            if (!comp.count(y)) dfs2(y, c);
    }
};
`,
  java: `
import java.util.*;

// new Kosaraju(graph) fills comp (node -> component number) and count.
class Kosaraju {
    final Map<String, List<String>> graph;
    final Map<String, List<String>> gt = new HashMap<>();  // G^T: every edge reversed
    final Set<String> visited = new HashSet<>();
    final Deque<String> finish = new ArrayDeque<>();       // the finish stack
    final Map<String, Integer> comp = new HashMap<>();
    int count = 0;

    Kosaraju(Map<String, List<String>> graph) {
        this.graph = graph;
        for (String u : graph.keySet())
            if (!visited.contains(u)) dfs1(u);
        for (String u : graph.keySet()) gt.put(u, new ArrayList<>());
        for (String u : graph.keySet())                    // reverse every edge
            for (String v : graph.get(u)) gt.get(v).add(u);
        while (!finish.isEmpty()) {                        // reverse finish order
            String u = finish.pop();
            if (!comp.containsKey(u)) dfs2(u, count++);
        }
    }

    void dfs1(String u) {
        visited.add(u);                                    // mark u visited
        for (String v : graph.get(u))
            if (!visited.contains(v)) dfs1(v);
        finish.push(u);                                    // push u on the finish stack
    }

    void dfs2(String x, int c) {                           // in G^T
        comp.put(x, c);
        for (String y : gt.get(x))
            if (!comp.containsKey(y)) dfs2(y, c);
    }
}
`,
  javascript: `
// graph: { node: [successors] }. Returns comp: node -> component number (0, 1, ...).
function kosaraju(graph) {
  const visited = new Set();
  const finish = [];                 // the finish stack

  function dfs1(u) {
    visited.add(u);                  // mark u visited
    for (const v of graph[u]) if (!visited.has(v)) dfs1(v);
    finish.push(u);                  // push u on the finish stack
  }
  for (const u in graph) if (!visited.has(u)) dfs1(u);

  const gt = {};                     // G^T: reverse every edge
  for (const u in graph) gt[u] = [];
  for (const u in graph) for (const v of graph[u]) gt[v].push(u);

  const comp = {};
  function dfs2(x, c) {              // in G^T
    comp[x] = c;
    for (const y of gt[x]) if (!(y in comp)) dfs2(y, c);
  }
  let c = 0;
  for (let i = finish.length - 1; i >= 0; i--) {  // reverse finish order
    const u = finish[i];
    if (!(u in comp)) dfs2(u, c++);
  }
  return comp;
}
`,
};

const clean = (s: Snippets): Snippets => ({
  python: trim(s.python),
  cpp: trim(s.cpp),
  java: trim(s.java),
  javascript: trim(s.javascript),
});

/** Code tabs per algorithm (Python, C++17, Java, JavaScript). */
export const GRAPH_CODE: Record<AlgoKey, Snippets> = {
  bfs: clean(BFS),
  dfs: clean(DFS),
  dijkstra: clean(DIJKSTRA),
  bellmanFord: clean(BELLMAN_FORD),
  kruskal: clean(KRUSKAL),
  prim: clean(PRIM),
  topo: clean(TOPO),
  scc: clean(SCC),
};
