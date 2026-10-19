import type { Adj, GEdge, GNode, Graph } from "./types";

export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
export const MAX_NODES = LETTERS.length;
export const WEIGHT_MIN = -99;
export const WEIGHT_MAX = 99;

export const byLabel = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Freeze the editable graph into the read-only structure every algorithm runs on. */
export function makeGraph(rawNodes: readonly GNode[], rawEdges: readonly GEdge[], directed: boolean, weighted: boolean): Graph {
  const nodes = rawNodes.map((n) => ({ id: n.id, label: n.label })).sort((a, b) => byLabel(a.label, b.label));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edges = rawEdges.map((e) => ({ ...e }));
  const eById = new Map(edges.map((e) => [e.id, e]));
  const w = (e: GEdge) => (weighted ? e.w : 1);
  const L = (id: string) => byId.get(id)?.label ?? "?";
  const adj = new Map<string, Adj[]>(nodes.map((n) => [n.id, []]));
  const radj = new Map<string, Adj[]>(nodes.map((n) => [n.id, []]));
  edges.forEach((e) => {
    adj.get(e.u)?.push({ v: e.v, e, w: w(e) });
    radj.get(e.v)?.push({ v: e.u, e, w: w(e) });
    if (!directed) adj.get(e.v)?.push({ v: e.u, e, w: w(e) });
  });
  const order = (a: Adj, b: Adj) => byLabel(L(a.v), L(b.v));
  adj.forEach((l) => l.sort(order));
  radj.forEach((l) => l.sort(order));
  return {
    directed,
    weighted,
    nodes,
    edges,
    w,
    L,
    adj: (id) => adj.get(id) ?? [],
    radj: (id) => radj.get(id) ?? [],
    edge: (id) => {
      const e = eById.get(id);
      if (!e) throw new Error(`Unknown edge ${id}`);
      return e;
    },
    other: (e, id) => (e.u === id ? e.v : e.u),
    name: (e) => `${L(e.u)}${directed ? "→" : "–"}${L(e.v)}`,
    hasNeg: weighted && edges.some((e) => e.w < 0),
  };
}
