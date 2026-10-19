import { code, fmtList, type Code, type Rec } from "./rec";
import type { ListKind } from "./types";

// ───────────────────────────── pseudocode ─────────────────────────────

export function codeInsertHead(kind: ListKind, tailPtr: boolean): Code {
  if (kind === "circular") {
    return code([
      "insertAtHead(value):",
      ["alloc", "  new = Node(value)"],
      ["empty", "  if head == NULL:"],
      ["self", "    new.next = new  # ring of one"],
      ["emptyHead", tailPtr ? "    head = tail = new" : "    head = new"],
      ["ret", "    return"],
      ["link", "  new.next = head"],
      ...(tailPtr
        ? [["last", "  last = tail          # O(1)"] as const]
        : [["last", "  last = head"] as const, ["walk", "  while last.next != head:"] as const, ["step", "    last = last.next"] as const]),
      ["close", "  last.next = new"],
      ["move", "  head = new"],
    ], { op: "insertHead", kind, tailPtr });
  }
  return code([
    "insertAtHead(value):",
    ["alloc", "  new = Node(value)"],
    ["link", "  new.next = head"],
    kind === "doubly" && ["backIf", "  if head != NULL:"],
    kind === "doubly" && ["back", "    head.prev = new"],
    ["move", "  head = new"],
    tailPtr && ["tailIf", "  if tail == NULL:"],
    tailPtr && ["tail", "    tail = new"],
  ], { op: "insertHead", kind, tailPtr });
}

/** Insert at tail. A doubly linked list always keeps `tail`, so only singly / circular lists ever walk here. */
export function codeInsertTail(kind: ListKind, tailPtr: boolean): Code {
  const circ = kind === "circular";
  const dbl = kind === "doubly";
  const end = circ ? "head" : "NULL";
  return code([
    "insertAtTail(value):",
    ["alloc", "  new = Node(value)"],
    ["empty", "  if head == NULL:"],
    circ && ["self", "    new.next = new"],
    ["emptyHead", tailPtr ? "    head = tail = new" : "    head = new"],
    ["ret", "    return"],
    circ && ["ring", "  new.next = head  # keep ring"],
    ...(tailPtr
      ? [
          dbl && (["back", "  new.prev = tail      # O(1)"] as const),
          ["link", dbl ? "  tail.next = new" : "  tail.next = new      # O(1)"] as const,
          ["tail", "  tail = new"] as const,
        ]
      : [
          ["curr", "  curr = head"] as const,
          ["walk", `  while curr.next != ${end}:`] as const,
          ["step", "    curr = curr.next"] as const,
          ["link", "  curr.next = new"] as const,
        ]),
  ], { op: "insertTail", kind, tailPtr });
}

export function codeInsertAt(kind: ListKind, tailPtr: boolean): Code {
  const dbl = kind === "doubly";
  return code([
    "insertAt(index, value):",
    ["zero", "  if index == 0:"],
    ["zeroCall", "    return insertAtHead(value)"],
    ["curr", "  curr = head"],
    ["loop", "  for i = 1 to index - 1:"],
    ["step", "    curr = curr.next"],
    ["alloc", "  new = Node(value)"],
    ["link", "  new.next = curr.next   # 1st"],
    dbl && ["prev", "  new.prev = curr"],
    dbl && ["backIf", "  if curr.next != NULL:"],
    dbl && ["back", "    curr.next.prev = new"],
    ["relink", "  curr.next = new        # 2nd"],
    tailPtr && ["tail", "  if curr == tail: tail = new"],
  ], { op: "insertAt", kind, tailPtr });
}

export function codeBug(): Code {
  return code([
    "insertAfter(value):  # ✗ WRONG",
    ["curr", "  curr = node at index - 1"],
    ["alloc", "  new = Node(value)"],
    ["relink", "  curr.next = new       # ✗ 1st"],
    ["link", "  new.next = curr.next  # ✗ = new!"],
    "",
    "# correct order:",
    ["fix1", "#   new.next = curr.next"],
    ["fix2", "#   curr.next = new"],
  ], { op: "bug", kind: "singly", tailPtr: false });
}

