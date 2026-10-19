/*
 * Real implementations shown next to the pseudocode (CodePanel). Each language is written as a class
 * header (fields + constructor), one method per operation and a footer, so the panel can show either the
 * whole class (overview) or just the constructor plus the method the animation is running — and both are
 * the exact same text the verification harness compiles and tests.
 */
import type { Implementations } from "@/components/visualizer";

export type Lang = "python" | "cpp" | "java" | "javascript";
export const LANGS: readonly Lang[] = ["python", "cpp", "java", "javascript"];

export interface ClassSource<Op extends string> {
  head: string;
  methods: Partial<Record<Op, string>>;
  /** Helper methods only shown in the full-class view (isEmpty, size…). */
  extras?: string;
  tail: string;
}

export type ClassCode<Op extends string> = Record<Lang, ClassSource<Op>>;

const trim = (s: string) => s.replace(/^\n+|\s+$/g, "");

/** The whole class: header, every method (in declaration order), helpers, footer. */
export function fullClass<Op extends string>(src: ClassSource<Op>): string {
  const parts = [src.head, ...Object.values<string | undefined>(src.methods), src.extras].filter((p): p is string => !!p).map(trim);
  return parts.join("\n\n") + (src.tail ? `\n${src.tail}` : "") + "\n";
}

/**
 * Header + one method + footer. An empty method string (e.g. for "new") shows the header alone; an op with
 * no entry falls back to the whole class.
 */
export function classFor<Op extends string>(src: ClassSource<Op>, op: Op | null): string {
  const m = op ? src.methods[op] : undefined;
  if (!op || m === undefined) return fullClass(src);
  const parts = [src.head, m].filter((p) => !!p).map(trim);
  return parts.join("\n\n") + (src.tail ? `\n${src.tail}` : "") + "\n";
}

/** Implementations for the CodePanel: whole class for overview ops, header + method otherwise. */
export function implementationsFor<Op extends string>(code: ClassCode<Op>, op: Op | null, whole: readonly string[] = ["idle"]): Implementations {
  const o = op && whole.includes(op) ? null : op;
  return {
    python: classFor(code.python, o),
    cpp: classFor(code.cpp, o),
    java: classFor(code.java, o),
    javascript: classFor(code.javascript, o),
  };
}

