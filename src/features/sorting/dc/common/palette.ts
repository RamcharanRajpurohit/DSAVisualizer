import { VIZ, type Triple } from "@/lib/theme";

/** Pointer colours shared by the merge and quick sort canvases. */
export const POINTER_COLOR = {
  i: VIZ.left[1],
  j: VIZ.right[1],
  k: "#ff7ac6",
  amber: VIZ.active[1],
} as const;

export const AMBER = VIZ.active[1];
export const AMBER_GLOW = "rgba(255,176,0,0.55)";

/** Two-shadow strings (same structure every time so motion can tween between them). */
export const SHADOW = {
  none: "0 0 0 0px rgba(0,0,0,0), 0 0 0px 0px rgba(0,0,0,0)",
  focus: `0 0 0 2px ${AMBER}, 0 0 18px 3px ${AMBER_GLOW}`,
  candidate: "0 0 0 2px rgba(90,180,255,0.9), 0 0 12px 1px rgba(57,170,255,0.35)",
  glow: (rgba: string) => `0 0 0 0px rgba(0,0,0,0), 0 0 14px 0px ${rgba}`,
} as const;

export const hexA = (hex: string, a: number) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((x) => x + x).join("") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export type { Triple };
