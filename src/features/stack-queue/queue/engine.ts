/*
 * Naive linear-array queue — pure step recorder.
 *
 *   A[0..capacity-1], front = index of the first element, rear = index of the last one.
 *   Empty when front > rear. Both indices only ever move RIGHT.
 *
 * Because nothing ever moves left again, slots before `front` are lost for good: once rear reaches the
 * last index the queue reports "full" even if most of the array is free. That "wasted space" problem is
 * exactly what the circular queue fixes; `compact()` shows the O(n) alternative (shift everything left).
 */
import type { Tone } from "@/lib/theme";
import { Recorder, type RunResult } from "../shared/recorder";
import type { ChipTone, Item, SnapStep, Vars } from "../shared/types";
import { emptySlots, setAt } from "../shared/util";

export interface QueueState {
  slots: readonly (Item | null)[];
  front: number;
  rear: number;
  cap: number;
  nextId: number;
}

export interface QueueFx {
  /** Element hovering above slot `at` (cap = past the end, i.e. "nowhere to go"). */
  float?: { item: Item; tone: ChipTone; at: number; shake?: boolean };
  hl?: Record<string, ChipTone>;
  slot?: { index: number; tone: "new" | "danger" };
  /** Pulse the wasted slots (indices < front). */
  waste?: boolean;
  ptr?: { front?: "alert" | "focus"; rear?: "alert" | "focus" };
  callout?: { text: string; tone: Tone; at: number | "waste" };
  result?: { text: string; tone: Tone };
}

export type QueueOp =
  | { kind: "enqueue"; v: number }
  | { kind: "dequeue" }
  | { kind: "peek" }
  | { kind: "compact" }
  | { kind: "clear" }
  | { kind: "new"; cap: number };

export type QueueOpKind = QueueOp["kind"] | "idle";
export type QueueStep = SnapStep<QueueOpKind, QueueState, QueueFx>;
type R = Recorder<QueueOpKind, QueueState, QueueFx>;

/** A queue whose elements start at index `front` (so an example can already have wasted slots). */
export function createQueue(cap: number, values: readonly number[] = [], front = 0): QueueState {
  const slots = emptySlots<Item>(cap);
  const f = Math.max(0, Math.min(front, cap));
  const vs = values.slice(0, cap - f);
  vs.forEach((v, i) => (slots[f + i] = { id: `q${i}`, v }));
  return { slots, front: f, rear: f + vs.length - 1, cap, nextId: vs.length };
}

export const queueSize = (s: QueueState) => Math.max(0, s.rear - s.front + 1);
export const queueValues = (s: QueueState) => s.slots.slice(s.front, s.rear + 1).map((it) => it?.v ?? NaN);

const varsOf = (s: QueueState): Vars => ({
  front: s.front,
  rear: s.rear,
  size: queueSize(s),
  capacity: s.cap,
  "wasted slots": s.front,
});

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

// ───────────────────────────── operations ─────────────────────────────

