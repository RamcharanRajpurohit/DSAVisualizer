import type { BarsStep, Marks, Pointer } from "../types";
import { BarsRecorder, listText, paint, stabilityNote } from "./common";

/** Shell sort with the classic n/2, n/4, …, 1 gap sequence (gapped insertion sort). */
export function recordShell(input: readonly number[]): BarsStep[] {
  const r = new BarsRecorder(input, true);
  const n = r.n;
  if (r.trivial("shell sort")) return r.steps;

  let comparisons = 0;
  let shifts = 0;
  const gaps: number[] = [];
  for (let g = Math.floor(n / 2); g > 0; g = Math.floor(g / 2)) gaps.push(g);

  /** Highlight the sub-sequence i, i ± gap, …; dim the rest. */
  const chainMarks = (i: number, gap: number): Marks => {
    const m: Marks = {};
    for (let k = 0; k < n; k++) if (k % gap !== i % gap) m[k] = "dim";
    return m;
  };
  const chainList = (i: number, gap: number) => {
    const idx: number[] = [];
    for (let k = i % gap; k < n; k += gap) idx.push(k);
    return idx;
  };
  const ptrs = (i: number, j: number, gap: number): Pointer[] => [
    { id: "i", label: "i", at: i, color: "amber" },
    { id: "j", label: "j", at: j, color: "blue" },
    ...(j - gap >= 0 ? [{ id: "jg", label: "j−gap", at: j - gap, color: "purple" } as Pointer] : []),
  ];
  const vars = (gap: number | null, i: number | null, j: number | null, tmp: number | null) => ({
    gap,
    i,
    j,
    tmp,
    comparisons,
    shifts,
  });

  r.snap({
    title: `Shell sort · ${n} elements`,
    detail:
      "Insertion sort only moves elements one slot at a time, so a small value at the far right needs many shifts. " +
      "Shell sort first insertion-sorts elements that are **gap** apart, letting values jump far in one move, then shrinks the gap.\n" +
      `Gaps used here (n/2, n/4, …): ${listText(gaps)}. The last pass (gap 1) is plain insertion sort on an almost-sorted array.`,
    tone: "info",
    line: [1, 2],
    tag: `gaps ${gaps.join(" → ")}`,
    vars: vars(gaps[0], null, null, null),
  });

  for (const gap of gaps) {
    const tag = `gap ${gap}`;
    r.snap({
      title: `gap = ${gap}`,
      detail:
        gap === 1
          ? "gap = 1: an ordinary insertion sort. Earlier passes already moved most elements close to their place, so it needs only a few short shifts."
          : `Elements ${gap} apart form ${gap} interleaved sub-sequences (indices with the same remainder mod ${gap}). Each one gets insertion-sorted on its own.`,
      tone: "info",
      line: 3,
      tag,
      vars: vars(gap, null, null, null),
    });

    for (let i = gap; i < n; i++) {
      const tmpItem = r.item(i);
      const tmp = tmpItem.value;
      const chain = chainMarks(i, gap);
      let j = i;
      r.slots[i] = null;
      r.floating = [{ item: tmpItem, at: i, state: "pivot", label: "tmp" }];
      r.snap({
        title: `tmp = ${tmp} (A[${i}])`,
        detail:
          (gap > 1
            ? `Work on the sub-sequence at indices ${listText(chainList(i, gap), 8)} (the others are dimmed). `
            : "") +
          `Lift **${tmp}** out — \`tmp ← A[${i}]\`, \`j ← ${i}\` — and insert it among the elements ${gap === 1 ? "to its left" : `${gap} slots apart to its left`}.`,
        tone: "info",
        line: [4, 5, 6],
        marks: chain,
        pointers: ptrs(i, j, gap),
        tag,
        vars: vars(gap, i, j, tmp),
      });

      for (;;) {
        if (j < gap) {
          r.snap({
            title: `j = ${j} < gap → front of the sub-sequence`,
            detail: `There is no element ${gap} slots left of index ${j}, so tmp goes here.`,
            tone: "info",
            line: 7,
            marks: chain,
            pointers: ptrs(i, j, gap),
            tag,
            vars: vars(gap, i, j, tmp),
          });
          break;
        }
        comparisons++;
        const a = r.val(j - gap);
        if (a > tmp) {
          r.snap({
            title: `${a} > ${tmp} → shift by ${gap}`,
            detail: `A[${j - gap}] = **${a}** is bigger than tmp = **${tmp}**, so it must move right — jumping ${gap === 1 ? "one slot" : `${gap} slots at once`} into the gap.`,
            tone: "warn",
            line: 7,
            marks: { ...chain, [j - gap]: "compare" },
            pointers: ptrs(i, j, gap),
            callout: { at: [j - gap, j], text: `${a} > ${tmp}`, tone: "warn" },
            tag,
            vars: vars(gap, i, j, tmp),
          });
          r.slots[j] = r.slots[j - gap];
          r.slots[j - gap] = null;
          r.floating = [{ item: tmpItem, at: j - gap, state: "pivot", label: "tmp" }];
          shifts++;
          r.snap({
            title: `Shift ${a} → index ${j}`,
            detail:
              `\`A[${j}] ← A[${j - gap}]\`, then \`j ← ${j - gap}\`: the gap jumps to index ${j - gap}.` +
              (gap > 1 ? ` Plain insertion sort would have needed up to ${gap} one-slot shifts for this move.` : ""),
            tone: "warn",
            line: [8, 9],
            marks: { ...chain, [j]: "active" },
            pointers: ptrs(i, j - gap, gap),
            tag,
            vars: vars(gap, i, j - gap, tmp),
          });
          j -= gap;
        } else {
          r.snap({
            title: `${a} ≤ ${tmp} → stop`,
            detail: `A[${j - gap}] = **${a}** is not bigger than tmp, so tmp belongs at index ${j}.`,
            tone: "ok",
            line: 7,
            marks: { ...chain, [j - gap]: "compare" },
            pointers: ptrs(i, j, gap),
            callout: { at: [j - gap, j], text: a === tmp ? `${a} = ${tmp}` : `${a} < ${tmp}`, tone: "ok" },
            tag,
            vars: vars(gap, i, j, tmp),
          });
          break;
        }
      }

      r.slots[j] = tmpItem;
      r.floating = [];
      r.snap({
        title: `Place ${tmp} at index ${j}`,
        detail: `\`A[${j}] ← tmp\`.` + (j === i ? " It was already in the right spot — nothing moved." : ""),
        tone: "ok",
        line: 10,
        marks: { ...chain, [j]: "pivot" },
        pointers: ptrs(i, j, gap),
        tag,
        vars: vars(gap, i, j, tmp),
      });
    }

    const next = Math.floor(gap / 2);
    r.snap({
      title: gap === 1 ? "gap-1 pass done" : `The array is now ${gap}-sorted`,
      detail:
        gap === 1
          ? "The gap = 1 pass was a full insertion sort, so the array is completely sorted."
          : `Every sub-sequence of elements ${gap} apart is in order. \`gap ← ⌊${gap} / 2⌋ = ${next}\`.`,
      tone: "ok",
      line: 11,
      marks: gap === 1 ? paint({}, 0, n - 1, "success") : {},
      tag,
      hold: 1.2,
      vars: vars(next, null, null, null),
    });
  }

  r.snap({
    title: "Sorted!",
    detail:
      `${gaps.length} gap ${gaps.length === 1 ? "pass" : "passes"} (${gaps.join(", ")}) with **${comparisons}** comparisons and **${shifts}** shifts. ` +
      "Long-distance moves can carry an element past an equal one, so shell sort is **not stable**." +
      stabilityNote(r.slots),
    tone: "ok",
    marks: paint({}, 0, n - 1, "success"),
    done: true,
    hold: 2,
    vars: vars(0, null, null, null),
  });
  return r.steps;
}
