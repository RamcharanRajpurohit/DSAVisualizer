"use client";

import { VALUE_MAX, VALUE_MIN } from "@/config/input";
import { useAgentTools } from "@/lib/hooks/useAgentTools";
import type { AgentTool } from "@/lib/webmcp";
import { AVL_DEMOS, type DemoId } from "../constants";
import type { AVLEngine } from "../engine/AVLEngine";
import { TRAVERSAL_NAME, type BSTEngine } from "../engine/BSTEngine";
import { deleteCase, searchPath, treeSummary } from "../model/describe";
import { avlInsertSilent, deleteKey, insertKey, keysInOrder, nodeFactory, traversalOrder } from "../model/tree";
import type { TraversalKind, TreeNode } from "../model/types";

/*
 * WebMCP tools for the BST and AVL pages: an agent can build, change and query the tree on screen.
 * Mutating tools compute their result on a copy of the settled tree (the same pure model the
 * engine animates), start the animation and answer immediately with the outcome.
 */

const MAX_BATCH = 20;
const MAX_LOAD = 40;
const ORDERS: readonly TraversalKind[] = ["inorder", "preorder", "postorder", "levelorder"];
const ROTATION_CASES: readonly DemoId[] = ["LL", "RR", "LR", "RL"];
const LOADING = "The visualizer is still loading. Try again in a moment.";
const KEY = { type: "integer", minimum: VALUE_MIN, maximum: VALUE_MAX } as const;

const isKey = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= VALUE_MIN && v <= VALUE_MAX;

function readKey(v: unknown): number | string {
  return isKey(v) ? v : `Error: key must be an integer between ${VALUE_MIN} and ${VALUE_MAX}.`;
}

function readKeys(v: unknown, min: number, max: number): number[] | string {
  if (!Array.isArray(v) || v.length < min || v.length > max || !v.every(isKey)) {
    return `Error: keys must be a list of ${min}–${max} integers between ${VALUE_MIN} and ${VALUE_MAX}.`;
  }
  return v;
}

const plain = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1");

