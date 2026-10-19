import { code, fmtList, Rec, type Code } from "./rec";
import type { ListKind, ListState } from "./types";

// ───────────────────────────── search ─────────────────────────────

export function codeSearch(kind: ListKind): Code {
  if (kind === "circular") {
    return code([
      "search(value):",
      ["empty", "  if head == NULL: return -1"],
      ["init", "  curr = head; i = 0"],
      ["do", "  do:"],
      ["cmp", "    if curr.data == value: return i"],
      ["step", "    curr = curr.next; i = i + 1"],
      ["loop", "  while curr != head"],
      ["miss", "  return -1"],
    ], { op: "search", kind, tailPtr: false });
  }
  return code([
    "search(value):",
    ["init", "  curr = head; i = 0"],
    ["loop", "  while curr != NULL:"],
    ["cmp", "    if curr.data == value: return i"],
    ["step", "    curr = curr.next; i = i + 1"],
    ["miss", "  return -1"],
  ], { op: "search", kind, tailPtr: false });
}

export function doSearch(r: Rec, value: number): number {
  r.use(codeSearch(r.kind));
  r.markAll("base");
  r.unbadge();
  const head = r.head;
  if (!head) {
    r.snap(`Search for ${value}: the list is empty`, "`head` is NULL — there is nothing to look at, so the answer is -1.", { tone: "warn", line: r.circ ? "empty" : "loop", vars: { value } });
    return -1;
  }
  let curr: string | null = head;
  let i = 0;
  r.ptr("curr", curr);
  r.mark(curr, "compare");
  r.snap(`Search for ${value}`, "Linear search is the only option: nodes are scattered in memory and each one only knows the address of the next. Start at the head.", {
    line: "init", callout: "curr = head", vars: { value, i },
  });
  do {
    const v = r.v(curr);
    if (v === value) {
      r.mark(curr, "success");
      r.badge(curr, `= ${value} ✓`, "ok");
      r.snap(`Found ${value} at index ${i}`, `curr.data == ${value}. It took **${i + 1} comparison${i ? "s" : ""}** — the best case is O(1) (value at the head), the worst case O(n).`, {
        tone: "ok", line: "cmp", callout: `curr.data (${v}) == ${value}`, vars: { value, i, "curr.data": v }, hold: 1.5,
      });
      r.drop("curr");
      return i;
    }
    r.badge(curr, `≠ ${value}`, "warn");
    r.snap(`${v} ≠ ${value}`, `Index ${i} doesn't hold ${value}.`, { line: "cmp", callout: `curr.data (${v}) ≠ ${value}`, vars: { value, i, "curr.data": v }, hold: 0.75 });
    r.unbadge(curr);
    r.mark(curr, "dim");
    curr = r.nx(curr);
    i++;
    const wrapped = r.circ && curr === head;
    r.ptr("curr", wrapped ? head : curr);
    if (curr && !wrapped) r.mark(curr, "compare");
    r.snap(curr && !wrapped ? `curr = curr.next (${r.v(curr)})` : wrapped ? "curr = curr.next → back at head" : "curr = curr.next → NULL", curr && !wrapped
      ? `Follow the pointer to index ${i}.`
      : wrapped ? "We've gone all the way around the ring — every node has been checked." : "We fell off the end of the list.", {
      line: r.circ ? ["step", "loop"] : ["step", "loop"], callout: "curr = curr.next", vars: { value, i, "curr.data": curr && !wrapped ? r.v(curr) : null }, hold: 0.6,
    });
    if (wrapped) break;
  } while (curr);
  r.markAll("base");
  r.snap(`${value} is not in the list → -1`, `Checked all ${i} node${i === 1 ? "" : "s"}. Unsuccessful search always costs the full **O(n)**.`, {
    tone: "warn", line: "miss", vars: { value, i }, hold: 1.4,
  });
  r.drop("curr");
  return -1;
}

// ───────────────────────────── reverse ─────────────────────────────

