import type { LegendItem } from "@/components/visualizer";
import { VIZ, type VizState } from "@/lib/theme";
import {
  BUBBLE_IMPL,
  BUBBLE_LESSON,
  COUNTING_IMPL,
  COUNTING_LESSON,
  INSERTION_IMPL,
  INSERTION_LESSON,
  RADIX_IMPL,
  RADIX_LESSON,
  SELECTION_IMPL,
  SELECTION_LESSON,
  SHELL_IMPL,
  SHELL_LESSON,
} from "../content";
import type { AnySortAlgorithm, SortAlgorithmDef } from "../types";
import { BarsCanvas } from "./components/BarsCanvas";
import { CountingCanvas } from "./components/CountingCanvas";
import { RadixCanvas } from "./components/RadixCanvas";
import { recordBubble } from "./engine/bubble";
import { recordCounting } from "./engine/counting";
import { recordInsertion } from "./engine/insertion";
import { recordRadix } from "./engine/radix";
import { recordSelection } from "./engine/selection";
import { recordShell } from "./engine/shell";
import { BUBBLE_CODE, COUNTING_CODE, INSERTION_CODE, RADIX_CODE, SELECTION_CODE, SHELL_CODE } from "./pseudocode";
import type { BarsStep, CountingStep, RadixStep } from "./types";

const sw = (label: string, state: VizState, kind: LegendItem["kind"] = "swatch"): LegendItem => ({
  label,
  color: kind === "line" || kind === "dashed" ? VIZ[state][1] : VIZ[state][0],
  stroke: VIZ[state][1],
  kind,
});

const bubble: SortAlgorithmDef<BarsStep> = {
  key: "bubble",
  name: "Bubble sort",
  blurb: "Swap out-of-order neighbours until a whole pass makes no swaps.",
  family: "Simple",
  stable: true,
  inPlace: true,
  complexity: [
    { op: "Time", best: "n", avg: "n²", worst: "n²", space: "O(1)" },
    { op: "Compares", best: "n − 1", avg: "~n²/2", worst: "n(n−1)/2" },
    { op: "Swaps", best: "0", avg: "~n²/4", worst: "n(n−1)/2" },
  ],
  pseudocode: BUBBLE_CODE,
  implementations: BUBBLE_IMPL,
  lesson: BUBBLE_LESSON,
  legend: [
    sw("Unsorted", "base"),
    sw("Comparing", "compare"),
    sw("Swapping", "active"),
    sw("Final position", "success"),
    sw("Final-region edge", "success", "dashed"),
  ],
  maxSize: 30,
  record: recordBubble,
  Canvas: BarsCanvas,
};

const selection: SortAlgorithmDef<BarsStep> = {
  key: "selection",
  name: "Selection sort",
  blurb: "Find the minimum of the unsorted part and swap it to the front.",
  family: "Simple",
  stable: false,
  inPlace: true,
  complexity: [
    { op: "Time", best: "n²", avg: "n²", worst: "n²", space: "O(1)" },
    { op: "Compares", best: "n(n−1)/2", avg: "n(n−1)/2", worst: "n(n−1)/2" },
    { op: "Swaps", best: "0", avg: "≤ n − 1", worst: "n − 1" },
  ],
  pseudocode: SELECTION_CODE,
  implementations: SELECTION_IMPL,
  lesson: SELECTION_LESSON,
  legend: [
    sw("Unsorted", "base"),
    sw("Scanning (j)", "compare"),
    sw("Current minimum", "pivot"),
    sw("Swapping", "active"),
    sw("Final position", "success"),
    sw("Final-region edge", "success", "dashed"),
  ],
  maxSize: 30,
  record: recordSelection,
  Canvas: BarsCanvas,
};

