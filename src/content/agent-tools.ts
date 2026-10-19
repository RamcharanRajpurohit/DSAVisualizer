/**
 * Human-readable index of the WebMCP tools each page registers (for /agent-skills.md).
 * Keep in sync with the `useAgentTools` calls in each feature.
 */
export interface AgentToolDoc {
  name: string;
  args?: string;
  does: string;
}

const TREE_COMMON: AgentToolDoc[] = [
  { name: "tree_insert", args: "{keys: int[]}", does: "insert keys (animated); returns the resulting tree" },
  { name: "tree_delete", args: "{key}", does: "delete a key and explain which case applied" },
  { name: "tree_search", args: "{key}", does: "search and return the path of visited keys (read-only)" },
  { name: "tree_traversal", args: "{order}", does: "run a traversal and return the visit order" },
  { name: "get_tree", does: "current tree: level order, height, size (read-only)" },
  { name: "load_tree", args: "{keys}", does: "replace the tree with one built from these keys" },
  { name: "undo / redo", does: "step back or forward through whole operations" },
];

export const AGENT_TOOL_DOCS: readonly { page: string; tools: readonly AgentToolDoc[] }[] = [
  {
    page: "Sorting — /sorting and /sorting/*",
    tools: [
      { name: "sort_array", args: "{algorithm, values: int[] 0–999, autoplay?}", does: "load and animate; returns sorted output, comparisons, swaps/writes and step count" },
      { name: "set_sort_options", args: "{scheme: lomuto|hoare, pivot: last|first|middle|random|median3}", does: "quick sort options; re-records the current array" },
      { name: "load_input", args: "{kind: random|sorted|reversed|nearly_sorted|few_unique|worst_case|best_case, algorithm?, size?}", does: "load a preset input" },
      { name: "get_current_step", does: "current step title, explanation, pseudocode line, array state and counters (read-only)" },
      { name: "control_playback", args: "{action: play|pause|next|previous|first|last|seek, step?}", does: "drive the animation" },
      { name: "compare_algorithms", args: "{values, algorithms?}", does: "operation counts per algorithm without animating (read-only)" },
      { name: "race_algorithms", args: "{algorithms, size}", does: "open Compare mode, race them and return the finishing order" },
    ],
  },
  {
    page: "Graphs — /graph and /graph/*",
    tools: [
      { name: "load_graph", args: "{directed, weighted, nodes: A–Z[], edges: [{from,to,weight?}], start?}", does: "replace the graph; returns its adjacency list" },
      { name: "generate_graph", args: "{preset: random|dag|clusters|negative_edge, nodes 3–12, directed?, weighted?}", does: "generate a graph suited to an algorithm" },
      { name: "run_algorithm", args: "{algorithm: bfs|dfs|dijkstra|bellman_ford|kruskal|prim|topological_sort|scc, start?}", does: "animate and return visit order, distances+paths, MST, topological order or SCCs" },
      { name: "shortest_path", args: "{from, to}", does: "shortest path and cost (read-only)" },
      { name: "get_graph", does: "nodes, edges, adjacency list, start node (read-only)" },
      { name: "get_current_step", does: "current step, explanation and variables (read-only)" },
      { name: "control_playback", args: "{action, step?, speed?}", does: "drive the animation" },
    ],
  },
  {
    page: "Stack & Queue — /stack-queue and /stack-queue/*",
    tools: [
      { name: "stack_push / stack_pop", args: "{values?, reset?, capacity?}", does: "push or pop with overflow/underflow handling" },
      { name: "queue_enqueue / queue_dequeue", args: "{values?, variant: linear|circular}", does: "enqueue or dequeue; shows front/rear arithmetic" },
      { name: "deque_push / deque_pop", args: "{end: front|back, values?}", does: "double-ended queue operations" },
      { name: "convert_infix_to_postfix", args: "{expression}", does: "shunting-yard conversion with a short trace" },
      { name: "evaluate_postfix", args: "{expression}", does: "evaluate a postfix expression with a short trace" },
      { name: "check_balanced_brackets", args: "{text}", does: "balanced or not, and where it fails" },
      { name: "next_greater_elements", args: "{values}", does: "monotonic-stack next greater element for each value" },
      { name: "set_mode", args: "{mode}", does: "switch view (stack, queue, circular, deque, applications)" },
      { name: "get_state", does: "current structure contents and pointers (read-only)" },
    ],
  },
  {
    page: "Linked list — /linked-list and /linked-list/*",
    tools: [
      { name: "list_build", args: "{values}", does: "replace the list" },
      { name: "list_insert", args: "{position: head|tail|index, value, index?}", does: "insert with every pointer write animated" },
      { name: "list_delete", args: "{by: head|tail|index|value, value?, index?}", does: "delete a node" },
      { name: "list_search", args: "{value}", does: "search and return the index or not found" },
      { name: "list_reverse", does: "reverse in place (prev/curr/next)" },
      { name: "find_middle", does: "slow/fast pointers; returns the middle node" },
      { name: "detect_cycle", args: "{cycle_to?}", does: "Floyd's tortoise and hare; returns meeting point and cycle start" },
      { name: "set_list_kind", args: "{kind: singly|doubly|circular}", does: "switch list type" },
      { name: "get_list", does: "values, kind and pointers (read-only)" },
    ],
  },
  {
    page: "Heap — /heap and /heap/*",
    tools: [
      { name: "heap_insert", args: "{values}", does: "insert with sift-up" },
      { name: "heap_extract", does: "remove the root with sift-down" },
      { name: "heap_build", args: "{values}", does: "Floyd's O(n) build-heap" },
      { name: "heap_sort", args: "{values}", does: "in-place heap sort" },
      { name: "set_heap_type", args: "{type: min|max}", does: "switch min-/max-heap" },
      { name: "get_heap", does: "array and tree levels (read-only)" },
    ],
  },
  { page: "Binary search tree — /bst and /bst/*", tools: TREE_COMMON },
  {
    page: "AVL tree — /avl-tree and /avl-tree/*",
    tools: [...TREE_COMMON, { name: "play_rotation_demo", args: "{case: LL|RR|LR|RL|delete}", does: "play a rotation case step by step" }],
  },
  {
    page: "B-tree — /btree and /btree/*",
    tools: [...TREE_COMMON, { name: "set_order", args: "{order: 3–7}", does: "change the order and rebuild the current keys" }],
  },
];