export function codeReverse(kind: ListKind, tailPtr: boolean): Code {
  if (kind === "circular") {
    return code([
      "reverse():",
      ["empty", "  if head == NULL: return"],
      ...(tailPtr
        ? [["prev", "  prev = tail       # last node"] as const]
        : [["prev", "  prev = last node  # walk ring"] as const]),
      ["curr", "  curr = head"],
      tailPtr && ["tail", "  tail = head"],
      ["do", "  do:"],
      ["save", "    next = curr.next"],
      ["flip", "    curr.next = prev"],
      ["adv1", "    prev = curr"],
      ["adv2", "    curr = next"],
      ["loop", "  while curr != head"],
      ["head", "  head = prev"],
    ], { op: "reverse", kind, tailPtr });
  }
  return code([
    "reverse():",
    ["prev", "  prev = NULL"],
    ["curr", "  curr = head"],
    tailPtr && ["tail", "  tail = head"],
    ["loop", "  while curr != NULL:"],
    ["save", "    next = curr.next  # save rest"],
    ["flip", "    curr.next = prev  # flip!"],
    kind === "doubly" && ["flipPrev", "    curr.prev = next"],
    ["adv1", "    prev = curr"],
    ["adv2", "    curr = next"],
    ["head", "  head = prev"],
  ], { op: "reverse", kind, tailPtr });
}

export function doReverse(r: Rec) {
  r.use(codeReverse(r.kind, r.tailPtr));
  r.markAll("base");
  const head = r.head;
  const n = r.size;
  if (!head) {
    r.snap("Nothing to reverse", "The list is empty — `head` is NULL. An empty list is its own reverse.", { tone: "warn", line: r.circ ? "empty" : "loop" });
    return;
  }
  const before = r.values();
  let prev: string | null = null;
  if (r.circ) {
    if (r.tailPtr && r.tail) {
      prev = r.tail;
      r.ptr("prev", prev);
      r.snap("prev = tail", "In a circular list the head's `next` must end up pointing at the **last** node (that's what closes the reversed ring), so `prev` starts there.", { line: "prev", callout: "prev = tail" });
    } else {
      prev = r.walk().at(-1)!;
      r.ptr("prev", prev);
      r.snap("prev = last node", `\`prev\` starts at the last node (**${r.v(prev)}**) — found by walking the ring, O(n) — so that the head's flipped arrow closes the reversed ring.`, { line: "prev", callout: "prev = last" });
    }
  } else {
    r.ptr("prev", null, { line: 0, slot: -0.62, lane: 0 });
    r.snap("prev = NULL", "`prev` holds the reversed part (empty, so NULL), `curr` the node being flipped, `next` the rest. The old head will end up last.", {
      line: "prev", callout: "prev = NULL", vars: { flipped: 0, n },
    });
  }
  let curr: string | null = head;
  r.ptr("curr", curr);
  r.mark(curr, "active");
  r.snap("curr = head", "Begin with the first node.", { line: "curr", callout: "curr = head", vars: { flipped: 0, n } });
  if (r.tailPtr) {
    r.ptr("tail", head);
    r.snap("tail = head", "After reversing, today's first node will be the last one, so the tail pointer can move there right away.", { line: "tail", callout: "tail = head" });
  }
  let flipped = 0;
  do {
    const next: string | null = r.nx(curr!);
    r.ptr("next", next);
    if (next && next !== head) r.mark(next, "compare");
    r.snap("next = curr.next", next && !(r.circ && next === head)
      ? `Save the rest of the list (from **${r.v(next)}**) before we overwrite curr.next — otherwise it would be unreachable.`
      : r.circ ? "curr.next is the head: this is the last node of the ring." : "curr.next is NULL: this is the last node.", {
      line: "save", callout: "next = curr.next", vars: { flipped, n },
    });
    r.setNext(curr!, prev);
    r.snap(`curr.next = prev → ${r.v(curr)} now points ${prev ? `at ${r.v(prev)}` : "at NULL"}`, prev
      ? `**Flip the arrow:** ${r.v(curr)} used to point forward${next ? ` to ${r.v(next)}` : ""}; now it points back at ${r.v(prev)}.`
      : `**Flip the arrow:** the old head becomes the end of the reversed list, so its next is NULL.`, {
      line: "flip", callout: "curr.next = prev", vars: { flipped: flipped + 1, n },
    });
    if (r.dbl) {
      r.setPrev(curr!, next);
      r.snap("curr.prev = next", `Doubly linked: swap the other direction too — ${r.v(curr)}'s \`prev\` now points ${next ? `at ${r.v(next)}` : "at NULL"}.`, {
        line: "flipPrev", callout: "curr.prev = next", vars: { flipped: flipped + 1, n },
      });
    }
    flipped++;
    r.mark(curr, "visited");
    prev = curr;
    curr = next;
    r.ptr("prev", prev);
    const done = curr === null || (r.circ && curr === head);
    r.ptr("curr", curr);
    if (curr && !done) r.mark(curr, "active");
    r.drop("next");
    r.snap(done ? "Advance — curr has run out of nodes" : `Advance: prev = ${r.v(prev)}, curr = ${r.v(curr)}`, done
      ? r.circ ? "curr is back at the head: every arrow in the ring has been flipped." : "curr is NULL: every arrow has been flipped."
      : `Both pointers move one node forward. ${flipped} of ${n} arrows flipped.`, {
      line: ["adv1", "adv2"], callout: "prev = curr; curr = next", vars: { flipped, n },
      hold: 0.8,
    });
  } while (curr !== null && !(r.circ && curr === head));
  r.ptr("head", prev);
  r.drop("curr");
  r.snap("head = prev", `\`prev\` is sitting on the old last node (**${r.v(prev)}**), which is the new first node.`, { line: "head", callout: "head = prev", vars: { flipped, n } });
  r.drop("prev");
  r.markAll("base");
  r.relayout();
  r.snap("Reversed!", `Each node visited once (**O(n)** time) with three pointers (**O(1)** space).\n**${fmtList(before)}** became **${fmtList(r.values())}**`, {
    tone: "ok", line: "head", hold: 1.6, vars: { flipped, n },
  });
}

