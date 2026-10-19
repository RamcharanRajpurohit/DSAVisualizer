/* Presets and random inputs for the stack applications (random ones are only generated in event handlers). */
import type { AppKind } from "./core";

export interface Example {
  text: string;
  /** Shown on the chip; defaults to the text. */
  label?: string;
  /** An intentionally invalid / unbalanced input. */
  bad?: boolean;
}

export const DEFAULT_INPUT: Record<AppKind, string> = {
  brackets: "{[()()]}",
  infix: "a+b*(c^d-e)/f",
  postfix: "5 1 2 + 4 * + 3 -",
  nge: "4 5 2 25 7 8",
};

export const EXAMPLES: Record<AppKind, readonly Example[]> = {
  brackets: [
    { text: "{[()()]}" },
    { text: "((a+b)*[c-d])" },
    { text: "[{()}](){}" },
    { text: "([)]", bad: true },
    { text: "{[}", bad: true },
    { text: "(()", bad: true },
    { text: ")(", bad: true },
  ],
  infix: [
    { text: "a+b*c" },
    { text: "(a+b)*c" },
    { text: "a+b*(c^d-e)/f" },
    { text: "a-b-c", label: "a-b-c (left assoc)" },
    { text: "2^3^2", label: "2^3^2 (right assoc)" },
    { text: "3+4*2/(1-5)^2^3" },
    { text: "a+b*(c^d-e)^(f+g*h)-i" },
    { text: "(a+b", bad: true },
    { text: "a+*b", bad: true },
    { text: "-3+4", bad: true },
  ],
  postfix: [
    { text: "2 3 1 * + 9 -" },
    { text: "5 1 2 + 4 * + 3 -" },
    { text: "231*+9-", label: "231*+9- (digits)" },
    { text: "2 3 2 ^ ^" },
    { text: "10 4 - 3 /" },
    { text: "8 0 /", bad: true },
    { text: "1 +", bad: true },
    { text: "1 2 3 +", bad: true },
  ],
  nge: [
    { text: "4 5 2 25" },
    { text: "13 7 6 12" },
    { text: "1 3 2 4" },
    { text: "5 4 3 2 1", label: "decreasing" },
    { text: "1 2 3 4 5", label: "increasing" },
    { text: "4 x 2", bad: true },
  ],
};

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];
const rint = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

function balanced(n: number): string {
  if (n <= 0) return "";
  const [o, c] = pick([["(", ")"], ["[", "]"], ["{", "}"]] as const);
  const inner = rint(0, n - 1);
  return o + balanced(inner) + c + balanced(n - 1 - inner);
}

function randomInfix(depth: number, names: boolean): string {
  if (depth <= 0 || Math.random() < 0.28) return names ? pick("abcdefgh".split("")) : String(rint(1, 9));
  const op = pick(["+", "-", "*", "/", "*", "+", "^"]);
  const right = op === "^" ? (names ? pick(["2", "3"]) : String(rint(1, 3))) : randomInfix(depth - 1, names);
  const e = `${randomInfix(depth - 1, names)}${op}${right}`;
  return Math.random() < 0.35 ? `(${e})` : e;
}

/** A random input for the given application. `toPostfix` converts a numeric infix expression. */
export function randomInput(kind: AppKind, toPostfix: (infix: string) => string[] | null): string {
  switch (kind) {
    case "brackets": {
      const s = balanced(rint(3, 6));
      if (Math.random() < 0.45) {
        // break it: swap one bracket for a wrong one
        const i = rint(0, s.length - 1);
        const wrong = pick("()[]{}".split("").filter((c) => c !== s[i]));
        return s.slice(0, i) + wrong + s.slice(i + 1);
      }
      return s;
    }
    case "infix":
      for (let k = 0; k < 20; k++) {
        const e = randomInfix(3, true);
        if (e.length >= 5 && e.length <= 22) return e;
      }
      return "a+b*c-d";
    case "postfix":
      for (let k = 0; k < 20; k++) {
        const e = randomInfix(3, false);
        const p = toPostfix(e);
        if (p && p.length >= 5 && p.length <= 15 && !/\/0|\^/.test(e)) return p.join(" ");
      }
      return "6 2 3 + *";
    case "nge":
      return Array.from({ length: rint(6, 10) }, () => rint(1, 60)).join(" ");
  }
}
