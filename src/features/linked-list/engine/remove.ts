import { code, fmtList, type Code, type Rec } from "./rec";
import type { ListKind } from "./types";

// ───────────────────────────── pseudocode ─────────────────────────────

export function codeDeleteHead(kind: ListKind, tailPtr: boolean): Code {
  if (kind === "circular") {
    return code([
      "deleteHead():",
      ["empty", "  if head == NULL: error \"empty\""],
      ["one", "  if head.next == head:  # 1 node"],
      ["oneFree", tailPtr ? "    free(head); head = tail = NULL" : "    free(head); head = NULL"],
      ["ret", "    return"],
      ...(tailPtr
        ? [["last", "  last = tail"] as const]
        : [["last", "  last = head"] as const, ["walk", "  while last.next != head:"] as const, ["step", "    last = last.next"] as const]),
      ["temp", "  temp = head"],
      ["move", "  head = head.next"],
      ["close", "  last.next = head"],
      ["free", "  free(temp)"],
    ]);
  }
  return code([
    "deleteHead():",
    ["empty", "  if head == NULL: error \"empty\""],
    ["temp", "  temp = head"],
    ["move", "  head = head.next"],
    kind === "doubly" && ["prevIf", "  if head != NULL: head.prev = NULL"],
    tailPtr && ["tail", "  if head == NULL: tail = NULL"],
    ["free", "  free(temp)"],
  ]);
}

export function codeDeleteTail(kind: ListKind, tailPtr: boolean): Code {
  if (kind === "doubly" && tailPtr) {
    return code([
      "deleteTail():",
      ["empty", "  if head == NULL: error \"empty\""],
      ["temp", "  temp = tail          # O(1)"],
      ["one", "  if temp.prev == NULL:"],
      ["oneSet", "    head = tail = NULL"],
      ["else", "  else:"],
      ["tail", "    tail = temp.prev"],
      ["cut", "    tail.next = NULL"],
      ["free", "  free(temp)"],
    ]);
  }
  if (kind === "doubly") {
    return code([
      "deleteTail():",
      ["empty", "  if head == NULL: error \"empty\""],
      ["curr", "  curr = head"],
      ["walk", "  while curr.next != NULL:"],
      ["step", "    curr = curr.next"],
      ["one", "  if curr.prev == NULL: head = NULL"],
      ["cut", "  else: curr.prev.next = NULL"],
      ["free", "  free(curr)"],
    ]);
  }
  const end = kind === "circular" ? "head" : "NULL";
  return code([
    "deleteTail():",
    ["empty", "  if head == NULL: error \"empty\""],
    ["one", `  if head.next == ${end}:  # 1 node`],
    ["oneFree", tailPtr ? "    free(head); head = tail = NULL" : "    free(head); head = NULL"],
    ["ret", "    return"],
    ["curr", "  curr = head"],
    ["walk", `  while curr.next.next != ${end}:`],
    ["step", "    curr = curr.next"],
    ["temp", "  temp = curr.next"],
    ["cut", `  curr.next = ${end}`],
    tailPtr && ["tail", "  tail = curr"],
    ["free", "  free(temp)"],
  ]);
}

export function codeDeleteAt(kind: ListKind, tailPtr: boolean): Code {
  if (kind === "doubly") {
    return code([
      "deleteAt(index):",
      ["zero", "  if index == 0:"],
      ["zeroCall", "    return deleteHead()"],
      ["curr", "  curr = head"],
      ["loop", "  for i = 1 to index:"],
      ["step", "    curr = curr.next"],
      ["bypass", "  curr.prev.next = curr.next"],
      ["backIf", "  if curr.next != NULL:"],
      ["back", "    curr.next.prev = curr.prev"],
      tailPtr && ["tailElse", "  else: tail = curr.prev"],
      ["free", "  free(curr)"],
    ]);
  }
  return code([
    "deleteAt(index):",
    ["zero", "  if index == 0:"],
    ["zeroCall", "    return deleteHead()"],
    ["prev", "  prev = head"],
    ["loop", "  for i = 1 to index - 1:"],
    ["step", "    prev = prev.next"],
    ["temp", "  temp = prev.next"],
    ["bypass", "  prev.next = temp.next"],
    tailPtr && ["tail", "  if temp == tail: tail = prev"],
    ["free", "  free(temp)"],
  ]);
}

