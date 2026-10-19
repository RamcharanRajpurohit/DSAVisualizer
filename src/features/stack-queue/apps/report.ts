/*
 * Plain-text answers for agents: the result of a stack application plus a compact token-by-token trace.
 * Built from the same step recordings the canvas plays, so the text always matches the animation.
 */
import { listText, plain } from "../shared/agent";
import { runBrackets } from "./brackets";
import type { AppKind, AppSnap, AppStep } from "./core";
import { runInfix } from "./infix";
import { runNge } from "./nge";
import { runPostfix } from "./postfix";

export interface AppReport {
  ok: boolean;
  /** One line: the answer (or why there is none). */
  result: string;
  /** A few lines of trace (empty when the input is invalid). */
  trace: string[];
}

const stackOf = (s: AppSnap) => (s.stack.length ? s.stack.map((x) => x.text).join(" ") : "(empty)");
const outputOf = (s: AppSnap) => (s.output.length ? s.output.map((x) => x.text).join(" ") : "(empty)");

/** The last recorded step for every token position, in scan order. */
function perToken(steps: readonly AppStep[]): AppStep[] {
  const last = new Map<number, AppStep>();
  for (const st of steps) {
    const c = st.s.cursor;
    if (c >= 0 && c < st.s.tokens.length) last.set(c, st);
  }
  return [...last.entries()].sort((a, b) => a[0] - b[0]).map(([, st]) => st);
}

const failure = (steps: readonly AppStep[]): string => {
  const end = steps[steps.length - 1];
  return end ? `${plain(end.title)}: ${plain(end.detail ?? "")}` : "Invalid input.";
};

export function infixReport(expr: string): AppReport {
  const { steps, postfix } = runInfix(expr);
  if (!postfix) return { ok: false, result: `Invalid infix expression — ${failure(steps)}`, trace: [] };
  const trace = perToken(steps).map((st) => `${st.s.tokens[st.s.cursor].text} → stack: ${stackOf(st.s)} | output: ${outputOf(st.s)}`);
  trace.push(`end → pop the rest | output: ${postfix.join(" ")}`);
  return { ok: true, result: `Postfix: ${postfix.join(" ")}`, trace };
}

export function postfixReport(expr: string): AppReport {
  const { steps, value } = runPostfix(expr);
  if (value === null) return { ok: false, result: `Can't evaluate — ${failure(steps)}`, trace: [] };
  const trace = perToken(steps).map((st) => {
    const t = st.s.tokens[st.s.cursor].text;
    const isNum = /^\d/.test(t);
    return `${t} → ${isNum ? "push" : plain(st.title).replace(/ → push$/, "")} | stack: ${stackOf(st.s)}`;
  });
  const end = steps[steps.length - 1];
  const shown = end?.fx.verdict?.text.replace(/^= /, "") ?? String(value);
  return { ok: true, result: `Value: ${shown}${String(value) !== shown ? ` (exactly ${value})` : ""}`, trace };
}

export function bracketsReport(text: string): AppReport {
  const { steps, balanced } = runBrackets(text);
  if (balanced === null) return { ok: false, result: failure(steps), trace: [] };
  const trace = perToken(steps)
    .filter((st) => !/^Skip/.test(st.title))
    .map((st) => `${st.s.tokens[st.s.cursor].text} → ${plain(st.title)} | stack: ${stackOf(st.s)}`);
  const end = steps[steps.length - 1];
  return {
    ok: true,
    result: balanced
      ? "Balanced: every opener is closed by its matching bracket in the right order."
      : `Not balanced — ${plain(end.title)}. ${plain(end.detail ?? "").replace(/\s*(The string is )?not balanced\.?$/i, "")}`,
    trace,
  };
}

export function ngeReport(values: string): AppReport {
  const { steps, result } = runNge(values);
  if (!result) return { ok: false, result: failure(steps), trace: [] };
  const A = steps[0].s.tokens.map((t) => Number(t.text));
  return {
    ok: true,
    result: `Next greater elements: ${listText(result)}`,
    trace: A.map((v, i) => `${v} (index ${i}) → ${result[i]}`),
  };
}

export function appReport(kind: AppKind, text: string): AppReport {
  switch (kind) {
    case "brackets": return bracketsReport(text);
    case "infix": return infixReport(text);
    case "postfix": return postfixReport(text);
    case "nge": return ngeReport(text);
  }
}

/** Result + trace as one block of text (trace capped so long inputs stay readable). */
export function reportText(r: AppReport, maxTrace = 34): string {
  if (!r.trace.length) return r.result;
  const t = r.trace.length > maxTrace ? [...r.trace.slice(0, maxTrace - 1), `… ${r.trace.length - maxTrace + 1} more`] : r.trace;
  return `${r.result}\nTrace:\n${t.join("\n")}`;
}
