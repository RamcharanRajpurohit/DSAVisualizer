/*
 * WebMCP tools for the linked-list page: an AI agent can build, change and query the list on screen.
 * Every action records the same animation a click would (it starts playing on the page) and returns
 * a short plain-text answer. Inputs are validated here; nothing throws.
 */
import { VALUE_MAX, VALUE_MIN } from "@/config/input";
import { useAgentTools } from "@/lib/hooks/useAgentTools";
import type { AgentTool } from "@/lib/webmcp";
import { KIND_NAME, MAX_NODES, type ListKind, type ListState, type OpRequest, type Recording } from "./engine";

export interface LinkedListAgentApi {
  /** The committed list right now (kept current synchronously, so back-to-back calls chain). */
  current(): ListState;
  /** Record an operation, show it on the page (it starts playing) and return the recording. */
  run(req: OpRequest): Recording;
  /** Title of the step currently on screen. */
  stepTitle(): string | undefined;
}

const KINDS: readonly ListKind[] = ["singly", "doubly", "circular"];
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const isValue = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= VALUE_MIN && (v as number) <= VALUE_MAX;
const isIndex = (v: unknown, max: number): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max;
const plain = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1");

/** "Doubly linked list with tail pointer, 3 nodes: head → 12 ⇄ 7 ⇄ 33 → NULL" */
export function describeList(l: ListState): string {
  const vals = l.nodes.map((x) => x.value);
  const link = l.kind === "doubly" ? " ⇄ " : " → ";
  const chain = vals.length
    ? `head → ${vals.join(link)} → ${l.kind === "circular" ? "(back to head)" : "NULL"}`
    : "head → NULL (empty)";
  return `${KIND_NAME[l.kind]}${l.tailPtr ? " with tail pointer" : ""}, ${plural(vals.length, "node")}: ${chain}`;
}

/** Index of the node findMiddle() returns (matches the engine: second middle, or first in a circular list). */
export const middleIndex = (n: number, kind: ListKind) => (kind === "circular" ? Math.floor((n - 1) / 2) : Math.floor(n / 2));

/** Floyd's algorithm on node indices: last node → `to` (null = no cycle). */
export function floydSummary(n: number, to: number | null) {
  const next = (i: number | null): number | null => (i === null ? null : i + 1 < n ? i + 1 : to);
  let slow: number | null = 0;
  let fast: number | null = 0;
  let steps = 0;
  while (fast !== null && next(fast) !== null) {
    slow = next(slow);
    fast = next(next(fast));
    steps++;
    if (slow === fast) return { cycle: true as const, steps, meet: slow!, start: to!, length: n - to! };
  }
  return { cycle: false as const, steps };
}

const PLAYING = "The animation is playing on the page.";

const VALUE = { type: "integer", minimum: VALUE_MIN, maximum: VALUE_MAX } as const;

/** Register the linked-list tools while the page is mounted (WebMCP is feature-detected; no-op elsewhere). */
export function useLinkedListAgentTools(api: LinkedListAgentApi) {
  useAgentTools(linkedListAgentTools(api));
}

