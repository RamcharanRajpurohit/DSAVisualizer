/* Balanced brackets checker — pure step recorder. */
import { invalid, mark, markAll, MAX_TOKENS, newRec, peekTop, pop, push, setCursor, stackText, toks, type AppStep } from "./core";

const OPEN = "([{";
const CLOSE = ")]}";
const PAIR: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
const isBracket = (c: string) => OPEN.includes(c) || CLOSE.includes(c);

export interface BracketsResult {
  steps: AppStep[];
  balanced: boolean | null; // null = invalid input
}

export function runBrackets(input: string): BracketsResult {
  const chars = [...input.replace(/\s+/g, "")];
  if (!chars.length) {
    return { steps: invalid("brackets", "Type something to check", "Enter a string with brackets such as `{[()()]}` — or click one of the examples.", [], -1, "warn"), balanced: null };
  }
  if (chars.length > MAX_TOKENS) {
    return { steps: invalid("brackets", "That's a bit long", `Keep it to ${MAX_TOKENS} characters (spaces are ignored) so every step fits on screen — you typed ${chars.length}.`, [], -1, "warn"), balanced: null };
  }
  const tokens = toks(chars);
  const R = newRec("brackets", tokens);
  const vars = (i: number, extra: Record<string, string | number> = {}) => ({ i, ch: chars[i] ?? "—", top: peekTop(R)?.text ?? "—", ...extra });

  R.snap("Scan left to right with an empty stack",
    "Every opening bracket waits on the stack until its partner shows up. Because brackets nest, the partner of a closing bracket must be the **most recent** unmatched opener — exactly what sits on top of a stack.",
    { line: 2, vars: { i: "—", ch: "—", top: "—" } });

  let i = 0;
  while (i < chars.length) {
    const c = chars[i];
    if (!isBracket(c)) {
      // group a run of non-bracket characters into one step
      let j = i;
      while (j + 1 < chars.length && !isBracket(chars[j + 1])) j++;
      markAll(R, Array.from({ length: j - i + 1 }, (_, k) => i + k), "skip");
      setCursor(R, j);
      R.snap(`Skip "${chars.slice(i, j + 1).join("")}"`, "Not a bracket, so it can't affect the balance — move on.", { tone: "muted", line: 3, vars: vars(j), hold: 0.5 });
      i = j + 1;
      continue;
    }
    setCursor(R, i);
    mark(R, i, "current");
    if (OPEN.includes(c)) {
      push(R, { id: `b${i}`, text: c, src: i });
      mark(R, i, "wait");
      R.snap(`'${c}' opens → push`,
        `An opening bracket starts a group that must be closed later. Push it; the stack is now \`${stackText(R.s)}\` (top on the right).`,
        { line: [4, 5], vars: vars(i), fx: { hl: { [`b${i}`]: "new" } } });
    } else {
      const top = peekTop(R);
      if (!top) {
        mark(R, i, "error");
        R.snap(`'${c}' has nothing to close`,
          "The stack is empty, so no opening bracket is waiting for this closing one. The string is **not balanced**.",
          { tone: "danger", line: [6, 7, 8], vars: vars(i), fx: { stackAlert: true, verdict: { text: "Not balanced ✗", tone: "danger" } } });
        return { steps: R.steps, balanced: false };
      }
      R.snap(`'${c}' closes → pop the top`,
        `A closing bracket must match the most recent unmatched opener, which is the top of the stack: \`${top.text}\`.`,
        { line: [6, 9], vars: vars(i), fx: { hl: { [top.id]: "active" }, card: { title: "Compare", body: `top = \`${top.text}\`   vs   ch = \`${c}\``, tone: "info" } } });
      if (top.text !== PAIR[c]) {
        mark(R, i, "error");
        mark(R, top.src!, "error");
        R.snap(`Mismatch: '${top.text}' can't be closed by '${c}'`,
          `\`${top.text}\` needs \`${CLOSE[OPEN.indexOf(top.text)]}\`, but we found \`${c}\` — the brackets cross instead of nesting. **Not balanced**.`,
          { tone: "danger", line: [10, 11], vars: vars(i), fx: { hl: { [top.id]: "danger" }, stackAlert: true, card: { title: "Mismatch", body: `\`${top.text}\` ≠ partner of \`${c}\``, tone: "danger" }, verdict: { text: "Not balanced ✗", tone: "danger" } } });
        return { steps: R.steps, balanced: false };
      }
      pop(R);
      mark(R, i, "ok");
      mark(R, top.src!, "ok");
      R.snap(`'${top.text}' matches '${c}' ✓`,
        `A matching pair — both are done. Stack: \`${stackText(R.s)}\`.`,
        { tone: "ok", line: 10, vars: vars(i), fx: { card: { title: "Match", body: `\`${top.text}\` … \`${c}\` ✓`, tone: "ok" } } });
    }
    i++;
  }

  setCursor(R, chars.length);
  if (R.s.stack.length) {
    const left = R.s.stack;
    markAll(R, left.map((it) => it.src!), "error");
    R.snap(`${left.length} bracket${left.length === 1 ? "" : "s"} never closed`,
      `The input is over but \`${left.map((x) => x.text).join(" ")}\` ${left.length === 1 ? "is" : "are"} still waiting on the stack. **Not balanced**.`,
      { tone: "danger", line: 12, vars: { i: "end", ch: "—", top: peekTop(R)?.text ?? "—" },
        fx: { hl: Object.fromEntries(left.map((it) => [it.id, "danger" as const])), stackAlert: true, verdict: { text: "Not balanced ✗", tone: "danger" } } });
    return { steps: R.steps, balanced: false };
  }
  R.snap("Balanced ✓",
    "Every closing bracket matched the most recent opener, and the stack is empty at the end, so every opener was closed. O(n) time, O(n) space for the stack in the worst case (all openers).",
    { tone: "ok", line: 12, vars: { i: "end", ch: "—", top: "—" }, fx: { verdict: { text: "Balanced ✓", tone: "ok" } } });
  return { steps: R.steps, balanced: true };
}
