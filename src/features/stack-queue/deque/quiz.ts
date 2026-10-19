/* "Quiz me" for the deque on a circular array. Pure — verified by a script. */
import { mod } from "../shared/util";
import { firstQuestion, fresh, listText, mcq, nearNumbers, rint, type Rng, type SQQuestion } from "../shared/quiz";
import { dequeValues, type DequeState } from "./engine";

export function dequeQuiz(s: DequeState, rng: Rng = Math.random): SQQuestion | null {
  const vals = dequeValues(s); // front → back
  const n = vals.length;
  if (!n) return null;
  const { front: f, cap } = s;
  const room = cap - n;
  const shown = `Deque, capacity ${cap}: front = ${f}, size = ${n}, holding \`${listText(vals)}\` (front → back).`;

  return firstQuestion(rng, [
    () => {
      if (!room) return null;
      const ans = mod(f - 1, cap);
      return mcq(rng, "pushFrontIndex", `${shown} \`pushFront(x)\` writes x into which index?`,
        String(ans),
        [String(f - 1), String(f), String(mod(f + n, cap)), String(mod(f + 1, cap)), ...nearNumbers(ans)],
        `front steps back: (${f} − 1 + ${cap}) % ${cap} = ${ans}. Adding capacity keeps it non-negative.`);
    },
    () => {
      if (!room) return null;
      const ans = mod(f + n, cap);
      return mcq(rng, "pushBackIndex", `${shown} \`pushBack(x)\` writes x into which index?`,
        String(ans),
        [String(f + n), String(mod(f + n - 1, cap)), String(mod(f + n + 1, cap)), String(n), ...nearNumbers(ans)],
        `The first free slot after the back: (front + size) % capacity = (${f} + ${n}) % ${cap} = ${ans}.`);
    },
    () => {
      if (n < 2) return null;
      const pair = (a: number, b: number) => `${a}, then ${b}`;
      return mcq(rng, "popBoth", `${shown} We call \`popFront()\`, then \`popBack()\`. What do they return?`,
        pair(vals[0], vals[n - 1]),
        [pair(vals[n - 1], vals[0]), pair(vals[0], vals[1]), pair(vals[n - 1], vals[n - 2]), pair(vals[1], vals[n - 1])],
        `popFront takes A[front] = ${vals[0]}; popBack takes the last element, ${vals[n - 1]}.`);
    },
    () => {
      const x = fresh(vals, rng);
      return mcq(rng, "pushBackPopFront", `${shown} We call \`pushBack(${x})\`, then \`popFront()\`. What does popFront return?`,
        String(vals[0]),
        [String(x), String(vals[n - 1]), "Error: deque full", ...vals.slice(1).map(String)],
        room ? `${x} joins the back; the front is still ${vals[0]}.` : `pushBack overflows (full), and the front is still ${vals[0]}.`, { x });
    },
    () => {
      const ans = mod(f + n - 1, cap);
      return mcq(rng, "lastIndex", `${shown} At which array index is the back element stored?`,
        String(ans),
        [String(f + n - 1), String(mod(f + n, cap)), String(n - 1), String(f), ...nearNumbers(ans)],
        `(front + size − 1) % capacity = (${f} + ${n} − 1) % ${cap} = ${ans}.`);
    },
    () => {
      if (!room) return null;
      const max = Math.min(3, room);
      const wraps = Array.from({ length: max }, (_, i) => i + 1).filter((k) => f - k < 0);
      const k = wraps.length && rng() < 0.75 ? wraps[0] : rint(rng, 1, max);
      const ans = mod(f - k, cap);
      return mcq(rng, "frontAfterPushFront", `${shown} What is front after ${k} \`pushFront\` call${k === 1 ? "" : "s"}?`,
        String(ans),
        [String(f - k), String(mod(f + k, cap)), String(mod(f - k + 1, cap)), String(f), ...nearNumbers(ans)],
        `Each pushFront moves front back by one, wrapping: (${f} − ${k} + ${cap}) % ${cap} = ${ans}.`, { k });
    },
  ]);
}
