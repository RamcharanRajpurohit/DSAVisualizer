/*
 * Geometry for the quick sort canvas: the main array row (with one spare column on each
 * side so i = lo − 1 and j = hi + 1 have somewhere to point), then the recursion tree drawn
 * as an icicle chart whose columns line up with the array.
 */

export const STRIP_H = 46;

export interface QuickLayout {
  pitch: number;
  c: number;
  gap: number;
  x0: number;
  bracketY: number;
  cellsY: number;
  idxY: number;
  regionY: number;
  ptrY: { i: number; j: number };
  treeHeaderY: number;
  treeTop: number;
  rowH: number;
  showIdx: boolean;
}

/** Left edge of the cell at index k (k may be −1 or n). */
export const colX = (L: QuickLayout, k: number) => L.x0 + (k + 1) * L.pitch + L.gap / 2;

export function layoutQuick(n: number, rows: number, W: number, H: number): QuickLayout | null {
  if (n === 0 || W <= 0 || H <= 0) return null;
  const pitch = Math.min(78, (W - 24) / (n + 2));
  const c = Math.max(12, Math.min(62, pitch * 0.84));
  const gap = pitch - c;
  const x0 = (W - (n + 2) * pitch) / 2;
  const showIdx = c >= 18;

  // Natural (top-aligned) positions.
  const bracketY = 0;
  const cellsY = bracketY + 52;
  const idxY = cellsY + c + 3;
  const regionY = idxY + (showIdx ? 13 : 2);
  const ptrI = regionY + 17;
  const ptrJ = ptrI + 24;
  const treeHeaderY = ptrJ + 32;
  const treeTop = treeHeaderY + 20;

  const avail = H - STRIP_H - 8 - treeTop - 10;
  const rowH = Math.max(7, Math.min(34, c * 0.9, avail / Math.max(1, rows)));
  const used = treeTop + rows * rowH;
  const shift = STRIP_H + 8 + Math.max(0, Math.min(110, (H - STRIP_H - 8 - used - 10) / 2.4));

  return {
    pitch,
    c,
    gap,
    x0,
    bracketY: bracketY + shift,
    cellsY: cellsY + shift,
    idxY: idxY + shift,
    regionY: regionY + shift,
    ptrY: { i: ptrI + shift, j: ptrJ + shift },
    treeHeaderY: treeHeaderY + shift,
    treeTop: treeTop + shift,
    rowH,
    showIdx,
  };
}