// ───────────────────────────── helpers ─────────────────────────────

/** Final "settle" step: draw the list left-to-right again with the new node in place. */
function settle(r: Rec, id: string, title: string, detail: string, line?: string) {
  r.drop("new", "curr", "last");
  r.markAll("base");
  r.mark(id, "success");
  r.relayout();
  r.snap(title, `${detail}\nList: **${fmtList(r.values())}**`, { tone: "ok", line, hold: 1.4, vars: { n: r.size } });
}

/** Walk `name` from head to the node at `index` (0-based), one step per hop. */
function walkTo(r: Rec, name: string, index: number, why: string, lines: { init: string; loop: string; step: string }) {
  let cur = r.head!;
  r.ptr(name, cur);
  r.mark(cur, "active");
  r.snap(`${name} = head`, `Start at the head (node 0, value **${r.v(cur)}**). ${why}`, {
    line: lines.init, vars: { i: 0, target: index }, callout: `${name} = head`,
  });
  for (let i = 1; i <= index; i++) {
    r.mark(cur, "visited");
    cur = r.nx(cur)!;
    r.ptr(name, cur);
    r.mark(cur, "active");
    r.snap(`${name} = ${name}.next → node ${i}`, `There's no way to jump straight to position ${index} — a linked list has no index. We follow \`next\` one node at a time (hop ${i} of ${index}).`, {
      line: [lines.loop, lines.step], vars: { i, target: index, [`${name}.data`]: r.v(cur) }, callout: `${name} = ${name}.next`, hold: 0.75,
    });
  }
  return cur;
}

// ───────────────────────────── insert at head ─────────────────────────────

export function doInsertHead(r: Rec, value: number) {
  r.use(codeInsertHead(r.kind, r.tailPtr));
  r.markAll("base");
  const old = r.head;
  const id = r.alloc(value, { line: 0, slot: 0, lane: 1 });
  r.ptr("new", id);
  r.snap(`Allocate a node for ${value}`, `**new = Node(${value})** reserves memory for one node on the heap (address \`${r.addr(id)}\`). Its \`next\` is NULL — the node exists, but nothing points to it from the list yet.`, {
    line: "alloc", vars: { value }, callout: `new = Node(${value})`,
  });

  if (r.circ) {
    if (!old) {
      r.setNext(id, id);
      r.snap("Empty list → the node points to itself", "`head` is NULL, so this is the only node. In a **circular** list the last node's `next` must lead back to the first — and here first and last are the same node.", {
        line: ["empty", "self"], callout: "new.next = new",
      });
      r.ptr("head", id);
      if (r.tailPtr) r.ptr("tail", id);
      r.snap(r.tailPtr ? "head = tail = new" : "head = new", "The list now consists of this single node.", { line: "emptyHead" });
      settle(r, id, `Inserted ${value} — a one-node ring`, "One node whose `next` is itself.", "ret");
      return;
    }
    r.setNext(id, old);
    r.snap("new.next = head", `Point the new node at the current first node (**${r.v(old)}**) *before* touching \`head\` — otherwise we'd lose our handle on the list.`, {
      line: "link", callout: "new.next = head",
    });
    const last = findLast(r, "head");
    r.setNext(last, id);
    r.snap("last.next = new", `The ring has to pass through the new node: the last node (**${r.v(last)}**) now points at **${value}** instead of the old head. The old arrow disappears, the new one is drawn.`, {
      line: "close", callout: "last.next = new",
    });
    r.ptr("head", id);
    r.snap("head = new", `\`head\` moves to the new node. Every node is still on the ring, and **${value}** is now first.`, { line: "move", callout: "head = new" });
    settle(r, id, `Inserted ${value} at the head`, r.tailPtr ? "O(1): with a tail pointer the last node is found instantly." : "O(n): without a tail pointer we had to walk the ring to find the last node.");
    return;
  }

  r.setNext(id, old);
  r.snap("new.next = head", old
    ? `Link the new node to the current first node (**${r.v(old)}**) **first**. If we moved \`head\` before doing this, nothing would point to ${r.v(old)} any more and the whole list would be lost.`
    : "The list is empty (`head` is NULL), so the new node's `next` stays NULL — it will be the only node.", {
    line: "link", callout: "new.next = head",
  });
  if (r.dbl) {
    if (old) {
      r.setPrev(old, id);
      r.snap("head.prev = new", `Doubly linked: the old first node's \`prev\` must point back at the new node, so we can walk backwards from **${r.v(old)}** to **${value}**.`, {
        line: ["backIf", "back"], callout: "head.prev = new",
      });
    } else {
      r.snap("head is NULL → no back link", "There is no old first node whose `prev` needs updating.", { line: "backIf" });
    }
  }
  r.ptr("head", id);
  r.snap("head = new", `\`head\` now points at the new node. Only two pointer writes${r.dbl ? " (three for doubly)" : ""}, no matter how long the list is — that's why insert-at-head is **O(1)**.`, {
    line: "move", callout: "head = new",
  });
  if (r.tailPtr) {
    if (!old) {
      r.ptr("tail", id);
      r.snap("tail = new", "The list was empty, so the new node is also the last one — `tail` must point at it too.", { line: ["tailIf", "tail"], callout: "tail = new" });
    }
  }
  settle(r, id, `Inserted ${value} at the head`, "Redrawn in list order — nothing moved in memory, only pointers changed.");
}