// ───────────────────────────── find middle ─────────────────────────────

export function codeMiddle(kind: ListKind): Code {
  const circ = kind === "circular";
  return code([
    "findMiddle():",
    ["init", "  slow = head; fast = head"],
    ["loop", circ ? "  while fast.next != head and" : "  while fast != NULL and"],
    ["loop", circ ? "        fast.next.next != head:" : "        fast.next != NULL:"],
    ["slow", "    slow = slow.next       # +1"],
    ["fast", "    fast = fast.next.next  # +2"],
    ["ret", "  return slow"],
  ], { op: "middle", kind, tailPtr: false });
}

export function doMiddle(r: Rec) {
  r.use(codeMiddle(r.kind));
  r.markAll("base");
  r.unbadge();
  const head = r.head;
  const n = r.size;
  if (!head) {
    r.snap("No middle — the list is empty", "`head` is NULL.", { tone: "warn", line: "init" });
    return;
  }
  let slow = head;
  let fast: string | null = head;
  r.ptr("slow", slow);
  r.ptr("fast", fast);
  r.mark(head, "active");
  r.snap("slow = fast = head", "**Tortoise & hare:** fast moves two nodes per step, slow one. When fast reaches the end, slow is at the middle.", {
    line: "init", callout: "slow = head; fast = head", vars: { iteration: 0 },
  });
  let it = 0;
  const cont = () => r.circ
    ? r.nx(fast!) !== head && r.nx(r.nx(fast!)) !== head
    : fast !== null && r.nx(fast) !== null;
  while (cont()) {
    it++;
    r.mark(slow, "visited");
    slow = r.nx(slow)!;
    r.ptr("slow", slow);
    r.mark(slow, "left");
    r.snap(`slow → ${r.v(slow)}`, "slow takes one step.", { line: ["loop", "slow"], callout: "slow = slow.next", vars: { iteration: it }, hold: 0.7 });
    fast = r.nx(r.nx(fast)!);
    r.ptr("fast", fast);
    if (fast) r.mark(fast, "right");
    r.snap(fast ? `fast → ${r.v(fast)}` : "fast → NULL", fast ? "fast jumps two nodes." : "fast jumped off the end.", {
      line: "fast", callout: "fast = fast.next.next", vars: { iteration: it },
    });
  }
  const why = r.circ
    ? "fast can't make two more steps without wrapping back to the head."
    : fast === null ? "fast is NULL (even number of nodes)." : "fast.next is NULL — fast is on the last node (odd number of nodes).";
  r.markAll("base");
  r.mark(slow, "success");
  r.badge(slow, "middle", "ok");
  const idx = r.walk().indexOf(slow);
  r.snap(`Middle is ${r.v(slow)} (index ${idx})`, `Loop ends: ${why}${n % 2 === 0 ? ` With ${n} nodes this returns the ${r.circ ? "first" : "second"} of the two middles.` : ""}`, {
    tone: "ok", line: "ret", vars: { iteration: it, n, index: idx }, hold: 1.6,
  });
  r.drop("slow", "fast");
  r.unbadge();
  r.markAll("base");
}

