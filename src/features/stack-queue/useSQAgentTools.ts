"use client";

import { useAgentTools } from "@/lib/hooks/useAgentTools";
import type { AgentTool } from "@/lib/webmcp";
import { appReport, reportText } from "./apps/report";
import type { AppKind } from "./apps/core";
import type { End, ModeApis, Rebuild } from "./shared/agent";
import type { SQMode } from "./shared/types";
import { CAP_MAX, CAP_MIN } from "./shared/util";
import { isSQView, SQ_VIEWS, VIEW_TARGET, viewOf } from "./shared/views";

export interface SQAgentDeps {
  /** Mode on screen right now (kept current synchronously by the page). */
  currentMode: () => SQMode;
  /** Switch to a mode and resolve with its API once it is mounted (null if it never appears). */
  ensure: <M extends SQMode>(mode: M) => Promise<ModeApis[M] | null>;
  /** The API of a mounted mode, if any. */
  apiOf: <M extends SQMode>(mode: M) => ModeApis[M] | null;
}

// ───────────────────────────── argument checks (never throw) ─────────────────────────────

type Checked<T> = { ok: true; value: T } | { ok: false; error: string };

function intList(v: unknown, name: string, maxItems: number): Checked<number[]> {
  if (!Array.isArray(v) || v.length === 0) return { ok: false, error: `Error: '${name}' must be a non-empty array of whole numbers 0–999.` };
  if (v.length > maxItems) return { ok: false, error: `Error: at most ${maxItems} values per call.` };
  if (!v.every((x) => Number.isInteger(x) && x >= 0 && x <= 999)) return { ok: false, error: `Error: every value in '${name}' must be a whole number from 0 to 999.` };
  return { ok: true, value: v as number[] };
}

function count(v: unknown): Checked<number> {
  if (v === undefined) return { ok: true, value: 1 };
  if (!Number.isInteger(v) || (v as number) < 1 || (v as number) > CAP_MAX) return { ok: false, error: `Error: 'count' must be a whole number from 1 to ${CAP_MAX}.` };
  return { ok: true, value: v as number };
}

function rebuild(args: { reset?: unknown; capacity?: unknown }): Checked<Rebuild> {
  const { reset, capacity } = args;
  if (reset !== undefined && typeof reset !== "boolean") return { ok: false, error: "Error: 'reset' must be true or false." };
  if (capacity !== undefined && (!Number.isInteger(capacity) || (capacity as number) < CAP_MIN || (capacity as number) > CAP_MAX)) {
    return { ok: false, error: `Error: 'capacity' must be a whole number from ${CAP_MIN} to ${CAP_MAX}.` };
  }
  return { ok: true, value: { reset: reset as boolean | undefined, capacity: capacity as number | undefined } };
}

function text(v: unknown, name: string): Checked<string> {
  if (typeof v !== "string" || !v.trim()) return { ok: false, error: `Error: '${name}' must be a non-empty string.` };
  if (v.length > 80) return { ok: false, error: `Error: '${name}' is limited to 80 characters.` };
  return { ok: true, value: v };
}

const end = (v: unknown): Checked<End> =>
  v === "front" || v === "back" ? { ok: true, value: v } : { ok: false, error: "Error: 'end' must be \"front\" or \"back\"." };

const NOT_READY = "Error: the visualizer didn't respond — reload the page and try again.";
/** Let React commit a view switch before reading the view back. */
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 80));
const PLAYING = "The animation is playing on the page.";

// ───────────────────────────── shared schema pieces ─────────────────────────────

const VALUES = (what: string) => ({
  type: "array",
  description: `Whole numbers to ${what}, in order (0–999, at most ${CAP_MAX}).`,
  items: { type: "integer", minimum: 0, maximum: 999 },
  minItems: 1,
  maxItems: CAP_MAX,
});
const COUNT = { type: "integer", minimum: 1, maximum: CAP_MAX, description: "How many elements to remove (default 1)." };
const RESET = { type: "boolean", description: "Empty the structure first (keeps its capacity). Default false." };
const CAPACITY = { type: "integer", minimum: CAP_MIN, maximum: CAP_MAX, description: `Start from a new, empty structure with this many slots (${CAP_MIN}–${CAP_MAX}).` };
const VARIANT = {
  type: "string",
  enum: ["linear", "circular"],
  description: "\"linear\" = plain array queue (slots before front are never reused); \"circular\" = ring buffer. Default: the queue currently on screen, else linear.",
};

/**
 * WebMCP tools for the Stack & Queue visualizer: operate the structures, run the stack applications
 * (each returns its answer plus a short trace and plays the animation), switch views and read state.
 */
