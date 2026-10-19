import { RANDOM_MAX, RANDOM_MIN } from "@/config/input";
import { randInt } from "./utils";

/** One random value in the shared random range, avoiding `exclude` when possible. */
export function randomValue(exclude: Iterable<number> = []): number {
  const taken = new Set(exclude);
  if (taken.size >= RANDOM_MAX - RANDOM_MIN + 1) return randInt(RANDOM_MIN, RANDOM_MAX);
  for (;;) {
    const v = randInt(RANDOM_MIN, RANDOM_MAX);
    if (!taken.has(v)) return v;
  }
}

/** `count` random values in the shared range; distinct (and not in `exclude`) unless `allowDuplicates`. */
export function randomValues(count: number, { exclude = [] as Iterable<number>, allowDuplicates = false } = {}): number[] {
  if (allowDuplicates) return Array.from({ length: count }, () => randInt(RANDOM_MIN, RANDOM_MAX));
  const taken = new Set(exclude);
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const v = randomValue(taken);
    taken.add(v);
    out.push(v);
  }
  return out;
}

/** A random element of a non-empty array (e.g. "search for something that exists"). */
export const pickOne = <T,>(items: readonly T[]): T | undefined => (items.length ? items[randInt(0, items.length - 1)] : undefined);
