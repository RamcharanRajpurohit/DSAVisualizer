/* Infix → postfix with the shunting-yard algorithm — pure step recorder. */
import { emit, invalid, mark, MAX_TOKENS, newRec, peekTop, pop, push, setCursor, stackText, toks, type AppStep } from "./core";

export const PREC: Record<string, number> = { "^": 3, "*": 2, "/": 2, "%": 2, "+": 1, "-": 1 };
export const RIGHT_ASSOC = new Set(["^"]);
export const isOperator = (t: string) => t in PREC;
export const isOperand = (t: string) => /^(\d+(\.\d+)?|[A-Za-z_][A-Za-z0-9_]*)$/.test(t);

export type Lexed = { ok: true; tokens: string[] } | { ok: false; chars: string[]; bad: number; message: string };

/** Split an infix expression into numbers, names, operators and parentheses. */
export function lexInfix(src: string): Lexed {
  const out: string[] = [];
  const chars = [...src.replace(/\s+/g, "")];
  let i = 0; // position among the non-space characters (for highlighting a bad one)
  let p = 0; // position in the raw string
  const s = src;
  while (p < s.length) {
    const c = s[p];
    if (/\s/.test(c)) { p++; continue; }
    const rest = s.slice(p);
    const m = /^(\d+(\.\d+)?|[A-Za-z_][A-Za-z0-9_]*)/.exec(rest);
    if (m) { out.push(m[0]); p += m[0].length; i += m[0].length; continue; }
    if (isOperator(c) || c === "(" || c === ")") { out.push(c); p++; i++; continue; }
    return { ok: false, chars, bad: i, message: `"${c}" isn't a number, a name, an operator (+ − * / % ^) or a parenthesis.` };
  }
  return { ok: true, tokens: out };
}

export interface InfixResult {
  steps: AppStep[];
  postfix: string[] | null; // null when the expression is invalid
}

const precText = (op: string) => `prec(${op}) = ${PREC[op]}`;