// ───────────────────────────── Floyd cycle detection ─────────────────────────────

export function codeCycle(): Code {
  return code([
    "detectCycle():",
    ["init", "  slow = head; fast = head"],
    ["loop", "  while fast != NULL and"],
    ["loop", "        fast.next != NULL:"],
    ["slow", "    slow = slow.next"],
    ["fast", "    fast = fast.next.next"],
    ["meet", "    if slow == fast: break"],
    ["none", "  if they never met: no cycle"],
    ["reset", "  slow = head"],
    ["p2", "  while slow != fast:  # 1 step each"],
    ["p2step", "    slow = slow.next"],
    ["p2step", "    fast = fast.next"],
    ["ret", "  return slow   # cycle start"],
  ], { op: "cycle", kind: "singly", tailPtr: false });
}

export function doCycle(r: Rec, to: number | null) {
  r.use(codeCycle());
  r.markAll("base");
  r.unbadge();
  const ids = r.walk();
  const head = r.head;
  if (!head) {
    r.snap("No cycle in an empty list", "`head` is NULL.", { tone: "warn", line: "init" });
    return;
  }
  let lastId: string | null = null;
  if (r.circ) {
    r.snap("A circular list is one big cycle", "Every node's `next` eventually leads back to the head. Let's watch Floyd's algorithm discover that on its own.", { tone: "merge", line: "init" });
  } else if (to !== null) {
    lastId = ids[ids.length - 1];
    const target = ids[to];
    r.setNext(lastId, target);
    r.mark(target, "merge");
    r.snap(`Demo setup: last.next = node ${to} (${r.v(target)})`, `The last node (**${r.v(lastId)}**) now points back at index ${to} instead of NULL. A naive traversal would loop forever.`, {
      tone: "merge", callout: `last.next = node ${to}`,
    });
    r.mark(target, "base");
  }
  let slow = head;
  let fast: string | null = head;
  r.ptr("slow", slow);
  r.ptr("fast", fast);
  r.snap("slow = fast = head", "**Tortoise & hare:** fast moves 2 nodes per step, slow 1. With no cycle fast hits NULL; with one, fast laps slow and they meet.", {
    line: "init", callout: "slow = head; fast = head",
  });
  let it = 0;
  let met = false;
  while (fast !== null && r.nx(fast) !== null) {
    it++;
    slow = r.nx(slow)!;
    fast = r.nx(r.nx(fast)!);
    r.ptr("slow", slow);
    r.ptr("fast", fast);
    r.markAll("base");
    r.mark(slow, "left");
    if (fast) r.mark(fast, "right");
    met = fast === slow;
    if (met) {
      r.mark(slow, "success");
      r.badge(slow, "meet", "ok");
    }
    r.snap(met ? `slow == fast at ${r.v(slow)} → cycle!` : `slow → ${r.v(slow)}, fast → ${fast ? r.v(fast) : "NULL"}`, met
      ? `After ${it} step${it === 1 ? "" : "s"} the hare caught the tortoise. That's only possible if the path loops back on itself.`
      : fast ? "Inside a cycle the gap between them shrinks by one node every step, so a meeting is guaranteed." : "fast ran off the end.", {
      line: met ? ["slow", "fast", "meet"] : ["loop", "slow", "fast"], tone: met ? "ok" : "info", callout: met ? "slow == fast" : "slow += 1, fast += 2", vars: { step: it },
      hold: met ? 1.3 : 0.8,
    });
    if (met) break;
  }
  if (!met) {
    r.markAll("base");
    r.snap("No cycle", `fast reached NULL after ${it} step${it === 1 ? "" : "s"}, so the list ends — it's a normal NULL-terminated list. **O(n)** time, **O(1)** space.`, {
      tone: "ok", line: "none", vars: { step: it },
    });
    r.drop("slow", "fast");
    return;
  }
  slow = head;
  r.ptr("slow", slow);
  r.markAll("base");
  r.mark(fast, "right");
  r.mark(slow, "left");
  r.snap("Phase 2: slow = head", "Restart slow at the head and move **both one step at a time**. They meet exactly where the cycle begins.", {
    line: "reset", callout: "slow = head", tone: "merge",
  });
  let p2 = 0;
  while (slow !== fast) {
    p2++;
    slow = r.nx(slow)!;
    fast = r.nx(fast!)!;
    r.ptr("slow", slow);
    r.ptr("fast", fast);
    r.markAll("base");
    r.mark(slow, "left");
    r.mark(fast, "right");
    if (slow === fast) r.mark(slow, "success");
    r.snap(slow === fast ? `They meet at ${r.v(slow)}` : `slow → ${r.v(slow)}, fast → ${r.v(fast)}`, slow === fast ? "Both arrived at the same node." : "Same speed now: one step each.", {
      line: ["p2", "p2step"], callout: "slow = slow.next; fast = fast.next", vars: { phase2: p2 }, hold: 0.8,
    });
  }
  const start = slow;
  const cyc: string[] = [];
  for (let c: string = start; ; ) { cyc.push(c); c = r.nx(c)!; if (c === start) break; }
  r.markAll("base");
  r.markAll("merge", cyc);
  r.mark(start, "success");
  r.badge(start, "cycle start", "ok");
  r.snap(`Cycle starts at ${r.v(start)} · length ${cyc.length}`, `The cycle is **${cyc.map((c) => r.v(c)).join(" → ")} → ${r.v(start)}**. Total work O(n), extra memory O(1) — just two pointers.`, {
    tone: "ok", line: "ret", vars: { "cycle length": cyc.length, "start index": ids.indexOf(start) }, hold: 1.6,
  });
  r.drop("slow", "fast");
  r.unbadge();
  r.markAll("base");
  if (lastId) {
    r.setNext(lastId, null);
    r.snap("Undo the demo: last.next = NULL", "The list is restored so other operations can run.", { tone: "muted" });
  }
}

