/** Topic pages under /sorting (e.g. /sorting/merge-sort) → the algorithm each one opens on. */
export const SORT_PAGE_ALGORITHMS: Readonly<Record<string, string>> = {
  "bubble-sort": "bubble",
  "selection-sort": "selection",
  "insertion-sort": "insertion",
  "shell-sort": "shell",
  "counting-sort": "counting",
  "radix-sort": "radix",
  "merge-sort": "merge",
  "quick-sort": "quick",
};
