/*
 * Plain-text reports for agents (WebMCP tools): what an operation did and what the structure holds now.
 * Pure functions over the engines' states — outcomes are read off the engine's own before/after states,
 * so they always agree with the animation.
 */
import { circUsable, circValues, type CircState } from "../circular/engine";
import { dequeValues, type DequeState } from "../deque/engine";
import { queueSize, queueValues, type QueueState } from "../queue/engine";
import { stackSize, stackValues, type StackState } from "../stack/engine";
import { listText, type End } from "./agent";

const s = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

// ───────────────────────────── stack ─────────────────────────────

export function stackDescribe(st: StackState): string {
  const v = stackValues(st);
  if (!v.length) return `Stack is empty (top = -1), capacity ${st.cap}.`;
  return `Stack bottom → top: ${listText(v)}. Top = ${v[v.length - 1]} (index ${st.top}), size ${v.length} of capacity ${st.cap}.`;
}

export function stackPushReport(before: StackState, values: readonly number[], after: StackState, rebuilt: boolean): string {
  const n = stackSize(after) - (rebuilt ? 0 : stackSize(before));
  const ok = values.slice(0, n);
  const bad = values.slice(n);
  const out: string[] = [];
  if (rebuilt) out.push(`Started a new empty stack of capacity ${after.cap}.`);
  if (ok.length) out.push(`Pushed ${ok.join(", ")}.`);
  if (bad.length) out.push(`Stack Overflow: ${bad.join(", ")} rejected — all ${after.cap} slots are full.`);
  out.push(stackDescribe(after));
  return out.join(" ");
}

export function stackPopReport(before: StackState, count: number, after: StackState): string {
  const popped = stackValues(before).slice(stackSize(after)).reverse();
  const out: string[] = [];
  if (popped.length) out.push(`Popped ${popped.join(", ")} (last in, first out).`);
  if (count > popped.length) out.push(`Stack Underflow: ${popped.length ? "then " : ""}the stack was empty, so ${s(count - popped.length, "pop")} failed.`);
  out.push(stackDescribe(after));
  return out.join(" ");
}

// ───────────────────────────── linear queue ─────────────────────────────

export function queueDescribe(q: QueueState): string {
  const v = queueValues(q);
  const waste = q.front > 0 ? ` ${s(q.front, "slot")} before front ${q.front === 1 ? "is" : "are"} wasted.` : "";
  if (!v.length) return `Linear queue is empty (front = ${q.front}, rear = ${q.rear}), capacity ${q.cap}.${waste}`;
  return `Linear queue front → rear: ${listText(v)}. front = ${q.front}, rear = ${q.rear}, size ${v.length} of capacity ${q.cap}.${waste}`;
}

export function queueEnqueueReport(before: QueueState, values: readonly number[], after: QueueState, rebuilt: boolean): string {
  const n = queueSize(after) - (rebuilt ? 0 : queueSize(before));
  const ok = values.slice(0, n);
  const bad = values.slice(n);
  const out: string[] = [];
  if (rebuilt) out.push(`Started a new empty linear queue of capacity ${after.cap}.`);
  if (ok.length) out.push(`Enqueued ${ok.join(", ")} at the rear.`);
  if (bad.length) {
    out.push(after.front > 0
      ? `Refused ${bad.join(", ")}: rear is at the last index, and the ${s(after.front, "free slot")} before front can't be reused (wasted space) — use the circular variant instead.`
      : `Queue Overflow: ${bad.join(", ")} rejected — all ${after.cap} slots are full.`);
  }
  out.push(queueDescribe(after));
  return out.join(" ");
}

export function queueDequeueReport(before: QueueState, count: number, after: QueueState): string {
  const gone = queueValues(before).slice(0, queueSize(before) - queueSize(after));
  const out: string[] = [];
  if (gone.length) out.push(`Dequeued ${gone.join(", ")} from the front (first in, first out).`);
  if (count > gone.length) out.push(`Queue Underflow: ${gone.length ? "then " : ""}the queue was empty, so ${s(count - gone.length, "dequeue")} failed.`);
  out.push(queueDescribe(after));
  return out.join(" ");
}

// ───────────────────────────── circular queue ─────────────────────────────

export function circDescribe(c: CircState): string {
  const v = circValues(c);
  const rule = c.rule === "count" ? "counter rule: every slot usable" : "gap rule: one slot always stays empty";
  if (!v.length) return `Circular queue is empty (front = ${c.front}), capacity ${c.cap} (${rule}).`;
  return `Circular queue front → rear: ${listText(v)}. front = ${c.front}, rear = ${c.rear}${c.rule === "gap" ? " (next free slot)" : ""}, count ${v.length} of ${circUsable(c)} usable (capacity ${c.cap}, ${rule}).`;
}

export function circEnqueueReport(before: CircState, values: readonly number[], after: CircState, rebuilt: boolean): string {
  const n = after.count - (rebuilt ? 0 : before.count);
  const ok = values.slice(0, n);
  const bad = values.slice(n);
  const out: string[] = [];
  if (rebuilt) out.push(`Started a new empty circular queue of capacity ${after.cap}.`);
  if (ok.length) out.push(`Enqueued ${ok.join(", ")} at the rear (indices wrap with (rear + 1) % capacity).`);
  if (bad.length) out.push(`Queue Overflow: ${bad.join(", ")} rejected — the ring is full.`);
  out.push(circDescribe(after));
  return out.join(" ");
}

export function circDequeueReport(before: CircState, count: number, after: CircState): string {
  const gone = circValues(before).slice(0, before.count - after.count);
  const out: string[] = [];
  if (gone.length) out.push(`Dequeued ${gone.join(", ")} from the front.`);
  if (count > gone.length) out.push(`Queue Underflow: ${gone.length ? "then " : ""}the queue was empty, so ${s(count - gone.length, "dequeue")} failed.`);
  out.push(circDescribe(after));
  return out.join(" ");
}

// ───────────────────────────── deque ─────────────────────────────

export function dequeDescribe(d: DequeState): string {
  const v = dequeValues(d);
  if (!v.length) return `Deque is empty, capacity ${d.cap}.`;
  return `Deque front → back: ${listText(v)}. front index ${d.front}, size ${v.length} of capacity ${d.cap}.`;
}

export function dequePushReport(before: DequeState, end: End, values: readonly number[], after: DequeState, rebuilt: boolean): string {
  const n = after.size - (rebuilt ? 0 : before.size);
  const ok = values.slice(0, n);
  const bad = values.slice(n);
  const out: string[] = [];
  if (rebuilt) out.push(`Started a new empty deque of capacity ${after.cap}.`);
  if (ok.length) out.push(`push_${end}: ${ok.join(", ")}${end === "front" && ok.length > 1 ? " (each one goes in front of the previous, so they end up reversed)" : ""}.`);
  if (bad.length) out.push(`Deque full: ${bad.join(", ")} rejected.`);
  out.push(dequeDescribe(after));
  return out.join(" ");
}

export function dequePopReport(before: DequeState, end: End, count: number, after: DequeState): string {
  const v = dequeValues(before);
  const k = before.size - after.size;
  const gone = end === "front" ? v.slice(0, k) : v.slice(v.length - k).reverse();
  const out: string[] = [];
  if (gone.length) out.push(`pop_${end} returned ${gone.join(", ")}.`);
  if (count > gone.length) out.push(`Underflow: ${gone.length ? "then " : ""}the deque was empty, so ${s(count - gone.length, "pop")} failed.`);
  out.push(dequeDescribe(after));
  return out.join(" ");
}
