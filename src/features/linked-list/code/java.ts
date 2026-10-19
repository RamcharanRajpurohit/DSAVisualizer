/* Java listings — same statements, order and names as the pseudocode (new → newNode; the GC frees nodes). */
import { L, type Ctx, type LangGen } from "./shared";

const end = (c: Ctx) => (c.circ ? "head" : "null");

/** Walk `name` from head to the last node (`name.next == END`). */
const walkToLast = (name: string, c: Ctx) => [
  `    Node ${name} = head;`,
  `    while (${name}.next != ${end(c)})`,
  `        ${name} = ${name}.next;`,
];

const EMPTY_ERROR = [
  "    if (head == null)",
  '        throw new IllegalStateException("empty list");',
];

/** free(x): nothing to do in Java — once unreachable, the node is garbage-collected. */
const gc = (name: string, pad = "    ") => `${pad}// free(${name}): the GC reclaims it`;

export const java: LangGen = {
  listClose: "}",
  memberIndent: 4,

  node: (c) => L(
    "class Node {",
    "    int data;",
    c.dbl && "    Node prev;  // previous node (null)",
    "    Node next;  // next node (null)",
    "    Node(int data) { this.data = data; }",
    "}",
  ),

  listOpen: (c) => L(
    "class LinkedList {",
    "    Node head;  // first node",
    c.tailPtr && "    Node tail;  // last node",
    c.circ && "    // invariant: last.next == head",
  ),

  method(op, c) {
    const { dbl, circ, tailPtr } = c;
    switch (op) {
      case "build":
        return L(
          "void build(int[] values) {",
          tailPtr ? "    head = tail = null;" : "    head = null;",
          "    for (int v : values)",
          "        insertAtTail(v);",
          "}",
        );

      case "clear":
        return L(
          "void clear() {",
          "    // The GC frees nodes nothing points to",
          "    // (rings included): dropping the",
          "    // references is enough.",
          tailPtr ? "    head = tail = null;" : "    head = null;",
          "}",
        );

      case "findTail":
        if (!tailPtr) return null;
        return L(
          "void findTail() {  // keep a pointer to the last node",
          "    tail = head;",
          "    if (tail == null)",
          "        return;",
          `    while (tail.next != ${end(c)})`,
          "        tail = tail.next;",
          "}",
        );

      case "insertHead":
        if (circ) {
          return L(
            "void insertAtHead(int value) {",
            "    Node newNode = new Node(value);",
            "    if (head == null) {",
            "        newNode.next = newNode;  // ring of one",
            tailPtr ? "        head = tail = newNode;" : "        head = newNode;",
            "        return;",
            "    }",
            "    newNode.next = head;",
            tailPtr ? "    Node last = tail;  // O(1)" : walkToLast("last", c),
            "    last.next = newNode;",
            "    head = newNode;",
            "}",
          );
        }
        return L(
          "void insertAtHead(int value) {",
          "    Node newNode = new Node(value);",
          "    newNode.next = head;",
          dbl && [
            "    if (head != null)",
            "        head.prev = newNode;",
          ],
          "    head = newNode;",
          tailPtr && [
            "    if (tail == null)",
            "        tail = newNode;",
          ],
          "}",
        );

      case "insertTail":
        return L(
          "void insertAtTail(int value) {",
          "    Node newNode = new Node(value);",
          "    if (head == null) {",
          circ && "        newNode.next = newNode;",
          tailPtr ? "        head = tail = newNode;" : "        head = newNode;",
          "        return;",
          "    }",
          circ && "    newNode.next = head;  // keep ring",
          tailPtr
            ? [
                dbl && "    newNode.prev = tail;  // O(1)",
                dbl ? "    tail.next = newNode;" : "    tail.next = newNode;  // O(1)",
                "    tail = newNode;",
              ]
            : [
                ...walkToLast("curr", c),
                "    curr.next = newNode;",
              ],
          "}",
        );

      case "insertAt":
        return L(
          "void insertAt(int index, int value) {",
          "    // assumes 0 <= index <= size",
          "    if (index == 0) {",
          "        insertAtHead(value);",
          "        return;",
          "    }",
          "    Node curr = head;",
          "    for (int i = 1; i <= index - 1; i++)",
          "        curr = curr.next;",
          "    Node newNode = new Node(value);",
          "    newNode.next = curr.next;  // 1st",
          dbl && [
            "    newNode.prev = curr;",
            "    if (curr.next != null)",
            "        curr.next.prev = newNode;",
          ],
          "    curr.next = newNode;       // 2nd",
          tailPtr && [
            "    if (curr == tail)",
            "        tail = newNode;",
          ],
          "}",
        );

      case "deleteHead":
        if (circ) {
          return L(
            "void deleteHead() {",
            EMPTY_ERROR,
            "    if (head.next == head) {  // 1 node",
            tailPtr ? "        head = tail = null;" : "        head = null;",
            "        return;",
            "    }",
            tailPtr ? "    Node last = tail;" : walkToLast("last", c),
            "    Node temp = head;",
            "    head = head.next;",
            "    last.next = head;",
            gc("temp"),
            "}",
          );
        }
        return L(
          "void deleteHead() {",
          EMPTY_ERROR,
          "    Node temp = head;",
          "    head = head.next;",
          dbl && [
            "    if (head != null)",
            "        head.prev = null;",
          ],
          tailPtr && [
            "    if (head == null)",
            "        tail = null;",
          ],
          gc("temp"),
          "}",
        );

      case "deleteTail":
        if (dbl) { // doubly always keeps tail (keepsTail): O(1) via tail.prev
          return L(
            "void deleteTail() {",
            EMPTY_ERROR,
            "    Node temp = tail;  // O(1)",
            "    if (temp.prev == null) {",
            "        head = tail = null;",
            "    } else {",
            "        tail = temp.prev;",
            "        tail.next = null;",
            "    }",
            gc("temp"),
            "}",
          );
        }
        return L(
          "void deleteTail() {",
          EMPTY_ERROR,
          `    if (head.next == ${end(c)}) {  // 1 node`,
          tailPtr ? "        head = tail = null;" : "        head = null;",
          "        return;",
          "    }",
          "    Node curr = head;",
          `    while (curr.next.next != ${end(c)})`,
          "        curr = curr.next;",
          "    Node temp = curr.next;",
          `    curr.next = ${end(c)};`,
          tailPtr && "    tail = curr;",
          gc("temp"),
          "}",
        );

      case "deleteAt":
        if (dbl) {
          return L(
            "void deleteAt(int index) {",
            "    // assumes 0 <= index < size",
            "    if (index == 0) {",
            "        deleteHead();",
            "        return;",
            "    }",
            "    Node curr = head;",
            "    for (int i = 1; i <= index; i++)",
            "        curr = curr.next;",
            "    curr.prev.next = curr.next;",
            "    if (curr.next != null)",
            "        curr.next.prev = curr.prev;",
            tailPtr && [
              "    else",
              "        tail = curr.prev;",
            ],
            gc("curr"),
            "}",
          );
        }
        return L(
          "void deleteAt(int index) {",
          "    // assumes 0 <= index < size",
          "    if (index == 0) {",
          "        deleteHead();",
          "        return;",
          "    }",
          "    Node prev = head;",
          "    for (int i = 1; i <= index - 1; i++)",
          "        prev = prev.next;",
          "    Node temp = prev.next;",
          "    prev.next = temp.next;",
          tailPtr && [
            "    if (temp == tail)",
            "        tail = prev;",
          ],
          gc("temp"),
          "}",
        );

      case "deleteValue":
        if (dbl) {
          return L(
            "boolean deleteValue(int value) {",
            "    Node curr = head;",
            "    while (curr != null) {",
            "        if (curr.data == value)",
            "            break;",
            "        curr = curr.next;",
            "    }",
            "    if (curr == null)",
            "        return false;  // not found",
            "    if (curr.prev != null)",
            "        curr.prev.next = curr.next;",
            "    else",
            "        head = curr.next;",
            "    if (curr.next != null)",
            "        curr.next.prev = curr.prev;",
            tailPtr && [
              "    else",
              "        tail = curr.prev;",
            ],
            gc("curr"),
            "    return true;",
            "}",
          );
        }
        return L(
          "boolean deleteValue(int value) {",
          "    if (head == null)",
          "        return false;",
          "    if (head.data == value) {",
          "        deleteHead();",
          "        return true;",
          "    }",
          "    Node prev = head;",
          `    while (prev.next != ${end(c)}) {`,
          "        if (prev.next.data == value)",
          "            break;",
          "        prev = prev.next;",
          "    }",
          `    if (prev.next == ${end(c)})`,
          "        return false;  // not found",
          "    Node temp = prev.next;",
          "    prev.next = temp.next;",
          tailPtr && [
            "    if (temp == tail)",
            "        tail = prev;",
          ],
          gc("temp"),
          "    return true;",
          "}",
        );

      case "search":
        if (circ) {
          return L(
            "int search(int value) {",
            "    if (head == null)",
            "        return -1;",
            "    Node curr = head;",
            "    int i = 0;",
            "    do {",
            "        if (curr.data == value)",
            "            return i;",
            "        curr = curr.next; i++;",
            "    } while (curr != head);",
            "    return -1;",
            "}",
          );
        }
        return L(
          "int search(int value) {",
          "    Node curr = head;",
          "    int i = 0;",
          "    while (curr != null) {",
          "        if (curr.data == value)",
          "            return i;",
          "        curr = curr.next; i++;",
          "    }",
          "    return -1;",
          "}",
        );

      case "reverse":
        if (circ) {
          return L(
            "void reverse() {",
            "    if (head == null)",
            "        return;",
            tailPtr ? "    Node prev = tail;  // last node" : [
              "    Node prev = head;  // find the last node",
              "    while (prev.next != head)",
              "        prev = prev.next;",
            ],
            "    Node curr = head;",
            tailPtr && "    tail = head;",
            "    do {",
            "        Node next = curr.next;",
            "        curr.next = prev;",
            "        prev = curr;",
            "        curr = next;",
            "    } while (curr != head);",
            "    head = prev;",
            "}",
          );
        }
        return L(
          "void reverse() {",
          "    Node prev = null;",
          "    Node curr = head;",
          tailPtr && "    tail = head;",
          "    while (curr != null) {",
          "        Node next = curr.next;  // save rest",
          "        curr.next = prev;       // flip!",
          dbl && "        curr.prev = next;",
          "        prev = curr;",
          "        curr = next;",
          "    }",
          "    head = prev;",
          "}",
        );

      case "middle":
        if (circ) {
          return L(
            "Node findMiddle() {",
            "    if (head == null)",
            "        return null;",
            "    Node slow = head, fast = head;",
            "    while (fast.next != head &&",
            "           fast.next.next != head) {",
            "        slow = slow.next;       // +1",
            "        fast = fast.next.next;  // +2",
            "    }",
            "    return slow;",
            "}",
          );
        }
        return L(
          "Node findMiddle() {",
          "    Node slow = head, fast = head;",
          "    while (fast != null && fast.next != null) {",
          "        slow = slow.next;       // +1",
          "        fast = fast.next.next;  // +2",
          "    }",
          "    return slow;",
          "}",
        );

      case "cycle":
        return L(
          "Node detectCycle() {",
          "    Node slow = head, fast = head;",
          "    while (fast != null && fast.next != null) {",
          "        slow = slow.next;",
          "        fast = fast.next.next;",
          "        if (slow == fast)",
          "            break;",
          "    }",
          "    if (fast == null || fast.next == null)",
          "        return null;  // they never met: no cycle",
          "    slow = head;",
          "    while (slow != fast) {  // 1 step each",
          "        slow = slow.next;",
          "        fast = fast.next;",
          "    }",
          "    return slow;  // cycle start",
          "}",
        );

      case "dedupe":
        return L(
          "void removeDuplicates() {",
          "    if (head == null)",
          "        return;",
          "    var seen = new java.util.HashSet<Integer>();",
          "    seen.add(head.data);",
          "    Node prev = head, curr = head.next;",
          `    while (curr != ${end(c)}) {`,
          "        if (seen.contains(curr.data)) {",
          "            prev.next = curr.next;",
          dbl && [
            "            if (curr.next != null)",
            "                curr.next.prev = prev;",
          ],
          tailPtr && [
            "            if (curr == tail)",
            "                tail = prev;",
          ],
          gc("curr", "            "),
          "        } else {",
          "            seen.add(curr.data);",
          "            prev = curr;",
          "        }",
          "        curr = prev.next;",
          "    }",
          "}",
        );

      case "merge":
        if (circ) return null;
        return L(
          "// a, b: heads of two sorted lists",
          "static Node merge(Node a, Node b) {",
          "    Node dummy = new Node(0), tail = dummy;",
          "    while (a != null && b != null) {",
          "        if (a.data <= b.data) {",
          "            tail.next = a; a = a.next;",
          "        } else {",
          "            tail.next = b; b = b.next;",
          "        }",
          dbl && "        tail.next.prev = tail;",
          "        tail = tail.next;",
          "    }",
          "    tail.next = (a != null) ? a : b;",
          dbl && [
            "    if (tail.next != null)",
            "        tail.next.prev = tail;",
          ],
          "    Node head = dummy.next;",
          dbl && [
            "    if (head != null)",
            "        head.prev = null;",
          ],
          "    return head;  // dummy is garbage-collected",
          "}",
        );

      case "bug":
        return L(
          "// ✗ WRONG pointer order — don't copy this!",
          "void insertAfterWrong(int index, int value) {",
          "    Node curr = head;  // walk to node index-1",
          "    for (int i = 1; i <= index - 1; i++)",
          "        curr = curr.next;",
          "    Node newNode = new Node(value);",
          "    curr.next = newNode;       // ✗ 1st: rest is lost",
          "    newNode.next = curr.next;  // ✗ == newNode itself!",
          "    // correct order:",
          "    //   newNode.next = curr.next;",
          "    //   curr.next = newNode;",
          "}",
        );
    }
  },
};
