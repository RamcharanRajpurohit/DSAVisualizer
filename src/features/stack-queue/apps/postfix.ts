/* Postfix (Reverse Polish) evaluation — pure step recorder. */
import { fmtNum } from "../shared/util";
import { invalid, mark, MAX_TOKENS, newRec, peekTop, pop, push, setCursor, stackText, toks, type AppStep, type SItem } from "./core";
import { isOperator } from "./infix";

/** With spaces: split on whitespace ("12 3 *"). Without: every character is a token ("231*+9-"). */
export function lexPostfix(src: string): string[] {
  const t = src.trim();
  if (!t) return [];
  return /\s/.test(t) ? t.split(/\s+/) : [...t];
}

export function applyOp(a: number, op: string, b: number): number | string {
  switch (op) {
    case "+": return a + b;
    case "-": return a - b;
    case "*": return a * b;
    case "/": return b === 0 ? "division by zero" : a / b;
    case "%": return b === 0 ? "modulo by zero" : a % b;
    case "^": return a ** b;
    default: return `unknown operator ${op}`;
  }
}

export interface PostfixResult {
  steps: AppStep[];
  value: number | null;
}

export function runPostfix(input: string): PostfixResult {
  const T = lexPostfix(input);
  if (!T.length) return { steps: invalid("postfix", "Type a postfix expression", "For example `2 3 1 * + 9 -` (spaces between tokens) or `231*+9-` (single digits) — or click an example."), value: null };
  if (T.length > MAX_TOKENS) return { steps: invalid("postfix", "That's a bit long", `Keep it to ${MAX_TOKENS} tokens — this one has ${T.length}.`), value: null };
  const bad = T.findIndex((t) => !/^\d+(\.\d+)?$/.test(t) && !isOperator(t));
  if (bad >= 0) {
    const name = /^[A-Za-z_]/.test(T[bad]);
    return {
      steps: invalid("postfix", `Can't evaluate '${T[bad]}'`,
        name ? "Evaluation needs numbers — variables have no value here. (Infix → Postfix accepts names; evaluate numeric expressions only.)"
          : `"${T[bad]}" is neither a number nor one of + − * / % ^.`,
        toks(T), bad, "danger"),
      value: null,
    };
  }

  const R = newRec("postfix", toks(T));
  const vars = (i: number, extra: Record<string, string | number> = {}) => ({ i, token: T[i] ?? "—", top: peekTop(R)?.text ?? "—", ...extra });
  const fail = (i: number, title: string, detail: string, line?: number | number[], hl: Record<string, "danger"> = {}) => {
    if (i >= 0 && i < T.length) mark(R, i, "error");
    R.snap(title, detail, { tone: "danger", line, vars: vars(i), fx: { stackAlert: true, hl, verdict: { text: "Invalid expression", tone: "danger" } } });
    return { steps: R.steps, value: null };
  };

  R.snap("Scan left to right with an empty stack",
    "In postfix every operator comes **after** its operands, so when we meet an operator its two operands are the two most recent values — the top two of the stack. No parentheses, no precedence.",
    { line: 2, vars: { i: "—", token: "—", top: "—" } });

  let rid = 0;
  for (let i = 0; i < T.length; i++) {
    const t = T[i];
    setCursor(R, i);
    mark(R, i, "current");
    if (!isOperator(t)) {
      push(R, { id: `n${i}`, text: t, src: i });
      mark(R, i, "done");
      R.snap(`Push ${t}`, `A number: it waits on the stack until an operator needs it. Stack: \`${stackText(R.s)}\`.`,
        { line: [4, 5], vars: vars(i), fx: { hl: { [`n${i}`]: "new" } } });
      continue;
    }
    if (R.s.stack.length < 2) {
      const have = R.s.stack;
      return fail(i, `Not enough operands for '${t}'`,
        `\`${t}\` needs two values but the stack holds ${have.length === 0 ? "none" : `only \`${have[0].text}\``}. The expression has too many operators (or they come too early).`,
        have.length ? 8 : 7, Object.fromEntries(have.map((x) => [x.id, "danger" as const])));
    }
    const b = pop(R)!;
    R.snap(`b = pop() → ${b.text}`,
      `\`${t}\` is an operator. The top value was pushed **last**, so it is the **right** operand b. (Order matters for − / % ^.)`,
      { line: [6, 7], vars: vars(i, { b: b.text }), fx: { floats: [{ item: b, slot: "b" }], hl: { [b.id]: "active" } } });
    const a = pop(R)!;
    R.snap(`a = pop() → ${a.text}`, "The next value down is the **left** operand a.",
      { line: 8, vars: vars(i, { a: a.text, b: b.text }), fx: { floats: [{ item: a, slot: "a" }, { item: b, slot: "b" }], hl: { [a.id]: "active", [b.id]: "active" } } });
    const r = applyOp(a.num ?? Number(a.text), t, b.num ?? Number(b.text));
    if (typeof r === "string") {
      return fail(i, `Can't compute ${a.text} ${t} ${b.text}`, `That is a **${r}** — the expression has no value.`, 9);
    }
    const res: SItem = { id: `r${rid++}`, text: fmtNum(r), num: r }; // no src: it appears from the computation card
    push(R, res);
    mark(R, i, "done");
    R.snap(`${a.text} ${t} ${b.text} = ${fmtNum(r)} → push`,
      `Apply the operator to a and b and push the result; it can now be an operand of a later operator. Stack: \`${stackText(R.s)}\`.`,
      { tone: "ok", line: 9, vars: vars(i, { a: a.text, b: b.text, result: fmtNum(r) }),
        fx: { hl: { [res.id]: "ok" }, card: { title: "Compute", body: `\`${a.text} ${t} ${b.text} = ${fmtNum(r)}\``, tone: "ok" } } });
  }

  setCursor(R, T.length);
  const left = R.s.stack;
  if (left.length !== 1) {
    return fail(-1, `${left.length} values left on the stack`,
      `A valid postfix expression leaves exactly one value. \`${left.map((x) => x.text).join(" ")}\` remain — there are too few operators.`,
      [10, 11], Object.fromEntries(left.map((x) => [x.id, "danger" as const])));
  }
  const v = left[0].num ?? Number(left[0].text);
  R.snap(`Result = ${left[0].text} ✓`,
    "Exactly one value is left — the value of the whole expression. Each token is handled once with O(1) stack work → **O(n)** time.",
    { tone: "ok", line: [10, 11], vars: vars(T.length, { result: left[0].text }), fx: { hl: { [left[0].id]: "ok" }, verdict: { text: `= ${left[0].text}`, tone: "ok" } } });
  return { steps: R.steps, value: v };
}