function enqueue(R: R, v: number): boolean {
  const s0 = R.s;
  const item: Item = { id: `q${s0.nextId}`, v };
  R.s = { ...s0, nextId: s0.nextId + 1 };
  const { front, rear, cap } = s0;
  const x = { x: v };

  if (rear === cap - 1) {
    R.snap(`enqueue(${v}) — room at the rear?`,
      `\`rear == capacity − 1\` → \`${rear} == ${cap - 1}\` → **true**: rear is already at the last index.`,
      { tone: "warn", line: 2, vars: x, fx: { float: { item, tone: "new", at: cap }, ptr: { rear: "focus" } } });
    if (front > 0) {
      R.snap(`"Full" — but ${plural(front, "slot")} sit empty!`,
        `enqueue refuses, yet A[0..${front - 1}] ${front === 1 ? "is" : "are"} free (emptied by dequeues). \`rear\` only moves right, so ${front === 1 ? "it is" : "they are"} never reused: the **wasted space** problem.`,
        { tone: "danger", line: 3, vars: x, hold: 1.8,
          fx: { float: { item, tone: "danger", at: cap, shake: true }, waste: true, ptr: { rear: "alert" }, callout: { text: `${plural(front, "wasted slot")} — can't be reused`, tone: "danger", at: "waste" } } });
      R.snap("Two ways out",
        "① **Compact**: shift everything back to index 0, in O(n).\n② **Wrap** the indices with `% capacity`: a circular queue, in O(1).",
        { tone: "warn", line: 3, vars: x, hold: 1.4, fx: { waste: true, result: { text: `enqueue(${v}) → "full"`, tone: "danger" } } });
    } else {
      R.snap("Queue Overflow!",
        `All ${cap} slots hold elements — there is genuinely no room for **${v}**. Dequeue something first or build a bigger queue.`,
        { tone: "danger", line: 3, vars: x, hold: 1.5,
          fx: { float: { item, tone: "danger", at: cap, shake: true }, ptr: { rear: "alert" }, callout: { text: "Overflow — queue full", tone: "danger", at: cap - 1 } } });
      R.snap(`enqueue(${v}) rejected`, "The queue is unchanged.", { tone: "danger", line: 3, vars: x, fx: { result: { text: `enqueue(${v}) → overflow`, tone: "danger" } } });
    }
    return false;
  }

  R.snap(`enqueue(${v}) — room at the rear?`,
    `\`rear == capacity − 1\` → \`${rear} == ${cap - 1}\` → **false**, so A[${rear + 1}] is free.`,
    { line: 2, vars: x, fx: { float: { item, tone: "new", at: rear + 1 }, slot: { index: rear + 1, tone: "new" } } });
  R.s = { ...R.s, rear: rear + 1 };
  R.snap(`rear = rear + 1 → ${rear + 1}`,
    "New elements join at the **rear** (back of the line), so `rear` advances to the slot the element will use.",
    { line: 4, vars: x, fx: { float: { item, tone: "new", at: rear + 1 }, slot: { index: rear + 1, tone: "new" }, ptr: { rear: "focus" } } });
  R.s = { ...R.s, slots: setAt(R.s.slots, rear + 1, item) };
  R.snap(`A[${rear + 1}] = ${v}`,
    `**${v}** joins the back in O(1); nothing else moves.` +
      (rear + 1 === cap - 1 ? " rear is now at the **last index**: the next enqueue will be refused." : front === rear + 1 ? " It is the only element, so front == rear." : ""),
    { tone: "ok", line: 5, vars: x, fx: { hl: { [item.id]: "ok" } } });
  return true;
}

function dequeue(R: R): boolean {
  const s0 = R.s;
  const { front, rear } = s0;
  if (front > rear) {
    R.snap("dequeue() — is the queue empty?",
      `\`front > rear\` → \`${front} > ${rear}\` → **true**: no element is waiting.`,
      { tone: "warn", line: 2, fx: { ptr: { front: "focus", rear: "focus" } } });
    R.snap("Queue Underflow!",
      "Dequeuing from an empty queue is an error — check `isEmpty()` first." +
        (front > 0 ? `\nNotice the queue is empty but front = ${front}: the ${plural(front, "slot")} behind it are wasted, too.` : ""),
      { tone: "danger", line: 3, hold: 1.5,
        fx: { ptr: { front: "alert", rear: "alert" }, waste: front > 0, callout: { text: "Underflow — nothing to dequeue", tone: "danger", at: Math.min(front, s0.cap - 1) }, result: { text: "dequeue() → underflow", tone: "danger" } } });
    return false;
  }
  const item = s0.slots[front]!;
  const x = { x: item.v };
  R.snap("dequeue() — is the queue empty?", `\`front > rear\` → \`${front} > ${rear}\` → **false**.`, { line: 2, fx: { ptr: { front: "focus" } } });
  R.snap(`x = A[${front}] = ${item.v}`,
    "The element at the **front** has waited longest, so it leaves first — First In, First Out.",
    { line: 4, vars: x, fx: { hl: { [item.id]: "active" } } });
  R.s = { ...s0, slots: setAt(s0.slots, front, null), front: front + 1 };
  R.snap(`front = front + 1 → ${front + 1}`,
    `**${item.v}** leaves and \`front\` moves right. A[${front}] is now behind front — in this naive queue that slot is **lost**: rear never comes back to it.`,
    { line: 5, vars: x, fx: { float: { item, tone: "out", at: front }, ptr: { front: "focus" } } });
  R.snap(`return ${item.v}`,
    `dequeue() hands back **${item.v}** in O(1).` +
      (front + 1 > rear ? ` The queue is now empty, with ${plural(front + 1, "wasted slot")}.` : ` ${plural(front + 1, "slot")} before front ${front + 1 === 1 ? "is" : "are"} now wasted.`),
    { tone: "ok", line: 6, vars: x, fx: { waste: true, result: { text: `dequeue() → ${item.v}`, tone: "ok" } } });
  return true;
}