export function codeDeleteValue(kind: ListKind, tailPtr: boolean): Code {
  if (kind === "doubly") {
    return code([
      "deleteValue(value):",
      ["curr", "  curr = head"],
      ["walk", "  while curr != NULL:"],
      ["test", "    if curr.data == value: break"],
      ["step", "    curr = curr.next"],
      ["miss", "  if curr == NULL: return"],
      ["prevIf", "  if curr.prev != NULL:"],
      ["prevIf", "    curr.prev.next = curr.next"],
      ["headElse", "  else: head = curr.next"],
      ["nextIf", "  if curr.next != NULL:"],
      ["nextIf", "    curr.next.prev = curr.prev"],
      tailPtr && ["tailElse", "  else: tail = curr.prev"],
      ["free", "  free(curr)"],
    ]);
  }
  const end = kind === "circular" ? "head" : "NULL";
  return code([
    "deleteValue(value):",
    ["empty", "  if head == NULL: return"],
    ["isHead", "  if head.data == value:"],
    ["headCall", "    return deleteHead()"],
    ["prev", "  prev = head"],
    ["walk", `  while prev.next != ${end}:`],
    ["test", "    if prev.next.data == value: break"],
    ["step", "    prev = prev.next"],
    ["miss", `  if prev.next == ${end}: return`],
    ["temp", "  temp = prev.next"],
    ["bypass", "  prev.next = temp.next"],
    tailPtr && ["tail", "  if temp == tail: tail = prev"],
    ["free", "  free(temp)"],
  ]);
}

// ───────────────────────────── helpers ─────────────────────────────

function emptyError(r: Rec, what: string) {
  r.snap(`Can't ${what} — the list is empty`, "`head` is NULL, so there is no node to remove. Real code must check for this first; dereferencing NULL (`head.next`) would crash.", {
    tone: "danger", line: "empty",
  });
}

/** Last step of every delete: free the unlinked node, then redraw the list closed up. */
function freeNode(r: Rec, id: string, name: string, extra = "") {
  const v = r.v(id);
  r.free(id);
  r.drop("curr", "prev", "temp", "last");
  r.markAll("base");
  r.relayout();
  r.snap(`free(${name}) — deleted ${v}`, `The unlinked node's memory is returned to the allocator. ${extra}\nList: **${fmtList(r.values())}**`, {
    tone: "ok", line: "free", hold: 1.4, vars: { n: r.size },
  });
}

function walkPtr(r: Rec, name: string, hops: number, lines: [string, string], why: (i: number) => string) {
  let cur = r.at(name)!;
  for (let i = 1; i <= hops; i++) {
    r.mark(cur, "visited");
    cur = r.nx(cur)!;
    r.ptr(name, cur);
    r.mark(cur, "active");
    r.snap(`${name} = ${name}.next → node ${i}`, why(i), { line: lines, callout: `${name} = ${name}.next`, vars: { i, [`${name}.data`]: r.v(cur) }, hold: 0.75 });
  }
  return cur;
}

// ───────────────────────────── delete head ─────────────────────────────

