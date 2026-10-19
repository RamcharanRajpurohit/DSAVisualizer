/*
 * Entry point of the linked-list engine: validates a request, records the operation step by step and
 * returns the steps plus the list it leaves behind. Pure TypeScript (runnable under tsx for fuzzing).
 */
import { codeBug, codeInsertAt, codeInsertHead, codeInsertTail, doBugDemo, doInsertAt, doInsertHead, doInsertTail } from "./insert";
import { codeDeleteAt, codeDeleteValue, doDeleteAt, doDeleteHead, doDeleteTail, doDeleteValue } from "./remove";
import { codeCycle, codeMerge, doCycle, doDedupe, doMiddle, doReverse, doSearch, recordMerge } from "./algorithms";
import { codeStruct, describe, KIND_NAME, recordBuild, recordClear, recordKind, recordTailPtr } from "./manage";
import { MAX_NODES, Rec, type Code } from "./rec";
import type { ListState, OpId, OpRequest, Recording } from "./types";

export { MAX_NODES, listFrom } from "./rec";
export { KIND_NAME } from "./manage";
export * from "./types";

export const MAX_MERGE = 7;

const done = (r: Rec, op: OpId, label: string, keep?: ListState): Recording => ({ op, label, steps: r.steps, final: keep ?? r.final() });

/** A one-step recording that explains why an operation can't run (shown in the status card, never alert()). */
export function invalid(state: ListState, title: string, detail: string, c?: Code, tone: "danger" | "warn" = "danger"): Recording {
  const r = new Rec(state, c ?? codeStruct(state.kind, state.tailPtr));
  r.snap(title, detail, { tone });
  return done(r, "invalid", title, state);
}

