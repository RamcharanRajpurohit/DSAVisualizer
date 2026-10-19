/*
 * Double-ended queue on a circular array — pure step recorder.
 *
 *   front = index of the first element, size = number of elements,
 *   the last element lives at (front + size - 1) % capacity.
 *
 * pushFront moves front BACKWARDS ((front - 1 + capacity) % capacity), popFront moves it forwards;
 * pushBack / popBack work at (front + size) and (front + size - 1). Every operation is O(1).
 * `rear` is kept in the snapshot only so the canvas can point at it during an operation.
 */
import type { Tone } from "@/lib/theme";
import { Recorder, type RunResult } from "../shared/recorder";
import type { ChipTone, Item, SnapStep, Vars } from "../shared/types";
import { emptySlots, mod, setAt } from "../shared/util";

export type Side = "front" | "back";

export interface DequeState {
  slots: readonly (Item | null)[];
  front: number;
  size: number;
  /** Index the rear pointer shows (null when empty). */
  rear: number | null;
  cap: number;
  nextId: number;
}

export interface DequeFx {
  /** Element waiting outside one end of the deque (or leaving through it). */
  float?: { item: Item; tone: ChipTone; side: Side; shake?: boolean };
  hl?: Record<string, ChipTone>;
  slot?: { index: number; tone: "new" | "danger" | "active" };
  ptr?: { front?: "alert" | "focus"; rear?: "alert" | "focus" };
  callout?: { text: string; tone: Tone };
  result?: { text: string; tone: Tone };
  calc?: { text: string; wrap: boolean };
}

export type DequeOp =
  | { kind: "pushFront"; v: number }
  | { kind: "pushBack"; v: number }
  | { kind: "popFront" }
  | { kind: "popBack" }
  | { kind: "peekFront" }
  | { kind: "peekBack" }
  | { kind: "clear" }
  | { kind: "new"; cap: number };

export type DequeOpKind = DequeOp["kind"] | "idle";
export type DequeStep = SnapStep<DequeOpKind, DequeState, DequeFx>;
type R = Recorder<DequeOpKind, DequeState, DequeFx>;

export function createDeque(cap: number, values: readonly number[] = [], front = 0): DequeState {
  const vs = values.slice(0, cap);
  const slots = emptySlots<Item>(cap);
  vs.forEach((v, k) => (slots[mod(front + k, cap)] = { id: `d${k}`, v }));
  return { slots, front: mod(front, cap), size: vs.length, rear: vs.length ? mod(front + vs.length - 1, cap) : null, cap, nextId: vs.length };
}

/** Elements in logical order, front → back (tolerates the transient states inside an operation). */
export function dequeItems(s: DequeState): Item[] {
  const out: Item[] = [];
  for (let k = 0; k < s.cap; k++) {
    const it = s.slots[mod(s.front + k, s.cap)];
    if (it) out.push(it);
  }
  return out;
}

export const dequeValues = (s: DequeState) => Array.from({ length: s.size }, (_, k) => s.slots[mod(s.front + k, s.cap)]?.v ?? NaN);

const lastIdx = (s: DequeState) => mod(s.front + s.size - 1, s.cap);

const varsOf = (s: DequeState): Vars => ({
  front: s.front,
  rear: s.rear ?? "—",
  size: s.size,
  capacity: s.cap,
});

const wrapBack = (from: number, cap: number) =>
  from === 0 ? ` **Wrap-around:** from 0 it goes to the last index, ${cap - 1}; adding capacity first keeps \`%\` non-negative.` : "";
const wrapFwd = (name: string, from: number, cap: number) =>
  from === cap - 1 ? ` **Wrap-around:** ${name} continues at 0.` : "";

function overflow(R: R, item: Item, side: Side, fn: string) {
  const { size, cap } = R.s;
  R.snap(`${fn}(${item.v}) — is it full?`, `\`size == capacity\` → \`${size} == ${cap}\` → **true**.`,
    { tone: "warn", line: 2, vars: { x: item.v }, fx: { float: { item, tone: "new", side } } });
  R.snap("Deque Overflow!", `Every slot is in use, so there is no room at either end for **${item.v}**. Pop from either end first.`,
    { tone: "danger", line: 3, vars: { x: item.v }, hold: 1.5,
      fx: { float: { item, tone: "danger", side, shake: true }, ptr: { front: "alert", rear: "alert" }, callout: { text: "size == capacity → full", tone: "danger" }, result: { text: `${fn}(${item.v}) → overflow`, tone: "danger" } } });
}

function underflow(R: R, fn: string) {
  R.snap(`${fn}() — is it empty?`, "`size == 0` → **true**.", { tone: "warn", line: 2, fx: { ptr: { front: "focus" } } });
  R.snap("Deque Underflow!", "There is no element at either end. Check `isEmpty()` (size == 0) before popping or peeking.",
    { tone: "danger", line: 3, hold: 1.4, fx: { ptr: { front: "alert" }, callout: { text: "size == 0 → empty", tone: "danger" }, result: { text: `${fn}() → underflow`, tone: "danger" } } });
}

