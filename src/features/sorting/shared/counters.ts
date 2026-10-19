import type { WatchValue } from "@/lib/player/types";
import { TONE_COLOR } from "@/lib/theme";

/** Step vars that are operation counters get their own tiles instead of the variables panel. */
export const COUNTERS = [
  { key: "comparisons", aliases: ["comparisons", "comps", "compares"], label: "Comparisons", color: TONE_COLOR.info },
  { key: "swaps", aliases: ["swaps", "exchanges"], label: "Swaps", color: TONE_COLOR.warn },
  { key: "writes", aliases: ["writes", "shifts", "moves", "assignments"], label: "Writes", color: TONE_COLOR.merge },
] as const;

export type CounterKey = (typeof COUNTERS)[number]["key"];

const ALIAS = new Map<string, CounterKey>(COUNTERS.flatMap((c) => c.aliases.map((a) => [a, c.key] as const)));

export interface SplitVars {
  counters: Partial<Record<CounterKey, number>>;
  rest: Record<string, WatchValue>;
}

export function splitVars(vars: Record<string, WatchValue> | undefined): SplitVars {
  const counters: SplitVars["counters"] = {};
  const rest: Record<string, WatchValue> = {};
  for (const [k, v] of Object.entries(vars ?? {})) {
    const c = ALIAS.get(k.toLowerCase());
    if (c && typeof v === "number") counters[c] = v;
    else rest[k] = v;
  }
  return { counters, rest };
}
