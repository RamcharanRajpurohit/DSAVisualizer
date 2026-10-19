import { clsx, type ClassValue } from "clsx";

export const cn = (...inputs: ClassValue[]) => clsx(inputs);

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

export const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

/** `count` random integers in [min, max]; distinct when the range allows it. */
export function randomInts(count: number, min = 1, max = 99, distinct = true): number[] {
  if (!distinct || max - min + 1 < count) return Array.from({ length: count }, () => randInt(min, max));
  const pool = new Set<number>();
  while (pool.size < count) pool.add(randInt(min, max));
  return [...pool];
}

export function shuffle<T>(items: T[]): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Parse "5, 3 9,-2" into [5, 3, 9, -2]; ignores anything that is not an integer. */
export function parseNumberList(input: string, { min = -9999, max = 9999 } = {}): number[] {
  return input
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= min && n <= max);
}

/** Parse a single integer, or null when the input is not one. */
export function parseIntSafe(input: string, { min = -9999, max = 9999 } = {}): number | null {
  const t = input.trim();
  if (!/^-?\d+$/.test(t)) return null;
  const n = Number(t);
  return n >= min && n <= max ? n : null;
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
