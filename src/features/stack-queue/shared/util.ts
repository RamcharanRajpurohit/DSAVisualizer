/* Small pure helpers shared by the engines (no React, no path aliases — runnable with tsx). */

export const CAP_MIN = 3;
export const CAP_MAX = 12;
export const CAP_OPTIONS = Array.from({ length: CAP_MAX - CAP_MIN + 1 }, (_, i) => CAP_MIN + i);

/** Positive modulo: mod(-1, 6) === 5. */
export const mod = (a: number, n: number) => ((a % n) + n) % n;

export const emptySlots = <T>(n: number): (T | null)[] => Array.from({ length: n }, () => null);

/** Replace index i of an array (immutably). */
export function setAt<T>(arr: readonly T[], i: number, v: T): T[] {
  const out = arr.slice();
  out[i] = v;
  return out;
}

/** Format a number for display: integers as-is, others with up to 3 decimals. */
export function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return n > 0 ? "∞" : n < 0 ? "-∞" : "NaN";
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 1000) / 1000);
}

export const list = (xs: readonly (string | number)[]) => (xs.length ? xs.join(", ") : "—");
