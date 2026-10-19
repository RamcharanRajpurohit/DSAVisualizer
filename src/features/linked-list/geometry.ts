/*
 * Pure geometry for the list drawing: node sizes, the multi-row layout (wrapping + scaling to fit the
 * canvas) and the routes of pointer arrows. All coordinates are in "natural" units; the canvas applies
 * one translate + scale on top.
 */
import type { ListKind, Place } from "./engine/types";

export type Pt = readonly [number, number];

export const G = {
  h: 40,
  dataW: 44,
  gap: 48,
  rowPitch: 196,
  laneDY: 100,
  top: 104,
  bottom: 178,
  ML: 80,
  MR: 66,
  /** Reserved for the HTML overlays (statement callout at the top, list strip at the bottom). */
  overlayTop: 46,
  overlayBottom: 46,
} as const;

export interface Dims {
  prevW: number;
  dataW: number;
  nextW: number;
  w: number;
  h: number;
}

export function dims(kind: ListKind): Dims {
  const dbl = kind === "doubly";
  const prevW = dbl ? 22 : 0;
  const nextW = dbl ? 22 : 24;
  return { prevW, dataW: G.dataW, nextW, w: prevW + G.dataW + nextW, h: G.h };
}

export interface Layout {
  cols: number;
  /** Distance between rows (smaller for multi-line drawings, which never park nodes below a row). */
  rowPitch: number;
  s: number;
  ox: number;
  oy: number;
  pitch: number;
  /** Box width used for slot spacing (widest kind in the recording). */
  slotW: number;
  lineRowStart: number[];
  lineRows: number[];
  natW: number;
  natH: number;
  /** x of the left / right routing margins (natural units). */
  leftX: number;
  rightX: number;
}

/**
 * Choose how many nodes per row so the drawing is as large as possible inside W × H.
 * `lineSlots[l]` = most slots line `l` ever needs during the recording (so the layout never jumps).
 */
export function computeLayout(pitchKind: ListKind, lineSlots: readonly number[], W: number, H: number): Layout {
  const d = dims(pitchKind);
  const pitch = d.w + G.gap;
  const lines = lineSlots.length ? lineSlots : [1];
  const maxSlots = Math.max(1, ...lines);
  const compact = lines.length > 1;
  const rowPitch = compact ? 134 : G.rowPitch;
  const bottom = compact ? 104 : G.bottom;
  const availH = Math.max(120, H - G.overlayTop - G.overlayBottom);
  const availW = Math.max(120, W - 16);
  // Scale each column count would allow; then take the fewest rows that are still comfortably readable.
  const options: { cols: number; s: number }[] = [];
  for (let c = maxSlots; c >= 1; c--) {
    const rows = lines.reduce((sum, n) => sum + Math.max(1, Math.ceil(n / c)), 0);
    const natW = G.ML + (c - 1) * pitch + d.w + G.MR;
    const natH = G.top + (rows - 1) * rowPitch + bottom;
    options.push({ cols: c, s: Math.min(1.05, availW / natW, availH / natH) });
  }
  const bestS = Math.max(...options.map((o) => o.s));
  const good = Math.min(0.8, bestS * 0.9);
  const pick = options.find((o) => o.s >= good) ?? options[0];
  const cols = pick.cols;
  const s = Math.max(0.28, pick.s);
  const lineRows = lines.map((n) => Math.max(1, Math.ceil(n / cols)));
  const lineRowStart: number[] = [];
  lineRows.reduce((acc, r, i) => { lineRowStart[i] = acc; return acc + r; }, 0);
  const totalRows = lineRows.reduce((a, b) => a + b, 0);
  const natW = G.ML + (cols - 1) * pitch + d.w + G.MR;
  const natH = G.top + (totalRows - 1) * rowPitch + bottom;
  return {
    cols, s, pitch, rowPitch, slotW: d.w, lineRowStart, lineRows, natW, natH,
    ox: (W - natW * s) / 2,
    oy: G.overlayTop + Math.max(0, (availH - natH * s) / 2),
    leftX: G.ML - 30,
    rightX: G.ML + (cols - 1) * pitch + d.w + 30,
  };
}

/** Centre of a node drawn at `p`, plus its global row index. */
export function placeXY(L: Layout, p: Place): { x: number; y: number; row: number } {
  const line = Math.min(p.line, L.lineRows.length - 1);
  const rows = L.lineRows[line] ?? 1;
  const r = Math.min(rows - 1, Math.floor(Math.max(0, p.slot) / L.cols));
  const col = p.slot - r * L.cols;
  const row = (L.lineRowStart[line] ?? 0) + r;
  return {
    x: G.ML + L.slotW / 2 + col * L.pitch,
    y: G.top + row * L.rowPitch + p.lane * G.laneDY,
    row,
  };
}

