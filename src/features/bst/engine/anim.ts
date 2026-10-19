/** Easing curves and colour interpolation for the engine's own tweens (pure, no Konva). */

export type Easing = (t: number) => number;

export const easeInOut: Easing = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut: Easing = (t) => 1 - Math.pow(1 - t, 3);
export const backOut: Easing = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export type RGBA = readonly [number, number, number, number];

/** Parses #rgb, #rrggbb, #rrggbbaa, rgb() and rgba(). Unknown strings become transparent black. */
export function parseColor(c: string | undefined): RGBA {
  if (!c) return [0, 0, 0, 0];
  const s = c.trim();
  if (s.startsWith("#")) {
    let h = s.slice(1);
    if (h.length === 3 || h.length === 4) h = [...h].map((ch) => ch + ch).join("");
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), h.length >= 8 ? n(6) / 255 : 1];
  }
  const m = s.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const p = m[1].split(",").map((x) => parseFloat(x));
    return [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0, p[3] ?? 1];
  }
  return [0, 0, 0, 0];
}

export function mixColor(a: RGBA, b: RGBA, t: number): string {
  const ch = (i: number) => Math.round(a[i] + (b[i] - a[i]) * t);
  const alpha = a[3] + (b[3] - a[3]) * t;
  return `rgba(${ch(0)},${ch(1)},${ch(2)},${alpha.toFixed(3)})`;
}

export interface Point {
  x: number;
  y: number;
}

/** A point `d` along the segment from a towards b. */
export function toward(a: Point, b: Point, d: number): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: a.x + (dx / len) * d, y: a.y + (dy / len) * d };
}
