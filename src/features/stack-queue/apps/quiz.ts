/*
 * "Quiz me" for the stack applications: questions about the input that is on screen. Pure — the answers
 * are checked by a script against independent reference implementations.
 */
import { fmtNum } from "../shared/util";
import { firstQuestion, mcq, nearNumbers, pick, rint, shuffled, type Rng, type SQQuestion } from "../shared/quiz";
import { runBrackets } from "./brackets";
import type { AppKind } from "./core";
import { isOperand, isOperator, lexInfix, PREC, RIGHT_ASSOC, runInfix } from "./infix";
import { applyOp, lexPostfix, runPostfix } from "./postfix";
import { parseNge } from "./nge";

const OPEN = "([{";
const CLOSE = ")]}";
const PAIR: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
const stackText = (xs: readonly (string | number)[]) => (xs.length ? xs.join(" ") : "empty");
const ord = (i: number) => `#${i + 1}`;

// ───────────────────────────── brackets ─────────────────────────────

export type BracketReason = "balanced" | "mismatch" | "unclosed" | "nothing";

export interface BracketTrace {
  chars: string[];
  reason: BracketReason;
  /** Index of the character where the check failed (-1 if it didn't fail mid-way). */
  failAt: number;
  maxDepth: number;
  /** Stack (bottom → top) after each fully processed character. */
  after: string[][];
  /** For each closing bracket that was read: what pop() returned (null = stack was empty). */
  popped: Record<number, string | null>;
}

export function bracketTrace(text: string): BracketTrace {
  const chars = [...text.replace(/\s+/g, "")];
  const st: string[] = [];
  const after: string[][] = [];
  const popped: Record<number, string | null> = {};
  let maxDepth = 0;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (OPEN.includes(c)) {
      st.push(c);
      maxDepth = Math.max(maxDepth, st.length);
    } else if (CLOSE.includes(c)) {
      if (!st.length) {
        popped[i] = null;
        return { chars, reason: "nothing", failAt: i, maxDepth, after, popped };
      }
      const t = st.pop()!;
      popped[i] = t;
      if (t !== PAIR[c]) return { chars, reason: "mismatch", failAt: i, maxDepth, after, popped };
    }
    after.push(st.slice());
  }
  return { chars, reason: st.length ? "unclosed" : "balanced", failAt: -1, maxDepth, after, popped };
}

export const BRACKET_VERDICT: Record<BracketReason, string> = {
  balanced: "Balanced",
  mismatch: "Not balanced: a closer doesn't match the top",
  unclosed: "Not balanced: an opener is never closed",
  nothing: "Not balanced: a closer finds the stack empty",
};

function bracketsQuiz(text: string, rng: Rng): SQQuestion | null {
  if (runBrackets(text).balanced === null) return null; // empty / too long: the canvas shows an error
  const tr = bracketTrace(text);
  const s = tr.chars.join("");
  const idx = tr.chars.map((c, i) => (OPEN.includes(c) || CLOSE.includes(c) ? i : -1)).filter((i) => i >= 0);
  if (!idx.length) return null;
  const processed = idx.filter((i) => i < tr.after.length);
  const closers = idx.filter((i) => i in tr.popped);
  const NOTHING = "Nothing: the stack is empty";

  return firstQuestion(rng, [
    () => mcq(rng, "verdict", `Is \`${s}\` balanced?`, BRACKET_VERDICT[tr.reason],
      (Object.keys(BRACKET_VERDICT) as BracketReason[]).filter((r) => r !== tr.reason).map((r) => BRACKET_VERDICT[r]),
      tr.reason === "balanced" ? "Every closer matched the top of the stack, and the stack ended empty."
        : tr.reason === "unclosed" ? "Every closer matched, but openers are still on the stack at the end."
          : `It fails at character ${ord(tr.failAt)}, \`${tr.chars[tr.failAt]}\`.`),
    () => {
      if (!tr.maxDepth) return null;
      return mcq(rng, "maxDepth", `While checking \`${s}\`, what is the most brackets on the stack at once?`,
        String(tr.maxDepth), nearNumbers(tr.maxDepth).filter((x) => x !== "0"),
        `The deepest nesting${tr.failAt >= 0 ? " before the check stops" : ""} is ${tr.maxDepth} level${tr.maxDepth === 1 ? "" : "s"}.`);
    },
    () => {
      if (!processed.length) return null;
      const i = pick(rng, processed);
      const now = tr.after[i];
      const before = i > 0 ? tr.after[i - 1] : [];
      return mcq(rng, "stackAfter", `Checking \`${s}\`: what is on the stack (bottom → top) right after character ${ord(i)}, \`${tr.chars[i]}\`?`,
        stackText(now),
        [stackText(now.slice().reverse()), stackText(before), stackText([...now, tr.chars[i]]), stackText(now.slice(0, -1)), stackText(now.slice(1))],
        OPEN.includes(tr.chars[i]) ? `\`${tr.chars[i]}\` is an opener, so it is pushed on top.` : `\`${tr.chars[i]}\` closes the top opener, which is popped.`, { i });
    },
    () => {
      if (!closers.length) return null;
      const i = pick(rng, closers);
      const p = tr.popped[i];
      return mcq(rng, "popped", `Checking \`${s}\`: when character ${ord(i)}, \`${tr.chars[i]}\`, is read, what does \`pop()\` return?`,
        p ?? NOTHING, ["(", "[", "{", NOTHING],
        p == null ? "No opener is waiting, so the check fails here." : `The most recent unmatched opener is \`${p}\`${p === PAIR[tr.chars[i]] ? " — a match." : ", which doesn't match."}`, { i });
    },
  ]);
}