export function doDeleteHead(r: Rec): boolean {
  r.use(codeDeleteHead(r.kind, r.tailPtr));
  r.markAll("base");
  const head = r.head;
  if (!head) { emptyError(r, "delete the head"); return false; }

  if (r.circ) {
    if (r.nx(head) === head) {
      r.ptr("temp", head);
      r.mark(head, "danger");
      r.snap("head.next == head → it's the only node", "A one-node ring: deleting it leaves the list empty.", { line: "one", tone: "warn" });
      r.ptr("head", null);
      if (r.tailPtr) r.ptr("tail", null);
      r.move(head, { lane: 1 });
      r.snap(r.tailPtr ? "head = tail = NULL" : "head = NULL", "The list no longer references the node.", { line: "oneFree" });
      freeNode(r, head, "head", "The list is now empty.");
      return true;
    }
    const last = findLastCirc(r);
    r.ptr("temp", head);
    r.mark(head, "danger");
    r.snap("temp = head", `Remember the node we're removing (**${r.v(head)}**) so we can free it at the end.`, { line: "temp", callout: "temp = head" });
    const nh = r.nx(head)!;
    r.ptr("head", nh);
    r.snap("head = head.next", `**${r.v(nh)}** becomes the first node. The old head is still on the ring, though — the last node points at it.`, { line: "move", callout: "head = head.next" });
    r.setNext(last, nh);
    r.move(head, { lane: 1 });
    r.snap("last.next = head", `Close the ring around the gap: **${r.v(last)}** now points at the new head **${r.v(nh)}**. Nothing points at ${r.v(head)} any more except \`temp\`.`, {
      line: "close", callout: "last.next = head",
    });
    freeNode(r, head, "temp", r.tailPtr ? "O(1) with the tail pointer." : "O(n): we walked the ring to find the last node.");
    return true;
  }

  r.ptr("temp", head);
  r.mark(head, "danger");
  r.snap("temp = head", `Keep a handle on the first node (**${r.v(head)}**): once \`head\` moves on, \`temp\` is the only way to reach it and free its memory.`, {
    line: "temp", callout: "temp = head",
  });
  const nh = r.nx(head);
  r.ptr("head", nh);
  r.move(head, { lane: 1 });
  r.snap("head = head.next", nh
    ? `\`head\` skips ahead to **${r.v(nh)}**. The old node is now outside the list (it still points at ${r.v(nh)}, but nothing points at it).`
    : "The old head was the only node, so `head` becomes NULL.", { line: "move", callout: "head = head.next" });
  if (r.dbl && nh) {
    r.setPrev(nh, null);
    r.snap("head.prev = NULL", `The new first node must not point back at a node that's about to be freed — that would be a dangling pointer.`, { line: "prevIf", callout: "head.prev = NULL" });
  }
  if (r.tailPtr && !nh) {
    r.ptr("tail", null);
    r.snap("head == NULL → tail = NULL", "The list is empty, so `tail` must not keep pointing at the freed node.", { line: "tail", callout: "tail = NULL" });
  }
  freeNode(r, head, "temp", "Deleting the head is **O(1)** — no walk needed.");
  return true;
}

function findLastCirc(r: Rec): string {
  const head = r.head!;
  if (r.tailPtr && r.tail) {
    r.ptr("last", r.tail);
    r.mark(r.tail, "active");
    r.snap("last = tail", "The last node's `next` will have to change, and the tail pointer gives it to us in O(1).", { line: "last", callout: "last = tail" });
    return r.tail;
  }
  let last = head;
  r.ptr("last", last);
  r.mark(last, "active");
  r.snap("last = head", "In a circular list the last node points at the head, so it must be updated too. No tail pointer → walk the ring to find it.", { line: "last", callout: "last = head" });
  let hops = 0;
  while (r.nx(last) !== head) {
    r.mark(last, "visited");
    last = r.nx(last)!;
    hops++;
    r.ptr("last", last);
    r.mark(last, "active");
    r.snap(`last = last.next (${r.v(last)})`, `Hop ${hops}: last.next isn't head yet.`, { line: ["walk", "step"], callout: "last = last.next", vars: { hops }, hold: 0.7 });
  }
  r.mark(last, "active");
  return last;
}

// ───────────────────────────── delete tail ─────────────────────────────