export function linkedListAgentTools(api: LinkedListAgentApi): AgentTool[] {
  /** Run a request and phrase the outcome; engine refusals come back as "Not done: …". */
  const exec = (req: OpRequest, ok: (r: Recording) => string): string => {
    const r = api.run(req);
    if (r.op === "invalid") {
      const s = r.steps[0];
      return `Not done: ${plain(s?.title ?? "invalid request")}. ${plain(s?.detail ?? "")}`.trim();
    }
    return `${ok(r)} ${PLAYING}`;
  };

  return [
    {
      name: "list_build",
      description:
        "Replace the linked list on the page with a new list of values (in order from head to tail), keeping the current list kind. Use this to set up an example before other operations. Returns the new list.",
      inputSchema: {
        type: "object",
        properties: {
          values: { type: "array", items: VALUE, minItems: 1, maxItems: MAX_NODES, description: `Node values from head to tail (whole numbers ${VALUE_MIN}–${VALUE_MAX}, at most ${MAX_NODES}).` },
        },
        required: ["values"],
        additionalProperties: false,
      },
      execute: ({ values }: { values?: unknown }) => {
        if (!Array.isArray(values) || !values.length || values.length > MAX_NODES || !values.every(isValue)) {
          return `Error: 'values' must be 1–${MAX_NODES} whole numbers from ${VALUE_MIN} to ${VALUE_MAX}.`;
        }
        return exec({ op: "build", values }, (r) => `Built: ${describeList(r.final)}.`);
      },
    },
    {
      name: "list_insert",
      description:
        "Insert one value into the linked list on the page — at the head, at the tail, or before the node at a given index — and animate every pointer write. Returns the list afterwards.",
      inputSchema: {
        type: "object",
        properties: {
          position: { type: "string", enum: ["head", "tail", "index"], description: "'head' = new first node, 'tail' = after the last node, 'index' = at the position given by `index`." },
          value: { ...VALUE, description: `Value for the new node (${VALUE_MIN}–${VALUE_MAX}).` },
          index: { type: "integer", minimum: 0, maximum: MAX_NODES, description: "Required when position is 'index': 0 = new head, n (the length) = after the tail." },
        },
        required: ["position", "value"],
        additionalProperties: false,
      },
      execute: ({ position, value, index }: { position?: unknown; value?: unknown; index?: unknown }) => {
        const l = api.current();
        const n = l.nodes.length;
        if (!isValue(value)) return `Error: 'value' must be a whole number from ${VALUE_MIN} to ${VALUE_MAX}.`;
        if (n >= MAX_NODES) return `Error: the list is full (${MAX_NODES} nodes). Delete a node first.`;
        if (position === "head") return exec({ op: "insertHead", values: [value] }, (r) => `Inserted ${value} at the head. ${describeList(r.final)}.`);
        if (position === "tail") return exec({ op: "insertTail", values: [value] }, (r) => `Inserted ${value} at the tail. ${describeList(r.final)}.`);
        if (position !== "index") return "Error: 'position' must be \"head\", \"tail\" or \"index\".";
        if (!isIndex(index, n)) return `Error: 'index' must be a whole number from 0 to ${n} for a list of ${plural(n, "node")}.`;
        return exec({ op: "insertAt", index, values: [value] }, (r) => `Inserted ${value} at index ${index}. ${describeList(r.final)}.`);
      },
    },
    {
      name: "list_delete",
      description:
        "Delete a node from the linked list on the page: the head, the tail, the node at an index, or the first node holding a value. Animates the unlinking and returns the list afterwards.",
      inputSchema: {
        type: "object",
        properties: {
          by: { type: "string", enum: ["head", "tail", "index", "value"], description: "Which node to delete." },
          index: { type: "integer", minimum: 0, maximum: MAX_NODES - 1, description: "Required when by is 'index' (0 = head)." },
          value: { ...VALUE, description: "Required when by is 'value': the first node with this value is deleted." },
        },
        required: ["by"],
        additionalProperties: false,
      },
      execute: ({ by, index, value }: { by?: unknown; index?: unknown; value?: unknown }) => {
        const l = api.current();
        const vals = l.nodes.map((x) => x.value);
        const n = vals.length;
        if (!n) return "Error: the list is empty — there is nothing to delete.";
        const done = (what: string) => (r: Recording) => `Deleted ${what}. ${describeList(r.final)}.`;
        if (by === "head") return exec({ op: "deleteHead" }, done(`the head (${vals[0]})`));
        if (by === "tail") return exec({ op: "deleteTail" }, done(`the tail (${vals[n - 1]})`));
        if (by === "index") {
          if (!isIndex(index, n - 1)) return `Error: 'index' must be a whole number from 0 to ${n - 1}.`;
          return exec({ op: "deleteAt", index }, done(`${vals[index]} at index ${index}`));
        }
        if (by !== "value") return "Error: 'by' must be \"head\", \"tail\", \"index\" or \"value\".";
        if (!isValue(value)) return `Error: 'value' must be a whole number from ${VALUE_MIN} to ${VALUE_MAX}.`;
        const at = vals.indexOf(value);
        if (at < 0) return exec({ op: "deleteValue", values: [value] }, () => `${value} is not in the list, so nothing was deleted (every node was checked).`);
        return exec({ op: "deleteValue", values: [value] }, done(`${value} (it was at index ${at})`));
      },
    },
    {
      name: "list_search",
      description:
        "Linear search for a value in the linked list on the page, animating each comparison from the head. Returns the index of the first match (or that it is absent) and how many nodes were compared.",
      inputSchema: {
        type: "object",
        properties: { value: { ...VALUE, description: "Value to look for." } },
        required: ["value"],
        additionalProperties: false,
      },
      execute: ({ value }: { value?: unknown }) => {
        if (!isValue(value)) return `Error: 'value' must be a whole number from ${VALUE_MIN} to ${VALUE_MAX}.`;
        const vals = api.current().nodes.map((x) => x.value);
        if (!vals.length) return "The list is empty, so the search returns -1 immediately.";
        const at = vals.indexOf(value);
        return exec({ op: "search", values: [value] }, () =>
          at >= 0
            ? `Found ${value} at index ${at} after ${plural(at + 1, "comparison")}.`
            : `${value} is not in the list: search returns -1 after checking all ${plural(vals.length, "node")}.`,
        );
      },
    },
    {
      name: "list_reverse",
      description:
        "Reverse the linked list on the page in place with the prev / curr / next three-pointer method, animating every arrow flip. Returns the list before and after.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: () => {
        const before = api.current().nodes.map((x) => x.value);
        if (!before.length) return "The list is empty; an empty list is its own reverse.";
        return exec({ op: "reverse" }, (r) => `Reversed in place: ${before.join(" → ")} became ${r.final.nodes.map((x) => x.value).join(" → ")}. O(n) time, O(1) extra space.`);
      },
    },
    {
      name: "find_middle",
      description:
        "Find the middle node of the linked list on the page with slow and fast pointers (slow moves 1, fast moves 2), animating each move. Returns the middle value and its index.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: () => {
        const l = api.current();
        const n = l.nodes.length;
        if (!n) return "The list is empty, so it has no middle node.";
        const i = middleIndex(n, l.kind);
        const note = n % 2 === 0 ? ` With an even count (${n}) this is the ${l.kind === "circular" ? "first" : "second"} of the two middle nodes.` : "";
        return exec({ op: "middle" }, () => `The middle node is ${l.nodes[i].value} at index ${i} of ${plural(n, "node")}.${note}`);
      },
    },
    {
      name: "detect_cycle",
      description:
        "Run Floyd's cycle detection (tortoise and hare) on the list on the page and animate both phases. Optionally link the last node back to the node at `cycle_to` first, to demonstrate a cycle (the link is removed afterwards). Returns whether there is a cycle, where it starts and its length.",
      inputSchema: {
        type: "object",
        properties: {
          cycle_to: { type: "integer", minimum: 0, maximum: MAX_NODES - 1, description: "Index the last node should point back to for the demo. Omit for the list as it is (no cycle unless the list is circular)." },
        },
        additionalProperties: false,
      },
      execute: ({ cycle_to }: { cycle_to?: unknown }) => {
        const l = api.current();
        const n = l.nodes.length;
        if (!n) return "The list is empty, so there is no cycle.";
        const circ = l.kind === "circular";
        if (cycle_to !== undefined && !circ && !isIndex(cycle_to, n - 1)) return `Error: 'cycle_to' must be a whole number from 0 to ${n - 1}.`;
        const to = circ ? 0 : cycle_to === undefined ? null : (cycle_to as number);
        const f = floydSummary(n, to);
        return exec({ op: "cycle", to: circ ? null : to }, () => {
          if (!f.cycle) return `No cycle: fast reached NULL after ${plural(f.steps, "step")}, so the list ends.`;
          const v = (i: number) => l.nodes[i].value;
          return `Cycle found: slow and fast met at ${v(f.meet)} (index ${f.meet}) after ${plural(f.steps, "step")}. The cycle starts at index ${f.start} (value ${v(f.start)}) and has length ${f.length}.${circ ? " (A circular list is one big cycle through the head.)" : " The demo link is removed again at the end."}`;
        });
      },
    },
    {
      name: "set_list_kind",
      description:
        "Convert the list on the page to a singly, doubly or circular linked list (same values), animating the pointer changes. Returns the converted list.",
      inputSchema: {
        type: "object",
        properties: { kind: { type: "string", enum: KINDS, description: "'singly' (next only), 'doubly' (prev + next) or 'circular' (last node points back to the head)." } },
        required: ["kind"],
        additionalProperties: false,
      },
      execute: ({ kind }: { kind?: unknown }) => {
        const k = KINDS.find((x) => x === kind);
        if (!k) return "Error: 'kind' must be \"singly\", \"doubly\" or \"circular\".";
        if (api.current().kind === k) return `It is already a ${KIND_NAME[k].toLowerCase()}. ${describeList(api.current())}.`;
        return exec({ op: "kind", kind: k }, (r) => `Converted. ${describeList(r.final)}.`);
      },
    },
    {
      name: "get_list",
      description:
        "Read the linked list currently on the page: kind, whether it keeps a tail pointer, its values from head to tail, and the animation step on screen. Changes nothing.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: () => {
        const l = api.current();
        const vals = l.nodes.map((x) => x.value);
        return {
          kind: l.kind,
          tailPointer: l.tailPtr,
          length: vals.length,
          values: vals,
          head: vals[0] ?? null,
          tail: vals.length ? vals[vals.length - 1] : null,
          text: describeList(l),
          currentStep: api.stepTitle() ? plain(api.stepTitle()!) : null,
        };
      },
    },
  ];
}
