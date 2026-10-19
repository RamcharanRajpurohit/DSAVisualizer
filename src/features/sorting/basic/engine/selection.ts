import type { BarsStep, Boundary, Marks, Pointer } from "../types";
import { BarsRecorder, paint, stabilityNote } from "./common";

/** Selection sort: select the minimum of the unsorted part, swap it to the front. */
export function recordSelection(input: readonly number[]): BarsStep[] {
  const r = new BarsRecorder(input, false);
  const n = r.n;
  if (r.trivial("selection sort")) return r.steps;

  let comparisons = 0;
  let swaps = 0;
  /** Indices < sortedTo are final. */
  let sortedTo = 0;

  const prefix = (): Marks => paint({}, 0, sortedTo - 1, "success");
  const boundary = (): Boundary | undefined =>
    sortedTo > 0 ? { at: sortedTo, side: "left", label: "final", state: "success" } : undefined;
  const ptrs = (i: number, j: number | null, min: number): Pointer[] => [
    { id: "i", label: "i", at: i, color: "amber" },
    ...(j == null ? [] : [{ id: "j", label: "j", at: j, color: "blue" } as Pointer]),
    { id: "min", label: "min", at: min, color: "pink" },
  ];
  const vars = (i: number | null, j: number | null, min: number | null) => ({
    i,
    j,
    min,
    "A[min]": min == null ? null : r.val(min),
    comparisons,
    swaps,
  });

  r.snap({
    title: `Selection sort · ${n} elements`,
    detail:
      "Each pass **selects** the smallest unsorted value and swaps it to the front, growing the **final** prefix by one. " +
      "Comparisons never change, but there are at most n − 1 swaps.",
    tone: "info",
    line: 1,
    vars: vars(null, null, null),
  });

  for (let i = 0; i < n - 1; i++) {
    let min = i;
    const tag = `Pass ${i + 1} / ${n - 1}`;
    r.snap({
      title: `Pass ${i + 1}: find the minimum of A[${i}..${n - 1}]`,
      detail: `Assume the first unsorted element, A[${i}] = **${r.val(i)}**, is the smallest until proven otherwise: \`min ← ${i}\`. Then scan the rest of the unsorted part for anything smaller.`,
      tone: "info",
      line: [2, 3],
      marks: { ...prefix(), [i]: "pivot" },
      boundary: boundary(),
      pointers: ptrs(i, null, min),
      tag,
      vars: vars(i, null, min),
    });

    for (let j = i + 1; j < n; j++) {
      comparisons++;
      const a = r.val(j);
      const m = r.val(min);
      if (a < m) {
        const old = min;
        min = j;
        r.snap({
          title: `${a} < ${m} → new minimum`,
          detail: `A[${j}] = **${a}** is smaller than the smallest value seen so far (${m} at index ${old}), so remember its position: \`min ← ${j}\`.`,
          tone: "warn",
          line: [4, 5, 6],
          marks: { ...prefix(), [old]: "compare", [j]: "pivot" },
          boundary: boundary(),
          pointers: ptrs(i, j, min),
          callout: { at: [old, j], text: `${a} < ${m}`, tone: "warn" },
          tag,
          vars: vars(i, j, min),
        });
      } else {
        r.snap({
          title: `${a} ≥ ${m} — keep min`,
          detail: `A[${j}] = **${a}** is not smaller than the current minimum (**${m}** at index ${min}), so \`min\` stays where it is.`,
          tone: "muted",
          line: [4, 5],
          marks: { ...prefix(), [j]: "compare", [min]: "pivot" },
          boundary: boundary(),
          pointers: ptrs(i, j, min),
          callout: { at: [min, j], text: a === m ? `${a} = ${m}` : `${a} > ${m}`, tone: "muted" },
          tag,
          vars: vars(i, j, min),
        });
      }
    }

    const minV = r.val(min);
    if (min !== i) {
      const front = r.val(i);
      // A long-distance swap can jump A[i] over an equal value → instability.
      let jumped = false;
      for (let k = i + 1; k < min; k++) if (r.val(k) === front) jumped = true;
      r.swap(i, min);
      swaps++;
      r.snap({
        title: `Swap ${front} ↔ ${minV}`,
        detail:
          `**${minV}** (index ${min}) is the smallest unsorted value, so it swaps to index ${i}.` +
          (jumped ? `\n⚠ ${front} just jumped over an equal ${front}, so selection sort is **not stable**.` : ""),
        tone: "warn",
        line: [7, 8],
        marks: { ...prefix(), [i]: "active", [min]: "active" },
        boundary: boundary(),
        pointers: ptrs(i, null, min),
        swap: [i, min],
        callout: { at: [i, min], text: "swap", tone: "warn" },
        tag,
        vars: vars(i, null, min),
      });
    } else {
      r.snap({
        title: `${minV} is already in front`,
        detail: `The scan found nothing smaller than A[${i}] = **${minV}**: \`min = i\`, so no swap is needed.`,
        tone: "ok",
        line: 7,
        marks: { ...prefix(), [i]: "pivot" },
        boundary: boundary(),
        pointers: ptrs(i, null, min),
        tag,
        vars: vars(i, null, min),
      });
    }

    sortedTo = i + 1;
    const last = i === n - 2;
    if (last) sortedTo = n;
    r.snap({
      title: last ? `${r.val(i)} and ${r.val(n - 1)} are final` : `${r.val(i)} is final`,
      detail:
        (i === 0
          ? "A[0] now holds the smallest value and will never change again."
          : `A[0..${i}] now holds the ${i + 1} smallest values in order and will never change again.`) +
        (last ? ` The single element left, ${r.val(n - 1)}, must be the largest — no pass needed for it.` : ""),
      tone: "ok",
      line: 9,
      marks: prefix(),
      boundary: boundary(),
      tag,
      hold: 1.1,
      vars: vars(i, null, null),
    });
  }

  r.snap({
    title: "Sorted!",
    detail:
      `**${comparisons}** comparisons (always n(n−1)/2) but only **${swaps}** ${swaps === 1 ? "swap" : "swaps"} (at most ${n - 1}).` +
      stabilityNote(r.slots),
    tone: "ok",
    marks: paint({}, 0, n - 1, "success"),
    done: true,
    hold: 2,
    vars: vars(null, null, null),
  });
  return r.steps;
}