/** The page's opening picture. */
export function idle(state: ListState, title?: string, extra?: string): Recording {
  const r = new Rec(state);
  describe(r, title, extra);
  return done(r, "idle", "Ready");
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

export function record(state: ListState, req: OpRequest): Recording {
  const n = state.nodes.length;
  const kindName = KIND_NAME[state.kind].toLowerCase();

  switch (req.op) {
    case "build": {
      if (req.values.length > MAX_NODES) {
        return invalid(state, `Too many values (${req.values.length})`, `This visualizer keeps lists at **${MAX_NODES} nodes or fewer** so every node and pointer stays readable.`);
      }
      const r = recordBuild(state, req.values, req.label);
      return done(r, "build", req.label ? `Preset: ${req.label}` : "Build");
    }
    case "clear":
      return done(recordClear(state), "clear", "Clear");
    case "kind":
      return done(recordKind(state, req.kind), "kind", `Convert to ${KIND_NAME[req.kind].toLowerCase()}`);
    case "tailPtr":
      return done(recordTailPtr(state, req.on), "tailPtr", req.on ? "Add tail pointer" : "Drop tail pointer");

    case "insertHead":
    case "insertTail":
    case "insertAt": {
      const c = req.op === "insertHead" ? codeInsertHead(state.kind, state.tailPtr)
        : req.op === "insertTail" ? codeInsertTail(state.kind, state.tailPtr) : codeInsertAt(state.kind, state.tailPtr);
      if (n >= MAX_NODES) {
        return invalid(state, `The list is full (${MAX_NODES} nodes)`, `A real linked list can grow until memory runs out, but this visualizer stops at **${MAX_NODES}** so everything stays readable. Delete something first.`, c, "warn");
      }
      const values = req.values.slice(0, MAX_NODES - n);
      const r = new Rec(state, c);
      let index = 0;
      if (req.op === "insertAt") {
        if (req.index === null) {
          index = Math.floor(n / 2);
          r.snap(`No index given → using the middle (index ${index})`, `Valid positions are **0 to ${n}**: 0 puts the node before the head, ${n} after the tail. Type an index to choose another spot.`, {
            vars: { index, n },
          });
        } else if (req.index < 0 || req.index > n) {
          return invalid(state, `Index ${req.index} is out of range`, `With ${plural(n, "node")}, a new node can go at positions **0 to ${n}** (0 = new head, ${n} = after the tail). There's no node ${req.index - 1} to attach it after.`, c);
        } else index = req.index;
      }
      values.forEach((v, k) => {
        if (req.op === "insertHead") doInsertHead(r, v);
        else if (req.op === "insertTail") doInsertTail(r, v);
        else doInsertAt(r, index + k, v);
      });
      if (values.length < req.values.length) {
        r.snap(`List full — skipped ${req.values.length - values.length} value${req.values.length - values.length === 1 ? "" : "s"}`, `Only ${values.length} of the ${req.values.length} values fit under the ${MAX_NODES}-node limit.`, { tone: "warn" });
      }
      const where = req.op === "insertHead" ? "at head" : req.op === "insertTail" ? "at tail" : `at index ${index}`;
      return done(r, req.op, `Insert ${values.join(", ")} ${where}`);
    }

    case "deleteHead":
    case "deleteTail": {
      const r = new Rec(state);
      if (req.op === "deleteHead") doDeleteHead(r); else doDeleteTail(r);
      return done(r, req.op, req.op === "deleteHead" ? "Delete head" : "Delete tail");
    }
    case "deleteAt": {
      const c = codeDeleteAt(state.kind, state.tailPtr);
      if (!n) return invalid(state, "Can't delete — the list is empty", "`head` is NULL: there is no node at any index.", c);
      const r = new Rec(state, c);
      let index: number;
      if (req.index === null) {
        index = Math.floor((n - 1) / 2);
        r.snap(`No index given → deleting the middle node (index ${index})`, `Valid indices are **0 to ${n - 1}**. Type an index to pick a different node.`, { vars: { index, n } });
      } else if (req.index < 0 || req.index >= n) {
        return invalid(state, `Index ${req.index} is out of range`, `The list has ${plural(n, "node")}, numbered **0 to ${n - 1}**. Following \`next\` ${req.index} times from the head would run past the end${state.kind === "circular" ? " (or wrap around the ring)" : " into NULL"}.`, c);
      } else index = req.index;
      doDeleteAt(r, index);
      return done(r, "deleteAt", `Delete index ${index}`);
    }
    case "deleteValue": {
      const r = new Rec(state, codeDeleteValue(state.kind, state.tailPtr));
      for (const v of req.values) doDeleteValue(r, v);
      return done(r, "deleteValue", `Delete ${req.values.join(", ")}`);
    }
    case "search": {
      const r = new Rec(state);
      for (const v of req.values) doSearch(r, v);
      return done(r, "search", `Search ${req.values.join(", ")}`);
    }
    case "reverse": {
      const r = new Rec(state);
      doReverse(r);
      return done(r, "reverse", "Reverse in place");
    }
    case "middle": {
      const r = new Rec(state);
      doMiddle(r);
      return done(r, "middle", "Find middle (slow / fast)");
    }
    case "cycle": {
      if (req.to !== null && (req.to < 0 || req.to >= n)) {
        return invalid(state, `No node at index ${req.to}`, `The demo cycle links the last node back to one of the **${n}** existing nodes (index 0 to ${n - 1}).`, codeCycle());
      }
      const r = new Rec(state);
      doCycle(r, state.kind === "circular" ? null : req.to);
      return done(r, "cycle", "Floyd's cycle detection", state);
    }
    case "dedupe": {
      const r = new Rec(state);
      doDedupe(r);
      return done(r, "dedupe", "Remove duplicates");
    }
    case "merge": {
      const c = codeMerge(state.kind);
      if (state.kind === "circular") {
        return invalid(state, "Merge needs NULL-terminated lists", `The classic merge stops when \`a\` or \`b\` reaches NULL — a ${kindName} never does. Switch to singly or doubly to try it.`, c, "warn");
      }
      if (req.a.length > MAX_MERGE || req.b.length > MAX_MERGE) {
        return invalid(state, `At most ${MAX_MERGE} values per list`, `Two lists of up to ${MAX_MERGE} nodes keep the merged result readable.`, c);
      }
      if (!req.a.length && !req.b.length) return invalid(state, "Nothing to merge", "Enter values for list A and/or list B.", c, "warn");
      const sorted = (xs: number[]) => xs.every((x, i) => i === 0 || xs[i - 1] <= x);
      const a = [...req.a].sort((x, y) => x - y);
      const b = [...req.b].sort((x, y) => x - y);
      const r = recordMerge(state, a, b);
      if (!sorted(req.a) || !sorted(req.b)) {
        r.steps[0] = { ...r.steps[0], detail: `${r.steps[0].detail}\n(Your input wasn't in order, so it was sorted first — merging only works on sorted lists.)` };
      }
      return done(r, "merge", "Merge two sorted lists");
    }
    case "bug": {
      const c = codeBug();
      if (!n) return invalid(state, "Build a list first", "The wrong-order demo needs at least one node to insert after.", c, "warn");
      const index = req.index ?? Math.max(1, Math.floor(n / 2));
      if (index < 1 || index > n) {
        return invalid(state, `Index ${index} is out of range for this demo`, `Pick an index from **1 to ${n}** (the demo inserts after node index − 1).`, c);
      }
      const r = new Rec(state, c);
      doBugDemo(r, index, req.value);
      // Rewind: show the untouched list again.
      const back = new Rec(state, c);
      back.snap("That's why the order matters", "Rewound to the original list. The safe order is:\n1. `new.next = curr.next` — the new node grabs the rest of the list.\n2. `curr.next = new` — only then hook it in.\nWith that order the rest of the list is reachable at every moment.", {
        tone: "ok", line: ["fix1", "fix2"], hold: 1.6,
      });
      return { op: "bug", label: "Bug demo: wrong pointer order", steps: [...r.steps, ...back.steps], final: state };
    }
  }
}

