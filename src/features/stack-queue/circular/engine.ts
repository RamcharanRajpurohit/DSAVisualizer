/*
 * Circular queue (ring buffer) — pure step recorder.
 *
 * Two classic ways to tell "full" from "empty", selectable in the UI:
 *   • "count": front = first element, rear = last element, plus a `count` variable.
 *              empty ⇔ count == 0, full ⇔ count == capacity. Every slot is usable.
 *   • "gap":   front = first element, rear = NEXT FREE slot, no counter.
 *              empty ⇔ front == rear, full ⇔ (rear + 1) % capacity == front.
 *              One slot always stays empty, otherwise "full" would also read front == rear.
 *
 * `fAbs` / `rAbs` are the same indices without the modulo (they only ever grow, except on reset),
 * so the clock hands on the ring keep turning forward instead of spinning back at the wrap.
 */
import type { Tone } from "@/lib/theme";
import { Recorder, type RunResult } from "../shared/recorder";
import type { ChipTone, Item, SnapStep, Vars } from "../shared/types";
import { emptySlots, mod, setAt } from "../shared/util";

export type FullRule = "count" | "gap";

export interface CircState {
  slots: readonly (Item | null)[];
  front: number;
  rear: number;
  count: number;
  cap: number;
  rule: FullRule;
  fAbs: number;
  rAbs: number;
  nextId: number;
}

export interface CircFx {
  /** Element hovering just outside slot `at`. */
  float?: { item: Item; tone: ChipTone; at: number; shake?: boolean };
  hl?: Record<string, ChipTone>;
  slot?: { index: number; tone: "new" | "danger" | "active" };
  /** Slot deliberately kept empty ("gap" rule, when full). */
  gap?: number;
  ptr?: { front?: "alert" | "focus"; rear?: "alert" | "focus" };
  callout?: { text: string; tone: Tone };
  result?: { text: string; tone: Tone };
  /** Modulo arithmetic of this step, e.g. "rear = (5 + 1) % 6 = 0". */
  calc?: { text: string; wrap: boolean };
}

export type CircOp =
  | { kind: "enqueue"; v: number }
  | { kind: "dequeue" }
  | { kind: "peek" }
  | { kind: "clear" }
  | { kind: "new"; cap: number; rule: FullRule };

export type CircOpKind = CircOp["kind"] | "idle";
export type CircStep = SnapStep<CircOpKind, CircState, CircFx>;
type R = Recorder<CircOpKind, CircState, CircFx>;

/** Build a queue whose elements start at index `start` (so the example can already be wrapped around). */
export function createCirc(cap: number, rule: FullRule, values: readonly number[] = [], start = 0): CircState {
  const usable = rule === "count" ? cap : cap - 1;
  const vs = values.slice(0, usable);
  const slots = emptySlots<Item>(cap);
  vs.forEach((v, k) => (slots[mod(start + k, cap)] = { id: `c${k}`, v }));
  const front = mod(start, cap);
  const fAbs = front;
  const rAbs = rule === "count" ? fAbs + vs.length - 1 : fAbs + vs.length;
  return {
    slots, front, cap, rule, fAbs, rAbs, count: vs.length, nextId: vs.length,
    // count rule: rear is the last element; for an empty queue it sits just before front (-1 when front is 0)
    rear: rule === "count" ? (vs.length || front !== 0 ? mod(rAbs, cap) : -1) : mod(rAbs, cap),
  };
}

export const circSize = (s: CircState) => s.count;
export const circUsable = (s: CircState) => (s.rule === "count" ? s.cap : s.cap - 1);
/** Values in queue order (front → rear). */
export const circValues = (s: CircState) => Array.from({ length: s.count }, (_, k) => s.slots[mod(s.front + k, s.cap)]?.v ?? NaN);
export const circFull = (s: CircState) => (s.rule === "count" ? s.count === s.cap : mod(s.rear + 1, s.cap) === s.front);

const varsOf = (s: CircState): Vars =>
  s.rule === "count"
    ? { front: s.front, rear: s.rear, count: s.count, capacity: s.cap }
    : { front: s.front, "rear (next free)": s.rear, size: s.count, capacity: s.cap };

/** " **Wrap-around:** …" when an index steps past the last slot, else "". */
const wrapNote = (name: string, from: number, cap: number) =>
  from + 1 === cap ? ` **Wrap-around:** \`(${from} + 1) % ${cap} = 0\` sends ${name} back to the start.` : "";

// ───────────────────────────── count rule ─────────────────────────────

