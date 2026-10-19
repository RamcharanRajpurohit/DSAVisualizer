/*
 * Share links for the step-by-step view: /sorting?algo=quick&a=38,27,43,3&scheme=hoare&pivot=median3
 * Everything is validated; anything unusable is dropped so the page falls back to its default example.
 */
import { VALUE_MAX, VALUE_MIN } from "@/config/input";
import { listParam, parseListParam, type ShareParams } from "@/lib/share";
import type { AnySortAlgorithm, SortRunOptions } from "../types";
import { seededRandom } from "./items";
import { algoOptions, defaultOptions } from "./options";

export interface StepShare {
  algo: AnySortAlgorithm;
  /** Null when the link carries no usable array. */
  values: number[] | null;
  opts: SortRunOptions;
}

export function stepShareParams(algo: AnySortAlgorithm, values: readonly number[], opts: SortRunOptions): ShareParams {
  const out: ShareParams = { algo: algo.key, a: listParam(values), n: values.length };
  for (const o of algoOptions(algo)) out[o.key] = String(opts[o.key] ?? o.default);
  return out;
}

/** Random-looking but deterministic values for `?n=12` without an array (render-safe: no Math.random). */
function seededValues(n: number): number[] {
  const rng = seededRandom(n * 7919);
  const pool = new Set<number>();
  while (pool.size < n) pool.add(1 + Math.floor(rng() * 99));
  return [...pool];
}

export function parseStepShare(p: URLSearchParams, algorithms: readonly AnySortAlgorithm[], fallback: AnySortAlgorithm): StepShare | null {
  const key = p.get("algo");
  const a = p.get("a");
  const nParam = p.get("n");
  const hasOption = algorithms.some((x) => algoOptions(x).some((o) => p.has(o.key)));
  if (!key && !a && !nParam && !hasOption) return null;

  const algo = algorithms.find((x) => x.key === key) ?? fallback;
  const minSize = 2;

  let values: number[] | null = null;
  const parsed = parseListParam(a, { min: VALUE_MIN, max: VALUE_MAX, limit: algo.maxSize });
  if (parsed.length >= minSize) values = parsed;
  else if (nParam && /^\d+$/.test(nParam)) {
    const n = Number(nParam);
    if (n >= minSize && n <= algo.maxSize) values = seededValues(n);
  }

  const opts = defaultOptions(algo);
  for (const o of algoOptions(algo)) {
    const v = p.get(o.key);
    if (v !== null && o.choices.some((c) => c.value === v)) opts[o.key] = v;
  }
  return { algo, values, opts };
}