/** Find the last node: O(1) via `tail`, otherwise walk (circular: until last.next == head). */
function findLast(r: Rec, endName: "head" | "NULL"): string {
  const head = r.head!;
  if (r.tailPtr && r.tail) {
    const last = r.tail;
    r.ptr("last", last);
    r.mark(last, "active");
    r.snap("last = tail", "With a tail pointer we already know where the last node is — no walk needed.", { line: "last", callout: "last = tail" });
    return last;
  }
  let last = head;
  r.ptr("last", last);
  r.mark(last, "active");
  r.snap("last = head", `No tail pointer, so we must walk from the head to find the last node (the one whose \`next\` is ${endName}).`, { line: "last", callout: "last = head", vars: { hops: 0 } });
  let hops = 0;
  while (r.nx(last) !== head && r.nx(last) !== null) {
    r.mark(last, "visited");
    last = r.nx(last)!;
    hops++;
    r.ptr("last", last);
    r.mark(last, "active");
    r.snap(`last = last.next (${r.v(last)})`, `last.next isn't ${endName} yet, keep walking. Hop ${hops} — this walk is what makes the operation O(n).`, {
      line: ["walk", "step"], callout: "last = last.next", vars: { hops }, hold: 0.7,
    });
  }
  r.snap(`last.next == ${endName} → found the last node`, `**${r.v(last)}** is the last node.`, { line: "walk", vars: { hops } });
  return last;
}

// ───────────────────────────── insert at tail ─────────────────────────────

