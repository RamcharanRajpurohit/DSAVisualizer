/* Share link for the circular queue: ?mode=circular&cap=6&rule=gap&front=4&a=15,42 (front → rear). */
import { capParam, intParam, valuesParam, type LinkParams } from "../shared/share";
import { circValues, createCirc, type CircState, type FullRule } from "./engine";

export const circLink = (s: CircState): LinkParams => ({ mode: "circular", cap: s.cap, rule: s.rule, front: s.front, a: circValues(s).join(",") });

export function circFromLink(p: URLSearchParams): CircState | null {
  const cap = capParam(p);
  if (cap == null) return null;
  const rule: FullRule = p.get("rule") === "gap" ? "gap" : "count";
  const vals = valuesParam(p, "a", rule === "count" ? cap : cap - 1);
  return createCirc(cap, rule, vals, intParam(p, "front", 0, cap - 1) ?? 0);
}
