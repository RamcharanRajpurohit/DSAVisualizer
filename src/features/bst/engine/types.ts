import type { WatchValue } from "@/lib/player/types";
import type { Tone } from "@/lib/theme";
import type { TraversalKind, TreeStats } from "../model/types";
import type { HistoryInfo } from "../model/history";
import type { CodeId } from "../pseudocode";

export interface StatusInfo {
  title: string;
  /** Supports **bold**, `code` and newlines (rendered with RichText). */
  detail?: string;
  tone: Tone;
}

/** idle: nothing running · running: animating · paused: frozen mid-animation · waiting: parked at a step boundary. */
export type RunPhase = "idle" | "running" | "paused" | "waiting";

export interface RunInfo {
  phase: RunPhase;
  stepMode: boolean;
  /** Short label of the running operation, e.g. "Insert 42 (2/5)". */
  op: string;
}

export interface CodeLine {
  id: CodeId;
  line?: number | readonly number[];
}

/** main: the operation's listing · sub: a helper being executed (rebalance / rotateLeft / rotateRight). */
export interface CodeFocus {
  main: CodeLine | null;
  sub: CodeLine | null;
}

export interface TraversalInfo {
  kind: TraversalKind;
  keys: number[];
  done: boolean;
}

export type Vars = Record<string, WatchValue>;

/** Everything the engine tells the UI. The engine never touches the DOM outside its own container. */
export interface EngineCallbacks {
  status(s: StatusInfo): void;
  run(r: RunInfo): void;
  stats(s: TreeStats): void;
  code(c: CodeFocus): void;
  vars(v: Vars | undefined): void;
  traversal(t: TraversalInfo | null): void;
  /** Undo / redo availability after every recorded operation. */
  history(h: HistoryInfo): void;
}

export interface EngineOptions {
  /** Canvas font stack (resolve the next/font family on the client and pass it in). */
  font?: string;
  showMeta?: boolean;
  speed?: number;
  stepMode?: boolean;
  /** Keys built silently on start so the page opens with a tree on screen. */
  initial?: readonly number[];
  /** Status shown once the initial tree is up. */
  ready?: Omit<StatusInfo, "tone"> & { tone?: StatusInfo["tone"] };
}
