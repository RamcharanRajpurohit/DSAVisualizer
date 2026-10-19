/* "Quiz me" for the linear array queue. Pure — verified by a script. */
import { firstQuestion, listText, mcq, nearNumbers, rint, type Rng, type SQQuestion } from "../shared/quiz";
import { queueValues, type QueueState } from "./engine";

export function queueQuiz(s: QueueState, rng: Rng = Math.random): SQQuestion | null {
  const vals = queueValues(s); // front → rear
  const n = vals.length;
  if (!n) return null;
  const { front: f, rear: r, cap } = s;
  const shown = `The queue holds \`${listText(vals)}\` (front → rear), with front = ${f}, rear = ${r}, capacity ${cap}.`;

  return firstQuestion(rng, [
    () => {
      const k = Math.min(n, rint(rng, 2, 3));
      const out = vals.slice(0, k);
      return mcq(rng, "dequeueOrder", `${shown} \`dequeue()\` is called ${k} time${k === 1 ? "" : "s"}. What comes out, in order?`,
        listText(out),
        [listText(vals.slice(-k).reverse()), listText(vals.slice(-k)), listText(out.slice().reverse()), listText(vals.slice(1, k + 1))],
        `FIFO: the oldest values leave first — ${listText(out)}.`, { k });
    },
    () => {
      const k = rint(rng, 1, n);
      const fmt = (a: number, b: number) => `front = ${a}, rear = ${b}`;
      return mcq(rng, "afterDequeues", `${shown} What are front and rear after ${k} \`dequeue()\` call${k === 1 ? "" : "s"}?`,
        fmt(f + k, r),
        [fmt(f, r - k), fmt(f + k, r - k), fmt(0, r - k), fmt(f + k - 1, r), fmt(f + k + 1, r)],
        `Dequeue only moves front right (${f} → ${f + k}); rear changes only on enqueue.`, { k });
    },
    () => mcq(rng, "enqueuesLeft", `${shown} How many more \`enqueue\` calls succeed before it reports full?`,
      String(cap - 1 - r),
      [String(cap - n), String(cap - r), String(cap - 2 - r), String(cap), ...nearNumbers(cap - 1 - r)],
      `Full means rear == capacity − 1 = ${cap - 1}, so ${cap - 1 - r} more fit.` + (f ? ` The ${f} slot${f === 1 ? "" : "s"} before front can't be reused.` : "")),
    () => {
      const k = rint(rng, 1, 3);
      const ans = Math.min(r + k, cap - 1);
      const refused = r + k - ans;
      return mcq(rng, "rearAfterEnqueues", `${shown} ${k} value${k === 1 ? " is" : "s are"} enqueued. What is rear afterwards?`,
        String(ans),
        [String(r + k), String((r + k) % cap), String(Math.max(-1, ans - 1)), String(r), ...nearNumbers(ans)],
        refused ? `rear stops at the last index ${cap - 1}; ${refused} enqueue${refused === 1 ? " is" : "s are"} refused (no wrap-around here).` : `Each enqueue moves rear right by one: ${r} + ${k} = ${ans}.`,
        { k });
    },
    () => {
      if (!f) return null;
      return mcq(rng, "wasted", `${shown} How many array slots are free but can never be used again?`,
        String(f), [String(cap - n), String(cap - 1 - r), "0", String(f + 1), ...nearNumbers(f)],
        `The ${f} slot${f === 1 ? "" : "s"} before front: rear only moves right, so it never comes back to them.`);
    },
  ]);
}
