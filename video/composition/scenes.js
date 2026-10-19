// Timeline of the AlgoLab demo video, shared by the composition (browser) and build-frames.mjs (Node).
// Times are in seconds of the final video. Footage scenes play `clip` from `src` at `rate`×.

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/** Overlap kept after a footage scene ends, so the next one can wipe over it. */
export const WIPE = 0.55;

export const FOOTAGE = [
  {
    id: "merge", clip: "merge", start: 6.2, dur: 7.4, src: 1.1, rate: 2.3,
    chapter: "01", area: "Sorting", title: "Merge sort", sub: "split it, then merge it back.",
    chips: ["divide", "conquer", "O(n log n)"], url: "/sorting/merge-sort", say: "split… split… merge!",
    zoom: { from: 1.24, to: 1.4, x: 0.56, y: 0.52 },
  },
  {
    id: "quick", clip: "quick", start: 13.6, dur: 5.6, src: 1.1, rate: 2.6,
    chapter: "01", area: "Sorting", title: "Quick sort", sub: "partition around a pivot.",
    chips: ["pivot", "Lomuto · Hoare", "in-place"], url: "/sorting/quick-sort", say: "pick a pivot!",
    zoom: { from: 1.4, to: 1.26, x: 0.56, y: 0.5 },
  },
  {
    id: "race", clip: "race", start: 19.2, dur: 5.4, src: 2.6, rate: 1.7,
    chapter: "01", area: "Sorting", title: "Race them all", sub: "one shared clock, four inputs.",
    chips: ["8 algorithms", "side by side"], url: "/sorting", say: "who wins?",
    zoom: { from: 1.08, to: 1.2, x: 0.56, y: 0.5 },
  },
  {
    id: "dijkstra", clip: "dijkstra", start: 24.6, dur: 5.8, src: 1.2, rate: 3.0,
    chapter: "02", area: "Graphs", title: "Dijkstra", sub: "shortest paths, edge by edge.",
    chips: ["priority queue", "BFS · DFS · Prim · Kruskal"], url: "/graph/dijkstra", say: "nearest node first!",
    zoom: { from: 1.26, to: 1.42, x: 0.52, y: 0.52 },
  },
  {
    id: "avl", clip: "avl", start: 30.4, dur: 5.8, src: 16.5, rate: 3.2,
    chapter: "03", area: "Trees", title: "AVL rotations", sub: "watch the tree re-balance.",
    chips: ["LL · RR · LR · RL", "BST · B-tree · heap"], url: "/avl-tree/rotations", say: "rotate!",
    zoom: { from: 1.3, to: 1.48, x: 0.48, y: 0.42 },
  },
  {
    id: "postfix", clip: "postfix", start: 36.2, dur: 5.6, src: 1.1, rate: 3.4,
    chapter: "04", area: "Stacks", title: "Infix → postfix", sub: "the stack decides the order.",
    chips: ["stack · queue · deque", "linked lists"], url: "/stack-queue/infix-to-postfix", say: "push, pop, done.",
    zoom: { from: 1.22, to: 1.38, x: 0.5, y: 0.5 },
  },
];

export const FEATURES_AT = 41.8;
export const END_AT = 46.6;
export const DURATION = 52;
