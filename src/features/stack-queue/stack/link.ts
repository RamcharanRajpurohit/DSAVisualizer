/* Share link for the stack mode: ?mode=stack&cap=6&a=12,7,31 (bottom → top). */
import { capParam, valuesParam, type LinkParams } from "../shared/share";
import { createStack, stackValues, type StackState } from "./engine";

export const stackLink = (s: StackState): LinkParams => ({ mode: "stack", cap: s.cap, a: stackValues(s).join(",") });

export function stackFromLink(p: URLSearchParams): StackState | null {
  const cap = capParam(p);
  return cap == null ? null : createStack(cap, valuesParam(p, "a", cap));
}