function peek(R: R): boolean {
  const { front, rear, slots } = R.s;
  if (front > rear) {
    R.snap("peek() — is the queue empty?", `\`front > rear\` → \`${front} > ${rear}\` → **true**.`, { tone: "warn", line: 2, fx: { ptr: { front: "focus" } } });
    R.snap("Nothing to peek", "There is no front element in an empty queue.", { tone: "danger", line: 3, fx: { ptr: { front: "alert" }, result: { text: "peek() → error", tone: "danger" } } });
    return false;
  }
  const item = slots[front]!;
  R.snap("peek() — is the queue empty?", `\`front > rear\` → \`${front} > ${rear}\` → **false**.`, { line: 2, fx: { ptr: { front: "focus" } } });
  R.snap(`peek() → ${item.v}`, `Return \`A[front]\` = **${item.v}** without moving front — the element stays in the queue. O(1).`,
    { tone: "ok", line: 4, vars: { x: item.v }, fx: { hl: { [item.id]: "active" }, result: { text: `peek() → ${item.v}`, tone: "ok" } } });
  return true;
}

function compact(R: R): boolean {
  const s0 = R.s;
  const n = queueSize(s0);
  if (s0.front === 0) {
    R.snap("Nothing to compact", "front is already 0 — there are no wasted slots to reclaim.", { tone: "muted", line: 1 });
    return true;
  }
  R.snap(`compact(): n = rear − front + 1 = ${n}`,
    `Fix #1 for wasted space: slide the ${plural(n, "element")} back to the start of the array so the ${plural(s0.front, "free slot")} at the front become usable again.`,
    { line: 2, vars: { n }, fx: { waste: true } });
  for (let i = 0; i < n; i++) {
    const it = R.s.slots[s0.front + i]!;
    R.s = { ...R.s, slots: setAt(setAt(R.s.slots, s0.front + i, null), i, it) };
    R.snap(`A[${i}] = A[${s0.front + i}]`,
      `Move **${it.v}** ${s0.front} place${s0.front === 1 ? "" : "s"} left. Every element moves once → this loop is O(n).`,
      { line: [3, 4], vars: { n, i }, hold: 0.7, fx: { hl: { [it.id]: "new" } } });
  }
  R.s = { ...R.s, front: 0, rear: n - 1 };
  R.snap("front = 0, rear = n − 1",
    `The indices reset to front = 0, rear = ${n - 1}, so the wasted slots are usable again. That cost O(n); a **circular queue** gets the same in O(1).`,
    { tone: "ok", line: [5, 6], vars: { n }, fx: { ptr: { front: "focus", rear: "focus" } } });
  return true;
}

function clear(R: R) {
  R.s = { ...R.s, slots: R.s.slots.map(() => null), front: 0, rear: -1 };
  R.snap("clear(): front = 0, rear = -1", "Back to the empty state in O(1), which also reclaims any wasted slots.",
    { tone: "ok", line: [2, 3], fx: { ptr: { front: "focus", rear: "focus" } } });
  return true;
}

function build(R: R, cap: number) {
  R.s = { ...createQueue(cap), nextId: R.s.nextId };
  R.snap(`new Queue(${cap})`,
    `An array of **${cap}** slots with \`front = 0\` and \`rear = -1\` (empty: front > rear).`,
    { line: [2, 3, 4], fx: { ptr: { front: "focus", rear: "focus" } } });
  return true;
}

export function runQueue(state: QueueState, ops: readonly QueueOp[]): RunResult<QueueOpKind, QueueState, QueueFx> {
  const R: R = new Recorder<QueueOpKind, QueueState, QueueFx>(state, "idle", varsOf);
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    R.op = op.kind;
    let ok = true;
    switch (op.kind) {
      case "enqueue": ok = enqueue(R, op.v); break;
      case "dequeue": ok = dequeue(R); break;
      case "peek": ok = peek(R); break;
      case "compact": ok = compact(R); break;
      case "clear": ok = clear(R); break;
      case "new": ok = build(R, op.cap); break;
    }
    const rest = ops.length - i - 1;
    if (!ok && rest > 0 && ops.slice(i + 1).every((o) => o.kind === op.kind)) {
      R.snap(`Skipped the remaining ${rest} ${op.kind}${rest === 1 ? "" : "s"}`,
        op.kind === "enqueue" ? "rear is at the last index, so every further enqueue would be refused the same way." : "The queue is empty, so every further dequeue would underflow the same way.",
        { tone: "warn" });
      break;
    }
  }
  return { steps: R.steps, state: R.s };
}

export function queueIntro(state: QueueState): QueueStep[] {
  const R: R = new Recorder<QueueOpKind, QueueState, QueueFx>(state, "idle", varsOf);
  R.snap("A queue: First In, First Out",
    "Like a line at a counter: **enqueue** joins at the **rear**, **dequeue** leaves from the **front**. In a plain array both indices only move right.",
    {});
  return R.steps;
}