export function runInfix(input: string): InfixResult {
  const lex = lexInfix(input);
  if (!lex.ok) {
    return { steps: invalid("infix", "Unexpected character", lex.message, toks(lex.chars), lex.bad, "danger"), postfix: null };
  }
  const T = lex.tokens;
  if (!T.length) return { steps: invalid("infix", "Type an expression", "For example `a + b * c` or `(1 + 2) * 3` — or click one of the examples."), postfix: null };
  if (T.length > MAX_TOKENS) return { steps: invalid("infix", "That's a bit long", `Keep it to ${MAX_TOKENS} tokens so every step fits on screen — this one has ${T.length}.`), postfix: null };

  const R = newRec("infix", toks(T));
  const vars = (i: number) => ({ i, token: T[i] ?? "—", top: peekTop(R)?.text ?? "—", output: R.s.output.length });
  const outText = () => R.s.output.map((x) => x.text).join(" ") || "—";
  const fail = (i: number, title: string, detail: string, line?: number | number[]) => {
    if (i >= 0 && i < T.length) mark(R, i, "error");
    R.snap(title, detail, { tone: "danger", line, vars: vars(i), fx: { verdict: { text: "Invalid expression", tone: "danger" } } });
    return { steps: R.steps, postfix: null };
  };
  /** Pop the top operator to the output (two steps: highlight, then move). */
  const popToOutput = (i: number, why: string, line: number | number[]) => {
    const top = pop(R)!;
    emit(R, top);
    R.snap(`Pop '${top.text}' → output`, why, { line, vars: vars(i), fx: { hl: { [top.id]: "out" } } });
  };

  R.snap("Scan the infix expression left to right",
    "Operands go straight to the output. Operators wait on a stack until we know nothing with **higher precedence** still needs to be applied first — that is the shunting-yard algorithm.",
    { line: 1, vars: { i: "—", token: "—", top: "—", output: 0 } });

  let expectOperand = true;
  for (let i = 0; i < T.length; i++) {
    const t = T[i];
    setCursor(R, i);
    mark(R, i, "current");

    if (isOperand(t)) {
      if (!expectOperand) return fail(i, `Missing operator before '${t}'`, `Two operands in a row (\`${T[i - 1]}\` then \`${t}\`) — an operator must separate them. (Implicit multiplication like \`2a\` isn't supported; write \`2 * a\`.)`, 3);
      emit(R, { id: `o${i}`, text: t, src: i });
      mark(R, i, "done");
      R.snap(`Operand '${t}' → output`,
        "Operands keep their original left-to-right order in postfix, so they go straight to the output.",
        { line: [3, 4], vars: vars(i), fx: { hl: { [`o${i}`]: "ok" } } });
      expectOperand = false;
    } else if (t === "(") {
      if (!expectOperand) return fail(i, "Missing operator before '('", `\`${T[i - 1]}\` is directly followed by \`(\`. Write the operator explicitly, e.g. \`2 * (…)\`.`, 5);
      push(R, { id: `s${i}`, text: t, src: i });
      mark(R, i, "wait");
      R.snap("'(' → push",
        "A left parenthesis starts a sub-expression. It sits on the stack as a **wall**: operators inside the parentheses can never pop anything below it.",
        { line: [5, 6], vars: vars(i), fx: { hl: { [`s${i}`]: "new" } } });
    } else if (t === ")") {
      if (expectOperand) {
        return fail(i, T[i - 1] === "(" ? "Empty parentheses" : `'${T[i - 1]}' is missing its right operand`,
          T[i - 1] === "(" ? "`()` contains nothing to evaluate." : `The operator \`${T[i - 1]}\` is followed directly by \`)\`.`, 7);
      }
      R.snap("')' → pop until '('",
        "The sub-expression is complete: everything stacked since its `(` must be applied now, so it moves to the output.",
        { line: [7, 8], vars: vars(i) });
      while (peekTop(R) && peekTop(R)!.text !== "(") {
        popToOutput(i, "An operator inside the parentheses — it belongs before whatever comes after `)`.", [8, 9]);
      }
      const lp = peekTop(R);
      if (!lp) return fail(i, "Unmatched ')'", "We popped the whole stack without finding a `(` — this `)` has no partner.", [8]);
      pop(R);
      mark(R, i, "done");
      mark(R, lp.src!, "done");
      R.snap("Discard the '(' — parentheses never reach the output",
        "Postfix needs no parentheses: the order of the tokens already encodes the grouping.",
        { tone: "ok", line: 10, vars: vars(i) });
      expectOperand = false;
    } else {
      // operator
      if (expectOperand) {
        const unary = (t === "-" || t === "+") && (i === 0 || T[i - 1] === "(" || isOperator(T[i - 1]));
        return fail(i, unary ? `Unary '${t}' isn't supported` : `'${t}' has no left operand`,
          unary ? `Here \`${t}\` is a sign, not a binary operator. Write \`(0 ${t} x)\` instead.` : `Two operators in a row (\`${T[i - 1]}\` then \`${t}\`).`, 11);
      }
      // the while loop of the algorithm
      for (;;) {
        const top = peekTop(R);
        if (!top || top.text === "(") {
          R.snap(top ? `Top is '(' → stop` : "Stack is empty → stop",
            top ? "An operator never pops past a `(` — it belongs to the enclosing sub-expression." : "Nothing is waiting, so there is nothing to compare against.",
            { line: [12, 13, 14], vars: vars(i), fx: { prec: { incoming: t }, card: { title: "Compare", body: top ? "top = `(` — a wall" : "stack empty", tone: "muted" } } });
          break;
        }
        const pt = PREC[top.text], pc = PREC[t];
        const popIt = pt > pc || (pt === pc && !RIGHT_ASSOC.has(t));
        const why = pt > pc ? `${precText(top.text)} > ${precText(t)}` : pt === pc ? `equal precedence and \`${t}\` is ${RIGHT_ASSOC.has(t) ? "right" : "left"}-associative` : `${precText(top.text)} < ${precText(t)}`;
        R.snap(popIt ? `'${top.text}' binds tighter → pop it` : `'${top.text}' waits → stop`,
          popIt
            ? `${why}. \`${top.text}\` must be applied before \`${t}\`, so it goes to the output first.`
            : pt === pc
              ? `${why}: \`${t}\` groups to the right (\`2^3^2 = 2^(3^2)\`), so \`${top.text}\` stays below it.`
              : `${why}: \`${t}\` must be applied first, so it goes **on top** of \`${top.text}\`.`,
          { tone: popIt ? "warn" : "info", line: [12, 13, 14], vars: vars(i),
            fx: { prec: { incoming: t, top: top.text }, hl: { [top.id]: popIt ? "active" : "base" },
              card: { title: "Compare precedence", body: `top \`${top.text}\` (${pt})  vs  \`${t}\` (${pc}) → ${popIt ? "**pop**" : "**push**"}`, tone: popIt ? "warn" : "info" } } });
        if (!popIt) break;
        popToOutput(i, `\`${top.text}\` is applied before \`${t}\`, so it is written first.`, 15);
      }
      push(R, { id: `s${i}`, text: t, src: i });
      mark(R, i, "wait");
      R.snap(`Push '${t}'`,
        `\`${t}\` waits on the stack until an operator with lower precedence (or \`)\` / the end) forces it out. Stack: \`${stackText(R.s)}\`.`,
        { line: 16, vars: vars(i), fx: { hl: { [`s${i}`]: "new" }, prec: { incoming: t } } });
      expectOperand = true;
    }
  }

  setCursor(R, T.length);
  if (expectOperand) return fail(T.length - 1, "Expression ends with an operator", `The last operator \`${T[T.length - 1]}\` has no right operand.`);

  if (R.s.stack.length) {
    R.snap("End of input → pop everything",
      "No more tokens, so every operator still waiting is applied now, top first.", { line: 17, vars: vars(T.length) });
  }
  while (peekTop(R)) {
    const top = peekTop(R)!;
    if (top.text === "(") {
      mark(R, top.src!, "error");
      R.snap("Unmatched '('", `The \`(\` at position ${top.src! + 1} was never closed.`,
        { tone: "danger", line: 17, vars: vars(T.length), fx: { hl: { [top.id]: "danger" }, stackAlert: true, verdict: { text: "Invalid expression", tone: "danger" } } });
      return { steps: R.steps, postfix: null };
    }
    popToOutput(T.length, "Remaining operators come out in stack order — the most recently pushed (tightest-binding) first.", [17, 18]);
  }
  const post = R.s.output.map((x) => x.text);
  R.snap("Postfix ready ✓",
    `\`${outText()}\`\nRead it left to right with a stack (see **Postfix eval**): operands are pushed, each operator pops its two operands. No parentheses or precedence rules needed. O(n) time.`,
    { tone: "ok", vars: vars(T.length), fx: { verdict: { text: post.join(" "), tone: "ok" } } });
  return { steps: R.steps, postfix: post };
}
