import type { StepBase } from "@/lib/player/types";
import type { AnySortAlgorithm, SortOptionSpec, SortRunOptions } from "../types";

export type { SortOptionChoice, SortOptionSpec, SortRunOptions } from "../types";

/* Helpers around the optional `options` / `usesSeed` / `pseudocodeFor` members of SortAlgorithmDef. */

export const pseudocodeOf = (algo: AnySortAlgorithm, opts: SortRunOptions): readonly string[] =>
  algo.pseudocodeFor?.(opts) ?? algo.pseudocode;

export const usesSeed = (algo: AnySortAlgorithm, opts: SortRunOptions): boolean => algo.usesSeed?.(opts) ?? false;

export const algoOptions = (algo: AnySortAlgorithm): readonly SortOptionSpec[] => algo.options ?? [];

export function defaultOptions(algo: AnySortAlgorithm): SortRunOptions {
  const out: SortRunOptions = {};
  for (const o of algoOptions(algo)) out[o.key] = o.default;
  return out;
}

/** Records a run; algorithms without options simply ignore `opts`. */
export function recordRun(algo: AnySortAlgorithm, values: readonly number[], opts: SortRunOptions): StepBase[] {
  return algo.record(values, opts);
}
