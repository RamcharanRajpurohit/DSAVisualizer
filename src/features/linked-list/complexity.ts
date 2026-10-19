import type { ComplexityRow, LegendItem } from "@/components/visualizer";
import { MARK, PTR_COLOR } from "./constants";
import type { ListKind } from "./engine/types";

export function complexityRows(kind: ListKind, tailPtr: boolean): ComplexityRow[] {
  const circNoTail = kind === "circular" && !tailPtr;
  return [
    { op: "Access [i]", best: "O(1)", worst: "O(n)", space: "O(1)" },
    { op: "Search", best: "O(1)", worst: "O(n)", space: "O(1)" },
    { op: "Insert head", worst: circNoTail ? "O(n)" : "O(1)", space: "O(1)" },
    { op: "Insert tail", worst: tailPtr ? "O(1)" : "O(n)", space: "O(1)" },
    { op: "Insert at i", best: "O(1)", worst: "O(n)", space: "O(1)" },
    { op: "Delete head", worst: circNoTail ? "O(n)" : "O(1)", space: "O(1)" },
    { op: "Delete tail", worst: kind === "doubly" && tailPtr ? "O(1)" : "O(n)", space: "O(1)" },
    { op: "Delete i / value", best: "O(1)", worst: "O(n)", space: "O(1)" },
    { op: "Reverse", worst: "O(n)", space: "O(1)" },
    { op: "Middle / cycle", worst: "O(n)", space: "O(1)" },
    { op: "Remove dups", worst: "O(n)", space: "O(n)" },
    { op: "Merge sorted", worst: "O(n+m)", space: "O(1)" },
  ];
}

export function complexityNote(kind: ListKind, tailPtr: boolean): string {
  if (kind === "doubly") {
    return tailPtr
      ? "Doubly + tail pointer: both ends are O(1) — prev lets delete-tail step back without a walk. Cost: one extra pointer per node."
      : "Without a tail pointer, reaching the end still needs an O(n) walk.";
  }
  if (kind === "circular") {
    return tailPtr
      ? "With tail, head is just tail.next — inserting or deleting at either end only rewires a couple of pointers."
      : "Circular without a tail pointer: even head operations walk the ring, because the last node's next must be updated.";
  }
  return tailPtr
    ? "Insert at tail is O(1) with the tail pointer, but delete-tail stays O(n): a singly linked list can't step back to the node before the tail."
    : "Turn on the tail pointer to make insert-at-tail O(1).";
}

export const LEGEND: LegendItem[] = [
  { label: "Node", color: MARK.base[0], stroke: MARK.base[1] },
  { label: "New node", color: MARK.new[0], stroke: MARK.new[1] },
  { label: "Current (curr)", color: MARK.active[0], stroke: MARK.active[1] },
  { label: "Comparing", color: MARK.compare[0], stroke: MARK.compare[1] },
  { label: "Found / done", color: MARK.success[0], stroke: MARK.success[1] },
  { label: "Deleting", color: MARK.danger[0], stroke: MARK.danger[1] },
  { label: "Visited / passed", color: MARK.visited[0], stroke: MARK.visited[1] },
  { label: "Unreachable", color: "#FDDEDE", stroke: "#DC2626" },
  { label: "slow / left", color: MARK.left[0], stroke: MARK.left[1] },
  { label: "fast / right", color: MARK.right[0], stroke: MARK.right[1] },
  { label: "next pointer", color: PTR_COLOR.next, kind: "line" },
  { label: "prev pointer", color: PTR_COLOR.prev, kind: "line" },
  { label: "Just written", color: PTR_COLOR.hot, kind: "line" },
  { label: "Removed", color: PTR_COLOR.removed, kind: "dashed" },
];