/** Registers the tree tools for as long as the page is mounted. `extra` adds page-specific tools. */
export function useTreeAgentTools(engine: BSTEngine | null, avl: boolean, extra: readonly AgentTool[] = []) {
  const name = avl ? "AVL tree" : "binary search tree";

  /** Finish a running animation instantly, so answers describe a settled tree. */
  const settled = async (): Promise<BSTEngine | null> => {
    if (!engine) return null;
    await engine.interrupt();
    return engine;
  };

  /** Insert keys into a copy of `root` exactly as the engine will. */
  const simulateInserts = (root: TreeNode | null, keys: readonly number[]) => {
    const make = nodeFactory("sim");
    const added: number[] = [], skipped: number[] = [];
    let rotations = 0;
    for (const k of keys) {
      const r = insertKey(root, k, make, avl);
      root = r.root;
      (r.inserted ? added : skipped).push(k);
      rotations += r.rotations;
    }
    return { root, added, skipped, rotations };
  };

  const tools: AgentTool[] = [
    {
      name: "tree_insert",
      description:
        `Insert integer keys into the ${name} on screen, one after another, animating each walk down the tree` +
        (avl ? ", the height / balance-factor retrace and any LL, RR, LR or RL rotation" : "") +
        `. Duplicates are skipped. Returns the inserted keys${avl ? ", how many rotations ran" : ""} and the resulting tree (size, height, level order).`,
      inputSchema: {
        type: "object",
        properties: {
          keys: { type: "array", items: KEY, minItems: 1, maxItems: MAX_BATCH, description: "Keys to insert, in this order, e.g. [42, 17, 63]." },
        },
        required: ["keys"],
        additionalProperties: false,
      },
      execute: async (args) => {
        const keys = readKeys(args.keys, 1, MAX_BATCH);
        if (typeof keys === "string") return keys;
        const e = await settled();
        if (!e) return LOADING;
        const r = simulateInserts(e.stableTree(), keys);
        void e.insert(keys);
        return [
          r.added.length ? `Inserting ${r.added.join(", ")} (animating on the canvas).` : "Nothing new to insert.",
          r.skipped.length ? `Skipped, already in the tree: ${r.skipped.join(", ")}.` : "",
          avl ? `Rotations: ${r.rotations}.` : "",
          treeSummary(r.root, avl),
        ].filter(Boolean).join("\n");
      },
    },
    {
      name: "tree_delete",
      description:
        `Delete one key from the ${name} and animate it: the search, then the leaf, one-child or two-children case ` +
        "(a node with two children is replaced by its in-order successor)" + (avl ? ", then the rebalancing rotations" : "") +
        ". Returns the case and the resulting tree. Nothing changes when the key is absent.",
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
        const root = e.stableTree();
        const kase = deleteCase(root, key);
        void e.remove([key]);
        if (!kase) return `${key} is not in the tree, so nothing was deleted. Keys: ${keysInOrder(root).join(", ") || "none"}.`;
        const r = deleteKey(root, key, avl);
        return [`Deleting ${key} (animating). Case: ${kase}.`, avl ? `Rebalancing rotations: ${r.rotations}.` : "", treeSummary(r.root, avl)]
          .filter(Boolean).join("\n");
      },
    },
    {
      name: "tree_search",
      description:
        `Search the ${name} for a key and animate the walk from the root (smaller → left, larger → right). ` +
        "Returns whether it was found and the comparison path, e.g. 50 → 30 → 40. Does not change the tree.",
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
        const { found, path } = searchPath(e.stableTree(), key);
        void e.search([key]);
        if (found) return `Found ${key} after ${path.length} comparison${path.length === 1 ? "" : "s"}: ${path.join(" → ")}.`;
        return path.length
          ? `${key} is not in the tree. Compared ${path.join(" → ")}, then reached an empty child — exactly where ${key} would be inserted.`
          : "The tree is empty.";
      },
    },
    {
      name: "tree_traversal",
      description:
        `Run a traversal of the ${name} and animate every visit. inorder = left, node, right (sorted output on a search tree); ` +
        "preorder = node, left, right; postorder = left, right, node; levelorder = breadth-first, level by level. Returns the visit order.",
      inputSchema: {
        type: "object",
        properties: { order: { type: "string", enum: ORDERS, description: "Which traversal to run." } },
        required: ["order"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: async (args) => {
        const kind = ORDERS.find((o) => o === args.order);
        if (!kind) return `Error: order must be one of ${ORDERS.join(", ")}.`;
        const e = await settled();
        if (!e) return LOADING;
        const keys = traversalOrder(e.stableTree(), kind).map((n) => n.key);
        if (!keys.length) return "The tree is empty — there is nothing to visit.";
        void e.traverse(kind);
        return `${TRAVERSAL_NAME[kind]} traversal (animating): ${keys.join(", ")}.` +
          (kind === "inorder" ? " In-order output of a search tree is always sorted." : "");
      },
    },
    {
      name: "get_tree",
      description:
        `Describe the ${name} on screen: size, height, root, keys level by level, and the pre-order list that rebuilds the exact shape. ` +
        "A running animation is finished instantly first.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: async () => {
        const e = await settled();
        if (!e) return LOADING;
        const h = e.historyInfo();
        return `${treeSummary(e.stableTree(), avl)}\nUndo: ${h.undoLabel ?? "nothing"} · Redo: ${h.redoLabel ?? "nothing"}.`;
      },
    },
    {
      name: "undo",
      description: `Undo the last operation that changed the ${name} (insert, delete, load, clear); the previous tree is restored instantly. Returns what was undone and the tree now on screen.`,
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: async () => {
        const e = await settled();
        if (!e) return LOADING;
        const label = e.historyInfo().undoLabel;
        if (!e.undo()) return "Nothing to undo.";
        return `Undid "${label}".\n${treeSummary(e.stableTree(), avl)}`;
      },
    },
    {
      name: "redo",
      description: `Redo the operation that was last undone on the ${name}. Returns what was re-applied and the tree now on screen.`,
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: async () => {
        const e = await settled();
        if (!e) return LOADING;
        const label = e.historyInfo().redoLabel;
        if (!e.redo()) return "Nothing to redo.";
        return `Redid "${label}".\n${treeSummary(e.stableTree(), avl)}`;
      },
    },
    {
      name: "load_tree",
      description:
        `Replace the whole ${name}: insert these keys in this order into an empty tree ` +
        (avl ? "(AVL inserts, so it comes out balanced)" : "(plain BST inserts, so the order decides the shape — sorted keys give a chain)") +
        ". Builds instantly with a short glide; an empty list clears the tree. Undo brings the old tree back. Returns the new tree.",
      inputSchema: {
        type: "object",
        properties: {
          keys: { type: "array", items: KEY, minItems: 0, maxItems: MAX_LOAD, description: "Keys in insertion order, e.g. [50, 30, 70, 20, 40]. [] clears the tree." },
        },
        required: ["keys"],
        additionalProperties: false,
      },
      execute: async (args) => {
        const keys = readKeys(args.keys, 0, MAX_LOAD);
        if (typeof keys === "string") return keys;
        const e = await settled();
        if (!e) return LOADING;
        if (!keys.length) {
          e.clear();
          return "Cleared the tree.";
        }
        const r = simulateInserts(null, keys);
        void e.preload(keys, { title: `Built a tree from ${r.added.length} keys`, tone: "ok" });
        return (r.skipped.length ? `Duplicates ignored: ${r.skipped.join(", ")}.\n` : "") + treeSummary(r.root, avl);
      },
    },
    ...extra,
  ];

  useAgentTools(tools);
}

/** AVL page only: play one of the scripted rotation demos. */
export function avlDemoTool(engine: AVLEngine | null): AgentTool {
  return {
    name: "play_rotation_demo",
    description:
      "Load a small AVL tree and play one rotation case step by step: LL (single right rotation), RR (single left rotation), " +
      "LR (left rotation at the child, then right rotation) or RL (right rotation at the child, then left rotation). Returns the starting tree, the trigger, the fix and the balanced result.",
    inputSchema: {
      type: "object",
      properties: { case: { type: "string", enum: ROTATION_CASES, description: "Which imbalance case to demonstrate." } },
      required: ["case"],
      additionalProperties: false,
    },
    execute: async (args) => {
      const id = ROTATION_CASES.find((d) => d === args.case);
      if (!id) return "Error: case must be one of LL, RR, LR, RL.";
      if (!engine) return LOADING;
      await engine.interrupt();
      const D = AVL_DEMOS[id];
      const make = nodeFactory("demo");
      let root: TreeNode | null = null;
      for (const k of D.base) root = avlInsertSilent(root, k, make);
      const r = D.op === "insert" ? insertKey(root, D.value, make, true) : deleteKey(root, D.value, true);
      void engine.demo(id);
      return `${D.title} (animating): start from [${D.base.join(", ")}], then ${D.op} ${D.value}. ${plain(D.intro)}\n` +
        `Rotations: ${r.rotations}.\n${treeSummary(r.root, true)}`;
    },
  };
}
