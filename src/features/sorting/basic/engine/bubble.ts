import type { BarsStep, Boundary, Marks, Pointer } from "../types";
import { BarsRecorder, paint, s } from "./common";

/** Bubble sort with the `swapped` early-exit flag. */
export function recordBubble(input: readonly number[]): BarsStep[] {
  const r = new BarsRecorder(input, false);
  const n = r.n;
  if (r.trivial("bubble sort")) return r.steps;

  let comparisons = 0;
  let swaps = 0;
  let passes = 0;
  /** Indices ≥ sortedFrom are in their final place. */
  let sortedFrom = n;

  const finalMarks = (): Marks => paint({}, sortedFrom, n - 1, "success");
  const boundary = (): Boundary | undefined =>
    sortedFrom < n ? { at: sortedFrom, side: "right", label: "final", state: "success" } : undefined;
  const ptrs = (j: number): Pointer[] => [
    { id: "j", label: "j", at: j, color: "blue" },
    { id: "j1", label: "j+1", at: j + 1, color: "blue" },
  ];
  const vars = (i: number | null, j: number | null, swapped: boolean | null) => ({
    pass: i == null ? null : i + 1,
    i,
    j,
    "A[j]": j == null ? null : r.val(j),
    "A[j+1]": j == null ? null : r.val(j + 1),
    swapped,
    comparisons,
    swaps,
  });

  r.snap({
    title: `Bubble sort · ${n} elements`,
    detail:
      "Each pass walks left → right comparing **neighbours**. Whenever the left one is bigger they swap, so the largest " +
      "unsorted value is carried — it **bubbles** — to the end of the unsorted part.\nAfter every pass one more element on " +
      "the right is final, so each pass can stop one slot earlier.",
    tone: "info",
    line: 1,
    vars: vars(null, null, null),
  });

  for (let i = 0; i < n - 1; i++) {
    passes++;
    let swapped = false;
    const lastJ = n - 2 - i;
    const tag = `Pass ${i + 1} / ${n - 1}`;

    r.snap({
      title: `Pass ${i + 1}: bubble through A[0..${lastJ + 1}]`,
      detail:
        (i === 0
          ? `Nothing is final yet, so compare every neighbouring pair up to index ${lastJ}.`
          : `The last ${s(i, "element")} ${i === 1 ? "is" : "are"} already final, so this pass only compares pairs up to index ${lastJ}.`) +
        " `swapped ← false` — we'll remember whether this pass moves anything.",
      tone: "info",
      line: [2, 3],
      marks: finalMarks(),
      boundary: boundary(),
      pointers: ptrs(0),
      tag,
      vars: vars(i, 0, false),
    });

    for (let j = 0; j <= lastJ; j++) {
      comparisons++;
      const a = r.val(j);
      const b = r.val(j + 1);
      const marks = finalMarks();
      if (a > b) {
        r.snap({
          title: `Compare ${a} and ${b} — out of order`,
          detail: `A[${j}] = **${a}** is bigger than its right neighbour A[${j + 1}] = **${b}**, so the bigger value is on the wrong side → **swap** them.`,
          tone: "danger",
          line: [4, 5],
          marks: paint(marks, j, j + 1, "compare"),
          boundary: boundary(),
          pointers: ptrs(j),
          callout: { at: [j, j + 1], text: `${a} > ${b}`, tone: "danger" },
          tag,
          vars: vars(i, j, swapped),
        });
        r.swap(j, j + 1);
        swaps++;
        swapped = true;
        r.snap({
          title: `Swap ${a} ↔ ${b}`,
          detail:
            `${b} moves left and ${a} moves right. ${a} keeps travelling right for as long as it is bigger than its next neighbour.` +
            " `swapped ← true` — this pass changed something, so we can't stop early yet.",
          tone: "warn",
          line: [6, 7],
          marks: paint(finalMarks(), j, j + 1, "active"),
          boundary: boundary(),
          pointers: ptrs(j),
          swap: [j, j + 1],
          callout: { at: [j, j + 1], text: "swap", tone: "warn" },
          tag,
          vars: vars(i, j, swapped),
        });
      } else {
        r.snap({
          title: `${a} ≤ ${b} — already in order`,
          detail:
            `A[${j}] = **${a}** is not bigger than A[${j + 1}] = **${b}**, so this pair is fine — no swap.` +
            (a === b
              ? " Equal values are **never** swapped (the test is `>`, not `≥`), which keeps equal elements in their original order: bubble sort is **stable**."
              : ""),
          tone: "ok",
          line: [4, 5],
          marks: paint(marks, j, j + 1, "compare"),
          boundary: boundary(),
          pointers: ptrs(j),
          callout: { at: [j, j + 1], text: a === b ? `${a} = ${b}` : `${a} < ${b}`, tone: "ok" },
          tag,
          vars: vars(i, j, swapped),
        });
      }
    }

    sortedFrom = n - 1 - i;
    const lastPass = i === n - 2;
    if (lastPass) sortedFrom = 0;
    const placed = r.val(n - 1 - i);
    r.snap({
      title: lastPass ? `${placed} and ${r.val(0)} are final` : `${placed} reached its final place`,
      detail:
        `Pass ${i + 1} carried the largest unsorted value, **${placed}**, to index ${n - 1 - i}. ` +
        (lastPass
          ? "Only A[0] is left and it must be the smallest, so it is final as well."
          : "Everything right of the boundary is final and is never compared again.") +
        (swapped && !lastPass ? "\n`swapped` is true, so another pass is needed." : ""),
      tone: "ok",
      line: swapped || lastPass ? [8, 9] : 8,
      marks: finalMarks(),
      boundary: boundary(),
      tag,
      hold: 1.2,
      vars: vars(i, null, swapped),
    });

    if (!swapped && !lastPass) {
      sortedFrom = 0;
      r.snap({
        title: "No swaps → sorted early!",
        detail:
          `Pass ${i + 1} made **zero swaps**: every neighbouring pair is already in order, so the whole array is sorted. ` +
          `The \`swapped\` flag lets us stop now and skip ${s(n - 2 - i, "more pass", "more passes")}.`,
        tone: "ok",
        line: 9,
        marks: finalMarks(),
        boundary: boundary(),
        tag,
        hold: 1.3,
        vars: vars(i, null, swapped),
      });
      break;
    }
  }

  const worst = (n * (n - 1)) / 2;
  r.snap({
    title: "Sorted!",
    detail:
      `${n} elements sorted in ${s(passes, "pass", "passes")} with **${comparisons}** comparisons and **${swaps}** swaps.\n` +
      `Every swap removes exactly one inversion, so this input had ${swaps} pairs out of order (the worst case, a reversed array, has n(n−1)/2 = ${worst}).`,
    tone: "ok",
    marks: paint({}, 0, n - 1, "success"),
    done: true,
    hold: 2,
    vars: vars(null, null, null),
  });
  return r.steps;
}
