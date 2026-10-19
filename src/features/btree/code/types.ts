/**
 * Each language's B-tree implementation in parts: `head` (node + tree class, shared `rank` helper),
 * one part per operation, and `tail` (closing brace). The Code tab of an operation shows
 * head + that operation + tail, which compiles on its own; all parts together form the full class.
 */
export interface LangParts {
  head: string;
  search: string;
  insert: string;
  delete: string;
  tail: string;
}
