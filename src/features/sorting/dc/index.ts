import type { AnySortAlgorithm } from "../types";
import { mergeSort } from "./merge";
import { quickSort } from "./quick";

/** Divide-and-conquer sorts: merge sort (split tree) and quick sort (partitioning + recursion tree). */
export const DC_SORTS: AnySortAlgorithm[] = [mergeSort, quickSort];