function enqueueCount(R: R, item: Item): boolean {
  const s0 = R.s;
  const { count, cap, rear, front } = s0;
  const v = item.v;
  const target = mod(rear + 1, cap);
  const x = { x: v };
  if (count === cap) {
    R.snap(`enqueue(${v}) — is it full?`,
      `\`count == capacity\` → \`${count} == ${cap}\` → **true**: every slot holds an element.`,
      { tone: "warn", line: 2, vars: x, fx: { float: { item, tone: "new", at: target } } });
    R.snap("Queue Overflow!",
      `The next slot, \`(rear + 1) % capacity = ${target}\`, is front's slot — it still holds the oldest element. Dequeue first.`,
      { tone: "danger", line: 3, vars: x, hold: 1.5,
        fx: { float: { item, tone: "danger", at: target, shake: true }, slot: { index: target, tone: "danger" }, ptr: { rear: "alert", front: "alert" },
          callout: { text: "count == capacity → full", tone: "danger" }, result: { text: `enqueue(${v}) → overflow`, tone: "danger" } } });
    return false;
  }
  R.snap(`enqueue(${v}) — is it full?`,
    `\`count == capacity\` → \`${count} == ${cap}\` → **false**.`,
    { line: 2, vars: x, fx: { float: { item, tone: "new", at: target }, slot: { index: target, tone: "new" } } });
  R.s = { ...R.s, rear: target, rAbs: s0.rAbs + 1 };
  R.snap(`rear = (${rear} + 1) % ${cap} = ${target}`,
    (rear + 1 === cap ? `rear advances **modulo the capacity**.` : `Advance rear **modulo the capacity**: \`(${rear} + 1) % ${cap} = ${target}\`.`) +
      (rear + 1 === cap ? wrapNote("rear", rear, cap) : count === 0 ? ` The queue was empty, so rear lands on front (${front}).` : ""),
    { line: 4, vars: x, fx: { float: { item, tone: "new", at: target }, slot: { index: target, tone: "new" }, ptr: { rear: "focus" },
      calc: { text: `rear = (${rear} + 1) % ${cap} = ${target}`, wrap: rear + 1 === cap } } });
  R.s = { ...R.s, slots: setAt(R.s.slots, target, item), count: count + 1 };
  R.snap(`A[${target}] = ${v}, count = ${count + 1}`,
    `**${v}** is stored at the rear and \`count\` becomes ${count + 1}.` + (count + 1 === cap ? " `count == capacity`: the queue is **full**, every slot in use." : ""),
    { tone: "ok", line: [5, 6], vars: x, fx: { hl: { [item.id]: "ok" } } });
  return true;
}

function dequeueCount(R: R): boolean {
  const s0 = R.s;
  const { count, cap, front } = s0;
  if (count === 0) {
    R.snap("dequeue() — is it empty?", "`count == 0` → **true**: nothing is waiting.", { tone: "warn", line: 2, fx: { ptr: { front: "focus" } } });
    R.snap("Queue Underflow!", "Dequeuing an empty queue is an error. With a counter, empty (count == 0) and full (count == capacity) can never be confused.",
      { tone: "danger", line: 3, hold: 1.4, fx: { ptr: { front: "alert", rear: "alert" }, callout: { text: "count == 0 → empty", tone: "danger" }, result: { text: "dequeue() → underflow", tone: "danger" } } });
    return false;
  }
  const item = s0.slots[front]!;
  const x = { x: item.v };
  const nf = mod(front + 1, cap);
  R.snap("dequeue() — is it empty?", `\`count == 0\` → \`${count} == 0\` → **false**.`, { line: 2, fx: { ptr: { front: "focus" } } });
  R.snap(`x = A[${front}] = ${item.v}`, "The element at **front** is the oldest one — it leaves first (FIFO).", { line: 4, vars: x, fx: { hl: { [item.id]: "active" } } });
  R.s = { ...s0, slots: setAt(s0.slots, front, null), front: nf, fAbs: s0.fAbs + 1 };
  R.snap(`front = (${front} + 1) % ${cap} = ${nf}`,
    `**${item.v}** leaves and front advances modulo the capacity.` + (front + 1 === cap ? wrapNote("front", front, cap) : ` Slot ${front} is **not wasted**: rear reaches it after wrapping.`),
    { line: 5, vars: x, fx: { float: { item, tone: "out", at: front }, ptr: { front: "focus" }, calc: { text: `front = (${front} + 1) % ${cap} = ${nf}`, wrap: front + 1 === cap } } });
  R.s = { ...R.s, count: count - 1 };
  R.snap(`count = ${count - 1}, return ${item.v}`,
    `dequeue() returns **${item.v}** in O(1).` + (count - 1 === 0 ? " count is 0 again — the queue is empty." : ""),
    { tone: "ok", line: [6, 7], vars: x, fx: { result: { text: `dequeue() → ${item.v}`, tone: "ok" } } });
  return true;
}

// ───────────────────────────── gap rule ─────────────────────────────

