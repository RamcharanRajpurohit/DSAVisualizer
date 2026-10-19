/*
 * Share links for the graph page — the whole graph in a short, readable query string:
 *
 *   ?a=dijkstra&s=A&d=0&w=1&n=A12-50.B33-21.C33-79&e=AB4.AC2.CB-4
 *
 *   a  algorithm key               s  start node label
 *   d  1 = directed                w  0 = unweighted (weights are still kept for later)
 *   n  nodes: <label><x>-<y>, x / y = position in % of a landscape box, joined by "."
 *   e  edges: <from><to><weight>, joined by "." (weight optional, default 1)
 *
 * Only characters URLSearchParams leaves unescaped are used (letters, digits, "-", "."), so the
 * link stays compact. Decoding validates everything; anything malformed is ignored and the page
 * falls back to its default example.
 *
 * Pure TS with relative imports only (runnable under tsx for the round-trip script).
 */
import { ALGO_ORDER } from "./algorithms";
import type { GraphExport } from "./engine/GraphEngine";
import { MAX_NODES, WEIGHT_MAX, WEIGHT_MIN } from "./graphModel";
import type { GraphSpec } from "./layout";
import type { AlgoKey } from "./types";

export type GraphShareParams = Record<string, string>;

const pct = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 100);

export function encodeGraphShare(g: GraphExport, algo: AlgoKey): GraphShareParams {
  const p: GraphShareParams = { a: algo };
  if (g.start) p.s = g.start;
  p.d = g.directed ? "1" : "0";
  p.w = g.weighted ? "1" : "0";
  if (g.nodes.length) p.n = g.nodes.map((n) => `${n.label}${pct(n.x)}-${pct(n.y)}`).join(".");
  if (g.edges.length) p.e = g.edges.map((e) => `${e.u}${e.v}${e.w}`).join(".");
  return p;
}

export const parseAlgo = (v: string | null | undefined): AlgoKey | null =>
  v && (ALGO_ORDER as readonly string[]).includes(v) ? (v as AlgoKey) : null;

const NODE_RE = /^([A-Z])(\d{1,3})-(\d{1,3})$/;
const EDGE_RE = /^([A-Z])([A-Z])(-?\d{1,2})?$/;

interface Getter {
  get(name: string): string | null;
}

/**
 * The graph a link describes, as a spec the engine can build — or null when the link has no
 * graph or any part of it is malformed (bad token, unknown node, self-loop, duplicate edge…).
 */
export function decodeGraphShare(q: Getter): GraphSpec | null {
  const nRaw = q.get("n");
  if (!nRaw || nRaw.length > MAX_NODES * 9) return null;
  const directed = q.get("d") === "1";
  const weighted = q.get("w") !== "0";

  const labels: string[] = [];
  const pos: [number, number][] = [];
  for (const tok of nRaw.split(".")) {
    const m = NODE_RE.exec(tok);
    if (!m) return null;
    const [, label, xs, ys] = m;
    const x = Number(xs);
    const y = Number(ys);
    if (x > 100 || y > 100 || labels.includes(label)) return null;
    labels.push(label);
    pos.push([x * 10, y * 5.6]); // back into the 1000 × 560 preset box
  }
  if (!labels.length || labels.length > MAX_NODES) return null;

  const index = new Map(labels.map((l, i) => [l, i]));
  const edges: [number, number, number][] = [];
  const seen = new Set<string>();
  const eRaw = q.get("e") ?? "";
  if (eRaw.length > MAX_NODES * MAX_NODES * 5) return null;
  for (const tok of eRaw ? eRaw.split(".") : []) {
    const m = EDGE_RE.exec(tok);
    if (!m) return null;
    const [, a, b, ws] = m;
    const u = index.get(a);
    const v = index.get(b);
    const w = ws === undefined ? 1 : Number(ws);
    if (u === undefined || v === undefined || u === v || w < WEIGHT_MIN || w > WEIGHT_MAX) return null;
    const key = directed ? `${a}>${b}` : [a, b].sort().join("-");
    if (seen.has(key)) return null;
    seen.add(key);
    edges.push([u, v, w]);
  }

  const startLabel = q.get("s");
  const start = startLabel ? index.get(startLabel) : undefined;
  const algo = parseAlgo(q.get("a"));
  return {
    n: labels.length,
    labels,
    pos,
    edges,
    directed,
    weighted,
    start: start ?? 0,
    title: "Shared graph loaded",
    detail:
      `This link rebuilt a ${directed ? "directed" : "undirected"}, ${weighted ? "weighted" : "unweighted"} graph with ` +
      `${labels.length} node${labels.length === 1 ? "" : "s"} and ${edges.length} edge${edges.length === 1 ? "" : "s"}.` +
      (algo ? ` Press **Run** to play it.` : " Pick an algorithm and press **Run**."),
  };
}
