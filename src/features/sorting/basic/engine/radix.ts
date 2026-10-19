import type { Marks, Pointer, RadixStep, SortItem } from "../types";
import { listText, makeItems, s } from "./common";

const PLACE = ["ones", "tens", "hundreds", "thousands", "ten-thousands", "hundred-thousands"];
const placeName = (p: number) => PLACE[p] ?? `10^${p}`;

type RadixInput = Omit<RadixStep, "kind" | "row" | "buckets" | "offset" | "digits" | "maxStack" | "pointers" | "marks" | "digitPos"> & {
  pointers?: Pointer[];
  marks?: Marks;
  digitPos?: number;
};

/** LSD radix sort, base 10, with ten FIFO buckets. Negative inputs are shifted by −min first. */
export function recordRadix(source: readonly number[]): RadixStep[] {
  const n = source.length;
  const items = makeItems(source);
  const steps: RadixStep[] = [];
  const min = n ? Math.min(...source) : 0;
  const offset = min < 0 ? -min : 0;
  const key = (it: SortItem) => it.value + offset;
  const maxKey = n ? Math.max(...source) + offset : 0;
  const digits = String(Math.max(0, maxKey)).length;
  const row: (SortItem | null)[] = items.slice();
  const buckets: SortItem[][] = Array.from({ length: 10 }, () => []);
  const allIds = (state: "success" | "merge"): Marks => Object.fromEntries(items.map((it) => [it.id, state]));
  let moves = 0;

  const vars = (pass: number | null, exp: number | null, i: number | null, d: number | null) => ({
    pass,
    exp,
    i,
    "A[i]": i == null ? null : (row[i]?.value ?? null),
    d,
    off: offset,
    moves,
  });

  const snap = (st: RadixInput) =>
    steps.push({
      ...st,
      kind: "radix",
      row: row.slice(),
      buckets: buckets.map((b) => b.slice()),
      offset,
      digits,
      digitPos: st.digitPos ?? -1,
      maxStack: 1,
      pointers: st.pointers ?? [],
      marks: { ...(st.marks ?? {}) },
    });

  if (n === 0) {
    snap({
      title: "Nothing to sort",
      detail: "The array is empty. Add a few values (or generate a random array) to watch radix sort work.",
      tone: "muted",
      done: true,
      vars: vars(null, null, null, null),
    });
    return steps;
  }

  snap({
    title: `Radix sort (LSD) · ${s(digits, "digit")} per key`,
    detail:
      "Sort one **digit** at a time, starting with the least significant (ones) digit. Each pass drops every element into one " +
      "of 10 buckets by that digit, then collects the buckets in order 0 → 9. Because each pass is **stable**, after pass p the " +
      `array is sorted by its last p digits — so ${s(digits, "pass", "passes")} sort it completely, with no comparisons at all.` +
      (offset
        ? `\nThe input contains negative numbers, whose digits don't order correctly, so every key gets **+${offset}** (= −min) first. ` +
          "Adding the same amount to everything keeps the order. The shifted key is shown under each value."
        : ""),
    tone: "info",
    line: [1, 2],
    tag: `${s(digits, "pass", "passes")}`,
    hold: 1.5,
    vars: vars(null, null, null, null),
  });

  if (maxKey === 0) {
    snap({
      title: "All keys are 0 — already sorted",
      detail: "Every key is 0, so `exp = 1 ≤ max` already fails: no pass is needed and the array is already in order.",
      tone: "ok",
      line: [3, 9],
      marks: allIds("success"),
      done: true,
      hold: 2,
      vars: vars(null, null, null, null),
    });
    return steps;
  }

  let pass = 0;
  for (let exp = 1; exp <= maxKey; exp *= 10, pass++) {
    const tag = `Pass ${pass + 1} / ${digits} · ${placeName(pass)}`;
    const digitOf = (it: SortItem) => Math.floor(key(it) / exp) % 10;
    snap({
      title: `Pass ${pass + 1}: the ${placeName(pass)} digit`,
      detail:
        `\`exp = ${exp}\`: look only at digit ⌊key / ${exp}⌋ mod 10 (highlighted in each tile) and ignore the rest. All ten buckets start empty.` +
        (pass > 0 ? ` The order left by the previous pass decides ties, so it must be kept — that's why buckets are FIFO queues.` : ""),
      tone: "info",
      line: [3, 4],
      digitPos: pass,
      tag,
      vars: vars(pass + 1, exp, null, null),
    });

    for (let i = 0; i < n; i++) {
      const it = row[i] as SortItem;
      const d = digitOf(it);
      const ahead = buckets[d].map((b) => b.value);
      const k = key(it);
      snap({
        title: `${it.value} → bucket ${d}`,
        detail:
          (offset ? `key = ${it.value} + ${offset} = ${k}; ` : "") +
          `⌊${k} / ${exp}⌋ mod 10 = **${d}**, so ${it.value} is appended to the **end** of bucket ${d}` +
          (ahead.length
            ? `, behind ${listText(ahead, 6)} which came earlier — appending keeps earlier elements first, so the pass is stable.`
            : "."),
        tone: "warn",
        line: [5, 6, 7],
        digitPos: pass,
        marks: { [it.id]: "active" },
        activeBucket: d,
        pointers: [{ id: "i", label: "i", at: i, color: "amber" }],
        callout: { target: "row", at: i, text: `digit ${d}`, tone: "warn" },
        tag,
        vars: vars(pass + 1, exp, i, d),
      });
      buckets[d].push(it);
      row[i] = null;
      moves++;
    }

    snap({
      title: "Every element is in a bucket",
      detail: "Now read the buckets back **in order 0 → 9**, each one front to back (first in, first out).",
      tone: "info",
      line: 8,
      digitPos: pass,
      tag,
      vars: vars(pass + 1, exp, null, null),
    });

    let pos = 0;
    for (let b = 0; b < 10; b++) {
      if (!buckets[b].length) continue;
      const group = buckets[b];
      const start = pos;
      for (const it of group) row[pos++] = it;
      moves += group.length;
      buckets[b] = [];
      snap({
        title: `Collect bucket ${b} → A[${start}${group.length > 1 ? `..${pos - 1}` : ""}]`,
        detail:
          `Bucket ${b} holds ${listText(group.map((g) => g.value), 8)} — ${group.length > 1 ? "they go" : "it goes"} back into the next free ` +
          `${group.length > 1 ? "slots" : "slot"} in the same order they arrived.`,
        tone: "info",
        line: 8,
        digitPos: pass,
        marks: Object.fromEntries(group.map((g) => [g.id, "active"])),
        activeBucket: b,
        tag,
        vars: vars(pass + 1, exp, null, b),
      });
    }

    const lastPass = exp * 10 > maxKey;
    snap({
      title: lastPass ? `Sorted by all ${s(pass + 1, "digit")}` : `Sorted by the last ${s(pass + 1, "digit")}`,
      detail: lastPass
        ? `That was the most significant digit (no key reaches ${exp * 10}), so the array is fully sorted.`
        : `Looking only at the last ${s(pass + 1, "digit")}, the array is now in order: ${listText(row.map((it) => it?.value ?? 0), 10)}. ` +
          `Next: the ${placeName(pass + 1)} digit (\`exp ← ${exp * 10}\`).`,
      tone: "ok",
      line: 3,
      digitPos: pass,
      marks: allIds(lastPass ? "success" : "merge"),
      tag,
      hold: 1.3,
      vars: vars(pass + 1, exp, null, null),
    });
  }

  snap({
    title: "Sorted!",
    detail:
      `${s(pass, "pass", "passes")} × (${n} elements + 10 buckets): O(d · (n + b)) time with d = ${digits}, b = 10 — ` +
      `and not a single comparison. ${moves} element moves in total.` +
      (offset ? ` The +${offset} offset only affected the keys; the values themselves never changed.` : ""),
    tone: "ok",
    line: 9,
    marks: allIds("success"),
    done: true,
    hold: 2,
    vars: vars(null, null, null, null),
  });

  const maxStack = Math.max(1, ...steps.map((st) => Math.max(...st.buckets.map((b) => b.length))));
  for (const st of steps) st.maxStack = maxStack;
  return steps;
}