export function doDeleteTail(r: Rec): boolean {
  r.use(codeDeleteTail(r.kind, r.tailPtr));
  r.markAll("base");
  const head = r.head;
  if (!head) { emptyError(r, "delete the tail"); return false; }

  if (r.dbl && r.tailPtr && r.tail) {
    const temp = r.tail;
    r.ptr("temp", temp);
    r.mark(temp, "danger");
    r.snap("temp = tail", `Doubly linked **and** a tail pointer: the last node (**${r.v(temp)}**) is right there, and its \`prev\` tells us the new last node — **O(1)**, no walk.`, {
      line: "temp", callout: "temp = tail",
    });
    const p = r.pv(temp);
    if (!p) {
      r.ptr("head", null);
      r.ptr("tail", null);
      r.move(temp, { lane: 1 });
      r.snap("temp.prev == NULL → it was the only node", "Both `head` and `tail` become NULL.", { line: ["one", "oneSet"], callout: "head = tail = NULL" });
      freeNode(r, temp, "temp", "The list is now empty.");
      return true;
    }
    r.ptr("tail", p);
    r.snap("tail = temp.prev", `Step back one node using the \`prev\` pointer: **${r.v(p)}** is the new tail.`, { line: ["else", "tail"], callout: "tail = temp.prev" });
    r.setNext(p, null);
    r.move(temp, { lane: 1 });
    r.snap("tail.next = NULL", `Cut the old last node off: **${r.v(p)}** now ends the list.`, { line: "cut", callout: "tail.next = NULL" });
    freeNode(r, temp, "temp", "**O(1)** — this is a big advantage of doubly linked lists.");
    return true;
  }

  if (r.dbl) {
    let curr = head;
    r.ptr("curr", curr);
    r.mark(curr, "active");
    r.snap("curr = head", "No tail pointer, so walk to the last node first (O(n)). Once there, its `prev` gives the new last node.", { line: "curr", callout: "curr = head" });
    let hops = 0;
    while (r.nx(curr)) {
      r.mark(curr, "visited");
      curr = r.nx(curr)!;
      hops++;
      r.ptr("curr", curr);
      r.mark(curr, "active");
      r.snap(`curr = curr.next (${r.v(curr)})`, `Hop ${hops}: curr.next isn't NULL yet.`, { line: ["walk", "step"], callout: "curr = curr.next", vars: { hops }, hold: 0.7 });
    }
    r.mark(curr, "danger");
    const p = r.pv(curr);
    if (!p) {
      r.ptr("head", null);
      r.move(curr, { lane: 1 });
      r.snap("curr.prev == NULL → head = NULL", "The last node was also the first: the list becomes empty.", { line: "one", callout: "head = NULL" });
    } else {
      r.setNext(p, null);
      r.move(curr, { lane: 1 });
      r.snap("curr.prev.next = NULL", `Follow \`prev\` back to **${r.v(p)}** and end the list there.`, { line: "cut", callout: "curr.prev.next = NULL" });
    }
    freeNode(r, curr, "curr", "**O(n)** because of the walk; with a tail pointer this would be O(1).");
    return true;
  }

  const end = r.circ ? "head" : "NULL";
  if (r.isEnd(r.nx(head))) {
    r.ptr("temp", head);
    r.mark(head, "danger");
    r.snap(`head.next == ${end} → it's the only node`, "Deleting the last node of a one-node list empties it.", { line: "one", tone: "warn" });
    r.ptr("head", null);
    if (r.tailPtr) r.ptr("tail", null);
    r.move(head, { lane: 1 });
    r.snap(r.tailPtr ? "head = tail = NULL" : "head = NULL", "Nothing refers to the node any more (except temp).", { line: "oneFree" });
    freeNode(r, head, "head", "The list is now empty.");
    return true;
  }
  let curr = head;
  r.ptr("curr", curr);
  r.mark(curr, "active");
  r.snap("curr = head", r.tailPtr
    ? "Even though `tail` points at the last node, we need the node **before** it — and a singly linked list can't step backwards. So we still walk from the head: **O(n)**."
    : "We need the second-to-last node (its `next` must change), so walk from the head: **O(n)**.", {
    line: "curr", callout: "curr = head",
  });
  let hops = 0;
  while (!r.isEnd(r.nx(r.nx(curr)))) {
    r.mark(curr, "visited");
    curr = r.nx(curr)!;
    hops++;
    r.ptr("curr", curr);
    r.mark(curr, "active");
    r.snap(`curr = curr.next (${r.v(curr)})`, `curr.next.next isn't ${end}, so curr is not the second-to-last node yet. Hop ${hops}.`, {
      line: ["walk", "step"], callout: "curr = curr.next", vars: { hops }, hold: 0.7,
    });
  }
  r.snap(`curr.next.next == ${end} → stop`, `**${r.v(curr)}** is the second-to-last node.`, { line: "walk", vars: { hops } });
  const temp = r.nx(curr)!;
  r.ptr("temp", temp);
  r.mark(temp, "danger");
  r.snap("temp = curr.next", `Hold on to the last node (**${r.v(temp)}**) so it can be freed.`, { line: "temp", callout: "temp = curr.next" });
  r.setNext(curr, r.circ ? head : null);
  r.move(temp, { lane: 1 });
  r.snap(`curr.next = ${end}`, r.circ
    ? `**${r.v(curr)}** becomes the last node, so it now points back at the head — the ring skips the old last node.`
    : `**${r.v(curr)}** becomes the last node; its \`next\` is NULL.`, { line: "cut", callout: `curr.next = ${end}` });
  if (r.tailPtr) {
    r.ptr("tail", curr);
    r.snap("tail = curr", "Move the tail pointer to the new last node.", { line: "tail", callout: "tail = curr" });
  }
  freeNode(r, temp, "temp", `**O(n)** — ${hops + 1} hop${hops ? "s" : ""} to find the second-to-last node.`);
  return true;
}

