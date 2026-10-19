import type { StepBase } from "@/lib/player/types";
import type { Tone } from "@/lib/theme";

/** Union-find set / strongly connected component colour tag: "c0", "c1", … */
export type CompTag = `c${number}`;

export type NodeState = "frontier" | "current" | "visited" | "danger" | "selected" | CompTag;
export type EdgeState = "active" | "tree" | "frontier" | "rejected" | "faded" | CompTag;
export type ChipTone = "base" | "frontier" | "current" | "ok" | "dim" | "danger" | CompTag;

/** One token in the data-structure strip at the top of the canvas (queue entry, edge, …). */
export interface Chip {
  key: string;
  text: string;
  tone: ChipTone;
  /** The node this chip stands for — it flies out of / back into that node. */
  node?: string;
  /** The edge this chip stands for — it flies out of / back into that edge's weight label. */
  edge?: string;
}

export interface ChipRow {
  /** Title drawn left of the row; "\n" splits it onto two lines. */
  title: string;
  items: Chip[];
}

/** A glowing comet that runs along `edge`, starting at node `from`. */
export interface Travel {
  edge: string;
  from: string;
  style: EdgeState;
}

/** A complete picture of the algorithm at one moment. */
export interface GraphStep extends StepBase {
  nodes: Record<string, NodeState>;
  edges: Record<string, EdgeState>;
  badges: Record<string, string>;
  rows: ChipRow[];
  /** SCC phase 2 draws every arrow reversed. */
  transposed: boolean;
  travel?: Travel;
}

// ───────────────────────────── graph data ─────────────────────────────

export interface GNode {
  id: string;
  label: string;
}

export interface GEdge {
  id: string;
  u: string;
  v: string;
  w: number;
}

export interface Adj {
  v: string;
  e: GEdge;
  /** Effective weight (1 when the graph is unweighted). */
  w: number;
}

/** Read-only view of the graph that the algorithms run on. */
export interface Graph {
  directed: boolean;
  weighted: boolean;
  /** Sorted by label. */
  nodes: GNode[];
  edges: GEdge[];
  hasNeg: boolean;
  w(e: GEdge): number;
  L(id: string): string;
  /** Outgoing neighbours (both directions when undirected), sorted by label. */
  adj(id: string): Adj[];
  /** Incoming neighbours (the transpose), sorted by label. */
  radj(id: string): Adj[];
  edge(id: string): GEdge;
  other(e: GEdge, id: string): string;
  name(e: GEdge): string;
}

// ───────────────────────────── registry / UI ─────────────────────────────

export type AlgoKey = "bfs" | "dfs" | "dijkstra" | "bellmanFord" | "kruskal" | "prim" | "topo" | "scc";

export type Tool = "move" | "node" | "edge" | "delete";

export type PresetKind = "random" | "dag" | "scc" | "negative";

export type ReprMode = "matrix" | "list";

export interface Status {
  title: string;
  detail?: string;
  tone: Tone;
}
