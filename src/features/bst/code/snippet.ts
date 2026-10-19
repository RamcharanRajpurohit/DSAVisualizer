import type { CodeId } from "../pseudocode";

/** One real-code snippet per pseudocode listing. */
export type Snippets = Record<CodeId, string>;

/** Trim the leading blank line(s) and trailing whitespace of a template literal, end with one newline. */
export const src = (s: string): string => `${s.replace(/^\s*\n/, "").replace(/\s+$/, "")}\n`;
