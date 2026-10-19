"use client";

import { VALUE_MAX, VALUE_MIN } from "@/config/input";
import { useAgentTools } from "@/lib/hooks/useAgentTools";
import type { AgentTool } from "@/lib/webmcp";
import { MAX_KEYS, ORDERS } from "./constants";
import type { BTreeEngine } from "./engine/BTreeEngine";
import { btreeSummary, explainDelete, explainInsert, FIX_TEXT, searchTrail, traversalVisits, type BTreeTraversal } from "./model/agent";
import { BTree, type ReplaceStrategy } from "./model/btree";
import { treeFrom } from "./model/shape";
import { settle } from "./useBTreeEngine";

/*
 * WebMCP tools for the B-tree page. Mutating tools compute their answer on a copy of the settled
 * tree with the same pure model the engine animates, start the animation and reply at once.
 */

const MAX_BATCH = 20;
const MAX_LOAD = 60;
const TRAVERSALS: readonly BTreeTraversal[] = ["inorder", "levelorder"];
const LOADING = "The visualizer is still loading. Try again in a moment.";
const KEY = { type: "integer", minimum: VALUE_MIN, maximum: VALUE_MAX } as const;
const ORDER = { type: "integer", minimum: ORDERS[0], maximum: ORDERS[ORDERS.length - 1] } as const;

const isKey = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= VALUE_MIN && v <= VALUE_MAX;
const readKey = (v: unknown): number | string =>
  isKey(v) ? v : `Error: key must be an integer between ${VALUE_MIN} and ${VALUE_MAX}.`;
function readKeys(v: unknown, min: number, max: number): number[] | string {
  if (!Array.isArray(v) || v.length < min || v.length > max || !v.every(isKey)) {
    return `Error: keys must be a list of ${min}–${max} integers between ${VALUE_MIN} and ${VALUE_MAX}.`;
  }
  return v;
}
const readOrder = (v: unknown): number | null => (ORDERS as readonly unknown[]).includes(v) ? (v as number) : null;
const fmt = (keys: readonly number[]) => `[${keys.join(", ")}]`;

interface Options {
  /** The engine, if it exists yet. */
  engine: () => BTreeEngine | undefined;
  /** Awaitable undo / redo; resolves with the operation's label or null. */
  travel: (dir: "undo" | "redo") => Promise<string | null>;
  /** Replacement rule for internal keys (the page's "Internal delete" setting). */
  strategy: ReplaceStrategy;
}

