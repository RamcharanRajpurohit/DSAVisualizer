import type { BarsStep, Boundary, Marks, Pointer } from "../types";
import { BarsRecorder, paint } from "./common";

/** Insertion sort: lift the key, shift larger prefix elements right, drop the key into the gap. */
export function recordInsertion(input: readonly number[]): BarsStep[] {
  const r = new BarsRecorder(input, true);
  const n = r.n;
  if (r.trivial("insertion sort")) return r.steps;

  let comparisons = 0;
  let shifts = 0;

  const prefixMarks = (to: number): Marks => paint({}, 0, to, "merge");
  const boundary = (at: number): Boundary => ({ at, side: "left", label: "sorted", state: "merge" });
  const ptrs = (i: number, j: number): Pointer[] => [
    { id: "i", label: "i", at: i, color: "amber" },
    { id: "j", label: "j", at: j, color: "blue" },
  ];
  const vars = (i: number | null, j: number | null, key: number | null) => ({ i, j, key, comparisons, shifts });

  r.snap({
    title: `Insertion sort · ${n} elements`,
    detail:
      "Like a hand of cards: insert each next element, the **key**, into the **sorted prefix** on the left. " +
      "A[0] alone is already sorted.",
    tone: "info",
    line: 1,
    marks: prefixMarks(0),
    boundary: boundary(1),
    vars: vars(null, null, null),
  });

  for (let i = 1; i < n; i++) {
    const keyItem = r.item(i);
    const key = keyItem.value;
    const tag = `i = ${i} / ${n - 1}`;
    let moved = 0;
    r.slots[i] = null;
    r.floating = [{ item: keyItem, at: i, state: "pivot", label: "key" }];
    let j = i - 1;

    r.snap({
      title: `Pick key = ${key}`,
      detail: `\`key ← A[${i}]\` lifts **${key}** out, leaving a **gap** at index ${i}. \`j\` walks left through the sorted prefix.`,
      tone: "info",
      line: [2, 3, 4],
      marks: prefixMarks(i - 1),
      boundary: boundary(i + 1),
      pointers: ptrs(i, j),
      tag,
      vars: vars(i, j, key),
    });

    for (;;) {
      if (j < 0) {
        r.snap({
          title: "j = −1 → reached the front",
          detail: `Every element of the prefix was bigger than ${key}, so the key is the new smallest value: it goes to index 0.`,
          tone: "info",
          line: 5,
          marks: prefixMarks(i),
          boundary: boundary(i + 1),
          pointers: ptrs(i, j),
          tag,
          vars: vars(i, j, key),
        });
        break;
      }
      comparisons++;
      const a = r.val(j);
      if (a > key) {
        r.snap({
          title: `${a} > ${key} → shift ${a} right`,
          detail: `A[${j}] = **${a}** is bigger than key = **${key}**, so ${a} has to end up to the right of the key. Make room by sliding it into the gap.`,
          tone: "warn",
          line: 5,
          marks: { ...prefixMarks(i), [j]: "compare" },
          boundary: boundary(i + 1),
          pointers: ptrs(i, j),
          callout: { at: [j, j + 1], text: `${a} > ${key}`, tone: "warn" },
          tag,
          vars: vars(i, j, key),
        });
        r.slots[j + 1] = r.slots[j];
        r.slots[j] = null;
        r.floating = [{ item: keyItem, at: j, state: "pivot", label: "key" }];
        shifts++;
        moved++;
        r.snap({
          title: `Shift ${a} → index ${j + 1}`,
          detail: `\`A[${j + 1}] ← A[${j}]\`: ${a} slides one slot right and the gap moves left to index ${j}. Then \`j ← ${j - 1}\` to look at the next prefix element.`,
          tone: "warn",
          line: [6, 7],
          marks: { ...prefixMarks(i), [j + 1]: "active" },
          boundary: boundary(i + 1),
          pointers: ptrs(i, j - 1),
          tag,
          vars: vars(i, j - 1, key),
        });
        j--;
      } else {
        r.snap({
          title: `${a} ≤ ${key} → stop`,
          detail:
            `A[${j}] = **${a}** is not bigger than key = **${key}**, so everything left of the gap is ≤ ${key}: the key belongs in the gap at index ${j + 1}.` +
            (a === key
              ? " Stopping at an **equal** value keeps equal elements in order: insertion sort is **stable**."
              : ""),
          tone: "ok",
          line: 5,
          marks: { ...prefixMarks(i), [j]: "compare" },
          boundary: boundary(i + 1),
          pointers: ptrs(i, j),
          callout: { at: [j, j + 1], text: a === key ? `${a} = ${key}` : `${a} < ${key}`, tone: "ok" },
          tag,
          vars: vars(i, j, key),
        });
        break;
      }
    }

    r.slots[j + 1] = keyItem;
    r.floating = [];
    r.snap({
      title: `Insert ${key} at index ${j + 1}`,
      detail:
        `The prefix A[0..${i}] is sorted again` +
        (moved ? ` after ${moved} ${moved === 1 ? "shift" : "shifts"}.` : " with nothing moved, which is why sorted input is O(n).") +
        (i < n - 1 ? " It isn't final yet: later keys may push it right." : ""),
      tone: "ok",
      line: 8,
      marks: { ...prefixMarks(i), [j + 1]: "pivot" },
      boundary: boundary(i + 1),
      pointers: ptrs(i, j),
      tag,
      vars: vars(i, j, key),
    });
  }

  r.snap({
    title: "Sorted!",
    detail:
      `**${comparisons}** comparisons and **${shifts}** shifts. Each shift fixes one inversion, so nearly-sorted input is fast.`,
    tone: "ok",
    marks: paint({}, 0, n - 1, "success"),
    done: true,
    hold: 2,
    vars: vars(null, null, null),
  });
  return r.steps;
}
