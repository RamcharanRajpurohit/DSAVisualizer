import type { LegendItem } from "@/components/visualizer";
import { VIZ, type VizState } from "@/lib/theme";
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
  blurb:
    "Sweep left → right swapping out-of-order neighbours; the largest unsorted value bubbles to the end each pass. " +
    "A `swapped` flag stops early once a pass makes no swaps.",
  family: "Simple",
  stable: true,
  inPlace: true,
  complexity: [
    { op: "Time", best: "n", avg: "n²", worst: "n²", space: "O(1)" },
    { op: "Compares", best: "n − 1", avg: "~n²/2", worst: "n(n−1)/2" },
    { op: "Swaps", best: "0", avg: "~n²/4", worst: "n(n−1)/2" },
  ],
  pseudocode: BUBBLE_CODE,
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
  blurb:
    "Scan the unsorted part for its minimum and swap it to the front; the final prefix grows by one per pass. " +
    "Always n(n−1)/2 comparisons, but at most n − 1 swaps.",
  family: "Simple",
  stable: false,
  inPlace: true,
  complexity: [
    { op: "Time", best: "n²", avg: "n²", worst: "n²", space: "O(1)" },
    { op: "Compares", best: "n(n−1)/2", avg: "n(n−1)/2", worst: "n(n−1)/2" },
    { op: "Swaps", best: "0", avg: "≤ n − 1", worst: "n − 1" },
  ],
  pseudocode: SELECTION_CODE,
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
  blurb:
    "Grow a sorted prefix: lift the next key out, slide bigger prefix elements one slot right, drop the key into the gap. " +
    "Very fast on nearly-sorted input.",
  family: "Simple",
  stable: true,
  inPlace: true,
  complexity: [
    { op: "Time", best: "n", avg: "n²", worst: "n²", space: "O(1)" },
    { op: "Compares", best: "n − 1", avg: "~n²/4", worst: "n(n−1)/2" },
    { op: "Shifts", best: "0", avg: "~n²/4", worst: "n(n−1)/2" },
  ],
  pseudocode: INSERTION_CODE,
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
  blurb:
    "Insertion sort on elements gap apart, with shrinking gaps n/2, n/4, …, 1. Far-away values travel in one jump, so the " +
    "final gap-1 pass has little left to do. (Shell's gaps: Θ(n²) worst case; Knuth's 1, 4, 13, … give O(n^1.5).)",
  family: "Simple",
  stable: false,
  inPlace: true,
  complexity: [
    { op: "Time", best: "n log n", avg: "n^1.25–1.5", worst: "n²", space: "O(1)" },
    { op: "Passes", best: "⌊log₂ n⌋", avg: "⌊log₂ n⌋", worst: "⌊log₂ n⌋" },
  ],
  pseudocode: SHELL_CODE,
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
  blurb:
    "No comparisons: count each value, turn the counts into end positions with prefix sums, then place elements right → left " +
    "(stable). Only worth it when the value range k is small.",
  family: "Non-comparison",
  stable: true,
  inPlace: false,
  complexity: [
    { op: "Time", best: "n + k", avg: "n + k", worst: "n + k", space: "O(n + k)" },
    { op: "Compares", best: "0", avg: "0", worst: "0" },
  ],
  pseudocode: COUNTING_CODE,
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
  blurb:
    "Distribute elements into 10 buckets by one digit, collect them back in order, repeat from the ones digit upwards. " +
    "Each pass is stable, so after d passes all d digits are sorted.",
  family: "Non-comparison",
  stable: true,
  inPlace: false,
  complexity: [
    { op: "Time", best: "d·(n + b)", avg: "d·(n + b)", worst: "d·(n + b)", space: "O(n + b)" },
    { op: "Passes", best: "d digits", avg: "d digits", worst: "d digits" },
  ],
  pseudocode: RADIX_CODE,
  legend: [
    sw("Element", "base"),
    sw("Moving", "active"),
    sw("Sorted by last p digits", "merge"),
    sw("Sorted", "success"),
    { label: "Current digit", color: "rgba(255,176,0,0.18)", stroke: "#ffb000", kind: "swatch" },
    { label: "Active bucket", color: "rgba(255,176,0,0.07)", stroke: "#ffd466", kind: "swatch" },
  ],
  maxSize: 16,
  record: recordRadix,
  Canvas: RadixCanvas,
};

/** Simple and non-comparison sorts, in picker order. */
export const BASIC_SORTS: AnySortAlgorithm[] = [bubble, selection, insertion, shell, counting, radix];