// ───────────────────────────── arrows ─────────────────────────────

export interface Box {
  cx: number;
  cy: number;
  w: number;
  h: number;
  prevW: number;
  nextW: number;
  row: number;
  lane: number;
}

/** Every arrow path has exactly this many cubic segments, so `d` can be tweened between any two routes. */
const N_SEG = 12;
type Seg = readonly [Pt, Pt, Pt];

const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
const mul = (a: Pt, k: number): Pt => [a[0] * k, a[1] * k];
const len = (a: Pt) => Math.hypot(a[0], a[1]);
const norm = (a: Pt): Pt => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };
const lineSeg = (a: Pt, b: Pt): Seg => [add(a, mul(sub(b, a), 1 / 3)), add(a, mul(sub(b, a), 2 / 3)), b];

/** Polyline with rounded corners as cubic segments. */
function poly(points: Pt[], r = 12): { start: Pt; segs: Seg[] } {
  const segs: Seg[] = [];
  let cur = points[0];
  for (let i = 1; i < points.length - 1; i++) {
    const c = points[i];
    const inV = sub(c, points[i - 1]);
    const outV = sub(points[i + 1], c);
    const rin = Math.min(r, len(inV) / 2);
    const rout = Math.min(r, len(outV) / 2);
    const a = sub(c, mul(norm(inV), rin));
    const b = add(c, mul(norm(outV), rout));
    segs.push(lineSeg(cur, a));
    segs.push([add(a, mul(norm(inV), rin * 0.55)), sub(b, mul(norm(outV), rout * 0.55)), b]);
    cur = b;
  }
  segs.push(lineSeg(cur, points[points.length - 1]));
  return { start: points[0], segs };
}

const f = (n: number) => (Math.round(n * 10) / 10).toString();

/** Serialise; pads at the front with zero-length segments so every path has N_SEG segments. */
function toD(start: Pt, segs: Seg[], mirror: boolean): string {
  const mx = (p: Pt): Pt => (mirror ? [-p[0], p[1]] : p);
  const s = mx(start);
  const pad: Seg[] = Array.from({ length: Math.max(0, N_SEG - segs.length) }, () => [start, start, start] as const);
  const all = [...pad, ...segs].slice(-N_SEG);
  return `M${f(s[0])} ${f(s[1])}` + all.map(([c1, c2, e]) => {
    const [a, b, c] = [mx(c1), mx(c2), mx(e)];
    return ` C${f(a[0])} ${f(a[1])} ${f(b[0])} ${f(b[1])} ${f(c[0])} ${f(c[1])}`;
  }).join("");
}

function arrowHead(tip: Pt, dir: Pt, mirror: boolean, size = 9): string {
  const d = norm(dir);
  const perp: Pt = [-d[1], d[0]];
  const base = sub(tip, mul(d, size));
  const pts = [tip, add(base, mul(perp, size * 0.5)), sub(base, mul(perp, size * 0.5))].map((p) => (mirror ? [-p[0], p[1]] : p));
  return `M${f(pts[0][0])} ${f(pts[0][1])} L${f(pts[1][0])} ${f(pts[1][1])} L${f(pts[2][0])} ${f(pts[2][1])} Z`;
}

/** Finish a route: pull the line end back under the arrowhead, serialise both. */
function finish(start: Pt, segs: Seg[], mirror: boolean) {
  const last = segs[segs.length - 1];
  const prevEnd = segs.length > 1 ? segs[segs.length - 2][2] : start;
  let dir = sub(last[2], last[1]);
  if (len(dir) < 0.5) dir = sub(last[2], last[0]);
  if (len(dir) < 0.5) dir = sub(last[2], prevEnd);
  const tip = last[2];
  const back = sub(tip, mul(norm(dir), 5));
  const segs2: Seg[] = [...segs.slice(0, -1), [last[0], last[1], back]];
  return { d: toD(start, segs2, mirror), head: arrowHead(tip, dir, mirror) };
}

export interface RouteCtx {
  dbl: boolean;
  leftX: number;
  rightX: number;
  direct: boolean;
}

