/* Page "views": every topic page opens the visualizer on one mode (and, for applications, one app). */
import type { AppKind } from "../apps/core";
import type { SQMode } from "./types";

/** The sub-page slugs under /stack-queue — each one is also a view an agent can switch to. */
export const SQ_VIEWS = [
  "stack",
  "queue",
  "circular-queue",
  "deque",
  "balanced-parentheses",
  "infix-to-postfix",
  "postfix-evaluation",
  "next-greater-element",
] as const;

export type SQView = (typeof SQ_VIEWS)[number];

/** Heading of the hub page — also shown on a sub-page once the visitor switches away from its own view. */
export const HUB_HEADING = "Stack & Queue Visualizer";

export const VIEW_TARGET: Record<SQView, { mode: SQMode; app?: AppKind }> = {
  stack: { mode: "stack" },
  queue: { mode: "queue" },
  "circular-queue": { mode: "circular" },
  deque: { mode: "deque" },
  "balanced-parentheses": { mode: "apps", app: "brackets" },
  "infix-to-postfix": { mode: "apps", app: "infix" },
  "postfix-evaluation": { mode: "apps", app: "postfix" },
  "next-greater-element": { mode: "apps", app: "nge" },
};

export const isSQView = (v: unknown): v is SQView => typeof v === "string" && (SQ_VIEWS as readonly string[]).includes(v);

/** The view name for a mode (+ app), used when reporting state to agents. */
export function viewOf(mode: SQMode, app: AppKind): SQView {
  if (mode !== "apps") return mode === "circular" ? "circular-queue" : mode;
  return ({ brackets: "balanced-parentheses", infix: "infix-to-postfix", postfix: "postfix-evaluation", nge: "next-greater-element" } as const)[app];
}
