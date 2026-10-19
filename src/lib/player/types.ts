import type { Tone } from "@/lib/theme";

/** Scalar shown in the "Variables" watch panel. */
export type WatchValue = string | number | boolean | null | undefined;

/**
 * The minimum every recorded step carries. Algorithms are run once up front and
 * recorded as an array of steps; each step is a complete picture of the state, so
 * the UI can play, pause, step back and scrub freely (see useStepPlayer).
 */
export interface StepBase {
  /** One-line headline, e.g. "Compare 7 and 3". */
  title: string;
  /** Longer explanation. Supports **bold**, `code` and newlines (see RichText). */
  detail?: string;
  tone?: Tone;
  /** 1-based pseudocode line(s) to highlight. */
  line?: number | readonly number[];
  /** Variable watch values (i, j, pivot, …). */
  vars?: Record<string, WatchValue>;
  /** Multiplier for how long autoplay lingers on this step (default 1). */
  hold?: number;
}

/** What playback controls need. useStepPlayer returns one; imperative engines can implement it too. */
export interface PlaybackApi {
  index: number;
  total: number;
  playing: boolean;
  speed: number;
  play(): void;
  pause(): void;
  toggle(): void;
  next(): void;
  prev(): void;
  first(): void;
  last(): void;
  seek(index: number): void;
  setSpeed(speed: number): void;
}