/** Where a pointer field's dot sits. */
export function fieldDot(b: Box, field: "next" | "prev", dbl: boolean): Pt {
  return field === "next"
    ? [b.cx + b.w / 2 - b.nextW / 2, b.cy + (dbl ? -7 : 0)]
    : [b.cx - b.w / 2 + b.prevW / 2, b.cy + 7];
}

/**
 * Route a pointer from `src`'s field to `dst`. `prev` pointers are routed as mirror images of `next`
 * pointers (they leave from the left and run in their own lanes), so one routine covers both.
 */
export function routePointer(src: Box, dst: Box, field: "next" | "prev", ctx: RouteCtx): { d: string; head: string } {
  const mirror = field === "prev";
  const m = (b: Box): Box => (mirror ? { ...b, cx: -b.cx, prevW: b.nextW, nextW: b.prevW } : b);
  const S = m(src);
  const T = m(dst);
  const off = ctx.dbl ? (field === "next" ? -7 : 7) : 0;
  const P: Pt = [S.cx + S.w / 2 - S.nextW / 2, S.cy + off];
  const uLane = field === "next" ? 46 : 56;
  const backLane = field === "next" ? 64 : 72;
  const E = S.cx + S.w / 2;
  const Tl = T.cx - T.w / 2;
  const Tb = T.cy + T.h / 2;
  const Tt = T.cy - T.h / 2;
  const ty = T.cy + off;
  // Arrows that enter a node from below/above land left of centre, clear of the address caption.
  const ex = T.cx - 24;
  const leftX = mirror ? -ctx.rightX : ctx.leftX;
  // Backward pointers come up through the gap right of the target and enter its right edge (low),
  // so a run of flipped arrows (reverse) never shares a segment.
  const Tr = T.cx + T.w / 2;
  const xR = Tr + 14;
  const bY = T.cy + (ctx.dbl ? 15 : 10);

  if (S.row === T.row && S.lane === T.lane) {
    if (Tl >= E + 2) { const p = poly([P, [Tl, ty]]); return finish(p.start, p.segs, mirror); }
    const yU = S.cy + uLane;
    const p = poly([P, [P[0], yU], [xR, yU], [xR, bY], [Tr, bY]], 10);
    return finish(p.start, p.segs, mirror);
  }
  if (S.row === T.row || ctx.direct || (T.row > S.row && Tl >= E + 12)) {
    if (Tl >= E + 12) {
      const dx = Math.max(30, (Tl - P[0]) * 0.5);
      return finish(P, [[[P[0] + dx, P[1]], [Tl - dx, ty], [Tl, ty]]], mirror);
    }
    if (T.cy < S.cy) return finish(P, [[[P[0] + 46, P[1]], [ex, Tb + 46], [ex, Tb]]], mirror);
    return finish(P, [[[P[0] + 46, P[1]], [ex, Tt - 46], [ex, Tt]]], mirror);
  }
  if (T.row > S.row) {
    const Rx = E + 16;
    const gY = S.cy + uLane + 10;
    const xL = Tl - 20;
    const p = poly([P, [Rx, P[1]], [Rx, gY], [xL, gY], [xL, ty], [Tl, ty]], 12);
    return finish(p.start, p.segs, mirror);
  }
  const gY = S.cy + backLane;
  const tU = T.cy + backLane;
  if (Tl - leftX < 40) {
    // Target starts its row: come up the margin and enter from the left like a normal pointer.
    const q = poly([P, [P[0], gY], [leftX, gY], [leftX, ty], [Tl, ty]], 12);
    return finish(q.start, q.segs, mirror);
  }
  const p = poly([P, [P[0], gY], [leftX, gY], [leftX, tU], [xR, tU], [xR, bY], [Tr, bY]], 10);
  return finish(p.start, p.segs, mirror);
}

/** A NULL pointer: a short stub out of the field ending at a "NULL" chip. Returns the chip centre too. */
export function routeNull(src: Box, field: "next" | "prev", dbl: boolean): { d: string; head: string; chip: Pt } {
  const mirror = field === "prev";
  const S: Box = mirror ? { ...src, cx: -src.cx, prevW: src.nextW, nextW: src.prevW } : src;
  const off = dbl ? (field === "next" ? -7 : 7) : 0;
  const P: Pt = [S.cx + S.w / 2 - S.nextW / 2, S.cy + off];
  const end: Pt = [S.cx + S.w / 2 + 13, P[1]];
  const r = finish(P, [lineSeg(P, end)], mirror);
  const chip: Pt = [S.cx + S.w / 2 + 13 + 16, P[1]];
  return { ...r, chip: mirror ? [-chip[0], chip[1]] : chip };
}