// ───────────────────────────── infix → postfix ─────────────────────────────

interface YardOpts { prec?: (op: string) => number; rightAssoc?: (op: string) => boolean }

/** Shunting-yard with optional (wrong) rules, used for distractors; also records pops per token and the depth. */
export function yard(T: readonly string[], o: YardOpts = {}) {
  const prec = o.prec ?? ((op: string) => PREC[op]);
  const right = o.rightAssoc ?? ((op: string) => RIGHT_ASSOC.has(op));
  const out: string[] = [];
  const st: string[] = [];
  const pops: number[] = T.map(() => 0);
  let maxDepth = 0;
  T.forEach((t, i) => {
    if (isOperand(t)) out.push(t);
    else if (t === "(") st.push(t);
    else if (t === ")") {
      while (st.length && st[st.length - 1] !== "(") { out.push(st.pop()!); pops[i]++; }
      st.pop();
    } else {
      while (st.length && isOperator(st[st.length - 1])) {
        const top = st[st.length - 1];
        if (!(prec(top) > prec(t) || (prec(top) === prec(t) && !right(t)))) break;
        out.push(st.pop()!);
        pops[i]++;
      }
      st.push(t);
    }
    maxDepth = Math.max(maxDepth, st.length);
  });
  while (st.length) out.push(st.pop()!);
  return { out, pops, maxDepth };
}

function infixQuiz(text: string, rng: Rng): SQQuestion | null {
  const post = runInfix(text).postfix;
  const lx = lexInfix(text);
  if (!post || !lx.ok) return null;
  const T = lx.tokens;
  const e = T.join(" ");
  const ops = T.map((t, i) => (isOperator(t) ? i : -1)).filter((i) => i >= 0);
  if (!ops.length) return null;
  const tr = yard(T);
  const show = (xs: readonly string[]) => xs.join(" ");

  return firstQuestion(rng, [
    () => {
      const operands = T.filter(isOperand);
      const opsInOrder = ops.map((i) => T[i]);
      const shuffles = Array.from({ length: 6 }, () => {
        const sh = shuffled(rng, post.filter(isOperator));
        let k = 0;
        return show(post.map((t) => (isOperator(t) ? sh[k++] : t)));
      });
      return mcq(rng, "postfix", `What is the postfix form of \`${e}\`?`, show(post),
        [
          show(yard(T, { prec: () => 1, rightAssoc: () => false }).out), // ignores precedence
          show(yard(T, { rightAssoc: () => false }).out), // ^ treated as left-associative
          show([...operands, ...opsInOrder]),
          show([...operands, ...opsInOrder.slice().reverse()]),
          ...shuffles,
        ],
        "Operands keep their order; each operator comes right after both of its operands, tighter-binding ones first.");
    },
    () => {
      const distinct = [...new Set(ops.map((i) => T[i]))];
      const first = post.find(isOperator)!;
      return mcq(rng, "firstOperator", `Converting \`${e}\`: which operator is written to the output first?`, `'${first}'`,
        [...distinct.map((o) => `'${o}'`), T.includes("(") ? "'('" : null],
        `\`${first}\` is the first operator whose operands are both complete${T.includes("(") ? "; parentheses never reach the output" : ""}.`);
    },
    () => mcq(rng, "maxDepth", `Converting \`${e}\`: what is the most tokens on the operator stack at once (counting '(')?`,
      String(tr.maxDepth), nearNumbers(tr.maxDepth).filter((x) => x !== "0"),
      `The stack peaks at ${tr.maxDepth}, while lower-precedence operators wait below tighter ones.`),
    () => {
      const i = pick(rng, ops);
      const k = tr.pops[i];
      return mcq(rng, "popsAt", `Converting \`${e}\`: when \`${T[i]}\` (token ${ord(i)}) arrives, how many operators does it pop to the output?`,
        String(k), ["0", "1", "2", "3", "4"].filter((x) => x !== String(k)),
        k ? `It pops while the top binds at least as tightly${RIGHT_ASSOC.has(T[i]) ? " (strictly tighter: ^ is right-associative)" : ""}: ${k}.` : "The top is lower-precedence, '(' or nothing, so it just waits on top.",
        { i });
    },
  ]);
}

