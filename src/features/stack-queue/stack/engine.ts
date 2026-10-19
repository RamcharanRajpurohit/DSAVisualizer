/*
 * Array-backed stack with a fixed capacity — pure step recorder (no React).
 *
 *   A[0..capacity-1], top = index of the top element (-1 when empty).
 *
 * The snapshot also remembers `stale` values: a real pop / clear only moves `top`, the old value is
 * still sitting in the array as garbage until a later push overwrites it. The canvas shows those
 * faintly so students see WHY clear() can be O(1).
 */
import type { Tone } from "@/lib/theme";
import { Recorder, type RunResult } from "../shared/recorder";
import type { ChipTone, Item, SnapStep, Vars } from "../shared/types";
import { emptySlots, setAt } from "../shared/util";

export interface StackState {
  slots: readonly (Item | null)[];
  stale: readonly (number | null)[];
  top: number;
  cap: number;
  nextId: number;
}

export interface StackFx {
  /** An element hovering above the container (about to drop in / just lifted out). */
  float?: { item: Item; tone: ChipTone; shake?: boolean };
  /** Tone overrides for stored elements, by id. */
  hl?: Record<string, ChipTone>;
  /** Outline an empty slot. */
  slot?: { index: number; tone: "new" | "danger" };
  flash?: "overflow" | "underflow";
  callout?: { text: string; tone: Tone; at: "float" | "top" | "base" };
  result?: { text: string; tone: Tone };
  /** Make the top pointer glow red / pulse. */
  ptr?: "alert" | "focus";
}

export type StackOp =
  | { kind: "push"; v: number }
  | { kind: "pop" }
  | { kind: "peek" }
  | { kind: "isEmpty" }
  | { kind: "isFull" }
  | { kind: "clear" }
  | { kind: "new"; cap: number };

export type StackOpKind = StackOp["kind"] | "idle";
export type StackStep = SnapStep<StackOpKind, StackState, StackFx>;
type R = Recorder<StackOpKind, StackState, StackFx>;

export function createStack(cap: number, values: readonly number[] = []): StackState {
  const slots = emptySlots<Item>(cap);
  values.slice(0, cap).forEach((v, i) => (slots[i] = { id: `s${i}`, v }));
  return { slots, stale: emptySlots<number>(cap), top: Math.min(values.length, cap) - 1, cap, nextId: values.length };
}

export const stackSize = (s: StackState) => s.top + 1;
export const stackValues = (s: StackState) => s.slots.slice(0, s.top + 1).map((it) => it?.v ?? NaN);

const varsOf = (s: StackState): Vars => ({
  top: s.top,
  size: s.top + 1,
  capacity: s.cap,
  "A[top]": s.top >= 0 ? (s.slots[s.top]?.v ?? "empty") : "—",
});

// ───────────────────────────── operations ─────────────────────────────

/** Returns false when the operation failed (overflow / underflow). */
function push(R: R, v: number): boolean {
  const s0 = R.s;
  const item: Item = { id: `s${s0.nextId}`, v };
  R.s = { ...s0, nextId: s0.nextId + 1 };
  const { top, cap } = s0;
  const x = { x: v };

  if (top === cap - 1) {
    R.snap(`push(${v}) — is there room?`,
      `Check for overflow first: \`top == capacity − 1\` → \`${top} == ${cap - 1}\` → **true**. Every slot A[0..${cap - 1}] is already taken.`,
      { tone: "warn", line: 2, vars: x, fx: { float: { item, tone: "new" }, ptr: "focus" } });
    R.snap("Stack Overflow!",
      `There is nowhere to put **${v}**: \`A[${cap}]\` would run past the end of the array. A dynamic-array stack would grow instead (O(1) amortized).`,
      { tone: "danger", line: 3, vars: x, hold: 1.6,
        fx: { float: { item, tone: "danger", shake: true }, flash: "overflow", ptr: "alert", callout: { text: "Overflow — no free slot", tone: "danger", at: "float" } } });
    R.snap(`push(${v}) rejected`,
      `The stack is unchanged (top is still ${top}). Pop something first, or build a stack with a larger capacity.`,
      { tone: "danger", line: 3, vars: x, fx: { result: { text: `push(${v}) → overflow`, tone: "danger" } } });
    return false;
  }

  R.snap(`push(${v}) — is there room?`,
    `Check for overflow first: \`top == capacity − 1\` → \`${top} == ${cap - 1}\` → **false**, so slot A[${top + 1}] is free.`,
    { line: 2, vars: x, fx: { float: { item, tone: "new" }, slot: { index: top + 1, tone: "new" } } });

  R.s = { ...R.s, top: top + 1 };
  R.snap(`top = top + 1 → ${top + 1}`,
    `\`top\` always points at the top element, so it moves up first (${top} → ${top + 1}) to the slot the new element will occupy.`,
    { line: 4, vars: x, fx: { float: { item, tone: "new" }, slot: { index: top + 1, tone: "new" }, ptr: "focus" } });

  const stale = R.s.stale[top + 1];
  R.s = { ...R.s, slots: setAt(R.s.slots, top + 1, item), stale: setAt(R.s.stale, top + 1, null) };
  R.snap(`A[${top + 1}] = ${v}`,
    `**${v}** becomes the new top; nothing else moves, so push is **O(1)**.` +
      (top + 1 === cap - 1 ? " The stack is now **full**." : stale != null ? ` It overwrites the stale ${stale} left by an earlier pop.` : ""),
    { tone: "ok", line: 5, vars: x, fx: { hl: { [item.id]: "ok" } } });
  return true;
}

