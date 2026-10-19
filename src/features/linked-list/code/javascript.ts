/* JavaScript listings — same statements, order and names as the pseudocode (new → newNode; the GC frees nodes). */
import { L, type Ctx, type LangGen } from "./shared";

const end = (c: Ctx) => (c.circ ? "this.head" : "null");

/** Walk `name` from head to the last node (`name.next === END`). */
const walkToLast = (name: string, c: Ctx) => [
  `  let ${name} = this.head;`,
  `  while (${name}.next !== ${end(c)}) ${name} = ${name}.next;`,
];

const EMPTY_ERROR = '  if (this.head === null) throw new Error("empty list");';

/** free(x): nothing to do in JS — once unreachable, the node is garbage-collected. */
const gc = (name: string, pad = "  ") => `${pad}// free(${name}): the GC reclaims it`;

export const javascript: LangGen = {
  listClose: "}",
  memberIndent: 2,

  node: (c) => L(
    "class Node {",
    "  constructor(data) {",
    "    this.data = data;",
    c.dbl && "    this.prev = null; // previous node",
    "    this.next = null; // next node",
    "  }",
    "}",
  ),

  listOpen: (c) => L(
    "class LinkedList {",
    "  constructor() {",
    "    this.head = null; // first node",
    c.tailPtr && "    this.tail = null; // last node",
    c.circ && "    // invariant: last.next === this.head",
    "  }",
  ),

  method(op, c) {
    const { dbl, circ, tailPtr } = c;
    switch (op) {
      case "build":
        return L(
          "build(values) {",
          tailPtr ? "  this.head = this.tail = null;" : "  this.head = null;",
          "  for (const v of values) this.insertAtTail(v);",
          "}",
        );

      case "clear":
        return L(
          "clear() {",
          "  // The GC frees nodes nothing points to",
          "  // (rings included): dropping the",
          "  // references is enough.",
          tailPtr ? "  this.head = this.tail = null;" : "  this.head = null;",
          "}",
        );

      case "findTail":
        if (!tailPtr) return null;
        return L(
          "findTail() { // keep a pointer to the last node",
          "  this.tail = this.head;",
          "  if (this.tail === null) return;",
          `  while (this.tail.next !== ${end(c)})`,
          "    this.tail = this.tail.next;",
          "}",
        );

      case "insertHead":
        if (circ) {
          return L(
            "insertAtHead(value) {",
            "  const newNode = new Node(value);",
            "  if (this.head === null) {",
            "    newNode.next = newNode; // ring of one",
            tailPtr ? "    this.head = this.tail = newNode;" : "    this.head = newNode;",
            "    return;",
            "  }",
            "  newNode.next = this.head;",
            tailPtr ? "  const last = this.tail; // O(1)" : walkToLast("last", c),
            "  last.next = newNode;",
            "  this.head = newNode;",
            "}",
          );
        }
        return L(
          "insertAtHead(value) {",
          "  const newNode = new Node(value);",
          "  newNode.next = this.head;",
          dbl && "  if (this.head !== null) this.head.prev = newNode;",
          "  this.head = newNode;",
          tailPtr && "  if (this.tail === null) this.tail = newNode;",
          "}",
        );

      case "insertTail":
        return L(
          "insertAtTail(value) {",
          "  const newNode = new Node(value);",
          "  if (this.head === null) {",
          circ && "    newNode.next = newNode;",
          tailPtr ? "    this.head = this.tail = newNode;" : "    this.head = newNode;",
          "    return;",
          "  }",
          circ && "  newNode.next = this.head; // keep ring",
          tailPtr
            ? [
                dbl && "  newNode.prev = this.tail; // O(1)",
                dbl ? "  this.tail.next = newNode;" : "  this.tail.next = newNode; // O(1)",
                "  this.tail = newNode;",
              ]
            : [
                ...walkToLast("curr", c),
                "  curr.next = newNode;",
              ],
          "}",
        );

      case "insertAt":
        return L(
          "insertAt(index, value) {",
          "  // assumes 0 <= index <= size",
          "  if (index === 0) return this.insertAtHead(value);",
          "  let curr = this.head;",
          "  for (let i = 1; i <= index - 1; i++) curr = curr.next;",
          "  const newNode = new Node(value);",
          "  newNode.next = curr.next; // 1st",
          dbl && [
            "  newNode.prev = curr;",
            "  if (curr.next !== null) curr.next.prev = newNode;",
          ],
          "  curr.next = newNode;      // 2nd",
          tailPtr && "  if (curr === this.tail) this.tail = newNode;",
          "}",
        );

      case "deleteHead":
        if (circ) {
          return L(
            "deleteHead() {",
            EMPTY_ERROR,
            "  if (this.head.next === this.head) { // 1 node",
            tailPtr ? "    this.head = this.tail = null;" : "    this.head = null;",
            "    return;",
            "  }",
            tailPtr ? "  const last = this.tail;" : walkToLast("last", c),
            "  const temp = this.head;",
            "  this.head = this.head.next;",
            "  last.next = this.head;",
            gc("temp"),
            "}",
          );
        }
        return L(
          "deleteHead() {",
          EMPTY_ERROR,
          "  const temp = this.head;",
          "  this.head = this.head.next;",
          dbl && "  if (this.head !== null) this.head.prev = null;",
          tailPtr && "  if (this.head === null) this.tail = null;",
          gc("temp"),
          "}",
        );

      case "deleteTail":
        if (dbl) { // doubly always keeps tail (keepsTail): O(1) via tail.prev
          return L(
            "deleteTail() {",
            EMPTY_ERROR,
            "  const temp = this.tail; // O(1)",
            "  if (temp.prev === null) {",
            "    this.head = this.tail = null;",
            "  } else {",
            "    this.tail = temp.prev;",
            "    this.tail.next = null;",
            "  }",
            gc("temp"),
            "}",
          );
        }
        return L(
          "deleteTail() {",
          EMPTY_ERROR,
          `  if (this.head.next === ${end(c)}) { // 1 node`,
          tailPtr ? "    this.head = this.tail = null;" : "    this.head = null;",
          "    return;",
          "  }",
          "  let curr = this.head;",
          `  while (curr.next.next !== ${end(c)}) curr = curr.next;`,
          "  const temp = curr.next;",
          `  curr.next = ${end(c)};`,
          tailPtr && "  this.tail = curr;",
          gc("temp"),
          "}",
        );

      case "deleteAt":
        if (dbl) {
          return L(
            "deleteAt(index) {",
            "  // assumes 0 <= index < size",
            "  if (index === 0) return this.deleteHead();",
            "  let curr = this.head;",
            "  for (let i = 1; i <= index; i++) curr = curr.next;",
            "  curr.prev.next = curr.next;",
            "  if (curr.next !== null) curr.next.prev = curr.prev;",
            tailPtr && "  else this.tail = curr.prev;",
            gc("curr"),
            "}",
          );
        }
        return L(
          "deleteAt(index) {",
          "  // assumes 0 <= index < size",
          "  if (index === 0) return this.deleteHead();",
          "  let prev = this.head;",
          "  for (let i = 1; i <= index - 1; i++) prev = prev.next;",
          "  const temp = prev.next;",
          "  prev.next = temp.next;",
          tailPtr && "  if (temp === this.tail) this.tail = prev;",
          gc("temp"),
          "}",
        );

      case "deleteValue":
        if (dbl) {
          return L(
            "deleteValue(value) {",
            "  let curr = this.head;",
            "  while (curr !== null) {",
            "    if (curr.data === value) break;",
            "    curr = curr.next;",
            "  }",
            "  if (curr === null) return false; // not found",
            "  if (curr.prev !== null) curr.prev.next = curr.next;",
            "  else this.head = curr.next;",
            "  if (curr.next !== null) curr.next.prev = curr.prev;",
            tailPtr && "  else this.tail = curr.prev;",
            gc("curr"),
            "  return true;",
            "}",
          );
        }
        return L(
          "deleteValue(value) {",
          "  if (this.head === null) return false;",
          "  if (this.head.data === value) {",
          "    this.deleteHead();",
          "    return true;",
          "  }",
          "  let prev = this.head;",
          `  while (prev.next !== ${end(c)}) {`,
          "    if (prev.next.data === value) break;",
          "    prev = prev.next;",
          "  }",
          `  if (prev.next === ${end(c)}) return false; // not found`,
          "  const temp = prev.next;",
          "  prev.next = temp.next;",
          tailPtr && "  if (temp === this.tail) this.tail = prev;",
          gc("temp"),
          "  return true;",
          "}",
        );

      case "search":
        if (circ) {
          return L(
            "search(value) {",
            "  if (this.head === null) return -1;",
            "  let curr = this.head, i = 0;",
            "  do {",
            "    if (curr.data === value) return i;",
            "    curr = curr.next; i++;",
            "  } while (curr !== this.head);",
            "  return -1;",
            "}",
          );
        }
        return L(
          "search(value) {",
          "  let curr = this.head, i = 0;",
          "  while (curr !== null) {",
          "    if (curr.data === value) return i;",
          "    curr = curr.next; i++;",
          "  }",
          "  return -1;",
          "}",
        );

      case "reverse":
        if (circ) {
          return L(
            "reverse() {",
            "  if (this.head === null) return;",
            tailPtr ? "  let prev = this.tail; // last node" : [
              "  let prev = this.head; // find the last node",
              "  while (prev.next !== this.head) prev = prev.next;",
            ],
            "  let curr = this.head;",
            tailPtr && "  this.tail = this.head;",
            "  do {",
            "    const next = curr.next;",
            "    curr.next = prev;",
            "    prev = curr;",
            "    curr = next;",
            "  } while (curr !== this.head);",
            "  this.head = prev;",
            "}",
          );
        }
        return L(
          "reverse() {",
          "  let prev = null;",
          "  let curr = this.head;",
          tailPtr && "  this.tail = this.head;",
          "  while (curr !== null) {",
          "    const next = curr.next; // save rest",
          "    curr.next = prev;       // flip!",
          dbl && "    curr.prev = next;",
          "    prev = curr;",
          "    curr = next;",
          "  }",
          "  this.head = prev;",
          "}",
        );

      case "middle":
        if (circ) {
          return L(
            "findMiddle() {",
            "  if (this.head === null) return null;",
            "  let slow = this.head, fast = this.head;",
            "  while (fast.next !== this.head &&",
            "         fast.next.next !== this.head) {",
            "    slow = slow.next;      // +1",
            "    fast = fast.next.next; // +2",
            "  }",
            "  return slow;",
            "}",
          );
        }
        return L(
          "findMiddle() {",
          "  let slow = this.head, fast = this.head;",
          "  while (fast !== null && fast.next !== null) {",
          "    slow = slow.next;      // +1",
          "    fast = fast.next.next; // +2",
          "  }",
          "  return slow;",
          "}",
        );

      case "cycle":
        return L(
          "detectCycle() {",
          "  let slow = this.head, fast = this.head;",
          "  while (fast !== null && fast.next !== null) {",
          "    slow = slow.next;",
          "    fast = fast.next.next;",
          "    if (slow === fast) break;",
          "  }",
          "  if (fast === null || fast.next === null)",
          "    return null; // they never met: no cycle",
          "  slow = this.head;",
          "  while (slow !== fast) { // 1 step each",
          "    slow = slow.next;",
          "    fast = fast.next;",
          "  }",
          "  return slow; // cycle start",
          "}",
        );

      case "dedupe":
        return L(
          "removeDuplicates() {",
          "  if (this.head === null) return;",
          "  const seen = new Set([this.head.data]);",
          "  let prev = this.head, curr = this.head.next;",
          `  while (curr !== ${end(c)}) {`,
          "    if (seen.has(curr.data)) {",
          "      prev.next = curr.next;",
          dbl && "      if (curr.next !== null) curr.next.prev = prev;",
          tailPtr && "      if (curr === this.tail) this.tail = prev;",
          gc("curr", "      "),
          "    } else {",
          "      seen.add(curr.data);",
          "      prev = curr;",
          "    }",
          "    curr = prev.next;",
          "  }",
          "}",
        );

      case "merge":
        if (circ) return null;
        return L(
          "// a, b: heads of two sorted lists",
          "static merge(a, b) {",
          "  const dummy = new Node(0);",
          "  let tail = dummy;",
          "  while (a !== null && b !== null) {",
          "    if (a.data <= b.data) {",
          "      tail.next = a; a = a.next;",
          "    } else {",
          "      tail.next = b; b = b.next;",
          "    }",
          dbl && "    tail.next.prev = tail;",
          "    tail = tail.next;",
          "  }",
          "  tail.next = a !== null ? a : b;",
          dbl && "  if (tail.next !== null) tail.next.prev = tail;",
          "  const head = dummy.next;",
          dbl && "  if (head !== null) head.prev = null;",
          "  return head; // dummy is garbage-collected",
          "}",
        );

      case "bug":
        return L(
          "// ✗ WRONG pointer order — don't copy this!",
          "insertAfterWrong(index, value) {",
          "  let curr = this.head; // walk to node index-1",
          "  for (let i = 1; i <= index - 1; i++) curr = curr.next;",
          "  const newNode = new Node(value);",
          "  curr.next = newNode;      // ✗ 1st: rest is lost",
          "  newNode.next = curr.next; // ✗ === newNode itself!",
          "  // correct order:",
          "  //   newNode.next = curr.next;",
          "  //   curr.next = newNode;",
          "}",
        );
    }
  },
};