// ───────────────────────────── delete at index ─────────────────────────────

export function doDeleteAt(r: Rec, index: number): boolean {
  r.use(codeDeleteAt(r.kind, r.tailPtr));
  r.markAll("base");
  if (index === 0) {
    r.snap("index == 0 → delete the head", "Removing position 0 is exactly delete-at-head.", { line: ["zero", "zeroCall"], vars: { index } });
    return doDeleteHead(r);
  }
  const head = r.head!;
  if (r.dbl) {
    r.ptr("curr", head);
    r.mark(head, "active");
    r.snap("curr = head", `Doubly linked: walk straight to node ${index} itself — its \`prev\` pointer gives us the node before it.`, { line: "curr", callout: "curr = head", vars: { i: 0, index } });
    const curr = walkPtr(r, "curr", index, ["loop", "step"], (i) => `Hop ${i} of ${index}. There is no random access in a linked list.`);
    r.mark(curr, "danger");
    const p = r.pv(curr)!;
    const n = r.nx(curr);
    r.snap(`curr is node ${index} (${r.v(curr)}) — delete it`, `Its neighbours are **${r.v(p)}** and **${n ? r.v(n) : "NULL"}**; both of their pointers that lead to curr must be redirected around it.`, { line: "loop", vars: { index } });
    r.setNext(p, n);
    r.move(curr, { lane: 1 });
    r.snap("curr.prev.next = curr.next", `**${r.v(p)}** now skips curr and points at **${n ? r.v(n) : "NULL"}**.`, { line: "bypass", callout: "curr.prev.next = curr.next" });
    if (n) {
      r.setPrev(n, p);
      r.snap("curr.next.prev = curr.prev", `**${r.v(n)}** now points back at **${r.v(p)}**. curr is fully unlinked.`, { line: ["backIf", "back"], callout: "curr.next.prev = curr.prev" });
    } else if (r.tailPtr) {
      r.ptr("tail", p);
      r.snap("curr was last → tail = curr.prev", "Keep the tail pointer valid.", { line: "tailElse", callout: "tail = curr.prev" });
    }
    freeNode(r, curr, "curr", `**O(${index})** to walk there, O(1) to unlink.`);
    return true;
  }

  r.ptr("prev", head);
  r.mark(head, "active");
  r.snap("prev = head", `To remove node ${index} we must change the \`next\` of the node **before** it (node ${index - 1}), so that's where we walk.`, {
    line: "prev", callout: "prev = head", vars: { i: 0, index },
  });
  const prev = walkPtr(r, "prev", index - 1, ["loop", "step"], (i) => `Hop ${i} of ${index - 1}.`);
  const temp = r.nx(prev)!;
  r.ptr("temp", temp);
  r.mark(temp, "danger");
  r.snap(`temp = prev.next (${r.v(temp)})`, `This is the node at index ${index}.`, { line: "temp", callout: "temp = prev.next", vars: { index } });
  const after = r.nx(temp);
  r.setNext(prev, after);
  r.move(temp, { lane: 1 });
  r.snap("prev.next = temp.next", `Bypass: **${r.v(prev)}** now points directly at **${r.isEnd(after) ? (r.circ ? `the head (${r.v(after)})` : "NULL") : r.v(after)}**. The removed node still points into the list, but nothing points at it — it's out.`, {
    line: "bypass", callout: "prev.next = temp.next",
  });
  if (r.tailPtr && r.tail === temp) {
    r.ptr("tail", prev);
    r.snap("temp was the tail → tail = prev", "Keep the tail pointer valid.", { line: "tail", callout: "tail = prev" });
  }
  freeNode(r, temp, "temp", `**O(${index})** to reach the node before it, O(1) to unlink.`);
  return true;
}