// ───────────────────────────── operations ─────────────────────────────

function pushFront(R: R, item: Item): boolean {
  const s0 = R.s;
  const { front, size, cap } = s0;
  if (size === cap) { overflow(R, item, "front", "pushFront"); return false; }
  const nf = mod(front - 1, cap);
  const x = { x: item.v };
  R.snap(`pushFront(${item.v}) — is it full?`, `\`size == capacity\` → \`${size} == ${cap}\` → **false**.`,
    { line: 2, vars: x, fx: { float: { item, tone: "new", side: "front" }, slot: { index: nf, tone: "new" } } });
  R.s = { ...s0, front: nf, rear: size === 0 ? nf : s0.rear };
  R.snap(`front = (${front} − 1 + ${cap}) % ${cap} = ${nf}`,
    `A new first element goes in the slot **before** front, so front steps back.` +
      (front === 0 ? wrapBack(front, cap) : size === 0 ? " The deque was empty, so this element is both front and rear." : ""),
    { line: 4, vars: x, fx: { float: { item, tone: "new", side: "front" }, slot: { index: nf, tone: "new" }, ptr: { front: "focus" },
      calc: { text: `front = (${front} − 1 + ${cap}) % ${cap} = ${nf}`, wrap: front === 0 } } });
  R.s = { ...R.s, slots: setAt(R.s.slots, nf, item), size: size + 1 };
  R.snap(`A[${nf}] = ${item.v}, size = ${size + 1}`, `**${item.v}** is the new front of the deque. No element moved → O(1).`,
    { tone: "ok", line: [5, 6], vars: x, fx: { hl: { [item.id]: "ok" } } });
  return true;
}

function pushBack(R: R, item: Item): boolean {
  const s0 = R.s;
  const { front, size, cap } = s0;
  if (size === cap) { overflow(R, item, "back", "pushBack"); return false; }
  const r = mod(front + size, cap);
  const x = { x: item.v };
  R.snap(`pushBack(${item.v}) — is it full?`, `\`size == capacity\` → \`${size} == ${cap}\` → **false**.`,
    { line: 2, vars: x, fx: { float: { item, tone: "new", side: "back" } } });
  R.s = { ...s0, rear: r };
  R.snap(`rear = (${front} + ${size}) % ${cap} = ${r}`,
    `The first free slot after the last element is \`(front + size) % capacity\`.` + (front + size >= cap ? " The sum passes the end, so the modulo **wraps** it to the start." : ""),
    { line: 4, vars: x, fx: { float: { item, tone: "new", side: "back" }, slot: { index: r, tone: "new" }, ptr: { rear: "focus" },
      calc: { text: `rear = (${front} + ${size}) % ${cap} = ${r}`, wrap: front + size >= cap } } });
  R.s = { ...R.s, slots: setAt(R.s.slots, r, item), size: size + 1 };
  R.snap(`A[${r}] = ${item.v}, size = ${size + 1}`, `**${item.v}** joins the back in O(1); front does not move.`,
    { tone: "ok", line: [5, 6], vars: x, fx: { hl: { [item.id]: "ok" } } });
  return true;
}

function popFront(R: R): boolean {
  const s0 = R.s;
  const { front, size, cap } = s0;
  if (size === 0) { underflow(R, "popFront"); return false; }
  const item = s0.slots[front]!;
  const nf = mod(front + 1, cap);
  const x = { x: item.v };
  R.snap("popFront() — is it empty?", `\`size == 0\` → \`${size} == 0\` → **false**.`, { line: 2, fx: { ptr: { front: "focus" } } });
  R.snap(`x = A[${front}] = ${item.v}`, "Read the element at the front end.", { line: 4, vars: x, fx: { hl: { [item.id]: "active" } } });
  R.s = { ...s0, slots: setAt(s0.slots, front, null), front: nf, size: size - 1, rear: size - 1 === 0 ? null : s0.rear };
  R.snap(`front = (${front} + 1) % ${cap} = ${nf}`,
    `**${item.v}** leaves through the front; front moves forward and size drops to ${size - 1}.` + wrapFwd("front", front, cap),
    { line: [5, 6], vars: x, fx: { float: { item, tone: "out", side: "front" }, ptr: { front: "focus" }, calc: { text: `front = (${front} + 1) % ${cap} = ${nf}`, wrap: front === cap - 1 } } });
  R.snap(`return ${item.v}`, `popFront() returns **${item.v}** in O(1).` + (size - 1 === 0 ? " The deque is now empty." : ""),
    { tone: "ok", line: 7, vars: x, fx: { result: { text: `popFront() → ${item.v}`, tone: "ok" } } });
  return true;
}