function pop(R: R): boolean {
  const s0 = R.s;
  const { top } = s0;
  if (top === -1) {
    R.snap("pop() — is the stack empty?",
      "Check for underflow first: `top == -1` → **true**. There is no element to remove.",
      { tone: "warn", line: 2, fx: { ptr: "focus" } });
    R.snap("Stack Underflow!",
      "Popping an empty stack is an error: there is no `A[-1]`. Check `isEmpty()` first.",
      { tone: "danger", line: 3, hold: 1.6,
        fx: { flash: "underflow", ptr: "alert", callout: { text: "Underflow — nothing to pop", tone: "danger", at: "base" }, result: { text: "pop() → underflow", tone: "danger" } } });
    return false;
  }
  const item = s0.slots[top]!;
  const x = { x: item.v };
  R.snap("pop() — is the stack empty?",
    `Check for underflow first: \`top == -1\` → \`${top} == -1\` → **false**, so there is something to pop.`,
    { line: 2, fx: { ptr: "focus" } });
  R.snap(`x = A[${top}] = ${item.v}`,
    `Read the top element. It is the **last one pushed**, and it is the only one a stack lets us remove — Last In, First Out.`,
    { line: 4, vars: x, fx: { hl: { [item.id]: "active" }, callout: { text: `x = ${item.v}`, tone: "warn", at: "top" } } });

  R.s = { ...s0, slots: setAt(s0.slots, top, null), stale: setAt(s0.stale, top, item.v), top: top - 1 };
  R.snap(`top = top - 1 → ${top - 1}`,
    `**${item.v}** lifts out and \`top\` drops to ${top - 1}. \`A[${top}]\` isn't erased: it is now garbage (faded) that the next push overwrites.`,
    { line: 5, vars: x, fx: { float: { item, tone: "out" }, ptr: "focus" } });
  R.snap(`return ${item.v}`,
    `pop() hands back **${item.v}** in **O(1)**.` +
      (top - 1 === -1 ? " The stack is now empty (top = -1)." : ` The new top is A[${top - 1}] = ${s0.slots[top - 1]?.v}.`),
    { tone: "ok", line: 6, vars: x, fx: { result: { text: `pop() → ${item.v}`, tone: "ok" } } });
  return true;
}

function peek(R: R): boolean {
  const { top, slots } = R.s;
  if (top === -1) {
    R.snap("peek() — is the stack empty?", "`top == -1` → **true**: there is no top element to look at.", { tone: "warn", line: 2, fx: { ptr: "focus" } });
    R.snap("Nothing to peek",
      "peek() on an empty stack is an error, exactly like pop(). Check `isEmpty()` before peeking.",
      { tone: "danger", line: 3, fx: { flash: "underflow", ptr: "alert", callout: { text: "Empty stack", tone: "danger", at: "base" }, result: { text: "peek() → error", tone: "danger" } } });
    return false;
  }
  const item = slots[top]!;
  R.snap("peek() — is the stack empty?", `\`top == -1\` → \`${top} == -1\` → **false**.`, { line: 2, fx: { ptr: "focus" } });
  R.snap(`peek() → ${item.v}`,
    `Return \`A[top]\` = **${item.v}** and leave \`top\` alone: peek only looks, in O(1).`,
    { tone: "ok", line: 4, vars: { x: item.v }, fx: { hl: { [item.id]: "active" }, result: { text: `peek() → ${item.v}`, tone: "ok" } } });
  return true;
}