function enqueueGap(R: R, item: Item): boolean {
  const s0 = R.s;
  const { cap, rear, front } = s0;
  const v = item.v;
  const next = mod(rear + 1, cap);
  const x = { x: v };
  if (next === front) {
    R.snap(`enqueue(${v}) — is it full?`,
      `\`(rear + 1) % capacity == front\` → \`(${rear} + 1) % ${cap} = ${next}\` and front is ${front} → **true**.`,
      { tone: "warn", line: 2, vars: x, fx: { float: { item, tone: "new", at: rear }, gap: rear } });
    R.snap("Full — one slot kept empty",
      `Slot ${rear} is empty, but using it would make \`front == rear\`, which means **empty**. So only ${cap - 1} of the ${cap} slots are ever used.`,
      { tone: "danger", line: 3, vars: x, hold: 1.8,
        fx: { float: { item, tone: "danger", at: rear, shake: true }, gap: rear, ptr: { rear: "alert", front: "alert" },
          callout: { text: `(rear + 1) % ${cap} == front → full`, tone: "danger" }, result: { text: `enqueue(${v}) → full`, tone: "danger" } } });
    return false;
  }
  R.snap(`enqueue(${v}) — is it full?`,
    `\`(rear + 1) % capacity == front\` → \`(${rear} + 1) % ${cap} = ${next}\` vs front ${front} → **false**.`,
    { line: 2, vars: x, fx: { float: { item, tone: "new", at: rear }, slot: { index: rear, tone: "new" }, calc: { text: `(${rear} + 1) % ${cap} = ${next} ≠ ${front}`, wrap: false } } });
  R.s = { ...R.s, slots: setAt(R.s.slots, rear, item), count: s0.count + 1 };
  R.snap(`A[${rear}] = ${v}`, `rear points at the next **free** slot, so we write first…`,
    { tone: "ok", line: 4, vars: x, fx: { hl: { [item.id]: "ok" } } });
  R.s = { ...R.s, rear: next, rAbs: s0.rAbs + 1 };
  R.snap(`rear = (${rear} + 1) % ${cap} = ${next}`,
    (rear + 1 === cap ? `…then advance rear modulo the capacity.${wrapNote("rear", rear, cap)}` : `…then advance rear modulo the capacity: \`(${rear} + 1) % ${cap} = ${next}\`.`) +
      (mod(next + 1, cap) === front && rear + 1 !== cap ? ` Now the queue is **full**, with slot ${next} left as the gap.` : ""),
    { line: 5, vars: x, fx: { ptr: { rear: "focus" }, calc: { text: `rear = (${rear} + 1) % ${cap} = ${next}`, wrap: rear + 1 === cap }, gap: mod(next + 1, cap) === front ? next : undefined } });
  return true;
}

function dequeueGap(R: R): boolean {
  const s0 = R.s;
  const { cap, rear, front } = s0;
  if (front === rear) {
    R.snap("dequeue() — is it empty?", `\`front == rear\` → \`${front} == ${rear}\` → **true**.`, { tone: "warn", line: 2, fx: { ptr: { front: "focus", rear: "focus" } } });
    R.snap("Queue Underflow!", "front has caught up with rear (the next free slot) — there is nothing in between.",
      { tone: "danger", line: 3, hold: 1.4, fx: { ptr: { front: "alert", rear: "alert" }, callout: { text: "front == rear → empty", tone: "danger" }, result: { text: "dequeue() → underflow", tone: "danger" } } });
    return false;
  }
  const item = s0.slots[front]!;
  const x = { x: item.v };
  const nf = mod(front + 1, cap);
  R.snap("dequeue() — is it empty?", `\`front == rear\` → \`${front} == ${rear}\` → **false**.`, { line: 2, fx: { ptr: { front: "focus" } } });
  R.snap(`x = A[${front}] = ${item.v}`, "The oldest element sits at front — it leaves first (FIFO).", { line: 4, vars: x, fx: { hl: { [item.id]: "active" } } });
  R.s = { ...s0, slots: setAt(s0.slots, front, null), front: nf, fAbs: s0.fAbs + 1, count: s0.count - 1 };
  R.snap(`front = (${front} + 1) % ${cap} = ${nf}`,
    `**${item.v}** leaves and front advances modulo the capacity.` + (front + 1 === cap ? wrapNote("front", front, cap) : ` Slot ${front} is reused once rear wraps around.`),
    { line: 5, vars: x, fx: { float: { item, tone: "out", at: front }, ptr: { front: "focus" }, calc: { text: `front = (${front} + 1) % ${cap} = ${nf}`, wrap: front + 1 === cap } } });
  R.snap(`return ${item.v}`, `dequeue() returns **${item.v}** in O(1).` + (nf === rear ? " front == rear again → empty." : ""),
    { tone: "ok", line: 6, vars: x, fx: { result: { text: `dequeue() → ${item.v}`, tone: "ok" } } });
  return true;
}

