import { code, fmtList, keepsTail, listFrom, Rec, type Code } from "./rec";
import type { ListKind, ListState } from "./types";

export const KIND_NAME: Record<ListKind, string> = {
  singly: "Singly linked list",
  doubly: "Doubly linked list",
  circular: "Circular singly linked list",
};

const KIND_BLURB: Record<ListKind, string> = {
  singly: "Each node stores **data** and one pointer, `next`; the last node's `next` is NULL.",
  doubly: "Each node stores **data**, `next` and `prev`, so the list can be walked both ways.",
  circular: "Like singly, but the last node's `next` points back to the **head** — there is no end.",
};

/** What a node looks like in code — shown whenever no operation is running. */
export function codeStruct(kind: ListKind, tailPtr: boolean): Code {
  return code([
    "class Node:",
    ["data", "  data"],
    kind === "doubly" && ["prev", "  prev = NULL   # previous node"],
    ["next", "  next = NULL   # next node"],
    "",
    "class LinkedList:",
    ["head", "  head = NULL   # first node"],
    tailPtr && ["tail", "  tail = NULL   # last node"],
    kind === "circular" && "  # always: last.next == head",
  ], { op: "struct", kind, tailPtr });
}

/** One-step recording that just shows the list. */
export function describe(r: Rec, title?: string, extra = "") {
  const n = r.size;
  if (!r.code.lines.length || /^convert|^# keep/.test(r.code.lines[0])) r.use(codeStruct(r.kind, r.tailPtr));
  r.snap(title ?? `${KIND_NAME[r.kind]} · ${n} node${n === 1 ? "" : "s"}`, `${KIND_BLURB[r.kind]}${extra ? `\n${extra}` : ""}\nList: **${fmtList(r.values())}**`, {
    tone: "info", vars: { n },
  });
}

export function codeBuild(kind: ListKind, tailPtr: boolean): Code {
  return code([
    "build(values):",
    ["head", tailPtr ? "  head = tail = NULL" : "  head = NULL"],
    ["loop", "  for v in values:"],
    ["append", "    insertAtTail(v)"],
  ], { op: "build", kind, tailPtr });
}

export function codeClear(kind: ListKind, tailPtr: boolean): Code {
  return code([
    "clear():",
    kind === "circular" && ["open", "  last.next = NULL  # open ring"],
    ["loop", "  while head != NULL:"],
    ["free", "    temp = head"],
    ["free", "    head = head.next"],
    ["free", "    free(temp)"],
    tailPtr && ["tail", "  tail = NULL"],
  ], { op: "clear", kind, tailPtr });
}

export function recordBuild(state: ListState, values: number[], label?: string): Rec {
  const s = listFrom(values, state.kind, state.tailPtr, state.seq);
  const r = new Rec(s, codeBuild(state.kind, state.tailPtr));
  r.snap(label ? `Loaded "${label}"` : `Built a list of ${values.length} node${values.length === 1 ? "" : "s"}`, `${KIND_BLURB[r.kind]}\nList: **${fmtList(values)}**. Nodes sit at scattered heap addresses (under each node); only pointers connect them.`, {
    tone: "ok", line: ["head", "loop", "append"], vars: { n: values.length },
  });
  return r;
}

export function recordClear(state: ListState): Rec {
  const r = new Rec(state, codeClear(state.kind, state.tailPtr));
  const n = r.size;
  for (const id of r.walk()) r.free(id);
  r.ptr("head", null);
  if (r.tailPtr) r.ptr("tail", null);
  r.snap(n ? `Freed all ${n} nodes` : "The list is already empty", n
    ? "Every node is freed one by one (we must save `head.next` before freeing `head`). `head` is NULL again."
    : "`head` is already NULL.", { tone: n ? "ok" : "warn", line: ["open", "loop", "free", "tail"], vars: { n: 0 } });
  return r;
}

export function recordTailPtr(state: ListState, on: boolean): Rec {
  const r = new Rec({ ...state, tailPtr: false }, code([
    "# keep a pointer to the last node",
    ["walk", "tail = head"],
    ["walk2", "while tail.next != " + (state.kind === "circular" ? "head:" : "NULL:")],
    ["walk2", "  tail = tail.next"],
  ], { op: "findTail", kind: state.kind, tailPtr: true }));
  if (!on) {
    describe(r, "Tail pointer removed", "Without `tail`, reaching the last node means walking the whole list: insert at tail becomes **O(n)**.");
    return r;
  }
  r.tailPtr = true;
  const ids = r.walk();
  if (!ids.length) {
    r.ptr("tail", null);
    r.snap("tail = NULL", "The list is empty, so `tail` starts as NULL. Every insert will now keep it up to date.", { tone: "ok", line: "walk" });
    return r;
  }
  ids.forEach((id, i) => {
    r.ptr("tail", id);
    r.markAll("base");
    r.mark(id, "active");
    r.snap(i === 0 ? "tail = head" : `tail = tail.next (${r.v(id)})`, i === ids.length - 1
      ? `Found the last node. This one-off O(n) walk is the only time we pay for it: from now on every operation keeps \`tail\` current, so insert at tail is **O(1)**.`
      : "Walk once to find the last node.", { line: i === 0 ? "walk" : "walk2", tone: i === ids.length - 1 ? "ok" : "info", hold: i === ids.length - 1 ? 1.4 : 0.6 });
  });
  r.markAll("base");
  return r;
}

/** Convert the list between kinds, animating the pointer changes. */
export function recordKind(state: ListState, to: ListKind): Rec {
  const from = state.kind;
  /** Converting to doubly adds `tail` if the list had none (the prev-walk ends on the last node anyway). */
  const addTail = !state.tailPtr && keepsTail(to, false);
  const r = new Rec(state, code([
    `convert(${from} → ${to}):`,
    from === "circular" && ["break", "  last.next = NULL  # open ring"],
    from === "doubly" && ["dropPrev", "  for each node: drop prev"],
    to === "doubly" && ["init", "  prev = NULL; curr = head"],
    to === "doubly" && ["loop", "  while curr != NULL:"],
    to === "doubly" && ["setPrev", "    curr.prev = prev"],
    to === "doubly" && ["adv", "    prev = curr; curr = curr.next"],
    addTail && ["tail", "  tail = prev  # last node"],
    to === "circular" && ["close", "  last.next = head  # close ring"],
  ], { op: "struct", kind: to, tailPtr: keepsTail(to, state.tailPtr) }));
  const ids = r.walk();
  if (from === to) { describe(r); return r; }
  if (!ids.length) {
    r.kind = to;
    if (addTail) {
      r.tailPtr = true;
      r.ptr("tail", null);
    }
    describe(r, `Switched to a ${KIND_NAME[to].toLowerCase()}`, "The list is empty, so there's nothing to convert.");
    return r;
  }
  const last = ids[ids.length - 1];
  if (from === "circular") {
    r.mark(last, "active");
    r.setNext(last, null);
    r.kind = "singly";
    r.snap("last.next = NULL", `Open the ring: the last node (**${r.v(last)}**) stops pointing back at the head.`, { line: "break", callout: "last.next = NULL" });
    r.markAll("base");
  }
  if (from === "doubly") {
    r.kind = "singly";
    r.snap("Drop every prev pointer", "A singly linked node has no `prev` field — one pointer less per node (less memory), but no more walking backwards.", { line: "dropPrev" });
  }
  if (to === "doubly") {
    r.kind = "doubly";
    for (const id of ids) r.prev[id] = null;
    r.ptr("curr", ids[0]);
    r.ptr("prev", null, { line: 0, slot: -0.62, lane: 0 });
    r.snap("Every node gets a prev field", "Each node grows a `prev` field (drawn on the left). It starts as NULL; walk the list once and point each node back at its predecessor.", { line: "init" });
    let prev: string | null = null;
    for (const id of ids) {
      r.markAll("base");
      r.mark(id, "active");
      r.ptr("curr", id);
      r.setPrev(id, prev);
      r.snap(`curr.prev = ${prev ? r.v(prev) : "NULL"}`, prev ? `**${r.v(id)}** now points back at **${r.v(prev)}**.` : "The head has no predecessor — its prev stays NULL.", {
        line: ["loop", "setPrev"], callout: "curr.prev = prev", hold: 0.7,
      });
      prev = id;
      r.ptr("prev", prev);
    }
    if (addTail) {
      r.tailPtr = true;
      r.ptr("tail", prev);
      r.markAll("base");
      r.mark(prev, "active");
      r.ptr("curr", null);
      r.snap("tail = prev", `The walk ends with \`prev\` on the last node (**${r.v(prev)}**), so a doubly linked list keeps it as \`tail\` for free. Now both ends are **O(1)**: insert at tail and delete tail need no walk.`, {
        line: "tail", callout: "tail = prev",
      });
    }
    r.drop("curr", "prev");
    r.markAll("base");
  }
  if (to === "circular") {
    r.mark(last, "active");
    r.setNext(last, ids[0]);
    r.kind = "circular";
    r.snap("last.next = head", `Close the ring: **${r.v(last)}** points back at the head **${r.v(ids[0])}** instead of NULL.`, { line: "close", callout: "last.next = head" });
    r.markAll("base");
  }
  r.kind = to;
  describe(r, `Now a ${KIND_NAME[to].toLowerCase()}`);
  return r;
}
