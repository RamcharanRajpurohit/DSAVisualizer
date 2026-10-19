/*
 * Helpers shared by the real-code generators (python.ts, cpp.ts, java.ts, javascript.ts).
 *
 * Every listing is generated from the same switches the pseudocode uses (list kind + tail pointer),
 * with the same statement order and variable names, so a learner can map each pseudocode line to
 * real code. Pure TypeScript (no React, no `@/` runtime imports) so the scratchpad harness can
 * compile and run every snippet.
 */
import type { ImplOp, ListKind } from "../engine/types";

export type Line = string | false | null | undefined | readonly Line[];

/** Join lines, skipping false / null / undefined (but keeping "" = blank line) and flattening arrays. */
export function L(...xs: readonly Line[]): string {
  const out: string[] = [];
  const add = (x: Line) => {
    if (x === false || x === null || x === undefined) return;
    if (typeof x === "string") out.push(x);
    else x.forEach(add);
  };
  xs.forEach(add);
  return out.join("\n");
}

/** Indent every non-empty line by `n` spaces. */
export const indent = (text: string, n: number) =>
  text.split("\n").map((l) => (l ? " ".repeat(n) + l : l)).join("\n");

export interface Ctx {
  kind: ListKind;
  tailPtr: boolean;
  dbl: boolean;
  circ: boolean;
}

export const ctxOf = (kind: ListKind, tailPtr: boolean): Ctx => ({
  kind, tailPtr, dbl: kind === "doubly", circ: kind === "circular",
});

/** One language: the node/list classes plus one method per operation. */
export interface LangGen {
  /** `class Node …` for this kind. */
  node(c: Ctx): string;
  /** `class LinkedList {` + fields (+ destructor) — without the closing brace. */
  listOpen(c: Ctx): string;
  /** Closing brace of the list class ("" for Python). */
  listClose: string;
  /** Spaces methods are indented by inside the class. */
  memberIndent: number;
  /** One operation as a method of LinkedList, at column 0. `null` = not available for this variant. */
  method(op: Exclude<ImplOp, "struct">, c: Ctx): string | null;
}

/** Operations whose listing is generated per method (everything except the class definition). */
export const METHOD_OPS = [
  "build", "clear", "findTail", "insertHead", "insertTail", "insertAt", "deleteHead", "deleteTail", "deleteAt",
  "deleteValue", "search", "reverse", "middle", "cycle", "dedupe", "merge", "bug",
] as const satisfies readonly Exclude<ImplOp, "struct">[];
