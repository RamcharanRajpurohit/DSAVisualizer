/* "Quiz me" for the circular queue (both full/empty rules). Pure — verified by a script. */
import { mod } from "../shared/util";
import { firstQuestion, listText, mcq, nearNumbers, rint, type Rng, type SQQuestion } from "../shared/quiz";
import { circUsable, circValues, type CircState } from "./engine";

/** Prefer a k in 1..max whose index arithmetic wraps past the end (the interesting case). */
function pickK(rng: Rng, start: number, max: number, cap: number): number {
  const wraps = Array.from({ length: max }, (_, i) => i + 1).filter((k) => start + k >= cap);
  return wraps.length && rng() < 0.75 ? wraps[0] : rint(rng, 1, max);
}

export function circQuiz(s: CircState, rng: Rng = Math.random): SQQuestion | null {
  const vals = circValues(s); // front → rear
  const n = vals.length;
  if (!n) return null;
  const { front: f, rear: r, cap, rule } = s;
  const usable = circUsable(s);
  const room = usable - n;
  const rearIs = rule === "count" ? "rear = last element" : "rear = next free slot";
  const shown = `Circular queue, capacity ${cap}: front = ${f}, rear = ${r} (${rearIs}), holding \`${listText(vals)}\`.`;

  return firstQuestion(rng, [
    () => {
      if (!room) return null;
      const k = pickK(rng, r, Math.min(3, room), cap);
      const ans = mod(r + k, cap);
      return mcq(rng, "rearAfterEnqueues", `${shown} ${k} value${k === 1 ? " is" : "s are"} enqueued. What is rear now?`,
        String(ans),
        [String(r + k), String(mod(r + k - 1, cap)), String(mod(r + k + 1, cap)), String(mod(f + k, cap)), ...nearNumbers(ans)],
        `rear = (rear + 1) % capacity each time: (${r} + ${k}) % ${cap} = ${ans}.`, { k });
    },
    () => {
      if (!room) return null;
      const ans = rule === "count" ? mod(r + 1, cap) : r;
      return mcq(rng, "nextSlot", `${shown} Which index does the next \`enqueue(x)\` write x into?`,
        String(ans),
        [String(r + 1), String(rule === "count" ? r : mod(r + 1, cap)), String(f), "0", ...nearNumbers(ans)],
        rule === "count" ? `rear moves first: (${r} + 1) % ${cap} = ${ans}, then A[rear] = x.` : `rear already points at the next free slot, so x goes to A[${r}].`);
    },
    () => {
      const k = pickK(rng, f, Math.min(3, n), cap);
      const ans = mod(f + k, cap);
      return mcq(rng, "frontAfterDequeues", `${shown} What is front after ${k} \`dequeue()\` call${k === 1 ? "" : "s"}?`,
        String(ans),
        [String(f + k), String(mod(f + k - 1, cap)), String(mod(f - k, cap)), String(f), ...nearNumbers(ans)],
        `front = (front + 1) % capacity each time: (${f} + ${k}) % ${cap} = ${ans}.`, { k });
    },
    () => {
      const k = Math.min(n, rint(rng, 2, 3));
      const byIndex = s.slots.filter((x) => x).map((x) => x!.v);
      return mcq(rng, "dequeueOrder", `${shown} \`dequeue()\` is called ${k} times. What comes out, in order?`,
        listText(vals.slice(0, k)),
        [listText(byIndex.slice(0, k)), listText(vals.slice(-k).reverse()), listText(vals.slice(1, k + 1)), listText(vals.slice(0, k).reverse())],
        `Values leave from front (index ${f}) in queue order, not array order.`, { k });
    },
    () => mcq(rng, "roomLeft", `${shown} How many more values can be enqueued before it is full?`,
      String(room),
      [String(cap - n), String(Math.max(0, cap - 1 - r)), String(room + 1), String(Math.max(0, room - 1)), ...nearNumbers(room)],
      rule === "count" ? `count = ${n} of ${cap} slots used, so ${room} more fit.` : `One slot always stays empty, so ${usable} usable − ${n} stored = ${room}.`),
    () => {
      if (rule !== "gap") return null;
      return mcq(rng, "sizeFromIndices", `${shown} Without a counter, how many elements does it hold?`,
        String(n),
        [String(r - f), String(r - f + 1), String(mod(f - r, cap)), String(n + 1), ...nearNumbers(n)],
        `size = (rear − front + capacity) % capacity = (${r} − ${f} + ${cap}) % ${cap} = ${n}.`);
    },
  ]);
}