// ───────────────────────────── remove duplicates ─────────────────────────────

export function codeDedupe(kind: ListKind, tailPtr: boolean): Code {
  const end = kind === "circular" ? "head" : "NULL";
  return code([
    "removeDuplicates():",
    ["empty", "  if head == NULL: return"],
    ["init", "  seen = { head.data }"],
    ["prev", "  prev = head; curr = head.next"],
    ["loop", `  while curr != ${end}:`],
    ["test", "    if curr.data in seen:"],
    ["bypass", "      prev.next = curr.next"],
    kind === "doubly" && ["back", "      if curr.next != NULL:"],
    kind === "doubly" && ["back", "        curr.next.prev = prev"],
    tailPtr && ["tail", "      if curr == tail: tail = prev"],
    ["free", "      free(curr)"],
    ["else", "    else:"],
    ["add", "      seen.add(curr.data)"],
    ["add", "      prev = curr"],
    ["step", "    curr = prev.next"],
  ], { op: "dedupe", kind, tailPtr });
}

export function doDedupe(r: Rec) {
  r.use(codeDedupe(r.kind, r.tailPtr));
  r.markAll("base");
  r.unbadge();
  const head = r.head;
  if (!head) {
    r.snap("Nothing to do — the list is empty", "`head` is NULL.", { tone: "warn", line: "empty" });
    return;
  }
  const seen = new Set<number>([r.v(head)]);
  const fmtSeen = () => `{${[...seen].join(", ")}}`;
  r.mark(head, "visited");
  r.snap("seen = { head.data }", `A hash set remembers the values kept so far — O(1) per lookup, so one pass is **O(n)**.`, {
    line: "init", vars: { seen: fmtSeen(), removed: 0 },
  });
  let prev = head;
  let curr: string | null = r.nx(head);
  r.ptr("prev", prev);
  r.ptr("curr", curr);
  const end = (c: string | null) => c === null || (r.circ && c === head);
  if (!end(curr)) r.mark(curr, "compare");
  r.snap("prev = head; curr = head.next", "`prev` trails one node behind `curr`, so we can unlink curr if it's a duplicate.", { line: "prev", vars: { seen: fmtSeen(), removed: 0 } });
  let removed = 0;
  while (!end(curr)) {
    const v = r.v(curr);
    if (seen.has(v)) {
      r.mark(curr, "danger");
      r.badge(curr, "dup", "danger");
      r.snap(`${v} is already in seen → duplicate`, `We've kept a **${v}** earlier, so this one goes.`, { line: "test", callout: `${v} in seen → yes`, tone: "warn", vars: { seen: fmtSeen(), removed } });
      const after = r.nx(curr!);
      r.setNext(prev, after);
      r.move(curr!, { lane: 1 });
      r.snap("prev.next = curr.next", `Bypass the duplicate: **${r.v(prev)}** → **${end(after) ? (r.circ ? "head" : "NULL") : r.v(after)}**.`, { line: "bypass", callout: "prev.next = curr.next", vars: { seen: fmtSeen(), removed } });
      if (r.dbl && after) {
        r.setPrev(after, prev);
        r.snap("curr.next.prev = prev", `**${r.v(after)}** points back at ${r.v(prev)}.`, { line: "back", callout: "curr.next.prev = prev" });
      }
      if (r.tailPtr && r.tail === curr) {
        r.ptr("tail", prev);
        r.snap("curr was the tail → tail = prev", "Keep the tail pointer valid.", { line: "tail", callout: "tail = prev" });
      }
      r.free(curr!);
      removed++;
      r.relayout();
      r.snap(`free(curr) — removed a ${v}`, "Close the gap.", { line: "free", vars: { seen: fmtSeen(), removed } });
    } else {
      seen.add(v);
      r.mark(curr, "visited");
      r.badge(curr, "new value", "ok");
      r.snap(`${v} not seen yet → keep it`, `Add **${v}** to the set and move prev forward.`, { line: ["test", "else", "add"], callout: `${v} in seen → no`, vars: { seen: fmtSeen(), removed } });
      r.unbadge(curr);
      prev = curr!;
      r.ptr("prev", prev);
    }
    curr = r.nx(prev);
    r.ptr("curr", curr);
    if (!end(curr)) r.mark(curr, "compare");
    r.snap(end(curr) ? `curr = prev.next → ${r.circ ? "head" : "NULL"}` : `curr = prev.next (${r.v(curr)})`, end(curr) ? "That was the last node." : "Look at the next node.", {
      line: "step", callout: "curr = prev.next", vars: { seen: fmtSeen(), removed }, hold: 0.6,
    });
  }
  r.drop("prev", "curr");
  r.markAll("base");
  r.relayout();
  r.snap(removed ? `Removed ${removed} duplicate${removed === 1 ? "" : "s"}` : "No duplicates found", `List: **${fmtList(r.values())}**. **O(n)** time, **O(n)** extra space for the set.`, {
    tone: "ok", line: "loop", vars: { seen: fmtSeen(), removed }, hold: 1.5,
  });
}

