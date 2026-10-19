// Timeline of the AlgoLab tour video (v4 = v3 with merge sort, heap, AVL, B-tree and Dijkstra in
// the site's own canvas fullscreen, shown edge to edge), shared by the composition (browser) and
// build-frames.mjs (Node). Times are seconds of the final video. Earlier cuts: v1 = 1794187,
// v2 = c0516fc, v3 = fbc24cf.
//
// A footage scene plays one or more `parts` of a recorded clip (from `src`, at `rate`×, for at
// most `len` clip-seconds). `layout` picks the window placement; `cam` is the camera path
// ([sceneTime, zoom, focusX, focusY], focus in frame fractions); clicks logged while recording
// add punch-ins (or, with `follow`, the camera tracks the cursor); `enter` is the transition.

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/** Length of in-window transitions (wipe / push / zoom). */
export const WIPE = 0.6;
/** Extra footage kept after a scene ends, so the next one can transition over it (float needs ~1 s). */
export const TAIL = 1.2;

/** Browser-window placement per layout (content is 16:9 under a 50 px bar). */
export const LAYOUTS = {
  right: { x: 600, y: 176, w: 1240 },
  left: { x: 80, y: 176, w: 1240 },
  full: { x: 150, y: 98, w: 1620 },
  explode: { x: 410, y: 214, w: 1100 },
  /** True fullscreen: the canvas edge to edge, browser bar pushed off the top. */
  fs: { x: 0, y: -50, w: 1920 },
};

/** Where Bit waits during each layout (bottom-centre anchor). */
export const HOSTS = {
  right: { x: 190, y: 968, s: 1.05 },
  left: { x: 1730, y: 968, s: 1.05 },
  full: { x: 1850, y: 1040, s: 0.8 },
  explode: { x: 960, y: 1046, s: 0.9 },
  grid: { x: 1850, y: 1046, s: 0.8 },
  fs: { x: 1845, y: 985, s: 0.8 },
};

/** The workspace's three panes, as fractions of a recorded frame. */
export const PANES = {
  left: { x: 0.005, y: 0.111, w: 0.1675, h: 0.878 },
  canvas: { x: 0.1775, y: 0.111, w: 0.615, h: 0.81 },
  right: { x: 0.799, y: 0.111, w: 0.196, h: 0.878 },
};