// ───────────────────────────── delete by value ─────────────────────────────

export function doDeleteValue(r: Rec, value: number): boolean {
  r.use(codeDeleteValue(r.kind, r.tailPtr));
  r.markAll("base");
  r.unbadge();
  const head = r.head;
  if (!head) {
    r.snap(`Can't delete ${value} — the list is empty`, "`head` is NULL, there's nothing to search.", { tone: "danger", line: r.dbl ? "walk" : "empty", vars: { value } });
    return false;
  }

  if (r.dbl) {
    let curr: string | null = head;
    r.ptr("curr", curr);
    r.mark(curr, "compare");
    r.snap("curr = head", `Find the first node holding **${value}**. Doubly linked, so curr itself is enough — its \`prev\` gives us the node before it.`, { line: "curr", callout: "curr = head", vars: { value } });
    while (curr && r.v(curr) !== value) {
      r.badge(curr, `≠ ${value}`, "warn");
      r.snap(`${r.v(curr)} ≠ ${value}`, "Not this one — keep walking.", { line: ["walk", "test"], callout: `curr.data (${r.v(curr)}) ≠ ${value}`, vars: { value, "curr.data": r.v(curr) }, hold: 0.7 });
      r.mark(curr, "dim");
      r.unbadge(curr);
      curr = r.nx(curr);
      r.ptr("curr", curr);
      if (curr) r.mark(curr, "compare");
      r.snap(curr ? `curr = curr.next (${r.v(curr)})` : "curr = curr.next → NULL", curr ? "Move to the next node." : "We walked off the end.", {
        line: "step", callout: "curr = curr.next", vars: { value, "curr.data": curr ? r.v(curr) : null }, hold: 0.6,
      });
    }
    if (!curr) {
      r.markAll("base");
      r.snap(`${value} is not in the list`, `Checked every node and reached NULL without finding **${value}** — nothing to delete. (That full scan is the O(n) worst case.)`, { tone: "warn", line: "miss", vars: { value } });
      r.drop("curr");
      return false;
    }
    r.mark(curr, "danger");
    r.badge(curr, `= ${value}`, "danger");
    r.snap(`Found ${value}`, "This is the node to unlink.", { line: "test", callout: `curr.data == ${value}`, tone: "warn" });
    const p = r.pv(curr);
    const n = r.nx(curr);
    if (p) {
      r.setNext(p, n);
      r.move(curr, { lane: 1 });
      r.snap("curr.prev.next = curr.next", `**${r.v(p)}** skips over the node and points at **${n ? r.v(n) : "NULL"}**.`, { line: "prevIf", callout: "curr.prev.next = curr.next" });
    } else {
      r.ptr("head", n);
      r.move(curr, { lane: 1 });
      r.snap("curr.prev == NULL → head = curr.next", "It was the first node, so `head` moves forward instead.", { line: "headElse", callout: "head = curr.next" });
    }
    if (n) {
      r.setPrev(n, p);
      r.snap("curr.next.prev = curr.prev", `**${r.v(n)}** now points back at **${p ? r.v(p) : "NULL"}**.`, { line: "nextIf", callout: "curr.next.prev = curr.prev" });
    } else if (r.tailPtr) {
      r.ptr("tail", p);
      r.snap("curr was last → tail = curr.prev", "Keep the tail pointer valid.", { line: "tailElse", callout: "tail = curr.prev" });
    }
    r.unbadge(curr);
    freeNode(r, curr, "curr", "**O(n)**: the search dominates, the unlink is O(1).");
    return true;
  }

  r.mark(head, "compare");
  r.snap(`Is head.data == ${value}?`, "The head is a special case: there is no node before it whose `next` could change — `head` itself has to move.", {
    line: "isHead", callout: `head.data (${r.v(head)}) ${r.v(head) === value ? "==" : "≠"} ${value}`, vars: { value },
  });
  if (r.v(head) === value) {
    r.badge(head, `= ${value}`, "danger");
    r.snap(`Yes — ${value} is the head`, "Delegate to delete-at-head.", { line: "headCall", tone: "warn" });
    r.unbadge(head);
    return doDeleteHead(r);
  }
  r.mark(head, "dim");
  let prev = head;
  r.ptr("prev", prev);
  r.snap("prev = head", "We look one node ahead (`prev.next`) so that when we find the value, we're standing on the node whose `next` must change.", { line: "prev", callout: "prev = head", vars: { value } });
  while (!r.isEnd(r.nx(prev)) && r.v(r.nx(prev)) !== value) {
    const c = r.nx(prev)!;
    r.mark(c, "compare");
    r.badge(c, `≠ ${value}`, "warn");
    r.snap(`${r.v(c)} ≠ ${value}`, "Not a match — step forward.", { line: ["walk", "test"], callout: `prev.next.data (${r.v(c)}) ≠ ${value}`, vars: { value, "prev.next.data": r.v(c) }, hold: 0.7 });
    r.unbadge(c);
    r.mark(c, "dim");
    prev = c;
    r.ptr("prev", prev);
    r.snap(`prev = prev.next (${r.v(prev)})`, "Advance.", { line: "step", callout: "prev = prev.next", hold: 0.6 });
  }
  const end = r.circ ? "head" : "NULL";
  if (r.isEnd(r.nx(prev))) {
    r.markAll("base");
    r.snap(`${value} is not in the list`, `prev.next is ${end}: every node was checked and none holds **${value}**. Nothing is deleted.`, { tone: "warn", line: "miss", vars: { value } });
    r.drop("prev");
    return false;
  }
  const temp = r.nx(prev)!;
  r.ptr("temp", temp);
  r.mark(temp, "danger");
  r.badge(temp, `= ${value}`, "danger");
  r.snap(`Found ${value} → temp = prev.next`, `**${r.v(prev)}** is the node before it — exactly where we need to be.`, { line: ["test", "temp"], callout: `prev.next.data == ${value}`, tone: "warn" });
  const after = r.nx(temp);
  r.setNext(prev, after);
  r.move(temp, { lane: 1 });
  r.snap("prev.next = temp.next", `Bypass the node: **${r.v(prev)}** → **${r.isEnd(after) ? end : r.v(after)}**.`, { line: "bypass", callout: "prev.next = temp.next" });
  if (r.tailPtr && r.tail === temp) {
    r.ptr("tail", prev);
    r.snap("temp was the tail → tail = prev", "Keep the tail pointer valid.", { line: "tail", callout: "tail = prev" });
  }
  r.unbadge(temp);
  freeNode(r, temp, "temp", "**O(n)**: the search dominates, the unlink is O(1).");
  return true;
}