// ───────────────────────────── merge two sorted lists ─────────────────────────────

export function codeMerge(kind: ListKind): Code {
  const dbl = kind === "doubly";
  return code([
    "merge(a, b):          # both sorted",
    ["dummy", "  dummy = Node(); tail = dummy"],
    ["loop", "  while a != NULL and b != NULL:"],
    ["cmp", "    if a.data <= b.data:"],
    ["takeA", "      tail.next = a; a = a.next"],
    ["else", "    else:"],
    ["takeB", "      tail.next = b; b = b.next"],
    dbl && ["back", "    tail.next.prev = tail"],
    ["adv", "    tail = tail.next"],
    ["rest", "  tail.next = (a != NULL) ? a : b"],
    dbl && ["restPrev", "  if tail.next != NULL:"],
    dbl && ["restPrev", "    tail.next.prev = tail"],
    ["head", "  head = dummy.next"],
    dbl && ["headPrev", "  if head != NULL:"],
    dbl && ["headPrev", "    head.prev = NULL"],
    ["free", "  free(dummy)"],
  ], { op: "merge", kind: kind === "doubly" ? "doubly" : "singly", tailPtr: false });
}

export function recordMerge(state: ListState, aVals: number[], bVals: number[]): Rec {
  const kind: ListKind = state.kind === "circular" ? "singly" : state.kind;
  const r = new Rec({ kind, tailPtr: false, nodes: [], seq: state.seq }, codeMerge(kind));
  r.direct = true;
  r.drop("head");
  const mk = (vals: number[], line: number) => {
    const ids = vals.map((v, i) => r.alloc(v, { line, slot: i, lane: 0 }));
    ids.forEach((id, i) => {
      r.next[id] = ids[i + 1] ?? null;
      r.prev[id] = kind === "doubly" ? (ids[i - 1] ?? null) : null;
      r.marks[id] = line === 0 ? "left" : "right";
    });
    return ids;
  };
  const A = mk(aVals, 0);
  const B = mk(bVals, 1);
  let a: string | null = A[0] ?? null;
  let b: string | null = B[0] ?? null;
  r.ptr("a", a, { line: 0, slot: 0, lane: 0 });
  r.ptr("b", b, { line: 1, slot: 0, lane: 0 });
  r.snap("Two sorted lists", `**A = ${fmtList(aVals)}** and **B = ${fmtList(bVals)}**. Their nodes are spliced into one sorted list by rewiring \`next\` — no new nodes.`, {
    tone: "merge", vars: { "|A|": aVals.length, "|B|": bVals.length },
  });
  const dummy = r.alloc(0, { line: 2, slot: 0, lane: 0 }, "dummy");
  r.marks[dummy] = "dim";
  r.ptr("dummy", dummy);
  let tail = dummy;
  r.ptr("tail", tail);
  r.snap("dummy = Node(); tail = dummy", "A **dummy** (sentinel) node gives the result list a fixed starting point, so appending the very first node isn't a special case. `tail` always marks the end of the merged list.", {
    line: "dummy", callout: "tail = dummy",
  });
  let k = 1;
  let taken = 0;
  const attach = (id: string, from: "a" | "b") => {
    r.setNext(tail, id);
    r.snap(`tail.next = ${from} (${r.v(id)})`, `Link the smaller node onto the end of the merged list.`, { line: from === "a" ? "takeA" : "takeB", callout: `tail.next = ${from}` });
    if (kind === "doubly") {
      r.setPrev(id, tail);
      r.snap("tail.next.prev = tail", `Doubly linked: ${r.v(id)} points back at ${tail === dummy ? "the dummy" : r.v(tail)}.`, { line: "back", callout: "tail.next.prev = tail" });
    }
  };
  while (a && b) {
    const av = r.v(a);
    const bv = r.v(b);
    r.mark(a, "compare");
    r.mark(b, "compare");
    const takeA = av <= bv;
    r.snap(`${av} ${takeA ? "≤" : ">"} ${bv} → take from ${takeA ? "A" : "B"}`, takeA
      ? `a.data ≤ b.data. (Using ≤ rather than < keeps equal values in their original order — the merge is **stable**.)`
      : `b.data is smaller, so B's node goes next.`, {
      line: takeA ? "cmp" : ["cmp", "else"], callout: `a.data (${av}) ${takeA ? "<=" : ">"} b.data (${bv})`, vars: { merged: taken },
    });
    const id: string = takeA ? a : b;
    r.mark(takeA ? b : a, takeA ? "right" : "left");
    attach(id, takeA ? "a" : "b");
    if (takeA) { a = r.nx(a); r.ptr("a", a, { line: 0, slot: aVals.length, lane: 0 }); }
    else { b = r.nx(b); r.ptr("b", b, { line: 1, slot: bVals.length, lane: 0 }); }
    tail = id;
    r.ptr("tail", tail);
    r.move(id, { line: 2, slot: k++, lane: 0 });
    r.mark(id, "success");
    taken++;
    r.snap(`${takeA ? "a" : "b"} = ${takeA ? "a" : "b"}.next; tail = tail.next`, `${r.v(id)} is now part of the merged list (drawn on the bottom row). Its old \`next\` still points into ${takeA ? "A" : "B"} — that gets overwritten when the next node is attached.`, {
      line: [takeA ? "takeA" : "takeB", "adv"], callout: "tail = tail.next", vars: { merged: taken }, hold: 0.9,
    });
  }
  const rest = a ?? b;
  const restName = a ? "a" : "b";
  if (rest) {
    r.setNext(tail, rest);
    if (kind === "doubly") r.setPrev(rest, tail);
    r.snap(`${a ? "B" : "A"} is used up → tail.next = ${restName}`, `The rest of ${a ? "A" : "B"} is sorted and larger, so **one pointer write** attaches it all.${kind === "doubly" ? " Its first node's `prev` points back at the tail." : ""}`, {
      line: kind === "doubly" ? ["rest", "restPrev"] : "rest", callout: `tail.next = ${restName}`, vars: { merged: taken },
    });
    for (const id of r.walk(rest)) { r.move(id, { line: 2, slot: k++, lane: 0 }); r.mark(id, "success"); }
    r.drop("a", "b");
    r.snap("The merged chain is complete", `dummy → ${fmtList(r.walk(r.nx(dummy)).map((id) => r.v(id)))} → NULL`, { line: "rest", vars: { merged: aVals.length + bVals.length } });
  } else {
    r.drop("a", "b");
  }
  const first = r.nx(dummy);
  r.ptr("head", first);
  r.snap("head = dummy.next", "The real list starts right after the dummy.", { line: "head", callout: "head = dummy.next" });
  if (kind === "doubly" && first) {
    r.setPrev(first, null);
    r.snap("head.prev = NULL", "The first node must not point back at the dummy, which is about to be freed.", { line: "headPrev", callout: "head.prev = NULL" });
  }
  r.free(dummy);
  r.drop("tail", "dummy");
  r.direct = false;
  r.markAll("base");
  r.relayout();
  if (state.tailPtr) {
    r.tailPtr = true;
    r.ptr("tail", r.walk().at(-1) ?? null);
  }
  const total = aVals.length + bVals.length;
  r.snap(`Merged ${total} nodes`, `Result: **${fmtList(r.values())}**. One comparison and one pointer write per node: **O(n + m)** time, **O(1)** space.`, {
    tone: "ok", line: "free", hold: 1.6, vars: { n: total },
  });
  return r;
}