export function doInsertTail(r: Rec, value: number) {
  r.use(codeInsertTail(r.kind, r.tailPtr));
  r.markAll("base");
  const head = r.head;
  const n = r.size;
  // Drawn just under the last node, so the links to it stay short even when the row wraps.
  const id = r.alloc(value, { line: 0, slot: Math.max(0, n - 1), lane: 1 });
  r.ptr("new", id);
  r.snap(`Allocate a node for ${value}`, `**new = Node(${value})** — a fresh node at \`${r.addr(id)}\`, not yet connected to the list.`, {
    line: "alloc", vars: { value }, callout: `new = Node(${value})`,
  });

  if (!head) {
    r.snap("head == NULL → the list is empty", "The new node becomes the whole list.", { line: "empty" });
    if (r.circ) {
      r.setNext(id, id);
      r.snap("new.next = new", "A circular list of one node points to itself.", { line: "self", callout: "new.next = new" });
    }
    r.ptr("head", id);
    if (r.tailPtr) r.ptr("tail", id);
    r.snap(r.tailPtr ? "head = tail = new" : "head = new", "Both ends of the list are this one node.", { line: "emptyHead" });
    settle(r, id, `Inserted ${value} into the empty list`, "The list has one node.", "ret");
    return;
  }

  if (r.circ) {
    r.setNext(id, head);
    r.snap("new.next = head", "In a circular list the new last node must point back to the head. Doing this first means the ring is never broken.", { line: "ring", callout: "new.next = head" });
  }

  if (r.tailPtr && r.tail) {
    // O(1): `tail` already holds the last node — jump straight there, no walk.
    const last = r.tail;
    r.mark(last, "active");
    const jump = `No walk: \`tail\` already holds the last node (**${r.v(last)}**, \`${r.addr(last)}\`), so we go straight there.`;
    if (r.dbl) {
      r.setPrev(id, last);
      r.snap("new.prev = tail", `${jump} The new node points back at it first — that touches only the new node, so it's always safe.`, {
        line: "back", callout: "new.prev = tail",
      });
    }
    r.setNext(last, id);
    r.snap("tail.next = new", r.circ
      ? `${r.dbl ? "" : `${jump} `}The old last node now points at **${value}** instead of head; since new.next is already head, the ring stays closed.`
      : `${r.dbl ? "" : `${jump} `}The old last node's \`next\` was NULL — now it holds the new node's address \`${r.addr(id)}\`.`, {
      line: "link", callout: "tail.next = new",
    });
    r.ptr("tail", id);
    r.snap("tail = new", "Move `tail` to the new node — it's the last one now, so the next insert at tail is just as quick.", { line: "tail", callout: "tail = new" });
    settle(r, id, `Inserted ${value} at the tail`, `**O(1)** — ${r.dbl ? "three" : "two"} pointer writes${r.circ ? " (plus the ring link)" : ""}, however long the list is.`);
    return;
  }

  let last = head;
  r.ptr("curr", last);
  r.mark(last, "active");
  r.snap("curr = head", `There's **no tail pointer**, so the only way to reach the end is to walk all ${n} nodes from the head — **O(n)**. (Turn on "Tail pointer" to see the O(1) version.)`, {
    line: "curr", callout: "curr = head", vars: { hops: 0 },
  });
  let hops = 0;
  while (!r.isEnd(r.nx(last))) {
    r.mark(last, "visited");
    last = r.nx(last)!;
    hops++;
    r.ptr("curr", last);
    r.mark(last, "active");
    r.snap(`curr = curr.next (${r.v(last)})`, `curr.next wasn't ${r.circ ? "head" : "NULL"}, so we're not at the end yet. Hop ${hops} of ${n - 1}.`, {
      line: ["walk", "step"], callout: "curr = curr.next", vars: { hops }, hold: 0.7,
    });
  }
  r.snap(`curr.next == ${r.circ ? "head" : "NULL"} → curr is the last node`, `Reached **${r.v(last)}** after ${hops} hop${hops === 1 ? "" : "s"}.`, { line: "walk", vars: { hops } });

  r.setNext(last, id);
  r.snap("curr.next = new", r.circ
    ? `The old last node now points at **${value}** instead of head; since new.next is already head, the ring stays closed.`
    : `The old last node's \`next\` was NULL — now it holds the new node's address \`${r.addr(id)}\`.`, {
    line: "link", callout: "curr.next = new",
  });
  settle(r, id, `Inserted ${value} at the tail`, `**O(n)** — we walked ${n - 1} hop${n - 1 === 1 ? "" : "s"} to find the end.`);
}

// ───────────────────────────── insert at index ─────────────────────────────