function popBack(R: R): boolean {
  const s0 = R.s;
  const { front, size, cap } = s0;
  if (size === 0) { underflow(R, "popBack"); return false; }
  const r = lastIdx(s0);
  const item = s0.slots[r]!;
  const x = { x: item.v };
  R.snap("popBack() — is it empty?", `\`size == 0\` → \`${size} == 0\` → **false**.`, { line: 2, fx: { ptr: { rear: "focus" } } });
  R.s = { ...s0, rear: r };
  R.snap(`rear = (${front} + ${size} − 1) % ${cap} = ${r}`, "Locate the last element from front and size.",
    { line: 4, fx: { ptr: { rear: "focus" }, calc: { text: `rear = (${front} + ${size} − 1) % ${cap} = ${r}`, wrap: front + size - 1 >= cap } } });
  R.snap(`x = A[${r}] = ${item.v}`, "Read the element at the back end.", { line: 5, vars: x, fx: { hl: { [item.id]: "active" } } });
  const s1: DequeState = { ...R.s, slots: setAt(R.s.slots, r, null), size: size - 1 };
  R.s = { ...s1, rear: size - 1 === 0 ? null : lastIdx(s1) };
  R.snap(`size = ${size - 1}`,
    `**${item.v}** leaves through the back. Shrinking size is enough — front stays where it is, and the new last element is A[${size - 1 === 0 ? "—" : lastIdx(s1)}].`,
    { line: 6, vars: x, fx: { float: { item, tone: "out", side: "back" }, ptr: { rear: "focus" } } });
  R.snap(`return ${item.v}`, `popBack() returns **${item.v}** in O(1).` + (size - 1 === 0 ? " The deque is now empty." : ""),
    { tone: "ok", line: 7, vars: x, fx: { result: { text: `popBack() → ${item.v}`, tone: "ok" } } });
  return true;
}

function peek(R: R, side: Side): boolean {
  const s = R.s;
  const fn = side === "front" ? "peekFront" : "peekBack";
  if (s.size === 0) { underflow(R, fn); return false; }
  const i = side === "front" ? s.front : lastIdx(s);
  const item = s.slots[i]!;
  R.snap(`${fn}() — is it empty?`, `\`size == 0\` → \`${s.size} == 0\` → **false**.`, { line: 2, fx: { ptr: side === "front" ? { front: "focus" } : { rear: "focus" } } });
  R.snap(`${fn}() → ${item.v}`, `Return \`A[${side === "front" ? "front" : "(front + size − 1) % capacity"}]\` = **${item.v}** without removing it. O(1).`,
    { tone: "ok", line: 4, vars: { x: item.v }, fx: { hl: { [item.id]: "active" }, result: { text: `${fn}() → ${item.v}`, tone: "ok" } } });
  return true;
}

function clear(R: R) {
  R.s = { ...R.s, slots: R.s.slots.map(() => null), front: 0, size: 0, rear: null };
  R.snap("clear(): front = 0, size = 0", "Both ends reset; the old values are simply forgotten. O(1).", { tone: "ok", line: [2, 3], fx: { ptr: { front: "focus" } } });
  return true;
}

function build(R: R, cap: number) {
  R.s = { ...createDeque(cap), nextId: R.s.nextId };
  R.snap(`new Deque(${cap})`, `A circular array of **${cap}** slots with front = 0 and size = 0. Both ends can grow and shrink — the modulo keeps every index inside 0..${cap - 1}.`,
    { line: [2, 3, 4], fx: { ptr: { front: "focus" } } });
  return true;
}

export function runDeque(state: DequeState, ops: readonly DequeOp[]): RunResult<DequeOpKind, DequeState, DequeFx> {
  const R: R = new Recorder<DequeOpKind, DequeState, DequeFx>(state, "idle", varsOf);
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    R.op = op.kind;
    let ok = true;
    switch (op.kind) {
      case "pushFront":
      case "pushBack": {
        const item: Item = { id: `d${R.s.nextId}`, v: op.v };
        R.s = { ...R.s, nextId: R.s.nextId + 1 };
        ok = op.kind === "pushFront" ? pushFront(R, item) : pushBack(R, item);
        break;
      }
      case "popFront": ok = popFront(R); break;
      case "popBack": ok = popBack(R); break;
      case "peekFront": ok = peek(R, "front"); break;
      case "peekBack": ok = peek(R, "back"); break;
      case "clear": ok = clear(R); break;
      case "new": ok = build(R, op.cap); break;
    }
    const rest = ops.length - i - 1;
    if (!ok && rest > 0 && ops.slice(i + 1).every((o) => o.kind === op.kind)) {
      R.snap(`Skipped the remaining ${rest} ${op.kind}${rest === 1 ? "" : "s"}`, "They would fail in exactly the same way.", { tone: "warn" });
      break;
    }
  }
  return { steps: R.steps, state: R.s };
}

export function dequeIntro(state: DequeState): DequeStep[] {
  const R: R = new Recorder<DequeOpKind, DequeState, DequeFx>(state, "idle", varsOf);
  R.snap("A deque: a queue with two open ends",
    `Values are added and removed at **both** ends. Top row: the deque in order; bottom row: the circular array that stores it (front = ${state.front}).`,
    {});
  return R.steps;
}
