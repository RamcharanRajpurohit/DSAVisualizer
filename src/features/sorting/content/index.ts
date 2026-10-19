/**
 * Teaching content for the sorting page: real implementations (Python / C++17 / Java / JS) and
 * Learn-mode lessons, one pair per algorithm. Attached to each algorithm's def in basic/index.ts
 * and dc/<algo>/index.ts.
 *
 * Lesson "Try it" buttons use only the page's action ids: sort, random, reversed, nearlySorted,
 * fewUnique, sorted, small, worst, best, algo:<key>, quick:lomuto|hoare,
 * pivot:last|first|middle|random|median3.
 *
 * Every snippet is verified outside the repo (compiled / run against random arrays and the
 * language's built-in sort); keep names and structure in step with the pseudocode files.
 */
export { BUBBLE_IMPL } from "./code/bubble";
export { SELECTION_IMPL } from "./code/selection";
export { INSERTION_IMPL } from "./code/insertion";
export { SHELL_IMPL } from "./code/shell";
export { COUNTING_IMPL } from "./code/counting";
export { RADIX_IMPL } from "./code/radix";
export { MERGE_IMPL } from "./code/merge";
export { QUICK_IMPL } from "./code/quick";

export { BUBBLE_LESSON } from "./lessons/bubble";
export { SELECTION_LESSON } from "./lessons/selection";
export { INSERTION_LESSON } from "./lessons/insertion";
export { SHELL_LESSON } from "./lessons/shell";
export { COUNTING_LESSON } from "./lessons/counting";
export { RADIX_LESSON } from "./lessons/radix";
export { MERGE_LESSON } from "./lessons/merge";
export { QUICK_LESSON } from "./lessons/quick";
