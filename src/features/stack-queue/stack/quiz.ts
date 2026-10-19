/* "Quiz me" for the array stack: questions about the stack as it is right now. Pure — verified by a script. */
import { firstQuestion, fresh, listText, mcq, nearNumbers, rint, type Rng, type SQQuestion } from "../shared/quiz";
import { stackValues, type StackState } from "./engine";

export function stackQuiz(s: StackState, rng: Rng = Math.random): SQQuestion | null {
  const vals = stackValues(s); // bottom → top
  const n = vals.length;
  if (!n) return null;
  const { top, cap } = s;
  const T = vals[n - 1];
  const shown = `The stack holds \`${listText(vals)}\` (bottom → top, capacity ${cap}).`;

  return firstQuestion(rng, [
    // the order values leave in
    () => {
      const k = Math.min(n, rint(rng, 2, 3));
      const out = vals.slice(-k).reverse();
      return mcq(rng, "popOrder", `${shown} \`pop()\` is called ${k} time${k === 1 ? "" : "s"}. What comes out, in order?`,
        listText(out),
        [listText(vals.slice(0, k)), listText(vals.slice(-k)), listText(vals.slice(0, k).reverse()), listText([...out.slice(1), out[0]])],
        `LIFO: the newest value leaves first, so pops return ${listText(out)}.`, { k });
    },
    // top index after pops
    () => {
      const k = rint(rng, 1, n);
      return mcq(rng, "topAfterPops", `${shown} What is \`top\` after ${k} \`pop()\` call${k === 1 ? "" : "s"}?`,
        String(top - k),
        [String(top - k + 1), String(top), String(top - k - 1), String(k)],
        `Each pop moves \`top\` down by one: ${top} − ${k} = ${top - k}. (top is an index, so it is size − 1.)`, { k });
    },
    // pushes before overflow
    () => mcq(rng, "pushesLeft", `${shown} How many more \`push\` calls succeed before a Stack Overflow?`,
      String(cap - n),
      [String(cap - n + 1), String(cap - n - 1), String(cap), String(n), ...nearNumbers(cap - n)],
      `Overflow when \`top == capacity − 1\` = ${cap - 1}. top is ${top}, so ${cap - 1 - top} more fit.`),
    // pop then peek
    () => {
      const ans = n >= 2 ? String(vals[n - 2]) : "Error: the stack is empty";
      return mcq(rng, "popThenPeek", `${shown} We call \`pop()\`, then \`peek()\`. What does \`peek()\` return?`,
        ans,
        [String(T), String(vals[0]), "Error: the stack is empty", ...vals.map(String)],
        n >= 2 ? `pop removes ${T}; the new top is ${vals[n - 2]}, and peek only reads it.` : `pop removes the only value, so peek finds an empty stack.`);
    },
    // overflow-aware push / push / pop
    () => {
      const x = fresh(vals, rng);
      const y = fresh([...vals, x], rng);
      const room = cap - n;
      const ans = room >= 2 ? y : room === 1 ? x : T;
      const why = room >= 2 ? `Both pushes fit, so pop returns the newest: ${y}.`
        : room === 1 ? `Only ${x} fits; push(${y}) overflows. pop returns ${x}.`
          : `The stack is full: both pushes overflow, so pop returns the old top ${T}.`;
      return mcq(rng, "pushPushPop", `${shown} We call \`push(${x})\`, \`push(${y})\`, then \`pop()\`. What does \`pop()\` return?`,
        String(ans), [String(x), String(y), String(T), String(vals[0]), ...nearNumbers(ans)], why, { x, y });
    },
    // which push overflows (only when it will)
    () => {
      const room = cap - n;
      if (room > 3) return null;
      const k = room + 1;
      return mcq(rng, "overflowAt", `${shown} We push values one by one. Which push overflows?`,
        `push #${k}`, [`push #${k + 1}`, k > 1 ? `push #${k - 1}` : null, `push #${cap}`, "none of the first 5", `push #${k + 2}`],
        `${room} free slot${room === 1 ? "" : "s"} (top ${top}, last index ${cap - 1}), so push #${k} is the first with no room.`);
    },
  ]);
}
