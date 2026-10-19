/**
 * Real implementations shown in the Code panels (Python / C++ / Java / JavaScript), one per
 * pseudocode listing. On the AVL page the insert listing carries the shared pieces (Node, h,
 * update, replace, retrace) and the delete / rebalance / rotate listings build on them.
 */
import type { CodeId } from "../pseudocode";
import { CPP } from "./cpp";
import { JAVA } from "./java";
import { JAVASCRIPT } from "./javascript";
import { PYTHON } from "./python";

export type SnippetLang = "python" | "cpp" | "java" | "javascript";

const ALL = { python: PYTHON, cpp: CPP, java: JAVA, javascript: JAVASCRIPT } as const;

export function implementationsFor(id: CodeId): Record<SnippetLang, string> {
  return { python: ALL.python[id], cpp: ALL.cpp[id], java: ALL.java[id], javascript: ALL.javascript[id] };
}

export { PYTHON, CPP, JAVA, JAVASCRIPT };
