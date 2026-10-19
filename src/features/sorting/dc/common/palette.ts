import { VIZ, type Triple } from "@/lib/theme";

/** Pointer colours shared by the merge and quick sort canvases (strong outlines, readable on paper). */
export const POINTER_COLOR = {
  i: VIZ.left[1],
  j: VIZ.right[1],
  k: VIZ.pivot[1],
  amber: VIZ.active[1],
} as const;

export const AMBER = VIZ.active[1];

/** Soft, neutral drop shadow — the only kind of shadow on the paper theme. */
const SOFT = "0 1px 3px 0px rgba(0,0,0,0.14)";

/** Two-shadow strings (same structure every time so motion can tween between them): an outline ring + a soft lift. */
export const SHADOW = {
  none: "0 0 0 0px rgba(0,0,0,0), 0 0 0px 0px rgba(0,0,0,0)",
  focus: `0 0 0 2px ${AMBER}, ${SOFT}`,
  candidate: `0 0 0 2px ${VIZ.compare[1]}, ${SOFT}`,
  /** Highlighted without an extra ring (pivot, finished cells). */
  lift: `0 0 0 0px rgba(0,0,0,0), ${SOFT}`,
} as const;

export const hexA = (hex: string, a: number) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((x) => x + x).join("") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export type { Triple };