// ───────────────────────────── postfix evaluation ─────────────────────────────

function evalTrace(T: readonly string[], swap = false) {
  const st: number[] = [];
  const after: number[][] = [];
  const pairs: Record<number, [number, number]> = {};
  let maxDepth = 0;
  T.forEach((t, i) => {
    if (isOperator(t)) {
      const b = st.pop()!, a = st.pop()!;
      pairs[i] = [a, b];
      const r = swap ? applyOp(b, t, a) : applyOp(a, t, b);
      st.push(typeof r === "number" ? r : NaN);
    } else st.push(Number(t));
    maxDepth = Math.max(maxDepth, st.length);
    after.push(st.slice());
  });
  return { value: st[0], after, pairs, maxDepth };
}

function postfixQuiz(text: string, rng: Rng): SQQuestion | null {
  const value = runPostfix(text).value;
  if (value == null) return null;
  const T = lexPostfix(text);
  const e = T.join(" ");
  const tr = evalTrace(T);
  const fmtList = (xs: readonly number[]) => stackText(xs.map(fmtNum));
  const ops = T.map((t, i) => (isOperator(t) ? i : -1)).filter((i) => i >= 0);

  return firstQuestion(rng, [
    () => {
      const swapped = evalTrace(T, true).value;
      const near = Number.isInteger(value) ? nearNumbers(value, 4, true) : [fmtNum(value + 1), fmtNum(value - 1), fmtNum(value * 2)];
      return mcq(rng, "value", `What does \`${e}\` evaluate to?`, fmtNum(value),
        [Number.isFinite(swapped) ? fmtNum(swapped) : null, ...near],
        "Push numbers; each operator pops b (top) then a and pushes a op b.");
    },
    () => {
      if (T.length < 3) return null;
      const i = rint(rng, 0, T.length - 2);
      const now = tr.after[i];
      return mcq(rng, "stackAfter", `Evaluating \`${e}\`: what is on the stack (bottom → top) right after token ${ord(i)}, \`${T[i]}\`?`,
        fmtList(now),
        [fmtList(now.slice().reverse()), fmtList(i > 0 ? tr.after[i - 1] : []), fmtList(tr.after[i + 1]), fmtList(now.slice(0, -1))],
        isOperator(T[i]) ? `\`${T[i]}\` popped two values and pushed one result.` : `${T[i]} is a number, so it is pushed on top.`, { i });
    },
    () => {
      if (!ops.length) return null;
      const i = pick(rng, ops);
      const [a, b] = tr.pairs[i];
      const fmt = (x: number, y: number) => `a = ${fmtNum(x)}, b = ${fmtNum(y)}`;
      const below = (i > 0 ? tr.after[i - 1] : []).slice(0, -2);
      return mcq(rng, "operands", `Evaluating \`${e}\`: when \`${T[i]}\` (token ${ord(i)}) is applied, what are a and b?`,
        fmt(a, b),
        [fmt(b, a), below.length ? fmt(below[below.length - 1], a) : null, below.length ? fmt(below[below.length - 1], b) : null, fmt(a, a), fmt(b, b)],
        `b is popped first (the top), then a: the result is ${fmtNum(a)} ${T[i]} ${fmtNum(b)}.`, { i });
    },
    () => mcq(rng, "maxDepth", `Evaluating \`${e}\`: what is the most values on the stack at once?`,
      String(tr.maxDepth), nearNumbers(tr.maxDepth).filter((x) => x !== "0"),
      `Operands pile up until operators consume them; the peak is ${tr.maxDepth}.`),
  ]);
}

