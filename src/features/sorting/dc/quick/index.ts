import { VIZ } from "@/lib/theme";
import { QUICK_IMPL, QUICK_LESSON } from "../../content";
import type { SortAlgorithmDef, SortOptionSpec, SortRunOptions } from "../../types";
import { HOARE_PSEUDOCODE, LOMUTO_PSEUDOCODE } from "./pseudocode";
import { QuickSortCanvas } from "./QuickSortCanvas";
import { recordQuickSort, type QuickStep } from "./record";

const OPTIONS: readonly SortOptionSpec[] = [
  {
    key: "scheme",
    label: "Partition scheme",
    kind: "segmented",
    default: "lomuto",
    choices: [
      { value: "lomuto", label: "Lomuto", title: "One pointer scans left to right (CLRS)" },
      { value: "hoare", label: "Hoare", title: "Two pointers scan inward from both ends" },
    ],
    hints: {
      lomuto: "One scan; the pivot lands in its final spot.",
      hoare: "Two pointers scan inward; fewer swaps.",
    },
  },
  {
    key: "pivot",
    label: "Pivot",
    kind: "select",
    default: "last",
    choices: [
      { value: "last", label: "Last element" },
      { value: "first", label: "First element" },
      { value: "middle", label: "Middle element" },
      { value: "random", label: "Random element" },
      { value: "median3", label: "Median of three" },
    ],
    hints: {
      last: "Sorted input hits the O(n²) worst case.",
      first: "Sorted or reversed input → O(n²).",
      middle: "Sorted input splits evenly.",
      random: "Expected O(n log n) on any input.",
      median3: "Median of A[lo], A[mid], A[hi].",
    },
  },
];

export const quickSort: SortAlgorithmDef<QuickStep> = {
  key: "quick",
  name: "Quick sort",
  blurb: "Partition around a pivot, then sort each side recursively.",
  family: "Divide & conquer",
  stable: false,
  inPlace: true,
  complexity: [
    { op: "Time", best: "n log n", avg: "n log n", worst: "n²" },
    { op: "Space", best: "log n", avg: "log n", worst: "O(n)" },
  ],
  pseudocode: LOMUTO_PSEUDOCODE,
  implementations: QUICK_IMPL,
  lesson: QUICK_LESSON,
  legend: [
    { label: "Unsorted", color: VIZ.base[0], stroke: VIZ.base[1] },
    { label: "Pivot", color: VIZ.pivot[0], stroke: VIZ.pivot[1] },
    { label: "≤ pivot", color: VIZ.left[0], stroke: VIZ.left[1] },
    { label: "> pivot", color: VIZ.right[0], stroke: VIZ.right[1] },
    { label: "Examining", color: "transparent", stroke: VIZ.active[1] },
    { label: "Final position", color: VIZ.success[0], stroke: VIZ.success[1] },
    { label: "Outside range", color: VIZ.dim[0], stroke: VIZ.dim[1] },
    { label: "Pending call", color: "transparent", stroke: "rgba(26,26,26,0.3)", kind: "dashed" },
  ],
  maxSize: 20,
  record: (input: readonly number[], opts?: SortRunOptions) => recordQuickSort(input, opts ?? {}),
  Canvas: QuickSortCanvas,
  options: OPTIONS,
  usesSeed: (opts) => opts.pivot === "random",
  pseudocodeFor: (opts) => (opts.scheme === "hoare" ? HOARE_PSEUDOCODE : LOMUTO_PSEUDOCODE),
};
