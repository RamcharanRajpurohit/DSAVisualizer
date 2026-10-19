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
      "Compare **neighbours** left → right and swap them when the left one is bigger. The largest unsorted value " +
      "**bubbles** to the end, so each pass can stop one slot earlier.",
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
        " `swapped ← false` until something moves.",
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
            `${a} keeps travelling right while it is bigger than its next neighbour.` +
            " `swapped ← true`, so this pass can't be the last.",
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
              ? " Equal values are **never** swapped (`>`, not `≥`), which keeps bubble sort **stable**."
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
        `**${placed}** was the largest unsorted value, so index ${n - 1 - i} is final and never compared again.` +
        (lastPass ? " A[0] is left over, so it is the smallest and final too." : swapped ? " `swapped` is true, so another pass follows." : ""),
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
          `Pass ${i + 1} made **zero swaps**, so every neighbouring pair is in order. ` +
          `The \`swapped\` flag skips the remaining ${s(n - 2 - i, "pass", "passes")}.`,
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
      `${s(passes, "pass", "passes")}, **${comparisons}** comparisons and **${swaps}** swaps. ` +
      `Each swap fixes one inversion: this input had ${swaps} of at most ${worst}.`,
    tone: "ok",
    marks: paint({}, 0, n - 1, "success"),
    done: true,
    hold: 2,
    vars: vars(null, null, null),
  });
  return r.steps;
}
