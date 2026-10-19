/*
 * Pure helpers shared by the sorting recorders (no React, no "@/" runtime imports,
 * so recorders stay runnable with plain `tsx`).
 */

/** One array element with a stable identity, so renderers can glide it between steps. */
export interface SortItem {
  id: number;
  value: number;
  /**
   * "a", "b", … when the value occurs more than once (in input order), so the canvas can
   * show whether equal keys keep their order (stability). null for unique values.
   */
  tag: string | null;
}

export function makeItems(values: readonly number[]): SortItem[] {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const seen = new Map<number, number>();
  return values.map((value, id) => {
    const k = seen.get(value) ?? 0;
    seen.set(value, k + 1);
    return { id, value, tag: (counts.get(value) ?? 0) > 1 ? String.fromCharCode(97 + (k % 26)) : null };
  });
}

/** "[3, 5, 8]" — shortened in the middle when long. */
export function listText(values: readonly number[], max = 10): string {
  if (values.length <= max) return `[${values.join(", ")}]`;
  const head = values.slice(0, Math.ceil(max / 2));
  const tail = values.slice(values.length - Math.floor(max / 2));
  return `[${head.join(", ")}, …, ${tail.join(", ")}]`;
}

export const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

/** Small deterministic PRNG (mulberry32) so recordings are reproducible for a given seed. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0 || 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * One sentence about stability for the final step, when the input has duplicates:
 * did equal keys keep their input order (a before b before c)?
 */
export function stabilityNote(items: readonly SortItem[], finalOrder: readonly number[]): string {
  let example: SortItem[] | null = null;
  const seen = new Map<number, SortItem>();
  for (const id of finalOrder) {
    const it = items[id];
    if (it.tag === null) continue;
    const prev = seen.get(it.value);
    if (prev && prev.id > it.id && !example) example = [prev, it];
    seen.set(it.value, it);
  }
  if (!seen.size) return "";
  if (!example) return "\nEqual keys kept their input order (a before b …) — this run was **stable**.";
  const [x, y] = example;
  return `\nEqual keys were reordered: **${x.value}${x.tag}** now comes before **${y.value}${y.tag}** — this sort is **not stable**.`;
}
