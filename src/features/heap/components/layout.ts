import { clamp } from "@/lib/utils";

/**
 * Geometry for the two synced views, computed from the canvas size and the largest array the
 * current recording ever holds (so positions stay put for the whole operation).
 *
 *   ┌─────────────────────────────────────────┐
 *   │ HUD                              tray ○ │  ← removed keys
 *   │ L0            ○ root                    │
 *   │ L1      ○            ○                  │  complete binary tree, one row per level,
 *   │ L2   ○     ○     ○      ○               │  fixed slots so a key's position depends
 *   │ …                                       │  only on its index
 *   │        parent(5) = ⌊(5 − 1) / 2⌋ = 2     │  ← formula
 *   │            i         p                  │  ← pointers
 *   │  0   1   2   3   4   5 …                │  ← indices
 *   │ [61][54][48][35][40][23] …              │  ← backing array
 *   │          ╰─────parent─────╯             │  ← index relation arcs
 *   └─────────────────────────────────────────┘
 */
export interface HeapLayout {
  W: number;
  H: number;
  pad: number;
  depth: number;
  gutter: number;
  treeLeft: number;
  treeW: number;
  rootY: number;
  gap: number;
  r: number;
  nodeFont: number;
  slots: number;
  /** The array wraps onto two rows when one row would make cells too small (phones). */
  rows: number;
  /** Room for pointer chips, the sorted marker label and index arcs (one array row, tall enough canvas). */
  detail: boolean;
  perRow: number;
  rowGap: number;
  cs: number;
  arrLeft: number;
  /** Top of the first array row. */
  cellY: number;
  cellFont: number;
  idxY: number;
  ptrY: number;
  formulaY: number;
  arcBase: number;
  arcDepth: number;
}

export const levelOf = (i: number) => Math.floor(Math.log2(i + 1));

export function computeLayout(W: number, H: number, cap: number): HeapLayout {
  const pad = 14;
  const slots = Math.max(1, cap);
  const depth = slots <= 1 ? 0 : Math.floor(Math.log2(slots));
  const gutter = W >= 640 ? 60 : 0;

  // Backing array strip at the bottom (one row, or two rows when one row would be cramped).
  const oneRow = Math.floor((W - 2 * pad) / Math.max(slots, 8));
  const rows = oneRow < 18 && slots > 8 ? 2 : 1;
  const perRow = Math.ceil(slots / rows);
  const rowGap = 16;
  const cs = clamp(Math.floor((W - 2 * pad) / Math.max(perRow, 8)), 12, 48);
  // A short canvas (a phone held sideways) drops the pointer row and index arcs so the tree keeps its levels.
  const detail = rows === 1 && H >= 320;
  const arcDepth = detail ? clamp(cs * 0.8, 16, 34) : 0;
  const arcBase = H - (detail ? 22 + arcDepth : 14);
  const cellY = arcBase - rows * cs - (rows - 1) * rowGap;
  const idxY = cellY - 6;
  const ptrY = detail ? idxY - 24 : idxY;
  const formulaY = detail ? ptrY - 22 : idxY - 18;
  const arrLeft = (W - perRow * cs) / 2;

  // Tree above it.
  const treeLeft = pad + gutter;
  const treeW = Math.max(40, W - treeLeft - pad);
  const rW = (treeW / 2 ** depth) * 0.4;
  const topY = H >= 320 ? 50 : 36; // room for a callout above the root
  let r = clamp(rW, 9, 24);
  const bottom = formulaY - 36; // index labels under the deepest level + the formula pill
  const avail = Math.max(0, bottom - r - (topY + r));
  const gap = depth ? Math.min(avail / depth, 112) : 0;
  r = clamp(Math.min(rW, depth ? gap * 0.34 : 24), 8, 24);
  const rootY = topY + r + Math.max(0, (avail - depth * gap) * 0.35);

  return {
    W, H, pad, depth, gutter, treeLeft, treeW, rootY, gap, r,
    nodeFont: clamp(r * 0.72, 8, 15),
    slots, rows, detail, perRow, rowGap, cs, arrLeft, cellY,
    cellFont: clamp(cs * 0.36, 8, 14),
    idxY, ptrY, formulaY, arcBase, arcDepth,
  };
}

export function nodeXY(L: HeapLayout, i: number) {
  const d = levelOf(i);
  const slotW = L.treeW / 2 ** d;
  return { x: L.treeLeft + (i - (2 ** d - 1) + 0.5) * slotW, y: L.rootY + d * L.gap };
}

/** Horizontal room each node has on level d (used to hide labels that would collide). */
export const slotWidth = (L: HeapLayout, d: number) => L.treeW / 2 ** d;

/** Centre of array cell i (row-aware). */
export function cellXY(L: HeapLayout, i: number) {
  const row = Math.floor(i / L.perRow);
  const col = i % L.perRow;
  return { x: L.arrLeft + col * L.cs + L.cs / 2, y: L.cellY + row * (L.cs + L.rowGap) + L.cs / 2, row, col };
}

export const cellCX = (L: HeapLayout, i: number) => cellXY(L, i).x;

/** Removed keys wait in a tray at the top-right corner. */
export function trayXY(L: HeapLayout, k: number) {
  return { x: L.W - L.pad - L.r - 6 - k * (2 * L.r + 12), y: L.rootY };
}
