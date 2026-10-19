import type { MergeTree } from "./record";

/*
 * Geometry for the merge-sort split tree. Leaves are laid out left to right with gaps that
 * grow with the level of the split between them, and every box is centred over the span of
 * its leaves — the classic textbook picture. Everything scales to the canvas size; when the
 * canvas is tight the gaps shrink first so the cells stay readable.
 */

export const STRIP_H = 46;
const LABEL_H = 15;
const IDX_H = 12;
const PTR_H = 21;
const MAX_CELL = 60;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MergeLayout {
  /** Slot pitch (= cell box size). */
  c: number;
  /** Drawn element size (slightly smaller than the pitch). */
  inner: number;
  pad: number;
  /** slotX[node][slot] = left edge of that slot. */
  slotX: number[][];
  box: Rect[];
  /** Top of the cells on each level. */
  rowTop: number[];
  rowH: number;
  showIdx: boolean;
  showLabels: boolean;
  /** Left gutter used for "depth d" labels (0 when there is no room). */
  gutter: number;
  idxH: number;
  labelH: number;
}

interface Spacing {
  gutter: number;
  margin: number;
  pad: number;
  minGap: number;
  /** Extra gap per split level, as a fraction of the cell size. */
  G: number;
}

export function layoutMerge(tree: MergeTree, W: number, H: number): MergeLayout | null {
  const { n, levels, nodes, splitDepth } = tree;
  if (n === 0 || W <= 0 || H <= 0) return null;

  const maxSplit = splitDepth.length ? Math.max(...splitDepth) : 0;
  const weight = (d: number) => 1 + 0.8 * (maxSplit - d);
  const sumW = splitDepth.reduce((s, d) => s + weight(d), 0);
  const cH = (H - STRIP_H - 12) / levels - (LABEL_H + IDX_H + PTR_H + 6);
  const cellFor = (sp: Spacing) =>
    Math.min(MAX_CELL, cH, (W - sp.gutter - 2 * sp.margin - 2 * sp.pad - (n - 1) * sp.minGap) / (n + sp.G * sumW));

  const roomy: Spacing = { gutter: W >= 900 || (W >= 700 && n <= 8) ? 64 : 0, margin: 14, pad: 3, minGap: 10, G: 0.28 };
  const compact: Spacing = { gutter: 0, margin: 8, pad: 2, minGap: 6, G: 0.1 };
  let sp = roomy;
  if (cellFor(roomy) < 34 && cellFor(compact) > cellFor(roomy)) {
    // Prefer the roomy look while it costs little; otherwise squeeze the gaps.
    sp = cellFor(compact) - cellFor(roomy) > 3 ? compact : roomy;
  }
  const { gutter, pad, minGap, G } = sp;
  const c = Math.max(12, cellFor(sp));
  const inner = Math.max(10, c - Math.max(3, c * 0.08));
  const showIdx = c >= 20;
  const showLabels = c >= 18;

  const gapAfter = (k: number) => G * weight(splitDepth[k]) * c + minGap;
  let totalW = n * c + 2 * pad;
  for (let k = 0; k < n - 1; k++) totalW += gapAfter(k);
  const x0 = gutter + Math.max(sp.margin, (W - gutter - totalW) / 2) + pad;

  const leafX: number[] = [];
  let cursor = x0;
  for (let k = 0; k < n; k++) {
    leafX.push(cursor);
    cursor += c + (k < n - 1 ? gapAfter(k) : 0);
  }

  const idxH = showIdx ? IDX_H : 2;
  const base = LABEL_H + c + idxH + PTR_H;
  const free = H - STRIP_H - 12 - levels * base;
  const gapV = levels > 1 ? Math.max(6, Math.min(56, free / (levels - 1))) : 0;
  const rowH = base + gapV;
  const totalH = levels * base + (levels - 1) * gapV;
  const y0 = STRIP_H + Math.max(4, (H - STRIP_H - totalH) / 2);
  const rowTop = Array.from({ length: levels }, (_, d) => y0 + d * rowH + LABEL_H);

  const slotX: number[][] = [];
  const box: Rect[] = [];
  for (const nd of nodes) {
    const len = nd.hi - nd.lo + 1;
    const center = (leafX[nd.lo] + leafX[nd.hi] + c) / 2;
    const start = center - (len * c) / 2;
    slotX[nd.id] = Array.from({ length: len }, (_, s) => start + s * c);
    box[nd.id] = { x: start - pad, y: rowTop[nd.depth] - pad, w: len * c + 2 * pad, h: c + 2 * pad };
  }

  return { c, inner, pad, slotX, box, rowTop, rowH, showIdx, showLabels, gutter, idxH, labelH: LABEL_H };
}
