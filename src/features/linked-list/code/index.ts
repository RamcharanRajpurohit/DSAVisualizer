/*
 * Real implementations (Python / C++ / Java / JavaScript) that match the pseudocode on screen.
 * Every recorded step carries an `impl` key (operation + list kind + tail pointer); the page looks
 * the listing up here, so the code tabs switch together with the pseudocode.
 */
import type { ImplKey, ImplOp } from "../engine/types";
import { cpp } from "./cpp";
import { java } from "./java";
import { javascript } from "./javascript";
import { python } from "./python";
import { ctxOf, L, type LangGen } from "./shared";

export type CodeLangId = "python" | "cpp" | "java" | "javascript";
export type ImplSet = Partial<Record<CodeLangId, string>>;

export const LANGS: Record<CodeLangId, LangGen> = { python, cpp, java, javascript };

/** Short name of each listing, shown in the code panel's title. */
export const IMPL_TITLE: Record<ImplOp, string> = {
  struct: "Node & list classes",
  build: "Build",
  clear: "Clear",
  findTail: "Find tail",
  insertHead: "Insert at head",
  insertTail: "Insert at tail",
  insertAt: "Insert at index",
  deleteHead: "Delete head",
  deleteTail: "Delete tail",
  deleteAt: "Delete at index",
  deleteValue: "Delete value",
  search: "Search",
  reverse: "Reverse",
  middle: "Find middle",
  cycle: "Floyd cycle detection",
  dedupe: "Remove duplicates",
  merge: "Merge sorted lists",
  bug: "Wrong insert order",
};

const MEMBER_NOTE: Record<CodeLangId, string> = {
  python: "    # ...plus the operations shown for each step",
  cpp: "    // ...plus the operations shown for each step",
  java: "    // ...plus the operations shown for each step",
  javascript: "  // ...plus the operations shown for each step",
};

/** The Node class and the list class (fields only). */
function structListing(id: CodeLangId, key: ImplKey): string {
  const g = LANGS[id];
  const c = ctxOf(key.kind, key.tailPtr);
  return L(g.node(c), "", id === "python" ? "" : null, g.listOpen(c), MEMBER_NOTE[id], g.listClose || null);
}

/** One listing in one language (null when the operation doesn't exist for this variant). */
export function listingFor(id: CodeLangId, key: ImplKey): string | null {
  if (key.op === "struct") return structListing(id, key);
  return LANGS[id].method(key.op, ctxOf(key.kind, key.tailPtr));
}

export const implKeyId = (k: ImplKey) => `${k.op}|${k.kind}|${k.tailPtr ? 1 : 0}`;

const cache = new Map<string, ImplSet>();

/** All four languages for one listing (cached — listings are pure functions of the key). */
export function implementationsFor(key: ImplKey): ImplSet {
  const id = implKeyId(key);
  let set = cache.get(id);
  if (!set) {
    set = {};
    for (const lang of Object.keys(LANGS) as CodeLangId[]) {
      const text = listingFor(lang, key);
      if (text) set[lang] = text;
    }
    cache.set(id, set);
  }
  return set;
}