// ───────────────────────────── shared ops ─────────────────────────────

function peek(R: R): boolean {
  const s = R.s;
  const empty = s.count === 0;
  const cond = s.rule === "count" ? `\`count == 0\` → \`${s.count} == 0\`` : `\`front == rear\` → \`${s.front} == ${s.rear}\``;
  if (empty) {
    R.snap("peek() — is it empty?", `${cond} → **true**.`, { tone: "warn", line: 2, fx: { ptr: { front: "focus" } } });
    R.snap("Nothing to peek", "An empty queue has no front element.", { tone: "danger", line: 3, fx: { ptr: { front: "alert" }, result: { text: "peek() → error", tone: "danger" } } });
    return false;
  }
  const item = s.slots[s.front]!;
  R.snap("peek() — is it empty?", `${cond} → **false**.`, { line: 2, fx: { ptr: { front: "focus" } } });
  R.snap(`peek() → ${item.v}`, `Return \`A[front]\` = **${item.v}**; front does not move. O(1).`,
    { tone: "ok", line: 4, vars: { x: item.v }, fx: { hl: { [item.id]: "active" }, result: { text: `peek() → ${item.v}`, tone: "ok" } } });
  return true;
}

function clear(R: R) {
  const s0 = R.s;
  const fAbs = s0.fAbs - mod(s0.fAbs, s0.cap);
  R.s = {
    ...s0, slots: s0.slots.map(() => null), front: 0, count: 0, fAbs,
    rear: s0.rule === "count" ? -1 : 0, rAbs: s0.rule === "count" ? fAbs - 1 : fAbs,
  };
  R.snap("clear()", s0.rule === "count" ? "front = 0, rear = -1, count = 0 — the initial empty state. O(1)." : "front = rear = 0 — front == rear means empty. O(1).",
    { tone: "ok", line: s0.rule === "count" ? [2, 3, 4] : [2, 3], fx: { ptr: { front: "focus", rear: "focus" } } });
  return true;
}

function build(R: R, cap: number, rule: FullRule) {
  R.s = { ...createCirc(cap, rule), nextId: R.s.nextId };
  R.snap(`new CircularQueue(${cap})`,
    rule === "count"
      ? `${cap} slots, \`front = 0\`, \`rear = -1\`, \`count = 0\`. The **counter** tells full (count == ${cap}) from empty (count == 0), so all ${cap} slots are usable.`
      : `${cap} slots, \`front = rear = 0\`, no counter. Empty is \`front == rear\`; full is \`(rear + 1) % ${cap} == front\`, so one slot always stays free — ${cap - 1} usable.`,
    { line: rule === "count" ? [2, 3, 4, 5] : [2, 3, 4], fx: { ptr: { front: "focus", rear: "focus" } } });
  return true;
}

export function runCirc(state: CircState, ops: readonly CircOp[]): RunResult<CircOpKind, CircState, CircFx> {
  const R: R = new Recorder<CircOpKind, CircState, CircFx>(state, "idle", varsOf);
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    R.op = op.kind;
    let ok = true;
    switch (op.kind) {
      case "enqueue": {
        const item: Item = { id: `c${R.s.nextId}`, v: op.v };
        R.s = { ...R.s, nextId: R.s.nextId + 1 };
        ok = R.s.rule === "count" ? enqueueCount(R, item) : enqueueGap(R, item);
        break;
      }
      case "dequeue": ok = R.s.rule === "count" ? dequeueCount(R) : dequeueGap(R); break;
      case "peek": ok = peek(R); break;
      case "clear": ok = clear(R); break;
      case "new": ok = build(R, op.cap, op.rule); break;
    }
    const rest = ops.length - i - 1;
    if (!ok && rest > 0 && ops.slice(i + 1).every((o) => o.kind === op.kind)) {
      R.snap(`Skipped the remaining ${rest} ${op.kind}${rest === 1 ? "" : "s"}`,
        op.kind === "enqueue" ? "The queue is full, so further enqueues would fail the same way." : "The queue is empty, so further dequeues would fail the same way.",
        { tone: "warn" });
      break;
    }
  }
  return { steps: R.steps, state: R.s };
}

export function circIntro(state: CircState): CircStep[] {
  const R: R = new Recorder<CircOpKind, CircState, CircFx>(state, "idle", varsOf);
  R.snap("A circular queue: the array's ends are glued together",
    `A FIFO queue whose indices **wrap around** with \`i = (i + 1) % capacity\`, so freed slots are reused. Here it already wraps: front = ${state.front}, rear = ${state.rear}.`,
    {});
  return R.steps;
}