export function useBTreeAgentTools({ engine, travel, strategy }: Options) {
  /** Finish any running animation, so answers describe a settled tree. */
  const settled = async () => {
    const e = engine();
    if (e) await settle(e);
    return e;
  };

  const tools: AgentTool[] = [
    {
      name: "tree_insert",
      description:
        "Insert integer keys into the B-tree on screen, one after another, animating the walk down to a leaf and every node split " +
        "(the median moves up; a root split makes the tree taller). Duplicates are skipped. Returns the number of splits and the resulting tree level by level.",
      inputSchema: {
        type: "object",
        properties: { keys: { type: "array", items: KEY, minItems: 1, maxItems: MAX_BATCH, description: "Keys to insert, in this order, e.g. [36, 37]." } },
        required: ["keys"],
        additionalProperties: false,
      },
      execute: async (args) => {
        const keys = readKeys(args.keys, 1, MAX_BATCH);
        if (typeof keys === "string") return keys;
        const e = await settled();
        if (!e) return LOADING;
        const t = treeFrom(e.snapshot());
        const added: number[] = [], dup: number[] = [], full: number[] = [];
        let splits = 0, grew = 0;
        for (const v of keys) {
          if (t.stats().keys >= MAX_KEYS) { full.push(v); continue; }
          const r = explainInsert(t, v);
          if (!r.inserted) { dup.push(v); continue; }
          added.push(v);
          splits += r.splits;
          if (r.grew) grew++;
        }
        void e.insert(keys);
        return [
          added.length ? `Inserting ${added.join(", ")} (animating on the canvas).` : "Nothing new to insert.",
          dup.length ? `Skipped, already in the tree: ${dup.join(", ")}.` : "",
          full.length ? `Skipped, the visualizer holds at most ${MAX_KEYS} keys: ${full.join(", ")}.` : "",
          added.length ? `Node splits: ${splits}${grew ? ` — the root split${grew > 1 ? ` ${grew} times` : ""}, so the tree grew taller` : ""}.` : "",
          btreeSummary(t),
        ].filter(Boolean).join("\n");
      },
    },
    {
      name: "tree_delete",
      description:
        "Delete one key from the B-tree and animate it: a key in a leaf is removed; an internal key is replaced by its predecessor or successor; " +
        "a node left below the minimum borrows from a sibling or merges with one, possibly up to the root. Returns each repair and the resulting tree.",
      inputSchema: {
        type: "object",
        properties: { key: { ...KEY, description: "The key to delete." } },
        required: ["key"],
        additionalProperties: false,
      },
      execute: async (args) => {
        const key = readKey(args.key);
        if (typeof key === "string") return key;
        const e = await settled();
        if (!e) return LOADING;
        const t = treeFrom(e.snapshot());
        const r = explainDelete(t, key, strategy);
        void e.delete([key]);
        if (!r.found) return `${key} is not in the B-tree, so nothing changed.`;
        return [
          `Deleting ${key} (animating).`,
          r.leaf || !r.replacement
            ? `${key} sat in a leaf, so it is removed directly.`
            : `${key} sat in an internal node, so its ${r.replacement.side} ${r.replacement.key} moves up from a leaf to take its place.`,
          r.fixes.length
            ? `Underflow repairs, bottom-up: ${r.fixes.map((f) => FIX_TEXT[f]).join("; then ")}.`
            : "No node fell below the minimum, so no repair was needed.",
          r.shrank ? "The root ran out of keys, so the tree lost a level." : "",
          btreeSummary(t),
        ].filter(Boolean).join("\n");
      },
    },
    {
      name: "tree_search",
      description:
        "Search the B-tree for a key and animate it: in each node find the first key ≥ the target, stop if equal, otherwise follow that child pointer. " +
        "Returns found / not found and the nodes read, root first. Does not change the tree.",
      inputSchema: {
        type: "object",
        properties: { key: { ...KEY, description: "The key to look for." } },
        required: ["key"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: async (args) => {
        const key = readKey(args.key);
        if (typeof key === "string") return key;
        const e = await settled();
        if (!e) return LOADING;
        const { found, nodes } = searchTrail(treeFrom(e.snapshot()), key);
        if (!nodes.length) return "The B-tree is empty.";
        void e.search([key]);
        const trail = nodes.map(fmt).join(" → ");
        return found
          ? `Found ${key} at depth ${nodes.length - 1} after reading ${nodes.length} node${nodes.length === 1 ? "" : "s"}: ${trail}.`
          : `${key} is not in the B-tree. Read ${trail} and stopped at a leaf with no child to follow.`;
      },
    },
    {
      name: "tree_traversal",
      description:
        "Walk the B-tree and animate every visit. inorder = child 0, key 0, child 1, key 1, … (sorted output); levelorder = node by node from the root, level by level. Returns the visit order.",
      inputSchema: {
        type: "object",
        properties: { order: { type: "string", enum: TRAVERSALS, description: "Which traversal to run." } },
        required: ["order"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: async (args) => {
        const kind = TRAVERSALS.find((k) => k === args.order);
        if (!kind) return `Error: order must be one of ${TRAVERSALS.join(", ")}.`;
        const e = await settled();
        if (!e) return LOADING;
        const keys = traversalVisits(treeFrom(e.snapshot()), kind).map((v) => v.key.v);
        if (!keys.length) return "The B-tree is empty — there is nothing to visit.";
        void e.traverse(kind);
        return `${kind === "inorder" ? "In-order" : "Level-order"} traversal (animating): ${keys.join(", ")}.`;
      },
    },
    {
      name: "get_tree",
      description:
        "Describe the B-tree on screen: order and node limits, number of keys and nodes, height, fill, and every node level by level. A running animation is finished instantly first.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: async () => {
        const e = await settled();
        if (!e) return LOADING;
        const rule = strategy === "auto" ? "whichever side can spare a key" : strategy;
        return `${btreeSummary(treeFrom(e.snapshot()))}\nInternal keys are deleted by replacing them with: ${rule}.`;
      },
    },
    {
      name: "undo",
      description: "Undo the last operation that changed the B-tree (insert, delete, order change, load, clear); the previous tree is restored at once. Returns what was undone and the tree now on screen.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: async () => {
        const e = engine();
        if (!e) return LOADING;
        const label = await travel("undo");
        return label ? `Undid "${label}".\n${btreeSummary(treeFrom(e.snapshot()))}` : "Nothing to undo.";
      },
    },
    {
      name: "redo",
      description: "Redo the B-tree operation that was last undone. Returns what was re-applied and the tree now on screen.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: async () => {
        const e = engine();
        if (!e) return LOADING;
        const label = await travel("redo");
        return label ? `Redid "${label}".\n${btreeSummary(treeFrom(e.snapshot()))}` : "Nothing to redo.";
      },
    },
    {
      name: "set_order",
      description:
        `Change the order m (${ORDERS[0]}–${ORDERS[ORDERS.length - 1]}): each node then holds at most m − 1 keys and m children, and every non-root node at least ⌈m/2⌉ − 1 keys. ` +
        "The current keys are re-inserted level by level. Returns the rebuilt tree.",
      inputSchema: {
        type: "object",
        properties: { order: { ...ORDER, description: "New order m, e.g. 4 for a 2-3-4 tree." } },
        required: ["order"],
        additionalProperties: false,
      },
      execute: async (args) => {
        const order = readOrder(args.order);
        if (order === null) return `Error: order must be an integer from ${ORDERS[0]} to ${ORDERS[ORDERS.length - 1]}.`;
        const e = await settled();
        if (!e) return LOADING;
        if (e.order === order) return `The tree already has order ${order}.\n${btreeSummary(treeFrom(e.snapshot()))}`;
        const t = new BTree(order);
        treeFrom(e.snapshot()).levelOrderKeys().forEach((k) => t.insert(k.v));
        void e.setOrder(order);
        return `Rebuilding as an order-${order} B-tree (animating).\n${btreeSummary(t)}`;
      },
    },
    {
      name: "load_tree",
      description:
        "Replace the whole B-tree: insert these keys in this order into an empty tree (optionally with a new order m) and show it at once. " +
        "An empty list gives an empty tree. Undo brings the old tree back. Returns the new tree level by level.",
      inputSchema: {
        type: "object",
        properties: {
          keys: { type: "array", items: KEY, minItems: 0, maxItems: MAX_LOAD, description: "Keys in insertion order, e.g. [10, 20, 30, 40, 50]." },
          order: { ...ORDER, description: "Order m for the new tree; omit to keep the current order." },
        },
        required: ["keys"],
        additionalProperties: false,
      },
      execute: async (args) => {
        const keys = readKeys(args.keys, 0, MAX_LOAD);
        if (typeof keys === "string") return keys;
        const order = args.order === undefined ? undefined : readOrder(args.order);
        if (order === null) return `Error: order must be an integer from ${ORDERS[0]} to ${ORDERS[ORDERS.length - 1]}.`;
        const e = await settled();
        if (!e) return LOADING;
        const t = new BTree(order ?? e.order);
        keys.forEach((k) => t.insert(k));
        void e.build(keys, keys.length ? "Built a B-tree" : "Empty tree", undefined, t.order);
        return btreeSummary(t);
      },
    },
  ];

  useAgentTools(tools);
}