export const FOOTAGE = [
  {
    id: "anatomy", clip: "merge", layout: "explode", start: 6.2, dur: 6.4, parts: [{ src: 0.6, rate: 1.0 }],
    url: "/sorting/merge-sort", say: "three panes. that's it.", punch: false,
  },
  {
    id: "merge", clip: "mergeFs", layout: "fs", enter: "zoom", start: 12.6, dur: 5.4, parts: [{ src: 4.9, rate: 3.0 }], punch: false,
    chapter: "01", area: "Sorting", title: "Merge sort", sub: "split it, then merge it back.",
    chips: ["divide", "conquer", "F for fullscreen"], url: "/sorting/merge-sort", say: "split… split… merge!",
    cam: [[0, 1.0, 0.5, 0.5], [0.9, 1.06, 0.42, 0.45], [5.4, 1.12, 0.4, 0.5]],
  },
  {
    id: "race", clip: "race", layout: "full", enter: "float", start: 18.0, dur: 4.6, parts: [{ src: 5.2, rate: 1.8 }],
    chapter: "01", area: "Sorting", title: "Race them all", sub: "eight sorts, one shared clock.",
    chips: ["bubble → radix", "4 inputs"], url: "/sorting", say: "who wins?",
    cam: [[0, 1.0, 0.5, 0.5], [4.6, 1.12, 0.55, 0.45]],
  },
  {
    id: "list", clip: "list", layout: "left", enter: "push", start: 22.6, dur: 7.0, parts: [{ src: 2.0, rate: 3.3 }],
    chapter: "02", area: "Lists", title: "Reverse a list", sub: "then make it doubly, or circular.",
    chips: ["singly · doubly · circular", "O(1) at both ends"], url: "/linked-list/reverse-linked-list", say: "flip, flip, flip!",
    cam: [[0, 1.5, 0.47, 0.42], [7, 1.5, 0.5, 0.42]],
  },
  {
    id: "postfix", clip: "postfix", layout: "full", enter: "zoom", start: 29.6, dur: 5.0, parts: [{ src: 4.6, rate: 3.7 }],
    chapter: "03", area: "Stacks", title: "Infix → postfix", sub: "the stack decides the order.",
    chips: ["stack · queue · deque", "circular queue"], url: "/stack-queue/infix-to-postfix", say: "push, pop, done.",
    cam: [[0, 1.3, 0.45, 0.42], [1.2, 1.7, 0.5, 0.33], [2.6, 1.75, 0.27, 0.55], [4.0, 1.6, 0.42, 0.45], [5.0, 1.35, 0.45, 0.45]],
  },
  {
    id: "heap", clip: "heapFs", layout: "fs", enter: "float", start: 34.6, dur: 4.8, parts: [{ src: 5.3, rate: 3.0 }],
    chapter: "04", area: "Heaps", title: "Build a heap", sub: "sift down, bottom-up, in O(n).",
    chips: ["min · max", "heap sort", "priority queue"], url: "/heap/build-heap", say: "bubble down!",
    cam: [[0, 1.05, 0.5, 0.45], [4.8, 1.18, 0.5, 0.42]], punch: false,
  },
  {
    id: "avl", clip: "avlFs", layout: "fs", enter: "wipe", start: 39.4, dur: 5.0, parts: [{ src: 9.6, rate: 2.2 }],
    chapter: "05", area: "Trees", title: "AVL rotations", sub: "watch the tree re-balance.",
    chips: ["BST · AVL", "LL · RR · LR · RL"], url: "/avl-tree/rotations", say: "rotate!",
    cam: [[0, 1.25, 0.36, 0.36], [3, 1.25, 0.43, 0.34], [5, 1.2, 0.5, 0.34]], punch: false,
  },
  {
    id: "btree", clip: "btreeFs", layout: "fs", enter: "push", start: 44.4, dur: 5.2, parts: [{ src: 6.0, rate: 5.2 }],
    chapter: "06", area: "B-trees", title: "B-tree split", sub: "a full node pushes its median up.",
    chips: ["order m = 3 to 7", "insert · delete"], url: "/btree/insertion", say: "split the root!",
    cam: [[0, 1.25, 0.5, 0.45], [5.2, 1.12, 0.5, 0.42]], punch: false,
  },
  {
    id: "dijkstra", clip: "dijkstraFs", layout: "fs", enter: "zoom", start: 49.6, dur: 4.6, parts: [{ src: 5.0, rate: 3.6 }],
    chapter: "07", area: "Graphs", title: "Dijkstra", sub: "shortest paths, edge by edge.",
    chips: ["priority queue", "weighted edges"], url: "/graph/dijkstra", say: "nearest node first!",
    cam: [[0, 1.1, 0.48, 0.52], [4.6, 1.2, 0.48, 0.52]], punch: false,
  },
  {
    id: "graphs", clip: "graphs", layout: "grid", start: 54.2, dur: 6.2, punch: false,
    // the four Run clicks: BFS, DFS, Prim, Kruskal on the same graph
    parts: [
      { src: 5.25, rate: 1.4, len: 5.9, name: "BFS" },
      { src: 15.2, rate: 1.4, len: 5.4, name: "DFS" },
      { src: 23.9, rate: 1.4, len: 6.0, name: "Prim" },
      { src: 33.4, rate: 1.4, len: 3.2, name: "Kruskal" },
    ],
    chapter: "07", area: "Graphs", title: "Eight graph algorithms", sub: "four of them, on the same graph.",
    url: "/graph",
    cam: [[0, 1.6, 0.47, 0.5]],
  },
  {
    id: "drive", clip: "controls", layout: "full", enter: "zoom", start: 60.4, dur: 8.0, parts: [{ src: 6.1, rate: 3.85 }],
    chapter: "08", area: "Controls", title: "You drive.", sub: "pause, step, scrub, slow it down.",
    chips: ["space · arrow keys", "0.25× to 4×", "scrubber"], url: "/sorting/quick-sort", say: "your speed, your call.", lt: "top",
    follow: { z: 1.85, y: 0.84 },
  },
  {
    id: "tabs", clip: "controls", layout: "right", enter: "morph", start: 68.4, dur: 4.4, parts: [{ src: 36.9, rate: 2.9 }],
    chapter: "08", area: "Controls", title: "Five code tabs", sub: "pseudocode, Python, C++, Java, JS.",
    chips: ["tested code", "copy-ready"], url: "/sorting/quick-sort", say: "pick your language!",
    follow: { z: 1.9, y: 0.45 },
  },
];

export const FEATURES_AT = 72.8;
export const END_AT = 77.6;
export const DURATION = 83;
