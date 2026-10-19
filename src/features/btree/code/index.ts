/**
 * Real B-tree code for the Code panel (order m, bottom-up split, delete with predecessor /
 * successor replacement, borrow-left, borrow-right and merge — the same decisions the animation
 * makes with the "Smart" replacement rule). Each operation's tab shows the node/tree class plus
 * that operation, mirroring the pseudocode's structure and names.
 */
import type { OpKind } from "../pseudocode";
import { CPP } from "./cpp";
import { JAVA } from "./java";
import { JAVASCRIPT } from "./javascript";
import { PYTHON } from "./python";
import type { LangParts } from "./types";

export const LANG_PARTS = { python: PYTHON, cpp: CPP, java: JAVA, javascript: JAVASCRIPT } as const;
export type Lang = keyof typeof LANG_PARTS;

/** head + one operation + tail: compiles on its own. */
export const snippet = (p: LangParts, op: OpKind) => `${p.head}${p[op]}${p.tail}`.trimEnd() + "\n";

/** head + every operation + tail (used by the test harnesses). */
export const fullSource = (p: LangParts) => `${p.head}${p.search}${p.insert}${p.delete}${p.tail}`;

const build = (op: OpKind) =>
  Object.fromEntries(Object.entries(LANG_PARTS).map(([lang, parts]) => [lang, snippet(parts, op)])) as Record<Lang, string>;

export const IMPLEMENTATIONS: Record<OpKind, Record<Lang, string>> = {
  search: build("search"),
  insert: build("insert"),
  delete: build("delete"),
};