const insertion: SortAlgorithmDef<BarsStep> = {
  key: "insertion",
  name: "Insertion sort",
  blurb: "Slide each element left into its place in the sorted prefix.",
  family: "Simple",
  stable: true,
  inPlace: true,
  complexity: [
    { op: "Time", best: "n", avg: "n²", worst: "n²", space: "O(1)" },
    { op: "Compares", best: "n − 1", avg: "~n²/4", worst: "n(n−1)/2" },
    { op: "Shifts", best: "0", avg: "~n²/4", worst: "n(n−1)/2" },
  ],
  pseudocode: INSERTION_CODE,
  implementations: INSERTION_IMPL,
  lesson: INSERTION_LESSON,
  legend: [
    sw("Not yet inserted", "base"),
    sw("Sorted prefix", "merge"),
    sw("Key (lifted out)", "pivot"),
    sw("Compared with key", "compare"),
    sw("Shifted right", "active"),
    sw("Gap for the key", "pivot", "dashed"),
    sw("Sorted", "success"),
  ],
  maxSize: 30,
  record: recordInsertion,
  Canvas: BarsCanvas,
};

const shell: SortAlgorithmDef<BarsStep> = {
  key: "shell",
  name: "Shell sort",
  blurb: "Insertion sort over shrinking gaps, so far-away values move in one jump.",
  family: "Simple",
  stable: false,
  inPlace: true,
  complexity: [
    { op: "Time", best: "n log n", avg: "n^1.25–1.5", worst: "n²", space: "O(1)" },
    { op: "Passes", best: "⌊log₂ n⌋", avg: "⌊log₂ n⌋", worst: "⌊log₂ n⌋" },
  ],
  pseudocode: SHELL_CODE,
  implementations: SHELL_IMPL,
  lesson: SHELL_LESSON,
  legend: [
    sw("Current sub-sequence", "base"),
    sw("Other sub-sequences", "dim"),
    sw("tmp (lifted out)", "pivot"),
    sw("Compared with tmp", "compare"),
    sw("Shifted by gap", "active"),
    sw("Sorted", "success"),
  ],
  maxSize: 30,
  record: recordShell,
  Canvas: BarsCanvas,
};

const counting: SortAlgorithmDef<CountingStep> = {
  key: "counting",
  name: "Counting sort",
  blurb: "Count each value, then place elements using prefix sums — no comparisons.",
  family: "Non-comparison",
  stable: true,
  inPlace: false,
  complexity: [
    { op: "Time", best: "n + k", avg: "n + k", worst: "n + k", space: "O(n + k)" },
    { op: "Compares", best: "0", avg: "0", worst: "0" },
  ],
  pseudocode: COUNTING_CODE,
  implementations: COUNTING_IMPL,
  lesson: COUNTING_LESSON,
  legend: [
    sw("Input element", "base"),
    sw("Being counted", "compare"),
    sw("Already counted", "dim"),
    sw("Counter changed / placed", "active"),
    sw("Prefix total ready", "merge"),
    sw("Sorted output", "success"),
    sw("Running-total carry", "compare", "line"),
  ],
  maxSize: 20,
  record: recordCounting,
  Canvas: CountingCanvas,
};

const radix: SortAlgorithmDef<RadixStep> = {
  key: "radix",
  name: "Radix sort (LSD)",
  blurb: "Bucket by one digit at a time, ones first, with stable passes.",
  family: "Non-comparison",
  stable: true,
  inPlace: false,
  complexity: [
    { op: "Time", best: "d·(n + b)", avg: "d·(n + b)", worst: "d·(n + b)", space: "O(n + b)" },
    { op: "Passes", best: "d digits", avg: "d digits", worst: "d digits" },
  ],
  pseudocode: RADIX_CODE,
  implementations: RADIX_IMPL,
  lesson: RADIX_LESSON,
  legend: [
    sw("Element", "base"),
    sw("Moving", "active"),
    sw("Sorted by last p digits", "merge"),
    sw("Sorted", "success"),
    { label: "Current digit", color: VIZ.active[0], stroke: VIZ.active[1], kind: "swatch" },
    { label: "Active bucket", color: "rgba(217, 119, 6, 0.07)", stroke: "rgba(217, 119, 6, 0.85)", kind: "swatch" },
  ],
  maxSize: 16,
  record: recordRadix,
  Canvas: RadixCanvas,
};

/** Simple and non-comparison sorts, in picker order. */
export const BASIC_SORTS: AnySortAlgorithm[] = [bubble, selection, insertion, shell, counting, radix];
