import { VIZ } from "@/lib/theme";
import type { SortAlgorithmDef } from "../../types";
import { MergeSortCanvas } from "./MergeSortCanvas";
import { MERGE_PSEUDOCODE } from "./pseudocode";
import { recordMergeSort, type MergeStep } from "./record";

export const mergeSort: SortAlgorithmDef<MergeStep> = {
  key: "merge",
  name: "Merge Sort",
  blurb:
    "Split the array in half again and again until each piece has one element, then merge sorted pieces back together — " +
    "the split tree shows every level of the recursion.",
  family: "Divide & conquer",
  stable: true,
  inPlace: false,
  complexity: [
    { op: "Time", best: "n log n", avg: "n log n", worst: "n log n" },
    { op: "Space", worst: "O(n)" },
  ],
  pseudocode: MERGE_PSEUDOCODE,
  legend: [
    { label: "Unsorted", color: VIZ.base[0], stroke: VIZ.base[1] },
    { label: "Left run L", color: VIZ.left[0], stroke: VIZ.left[1] },
    { label: "Right run R", color: VIZ.right[0], stroke: VIZ.right[1] },
    { label: "Comparing", color: "transparent", stroke: VIZ.active[1] },
    { label: "Sorted run", color: VIZ.success[0], stroke: VIZ.success[1] },
    { label: "Active call", color: "rgba(255,176,0,0.12)", stroke: VIZ.active[1] },
    { label: "Merging into", color: "rgba(122,69,184,0.2)", stroke: VIZ.merge[1] },
    { label: "Not reached yet", color: "transparent", stroke: "rgba(255,255,255,0.18)" },
  ],
  maxSize: 16,
  record: recordMergeSort,
  Canvas: MergeSortCanvas,
};
