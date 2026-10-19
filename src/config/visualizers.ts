/**
 * Single source of truth for every visualizer: the home page cards, the navbar,
 * the sitemap and each page's metadata are all generated from this list.
 */
export type VisualizerCategory = "Linear" | "Trees" | "Graphs" | "Algorithms";

export type VisualizerIcon =
  | "sort" | "stack" | "link" | "heap" | "bst" | "avl" | "btree" | "graph";

export interface VisualizerMeta {
  slug: string;
  href: `/${string}`;
  title: string;
  short: string;
  description: string;
  category: VisualizerCategory;
  icon: VisualizerIcon;
  topics: string[];
}

export const VISUALIZERS: readonly VisualizerMeta[] = [
  {
    slug: "sorting",
    href: "/sorting",
    title: "Sorting Algorithms",
    short: "Sorting",
    description:
      "Bubble, selection, insertion, merge and quick sort, step by step. Merge sort shows the real divide-and-conquer split tree; quick sort shows partitioning with live i / j pointers.",
    category: "Algorithms",
    icon: "sort",
    topics: ["Merge sort tree", "Partitioning", "Pseudocode"],
  },
  {
    slug: "stack-queue",
    href: "/stack-queue",
    title: "Stack & Queue",
    short: "Stack & Queue",
    description:
      "LIFO stacks, FIFO queues, circular queues and deques — plus classic applications like bracket matching and infix → postfix conversion.",
    category: "Linear",
    icon: "stack",
    topics: ["Push / Pop", "Circular queue", "Applications"],
  },
  {
    slug: "linked-list",
    href: "/linked-list",
    title: "Linked List",
    short: "Linked List",
    description:
      "Singly and doubly linked lists with animated pointer rewiring for insert, delete, search and in-place reversal.",
    category: "Linear",
    icon: "link",
    topics: ["Pointers", "Reversal", "Doubly linked"],
  },
  {
    slug: "heap",
    href: "/heap",
    title: "Binary Heap",
    short: "Heap",
    description:
      "Min-heap and max-heap shown as a tree and as the array behind it. Watch sift-up, sift-down, build-heap and heap sort swap by swap.",
    category: "Trees",
    icon: "heap",
    topics: ["Sift up / down", "Build heap", "Heap sort"],
  },
  {
    slug: "bst",
    href: "/bst",
    title: "Binary Search Tree",
    short: "BST",
    description:
      "Insert, delete and search with an animated walk down the tree, plus preorder, inorder, postorder and level-order traversals.",
    category: "Trees",
    icon: "bst",
    topics: ["Search path", "Deletion cases", "Traversals"],
  },
  {
    slug: "avl-tree",
    href: "/avl-tree",
    title: "AVL Tree",
    short: "AVL",
    description:
      "Self-balancing BST. Heights and balance factors update live and every LL, RR, LR and RL rotation is played out node by node.",
    category: "Trees",
    icon: "avl",
    topics: ["Rotations", "Balance factor", "Demos"],
  },
  {
    slug: "btree",
    href: "/btree",
    title: "B-Tree",
    short: "B-Tree",
    description:
      "Multi-way search tree of any order. Keys keep their identity, so you watch medians rise on a split, separators drop on a merge, and keys borrowed through the parent.",
    category: "Trees",
    icon: "btree",
    topics: ["Split", "Merge", "Borrow"],
  },
  {
    slug: "graph",
    href: "/graph",
    title: "Graph Algorithms",
    short: "Graphs",
    description:
      "Build your own graph and run BFS, DFS, Dijkstra, Bellman-Ford, Kruskal, Prim, topological sort and SCCs with full step-by-step playback.",
    category: "Graphs",
    icon: "graph",
    topics: ["Shortest paths", "MST", "Traversals"],
  },
];

export const getVisualizer = (slug: string) => {
  const v = VISUALIZERS.find((x) => x.slug === slug);
  if (!v) throw new Error(`Unknown visualizer: ${slug}`);
  return v;
};
