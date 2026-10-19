import { BASIC_SORTS } from "./basic";
import { DC_SORTS } from "./dc";
import type { AnySortAlgorithm } from "./types";

/** Every sorting algorithm available on the page, in picker order. */
export const SORT_ALGORITHMS: readonly AnySortAlgorithm[] = [...BASIC_SORTS, ...DC_SORTS];
