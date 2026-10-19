import type { VizState } from "@/lib/theme";
import type { BarsStep, FloatingItem, Marks, Pointer, SortItem } from "../types";

/*
 * Shared helpers for the step recorders. Pure TS (type-only imports), so the engines
 * run under plain `tsx` as well as inside the app.
 */

export const makeItems = (input: readonly number[]): SortItem[] => input.map((value, id) => ({ id, value }));

/** Paint `state` on indices from..to (inclusive) of `marks`; returns `marks`. */
export function paint(marks: Marks, from: number, to: number, state: VizState): Marks {
  for (let i = Math.max(0, from); i <= to; i++) marks[i] = state;
  return marks;
}

export const s = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

/** "[3, 5, 8]" — shortened in the middle when long. */
export function listText(values: readonly number[], max = 10): string {
  if (values.length <= max) return `[${values.join(", ")}]`;
  const head = values.slice(0, Math.ceil(max / 2));
  const tail = values.slice(values.length - Math.floor(max / 2));
  return `[${head.join(", ")}, …, ${tail.join(", ")}]`;
}

export const ordinal = (k: number) => {
  const v = k % 100;
  const suf = v >= 11 && v <= 13 ? "th" : ["th", "st", "nd", "rd"][k % 10] ?? "th";
  return `${k}${suf ?? "th"}`;
};

type BarsInput = Omit<BarsStep, "kind" | "slots" | "floating" | "liftRoom" | "pointers" | "marks"> & {
  pointers?: Pointer[];
  marks?: Marks;
};

/**
 * Holds the live array for the bar-based sorts and snapshots it into steps.
 * Every step is a full copy, so playback can jump anywhere.
 */
export class BarsRecorder {
  readonly steps: BarsStep[] = [];
  readonly n: number;
  slots: (SortItem | null)[];
  floating: FloatingItem[] = [];

  constructor(input: readonly number[], private readonly liftRoom: boolean) {
    this.slots = makeItems(input);
    this.n = input.length;
  }

  item(i: number): SortItem {
    const it = this.slots[i];
    if (!it) throw new Error(`slot ${i} is empty`);
    return it;
  }

  val(i: number): number {
    return this.item(i).value;
  }

  values(from = 0, to = this.n - 1): number[] {
    const out: number[] = [];
    for (let i = from; i <= to; i++) {
      const it = this.slots[i];
      if (it) out.push(it.value);
    }
    return out;
  }

  swap(a: number, b: number) {
    const t = this.slots[a];
    this.slots[a] = this.slots[b];
    this.slots[b] = t;
  }

  snap(step: BarsInput) {
    this.steps.push({
      ...step,
      kind: "bars",
      slots: this.slots.slice(),
      floating: this.floating.map((f) => ({ ...f })),
      marks: { ...(step.marks ?? {}) },
      pointers: step.pointers ?? [],
      liftRoom: this.liftRoom,
    });
  }

  /** Handles n ≤ 1. Returns true when there is nothing left to do. */
  trivial(name: string): boolean {
    if (this.n === 0) {
      this.snap({
        title: "Nothing to sort",
        detail: "The array is empty. Add a few values (or generate a random array) to watch " + name + " work.",
        tone: "muted",
        done: true,
      });
      return true;
    }
    if (this.n === 1) {
      this.snap({
        title: "Already sorted",
        detail: `A single element (**${this.val(0)}**) is sorted by definition — ${name} has nothing to compare.`,
        tone: "ok",
        marks: { 0: "success" },
        done: true,
      });
      return true;
    }
    return false;
  }
}

/**
 * For unstable sorts: did equal values end up out of their input order? Names the first offending
 * pair with the same a/b/c tags the canvas draws ("4b now comes before 4a").
 */
export function stabilityNote(final: readonly (SortItem | null)[]): string {
  const items = final.filter((it): it is SortItem => !!it);
  const ids = new Map<number, number[]>();
  for (const it of items) ids.set(it.value, [...(ids.get(it.value) ?? []), it.id]);
  const dupes = [...ids.values()].filter((g) => g.length > 1);
  if (!dupes.length) return "";
  const tag = (value: number, id: number) => {
    const sorted = [...(ids.get(value) ?? [])].sort((a, b) => a - b);
    return `${value}${String.fromCharCode(97 + (sorted.indexOf(id) % 26))}`;
  };
  for (const it of items) {
    const group = ids.get(it.value) ?? [];
    const pos = group.indexOf(it.id);
    const earlier = group.slice(pos + 1).find((id) => id < it.id);
    if (earlier != null) {
      return `\n**${tag(it.value, it.id)}** now comes before **${tag(it.value, earlier)}**: equal values changed order.`;
    }
  }
  return "\nEqual values kept their order this time, but only by luck.";
}
