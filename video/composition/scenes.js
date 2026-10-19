// Timeline of the AlgoLab tour video (v2), shared by the composition (browser) and
// build-frames.mjs (Node). Times are in seconds of the final video. Footage scenes play `clip`
// from `src` at `rate`×. v1 (sorting-heavy, 52 s) is commit 1794187.

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/** Overlap kept after a footage scene ends, so the next one can wipe over it. */
export const WIPE = 0.55;

// One beat per family, in the order the site teaches them.
export const FOOTAGE = [
  {
    id: "merge", clip: "merge", start: 6.2, dur: 5.4, src: 1.1, rate: 3.0,
    chapter: "01", area: "Sorting", title: "Merge sort", sub: "split it, then merge it back.",
    chips: ["divide", "conquer", "O(n log n)"], url: "/sorting/merge-sort", say: "split… split… merge!",
    zoom: { from: 1.24, to: 1.4, x: 0.56, y: 0.52 },
  },
  {
    id: "race", clip: "race", start: 11.6, dur: 4.8, src: 2.6, rate: 1.8,
    chapter: "01", area: "Sorting", title: "Race them all", sub: "eight sorts, one shared clock.",
    chips: ["bubble → radix", "4 inputs"], url: "/sorting", say: "who wins?",
    zoom: { from: 1.08, to: 1.2, x: 0.56, y: 0.5 },
  },
  {
    id: "list", clip: "list", start: 16.4, dur: 4.8, src: 1.0, rate: 2.8,
    chapter: "02", area: "Lists", title: "Reverse a list", sub: "three pointers, one pass.",
    chips: ["singly · doubly · circular", "O(1) at both ends"], url: "/linked-list/reverse-linked-list", say: "flip, flip, flip!",
    zoom: { from: 1.26, to: 1.4, x: 0.47, y: 0.45 },
  },
  {
    id: "postfix", clip: "postfix", start: 21.2, dur: 4.8, src: 1.1, rate: 4.0,
    chapter: "03", area: "Stacks", title: "Infix → postfix", sub: "the stack decides the order.",
    chips: ["stack · queue · deque", "circular queue"], url: "/stack-queue/infix-to-postfix", say: "push, pop, done.",
    zoom: { from: 1.22, to: 1.38, x: 0.5, y: 0.5 },
  },
  {
    id: "heap", clip: "heap", start: 26.0, dur: 4.8, src: 1.0, rate: 3.1,
    chapter: "04", area: "Heaps", title: "Build a heap", sub: "sift down, bottom-up, in O(n).",
    chips: ["min · max", "heap sort", "priority queue"], url: "/heap/build-heap", say: "bubble down!",
    zoom: { from: 1.22, to: 1.36, x: 0.48, y: 0.5 },
  },
  {
    id: "avl", clip: "avl", start: 30.8, dur: 5.0, src: 16.5, rate: 3.6,
    chapter: "05", area: "Trees", title: "AVL rotations", sub: "watch the tree re-balance.",
    chips: ["BST · AVL", "LL · RR · LR · RL"], url: "/avl-tree/rotations", say: "rotate!",
    zoom: { from: 1.3, to: 1.48, x: 0.48, y: 0.42 },
  },
  {
    id: "btree", clip: "btree", start: 35.8, dur: 5.2, src: 5.0, rate: 4.8,
    chapter: "06", area: "B-trees", title: "B-tree split", sub: "a full node pushes its median up.",
    chips: ["order m = 3 to 7", "insert · delete"], url: "/btree/insertion", say: "split the root!",
    zoom: { from: 1.25, to: 1.4, x: 0.5, y: 0.55 },
  },
  {
    id: "dijkstra", clip: "dijkstra", start: 41.0, dur: 5.2, src: 1.2, rate: 3.6,
    chapter: "07", area: "Graphs", title: "Dijkstra", sub: "shortest paths, edge by edge.",
    chips: ["BFS · DFS · Bellman-Ford", "Prim · Kruskal · topo sort"], url: "/graph/dijkstra", say: "nearest node first!",
    zoom: { from: 1.26, to: 1.42, x: 0.52, y: 0.52 },
  },
];

export const FEATURES_AT = 46.2;
export const END_AT = 51.0;
export const DURATION = 56;
