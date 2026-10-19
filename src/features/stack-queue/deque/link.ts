/* Share link for the deque: ?mode=deque&cap=7&front=5&a=8,3,5 (front → back). */
import { capParam, intParam, valuesParam, type LinkParams } from "../shared/share";
import { createDeque, dequeValues, type DequeState } from "./engine";

export const dequeLink = (s: DequeState): LinkParams => ({ mode: "deque", cap: s.cap, front: s.front, a: dequeValues(s).join(",") });

export function dequeFromLink(p: URLSearchParams): DequeState | null {
  const cap = capParam(p);
  return cap == null ? null : createDeque(cap, valuesParam(p, "a", cap), intParam(p, "front", 0, cap - 1) ?? 0);
}
