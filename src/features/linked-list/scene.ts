/*
 * Turns one recorded step into everything the SVG needs: node boxes with positions, routed pointer
 * arrows (keyed by source + field + target so a rewire = old arrow out, new arrow drawn in), NULL stubs,
 * stacked pointer tags and unreachable ("leaked") nodes. Pure — no React.
 */
import { tagStyle, PTR_COLOR } from "./constants";
import type { LLStep, NodeSnap } from "./engine/types";
import { dims, placeXY, routeNull, routePointer, type Box, type Dims, type Layout, type Pt } from "./geometry";

export interface SceneNode {
  id: string;
  x: number;
  y: number;
  box: Box;
  d: Dims;
  snap: NodeSnap;
  index?: number;
  leaked: boolean;
}

export interface SceneArrow {
  key: string;
  d: string;
  head: string;
  color: string;
  hot: boolean;
  dim: boolean;
}

export interface SceneNull extends SceneArrow {
  chip: Pt;
}

export interface SceneTag {
  name: string;
  x: number;
  y: number;
  color: string;
  below: boolean;
  /** Draw a NULL chip under the tag (a NULL pointer that has no stub to sit on). */
  chip: boolean;
  isNull: boolean;
}

export interface Scene {
  nodes: SceneNode[];
  arrows: SceneArrow[];
  nulls: SceneNull[];
  tags: SceneTag[];
  leaked: number;
}

const PILL_GAP = 19;

export function buildScene(step: LLStep, L: Layout): Scene {
  const d = dims(step.kind);
  const dbl = step.kind === "doubly";
  const byId = new Map(step.nodes.map((n) => [n.id, n]));

  // Reachability from every named pointer (anything else is garbage / leaked memory).
  const reach = new Set<string>();
  const stack = step.ptrs.map((p) => p.to).filter((x): x is string => !!x);
  while (stack.length) {
    const id = stack.pop()!;
    if (reach.has(id) || !byId.has(id)) continue;
    reach.add(id);
    const n = byId.get(id)!;
    if (n.next) stack.push(n.next);
    if (n.prev) stack.push(n.prev);
  }

  const nodes: SceneNode[] = step.nodes.map((n) => {
    const p = placeXY(L, n.place);
    const box: Box = { cx: p.x, cy: p.y, w: d.w, h: d.h, prevW: d.prevW, nextW: d.nextW, row: p.row, lane: n.place.lane };
    const index = !step.direct && n.place.line === 0 && n.place.lane === 0 && Number.isInteger(n.place.slot) ? n.place.slot : undefined;
    return { id: n.id, x: p.x, y: p.y, box, d, snap: n, index, leaked: !reach.has(n.id) };
  });
  const sn = new Map(nodes.map((n) => [n.id, n]));
  const ctx = { dbl, leftX: L.leftX, rightX: L.rightX, direct: !!step.direct };

  const arrows: SceneArrow[] = [];
  const nulls: SceneNull[] = [];
  for (const n of nodes) {
    const fields: ("next" | "prev")[] = dbl ? ["next", "prev"] : ["next"];
    for (const field of fields) {
      const to = field === "next" ? n.snap.next : n.snap.prev;
      const hot = n.snap.hot.includes(field);
      const base = field === "next" ? PTR_COLOR.next : PTR_COLOR.prev;
      const color = n.leaked ? PTR_COLOR.dim : hot ? PTR_COLOR.hot : base;
      if (to && sn.has(to)) {
        const r = routePointer(n.box, sn.get(to)!.box, field, ctx);
        arrows.push({ key: `${n.id}>${field}>${to}`, ...r, color, hot, dim: n.leaked });
      } else {
        const r = routeNull(n.box, field, dbl);
        nulls.push({ key: `${n.id}>${field}>null`, ...r, color, hot, dim: n.leaked });
      }
    }
  }

  // Pointer tags, stacked per target (lower `order` sits closest to the node).
  const tags: SceneTag[] = [];
  const groups = new Map<string, { names: string[]; x: number; y: number; below: boolean; isNull: boolean; chip: boolean }>();
  const line0 = nodes.filter((n) => n.snap.place.line === 0 && n.snap.place.lane === 0);
  const endNode = line0.reduce<SceneNode | null>((a, b) => (!a || b.snap.place.slot > a.snap.place.slot ? b : a), null);
  for (const p of step.ptrs) {
    if (p.to && sn.has(p.to)) {
      const t = sn.get(p.to)!;
      const below = t.snap.place.lane > 0;
      const g = groups.get(p.to) ?? { names: [], x: t.x, y: below ? t.y + d.h / 2 + 30 : t.y - d.h / 2 - 14, below, isNull: false, chip: false };
      g.names.push(p.name);
      groups.set(p.to, g);
      continue;
    }
    // NULL pointer: sit on a nearby NULL stub if there is one, otherwise draw our own NULL chip.
    let want: Pt;
    if (p.at) {
      const q = placeXY(L, p.at);
      want = [q.x, q.y];
    } else if (endNode) {
      want = [endNode.x + d.w / 2 + 29, endNode.y + (dbl ? -7 : 0)];
    } else {
      const q = placeXY(L, { line: 0, slot: 0, lane: 0 });
      want = [q.x, q.y];
    }
    let best: SceneNull | null = null;
    let bestD = 64;
    for (const nl of nulls) {
      const dd = Math.hypot(nl.chip[0] - want[0], nl.chip[1] - want[1]);
      if (dd < bestD) { bestD = dd; best = nl; }
    }
    const pos: Pt = best ? best.chip : want;
    const key = `null@${Math.round(pos[0])},${Math.round(pos[1])}`;
    const g = groups.get(key) ?? { names: [], x: pos[0], y: pos[1] - 7 - 14, below: false, isNull: true, chip: !best };
    g.names.push(p.name);
    groups.set(key, g);
  }
  for (const g of groups.values()) {
    g.names.sort((a, b) => tagStyle(a).order - tagStyle(b).order);
    g.names.forEach((name, k) => {
      tags.push({
        name, x: g.x, y: g.below ? g.y + k * PILL_GAP : g.y - k * PILL_GAP,
        color: tagStyle(name).color, below: g.below, chip: g.chip && k === 0, isNull: g.isNull,
      });
    });
  }

  return { nodes, arrows, nulls, tags, leaked: nodes.filter((n) => n.leaked).length };
}

/** Values reachable from head (for the list strip under the canvas). */
export function readFromHead(step: LLStep): { label: string; values: string[]; end: "null" | "ring" | "cycle" | "none"; cycleTo?: string } {
  const byId = new Map(step.nodes.map((n) => [n.id, n]));
  const start = step.ptrs.find((p) => p.name === "head") ?? step.ptrs.find((p) => p.name === "dummy");
  if (!start) return { label: "", values: [], end: "none" };
  const values: string[] = [];
  const seen = new Set<string>();
  let c = start.to;
  while (c && byId.has(c) && !seen.has(c)) {
    seen.add(c);
    const n = byId.get(c)!;
    values.push(n.label ?? String(n.value));
    c = n.next;
  }
  if (!c || !byId.has(c)) return { label: start.name, values, end: "null" };
  if (c === start.to) return { label: start.name, values, end: "ring" };
  const n = byId.get(c)!;
  return { label: start.name, values, end: "cycle", cycleTo: n.label ?? String(n.value) };
}