function isEmpty(R: R) {
  const { top } = R.s;
  const e = top === -1;
  R.snap(`isEmpty() → ${e}`,
    e ? "`top == -1` → **true**: no element has been pushed (or all were popped)."
      : `\`top\` is ${top}, not -1 → **false**. The stack holds top + 1 = ${top + 1} element${top === 0 ? "" : "s"}.`,
    { tone: e ? "warn" : "ok", line: 2, fx: { ptr: "focus", result: { text: `isEmpty() → ${e}`, tone: e ? "warn" : "ok" } } });
  return true;
}

function isFull(R: R) {
  const { top, cap } = R.s;
  const f = top === cap - 1;
  R.snap(`isFull() → ${f}`,
    `\`top == capacity − 1\` → \`${top} == ${cap - 1}\` → **${f}**.` +
      (f ? " Another push would overflow." : ` ${cap - 1 - top} more element${cap - 1 - top === 1 ? "" : "s"} fit.`),
    { tone: f ? "warn" : "ok", line: 2, fx: { ptr: "focus", result: { text: `isFull() → ${f}`, tone: f ? "warn" : "ok" } } });
  return true;
}

function clear(R: R) {
  const s0 = R.s;
  if (s0.top === -1) {
    R.snap("clear() — already empty", "`top` is already -1, nothing to do.", { line: 2, fx: { ptr: "focus" } });
    return true;
  }
  const live = s0.slots.slice(0, s0.top + 1).filter((it): it is Item => !!it);
  R.snap("clear()",
    `All ${live.length} element${live.length === 1 ? "" : "s"} are about to be discarded.`,
    { line: 1, fx: { hl: Object.fromEntries(live.map((it) => [it.id, "out" as ChipTone])) } });
  R.s = {
    ...s0,
    slots: s0.slots.map(() => null),
    stale: s0.slots.map((it, i) => it?.v ?? s0.stale[i]),
    top: -1,
  };
  R.snap("top = -1",
    "Resetting `top` is all it takes: the old values become garbage that future pushes overwrite. No loop, so **O(1)**.",
    { tone: "ok", line: 2, fx: { ptr: "focus" } });
  return true;
}

function build(R: R, cap: number) {
  R.s = { ...createStack(cap), nextId: R.s.nextId };
  R.snap(`new Stack(${cap})`,
    `Allocate an array of **${cap}** slots (indices 0..${cap - 1}) and set \`top = -1\`, meaning "no element yet". The capacity is fixed from now on — that is what makes overflow possible.`,
    { line: [2, 3], fx: { ptr: "focus" } });
  return true;
}

// ───────────────────────────── runner ─────────────────────────────

export function runStack(state: StackState, ops: readonly StackOp[]): RunResult<StackOpKind, StackState, StackFx> {
  const R: R = new Recorder<StackOpKind, StackState, StackFx>(state, "idle", varsOf);
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    R.op = op.kind;
    let ok = true;
    switch (op.kind) {
      case "push": ok = push(R, op.v); break;
      case "pop": ok = pop(R); break;
      case "peek": ok = peek(R); break;
      case "isEmpty": ok = isEmpty(R); break;
      case "isFull": ok = isFull(R); break;
      case "clear": ok = clear(R); break;
      case "new": ok = build(R, op.cap); break;
    }
    const rest = ops.length - i - 1;
    if (!ok && rest > 0 && ops.slice(i + 1).every((o) => o.kind === op.kind)) {
      R.snap(`Skipped the remaining ${rest} ${op.kind}${rest === 1 ? "" : "s"}`,
        op.kind === "push" ? "The stack is full, so every further push would overflow in exactly the same way." : "The stack is empty, so every further pop would underflow in exactly the same way.",
        { tone: "warn" });
      break;
    }
  }
  return { steps: R.steps, state: R.s };
}

export function stackIntro(state: StackState): StackStep[] {
  const R: R = new Recorder<StackOpKind, StackState, StackFx>(state, "idle", varsOf);
  R.snap("A stack: Last In, First Out",
    `Values are pushed and popped at one end only: the **top**. Here it is an array of ${state.cap} slots, and \`top\` is the index of the newest value.`,
    { fx: {} });
  return R.steps;
}