// ───────────────────────────── next greater element ─────────────────────────────

export function ngeTrace(A: readonly number[]) {
  const result = A.map(() => -1);
  const st: number[] = [];
  const pops = A.map(() => 0);
  const after: number[][] = [];
  A.forEach((x, i) => {
    while (st.length && A[st[st.length - 1]] < x) { result[st.pop()!] = x; pops[i]++; }
    st.push(i);
    after.push(st.map((j) => A[j]));
  });
  return { result, pops, after };
}

function ngeQuiz(text: string, rng: Rng): SQQuestion | null {
  const p = parseNge(text);
  if (!p.ok) return null;
  const A = p.values;
  const n = A.length;
  const tr = ngeTrace(A);
  const arr = (xs: readonly number[]) => `[${xs.join(", ")}]`;
  const shown = `A = \`${arr(A)}\``;
  const maxRight = A.map((x, i) => { const m = Math.max(-1, ...A.slice(i + 1)); return m > x ? m : -1; });
  const nextOnly = A.map((x, i) => (i + 1 < n && A[i + 1] > x ? A[i + 1] : -1));
  const prevGreater = A.map((x, i) => { for (let j = i - 1; j >= 0; j--) if (A[j] > x) return A[j]; return -1; });

  return firstQuestion(rng, [
    () => {
      const i = rint(rng, 0, n - 1);
      const dup = A.indexOf(A[i]) !== i || A.lastIndexOf(A[i]) !== i;
      return mcq(rng, "ngeOf", `${shown}. What is the next greater element of ${A[i]}${dup ? ` (index ${i})` : ""}?`,
        String(tr.result[i]),
        [String(maxRight[i]), i + 1 < n ? String(A[i + 1]) : null, String(prevGreater[i]), "-1", ...nearNumbers(Math.max(0, tr.result[i]))],
        tr.result[i] < 0 ? `Nothing to the right of index ${i} is larger, so -1.` : `${tr.result[i]} is the first value to the right that is larger — not necessarily the largest.`, { i });
    },
    () => {
      const k = tr.result.filter((x) => x < 0).length;
      return mcq(rng, "countMinus", `${shown}. How many elements have no next greater element (answer -1)?`,
        String(k), nearNumbers(k).filter((x) => x !== "0" || k !== 0),
        `The indices still on the stack at the end: ${k}. The last element is always one of them.`);
    },
    () => {
      if (n < 2) return null;
      const i = rint(rng, 1, n - 1);
      const now = tr.after[i];
      return mcq(rng, "stackAfter", `${shown}. Which values are on the stack (bottom → top) right after index ${i} is pushed?`,
        stackText(now),
        [stackText(A.slice(0, i + 1)), stackText(now.slice().reverse()), stackText(tr.after[i - 1]), stackText([...tr.after[i - 1], A[i]])],
        "Smaller values are popped (they found their answer); what remains decreases bottom → top.", { i });
    },
    () => mcq(rng, "resultArray", `${shown}. What does nextGreater(A) return?`, arr(tr.result),
      [arr(maxRight), arr(nextOnly), arr(prevGreater)],
      "For each element: the first larger value to its right, or -1."),
    () => {
      const cand = A.map((_, i) => i).filter((i) => i > 0);
      if (!cand.length) return null;
      const i = pick(rng, cand.filter((j) => tr.pops[j] > 0).length && rng() < 0.7 ? cand.filter((j) => tr.pops[j] > 0) : cand);
      const k = tr.pops[i];
      return mcq(rng, "popsAt", `${shown}. When ${A[i]} (index ${i}) is processed, how many indices does it pop?`,
        String(k), ["0", "1", "2", "3", "4"].filter((x) => x !== String(k)),
        k ? `It pops every waiting value smaller than ${A[i]}: ${k}.` : `The top value is not smaller than ${A[i]}, so nothing is popped.`, { i });
    },
  ]);
}

export function appsQuiz(kind: AppKind, text: string, rng: Rng = Math.random): SQQuestion | null {
  switch (kind) {
    case "brackets": return bracketsQuiz(text, rng);
    case "infix": return infixQuiz(text, rng);
    case "postfix": return postfixQuiz(text, rng);
    case "nge": return ngeQuiz(text, rng);
  }
}
