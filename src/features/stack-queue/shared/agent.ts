/*
 * The imperative API each mode hands the page so WebMCP tools can drive it. Every call works on the
 * mode's latest structure (not a stale render closure), starts the animation, and returns a short
 * plain-text report an agent can relay.
 */
import type { AppKind } from "../apps/core";
import type { SQMode } from "./types";

export type End = "front" | "back";

/** Optional rebuild before an insert: `reset` empties the structure, `capacity` also resizes it. */
export interface Rebuild {
  reset?: boolean;
  capacity?: number;
}

export interface StackApi {
  push(values: readonly number[], rebuild: Rebuild): string;
  pop(count: number): string;
  describe(): string;
}

export interface QueueApi {
  enqueue(values: readonly number[], rebuild: Rebuild): string;
  dequeue(count: number): string;
  describe(): string;
}

export interface DequeApi {
  push(end: End, values: readonly number[], rebuild: Rebuild): string;
  pop(end: End, count: number): string;
  describe(): string;
}

export interface AppsApi {
  /** Load an input and play it. */
  run(kind: AppKind, text: string): void;
  /** Switch to an application with whatever input it last had (no autoplay). */
  show(kind: AppKind): void;
  kind(): AppKind;
  describe(): string;
}

export interface ModeApis {
  stack: StackApi;
  queue: QueueApi;
  circular: QueueApi;
  deque: DequeApi;
  apps: AppsApi;
}

/** Called by a mode on mount; returns the unbind function. */
export type BindApi = <M extends SQMode>(mode: M, api: ModeApis[M]) => () => void;

/** "Animation: step 3 of 9 — title". */
export function playbackLine(index: number, total: number, title: string | undefined, playing: boolean): string {
  if (!total) return "Animation: nothing recorded yet.";
  return `Animation: step ${index + 1} of ${total}${playing ? " (playing)" : ""} — ${plain(title ?? "")}`;
}

/** Strip the light markup (**bold**, `code`) from explanations. */
export const plain = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/\s*\n\s*/g, " ").trim();

export const listText = (xs: readonly (number | string)[]) => `[${xs.join(", ")}]`;
