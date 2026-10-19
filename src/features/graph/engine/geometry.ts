export interface Pt {
  x: number;
  y: number;
}

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** Cubic ease-in-out. */
export const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** The point `d` along the segment a → b. */
export const toward = (a: Pt, b: Pt, d: number): Pt => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: a.x + (dx / len) * d, y: a.y + (dy / len) * d };
};

/** Point on a cubic bezier given as a flat [x0,y0,x1,y1,x2,y2,x3,y3] array. */
export const cubicAt = (p: readonly number[], t: number): Pt => {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return { x: a * p[0] + b * p[2] + c * p[4] + d * p[6], y: a * p[1] + b * p[3] + c * p[5] + d * p[7] };
};

/** The same bezier walked from the other end. */
export const reverseCubic = (p: readonly number[]) => [p[6], p[7], p[4], p[5], p[2], p[3], p[0], p[1]];