export function useSQAgentTools({ currentMode, ensure, apiOf }: SQAgentDeps) {
  const queueMode = (v: unknown): Checked<"queue" | "circular"> => {
    if (v === undefined) return { ok: true, value: currentMode() === "circular" ? "circular" : "queue" };
    if (v === "linear") return { ok: true, value: "queue" };
    if (v === "circular") return { ok: true, value: "circular" };
    return { ok: false, error: "Error: 'variant' must be \"linear\" or \"circular\"." };
  };

  const runApp = async (kind: AppKind, input: string) => {
    const report = appReport(kind, input);
    const api = await ensure("apps");
    if (!api) return NOT_READY;
    api.run(kind, input);
    return `${reportText(report)}\n${PLAYING}`;
  };

  const tools: AgentTool[] = [
    {
      name: "stack_push",
      description:
        "Push one or more values onto the array-backed stack (LIFO) and animate it. Switches the page to the Stack view. Returns which values were pushed, any Stack Overflow (fixed capacity), and the stack contents bottom → top.",
      inputSchema: {
        type: "object",
        properties: { values: VALUES("push"), reset: RESET, capacity: CAPACITY },
        required: ["values"],
        additionalProperties: false,
      },
      execute: async (args) => {
        const v = intList(args.values, "values", CAP_MAX);
        if (!v.ok) return v.error;
        const r = rebuild(args);
        if (!r.ok) return r.error;
        const api = await ensure("stack");
        return api ? `${api.push(v.value, r.value)}\n${PLAYING}` : NOT_READY;
      },
    },
    {
      name: "stack_pop",
      description:
        "Pop values off the top of the stack (last in, first out) and animate it. Switches to the Stack view. Returns the popped values in order, any Stack Underflow, and the remaining stack bottom → top.",
      inputSchema: { type: "object", properties: { count: COUNT }, additionalProperties: false },
      execute: async (args) => {
        const c = count(args.count);
        if (!c.ok) return c.error;
        const api = await ensure("stack");
        return api ? `${api.pop(c.value)}\n${PLAYING}` : NOT_READY;
      },
    },
    {
      name: "queue_enqueue",
      description:
        "Enqueue values at the rear of a FIFO queue and animate it — either the plain linear array queue or the circular queue (ring buffer). Returns which values were added, any overflow or wasted-space refusal, and the queue front → rear with its front/rear indices.",
      inputSchema: {
        type: "object",
        properties: { values: VALUES("enqueue"), variant: VARIANT, reset: RESET, capacity: CAPACITY },
        required: ["values"],
        additionalProperties: false,
      },
      execute: async (args) => {
        const v = intList(args.values, "values", CAP_MAX);
        if (!v.ok) return v.error;
        const m = queueMode(args.variant);
        if (!m.ok) return m.error;
        const r = rebuild(args);
        if (!r.ok) return r.error;
        const api = await ensure(m.value);
        return api ? `${api.enqueue(v.value, r.value)}\n${PLAYING}` : NOT_READY;
      },
    },
    {
      name: "queue_dequeue",
      description:
        "Dequeue values from the front of the linear or circular queue (first in, first out) and animate it. Returns the dequeued values, any underflow, and the queue front → rear.",
      inputSchema: { type: "object", properties: { count: COUNT, variant: VARIANT }, additionalProperties: false },
      execute: async (args) => {
        const c = count(args.count);
        if (!c.ok) return c.error;
        const m = queueMode(args.variant);
        if (!m.ok) return m.error;
        const api = await ensure(m.value);
        return api ? `${api.dequeue(c.value)}\n${PLAYING}` : NOT_READY;
      },
    },
    {
      name: "deque_push",
      description:
        "Insert values at the front or back of the double-ended queue (circular array, O(1) at both ends) and animate it. Switches to the Deque view. Returns what was inserted, any overflow, and the deque front → back.",
      inputSchema: {
        type: "object",
        properties: {
          end: { type: "string", enum: ["front", "back"], description: "Which end to insert at." },
          values: VALUES("insert"),
          reset: RESET,
          capacity: CAPACITY,
        },
        required: ["end", "values"],
        additionalProperties: false,
      },
      execute: async (args) => {
        const e = end(args.end);
        if (!e.ok) return e.error;
        const v = intList(args.values, "values", CAP_MAX);
        if (!v.ok) return v.error;
        const r = rebuild(args);
        if (!r.ok) return r.error;
        const api = await ensure("deque");
        return api ? `${api.push(e.value, v.value, r.value)}\n${PLAYING}` : NOT_READY;
      },
    },
    {
      name: "deque_pop",
      description:
        "Remove values from the front or back of the deque and animate it. Switches to the Deque view. Returns the removed values, any underflow, and the deque front → back.",
      inputSchema: {
        type: "object",
        properties: { end: { type: "string", enum: ["front", "back"], description: "Which end to remove from." }, count: COUNT },
        required: ["end"],
        additionalProperties: false,
      },
      execute: async (args) => {
        const e = end(args.end);
        if (!e.ok) return e.error;
        const c = count(args.count);
        if (!c.ok) return c.error;
        const api = await ensure("deque");
        return api ? `${api.pop(e.value, c.value)}\n${PLAYING}` : NOT_READY;
      },
    },
    {
      name: "convert_infix_to_postfix",
      description:
        "Convert an infix expression (numbers or names, + - * / % ^, parentheses; ^ is right-associative) to postfix with the shunting-yard algorithm. Returns the postfix and a token-by-token trace of the operator stack and output, or why the expression is invalid. Also loads it into the visualizer and plays it.",
      inputSchema: {
        type: "object",
        properties: { expression: { type: "string", minLength: 1, maxLength: 80, description: "Infix expression, e.g. a+b*(c^d-e)/f or (3+4)*2. Unary minus is not supported." } },
        required: ["expression"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: async (args) => {
        const t = text(args.expression, "expression");
        return t.ok ? runApp("infix", t.value) : t.error;
      },
    },
    {
      name: "evaluate_postfix",
      description:
        "Evaluate a postfix (Reverse Polish) expression with a stack. Returns the value and a trace of each push and computation, or the error (missing operands, leftover values, division by zero). Also loads it into the visualizer and plays it.",
      inputSchema: {
        type: "object",
        properties: { expression: { type: "string", minLength: 1, maxLength: 80, description: "Space-separated tokens such as '5 1 2 + 4 * + 3 -', or single digits without spaces such as '231*+9-'. Operators: + - * / % ^." } },
        required: ["expression"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: async (args) => {
        const t = text(args.expression, "expression");
        return t.ok ? runApp("postfix", t.value) : t.error;
      },
    },
    {
      name: "check_balanced_brackets",
      description:
        "Check whether the brackets ( ) [ ] { } in a string are balanced, using a stack. Other characters are ignored. Returns balanced / not balanced with the reason (mismatch, unexpected closer, unclosed opener) and a trace of the stack. Also loads it into the visualizer and plays it.",
      inputSchema: {
        type: "object",
        properties: { text: { type: "string", minLength: 1, maxLength: 80, description: "Text to check, e.g. {[()()]} or if (a[i] == f(x)) { }. At most 32 non-space characters." } },
        required: ["text"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: async (args) => {
        const t = text(args.text, "text");
        return t.ok ? runApp("brackets", t.value) : t.error;
      },
    },
    {
      name: "next_greater_elements",
      description:
        "For each value, find the first strictly larger value to its right (-1 if none) with a monotonic stack in O(n). Returns the result array and each element's answer. Also loads it into the visualizer and plays it.",
      inputSchema: {
        type: "object",
        properties: {
          values: { type: "array", description: "Whole numbers 0–999 (at most 14).", items: { type: "integer", minimum: 0, maximum: 999 }, minItems: 1, maxItems: 14 },
        },
        required: ["values"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: async (args) => {
        const v = intList(args.values, "values", 14);
        return v.ok ? runApp("nge", v.value.join(" ")) : v.error;
      },
    },
    {
      name: "set_mode",
      description:
        "Switch the visualizer to another view: a structure (stack, queue, circular-queue, deque) or a stack application (balanced-parentheses, infix-to-postfix, postfix-evaluation, next-greater-element). The view keeps its current data. Returns what the view now shows.",
      inputSchema: {
        type: "object",
        properties: { mode: { type: "string", enum: [...SQ_VIEWS], description: "The view to show." } },
        required: ["mode"],
        additionalProperties: false,
      },
      execute: async (args) => {
        if (!isSQView(args.mode)) return `Error: 'mode' must be one of ${SQ_VIEWS.join(", ")}.`;
        const target = VIEW_TARGET[args.mode];
        const api = await ensure(target.mode);
        if (!api) return NOT_READY;
        if (target.app) (api as ModeApis["apps"]).show(target.app);
        await settle();
        return `Showing ${args.mode}.\n${api.describe()}`;
      },
    },
    {
      name: "get_state",
      description:
        "Read what the visualizer currently shows: the active view, the structure's contents and pointers (or the application's input and result), and the animation step. Does not change anything.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: () => {
        const m = currentMode();
        const api = apiOf(m);
        if (!api) return `View: ${m} (still loading).`;
        const view = m === "apps" ? viewOf(m, (api as ModeApis["apps"]).kind()) : viewOf(m, "brackets");
        return `View: ${view}\n${api.describe()}`;
      },
    },
  ];

  useAgentTools(tools);
}
