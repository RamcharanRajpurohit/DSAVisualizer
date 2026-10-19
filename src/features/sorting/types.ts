import type { ComponentType } from "react";
import type { ComplexityRow, LegendItem } from "@/components/visualizer";
import type { StepBase } from "@/lib/player/types";

/**
 * Contract every sorting algorithm implements. The sorting page is generic over this:
 * it records steps once with `record`, plays them with useStepPlayer, and draws the
 * current step with the algorithm's own `Canvas` (bars, a merge-sort split tree, …).
 */
export interface SortAlgorithmDef<S extends StepBase = StepBase> {
  key: string;
  name: string;
  /** One or two sentences shown under the algorithm picker. */
  blurb: string;
  family: "Simple" | "Divide & conquer" | "Non-comparison";
  stable: boolean;
  inPlace: boolean;
  complexity: readonly ComplexityRow[];
  pseudocode: readonly string[];
  legend: readonly LegendItem[];
  /** Largest input this visualization stays readable for. */
  maxSize: number;
  /**
   * Run the algorithm on `input` and record every step. Must not mutate `input`.
   * `opts` carries the chosen values of `options` (algorithms without options ignore it).
   */
  record(input: readonly number[], opts?: SortRunOptions): S[];
  /** Optional knobs shown on the page, e.g. quick sort's partition scheme and pivot rule. */
  options?: readonly SortOptionSpec[];
  /** True when the recording depends on a random seed (random pivots), so re-running differs. */
  usesSeed?(opts: SortRunOptions): boolean;
  /** Pseudocode that depends on the chosen options (falls back to `pseudocode`). */
  pseudocodeFor?(opts: SortRunOptions): readonly string[];
  /** Draws one step. Fills its parent (absolute inset-0 is fine). */
  Canvas: ComponentType<SortCanvasProps<S>>;
}

export type SortRunOptions = Record<string, string | number>;

export interface SortOptionChoice {
  value: string;
  label: string;
  title?: string;
}

export interface SortOptionSpec {
  key: string;
  label: string;
  /** "segmented" for 2–3 short choices, "select" for longer lists. */
  kind: "segmented" | "select";
  choices: readonly SortOptionChoice[];
  default: string;
  /** Explanation of each choice, shown under the control. */
  hints?: Readonly<Record<string, string>>;
}

export interface SortCanvasProps<S extends StepBase = StepBase> {
  step: S;
  /** Suggested transition duration (seconds) for the current playback speed. */
  animSec: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnySortAlgorithm = SortAlgorithmDef<any>;