export function doInsertAt(r: Rec, index: number, value: number) {
  r.use(codeInsertAt(r.kind, r.tailPtr));
  r.markAll("base");
  if (index === 0) {
    r.snap("index == 0 → insert at head", "Position 0 means the new node becomes the first node, which is exactly insert-at-head.", {
      line: ["zero", "zeroCall"], vars: { index, value },
    });
    doInsertHead(r, value);
    return;
  }
  const curr = walkTo(r, "curr", index - 1, `We need the node **before** position ${index} (node ${index - 1}), because that's the node whose \`next\` must change.`, {
    init: "curr", loop: "loop", step: "step",
  });
  const after = r.nx(curr);
  const afterTxt = r.isEnd(after) ? (r.circ ? "head" : "NULL") : String(r.v(after));
  r.snap(`curr is node ${index - 1} (${r.v(curr)})`, `The new node goes between **${r.v(curr)}** and **${afterTxt}**.`, { line: "loop", vars: { i: index - 1, index } });

  const id = r.alloc(value, { line: 0, slot: index - 0.5, lane: 1 });
  r.ptr("new", id);
  r.snap(`Allocate a node for ${value}`, `**new = Node(${value})** at \`${r.addr(id)}\`. It's drawn under the gap where it will go, but it isn't linked in yet.`, {
    line: "alloc", callout: `new = Node(${value})`, vars: { index, value },
  });
  r.setNext(id, after);
  r.snap("new.next = curr.next", `**Order matters:** copy curr's \`next\` first, so the new node also points at **${afterTxt}**. Writing \`curr.next = new\` first would lose the rest of the list.`, {
    line: "link", callout: "new.next = curr.next", vars: { index, value },
  });
  if (r.dbl) {
    r.setPrev(id, curr);
    r.snap("new.prev = curr", `The new node's back pointer goes to **${r.v(curr)}**.`, { line: "prev", callout: "new.prev = curr" });
    if (after) {
      r.setPrev(after, id);
      r.snap("curr.next.prev = new", `**${afterTxt}** used to point back at ${r.v(curr)}; now its \`prev\` points at the new node. (We still reach it through curr.next, which hasn't changed yet.)`, {
        line: ["backIf", "back"], callout: "curr.next.prev = new",
      });
    } else {
      r.snap("curr.next is NULL → no back link to fix", "We're inserting at the end, so there's no following node.", { line: "backIf" });
    }
  }
  r.setNext(curr, id);
  r.snap("curr.next = new", `Now it's safe to redirect **${r.v(curr)}** to the new node. The old arrow ${r.v(curr)} → ${afterTxt} is replaced by ${r.v(curr)} → ${value}.`, {
    line: "relink", callout: "curr.next = new",
  });
  if (r.tailPtr && r.tail === curr) {
    r.ptr("tail", id);
    r.snap("curr was the tail → tail = new", "We inserted after the last node, so the tail pointer moves to the new node.", { line: "tail", callout: "tail = new" });
  }
  settle(r, id, `Inserted ${value} at index ${index}`, `**O(i)** to walk to position ${index - 1} (${index - 1} hop${index - 1 === 1 ? "" : "s"} here), then **O(1)** to splice the node in.`);
}

// ───────────────────────────── bug demo ─────────────────────────────

/** Insert with the pointer writes in the wrong order: the rest of the list becomes unreachable. */
export function doBugDemo(r: Rec, index: number, value: number) {
  r.use(codeBug());
  r.markAll("base");
  const curr = walkTo(r, "curr", index - 1, `Let's insert after node ${index - 1} — but write the two pointers in the **wrong order**.`, {
    init: "curr", loop: "curr", step: "curr",
  });
  const after = r.nx(curr);
  const id = r.alloc(value, { line: 0, slot: index - 0.5, lane: 1 });
  r.ptr("new", id);
  r.snap(`Allocate a node for ${value}`, "So far so good.", { line: "alloc", callout: `new = Node(${value})` });
  r.setNext(curr, id);
  const lost = r.walk(after).filter((x) => x !== r.head && x !== id).length;
  r.snap("✗ curr.next = new (first!)", after
    ? `curr.next was overwritten before being saved: the ${lost} node${lost === 1 ? "" : "s"} after **${r.v(curr)}** ${lost === 1 ? "is" : "are"} now **unreachable**. In C/C++ that memory leaks.`
    : "curr was the last node, so nothing is lost yet — but watch the next line.", {
    line: "relink", tone: "danger", callout: "curr.next = new",
  });
  r.setNext(id, r.nx(curr));
  r.snap("✗ new.next = curr.next → new points to itself!", "curr.next is the new node now, so the new node points at **itself**. Any traversal will loop forever on this node.", {
    line: "link", tone: "danger", callout: "new.next = curr.next  (== new)",
  });
}
