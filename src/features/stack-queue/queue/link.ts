/* Share link for the linear queue: ?mode=queue&cap=8&front=2&a=8,23 (front → rear). */
import { capParam, intParam, valuesParam, type LinkParams } from "../shared/share";
import { createQueue, queueValues, type QueueState } from "./engine";

export const queueLink = (s: QueueState): LinkParams => ({ mode: "queue", cap: s.cap, front: s.front, a: queueValues(s).join(",") });

export function queueFromLink(p: URLSearchParams): QueueState | null {
  const cap = capParam(p);
  if (cap == null) return null;
  const vals = valuesParam(p, "a", cap);
  return createQueue(cap, vals, Math.min(intParam(p, "front", 0, cap) ?? 0, cap - vals.length));
}
