import { VIZ } from "@/lib/theme";
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
      lomuto: "j scans left → right; i marks the end of the ≤ region. The pivot is locked into its final place after each partition.",
      hoare: "i and j scan inward from both ends and swap misplaced pairs. Fewer swaps, but the pivot isn't locked in place.",
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
      last: "Classic textbook choice. Try the Sorted preset to see the O(n²) worst case.",
      first: "Also O(n²) on sorted or reversed input.",
      middle: "Sorted input now splits evenly.",
      random: "Expected O(n log n) on every input.",
      median3: "Median of A[lo], A[mid], A[hi] — robust and cheap.",
    },
  },
];

export const quickSort: SortAlgorithmDef<QuickStep> = {
  key: "quick",
  name: "Quick Sort",
  blurb:
    "Pick a pivot, partition the range so smaller elements go left and larger go right, then sort each side recursively. " +
    "Watch the ≤ / > regions grow and the recursion tree take shape.",
  family: "Divide & conquer",
  stable: false,
  inPlace: true,
  complexity: [
    { op: "Time", best: "n log n", avg: "n log n", worst: "n²" },
    { op: "Space", best: "log n", avg: "log n", worst: "O(n)" },
  ],
  pseudocode: LOMUTO_PSEUDOCODE,
  legend: [
    { label: "Unsorted", color: VIZ.base[0], stroke: VIZ.base[1] },
    { label: "Pivot", color: VIZ.pivot[0], stroke: VIZ.pivot[1] },
    { label: "≤ pivot", color: VIZ.left[0], stroke: VIZ.left[1] },
    { label: "> pivot", color: VIZ.right[0], stroke: VIZ.right[1] },
    { label: "Examining", color: "transparent", stroke: VIZ.active[1] },
    { label: "Final position", color: VIZ.success[0], stroke: VIZ.success[1] },
    { label: "Outside range", color: "rgba(69,69,82,0.35)", stroke: "rgba(108,108,120,0.35)" },
    { label: "Pending call", color: "transparent", stroke: "rgba(255,255,255,0.3)", kind: "dashed" },
  ],
  maxSize: 20,
  record: (input: readonly number[], opts?: SortRunOptions) => recordQuickSort(input, opts ?? {}),
  Canvas: QuickSortCanvas,
  options: OPTIONS,
  usesSeed: (opts) => opts.pivot === "random",
  pseudocodeFor: (opts) => (opts.scheme === "hoare" ? HOARE_PSEUDOCODE : LOMUTO_PSEUDOCODE),
};
