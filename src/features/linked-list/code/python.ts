/* Python listings — same statements, order and names as the pseudocode (new → new_node, next → nxt). */
import { L, type Ctx, type LangGen } from "./shared";

const end = (c: Ctx) => (c.circ ? "self.head" : "None");

/** Walk `name` from head to the last node (`name.next is END`). */
const walkToLast = (name: string, c: Ctx) => [
  `    ${name} = self.head`,
  `    while ${name}.next is not ${end(c)}:`,
  `        ${name} = ${name}.next`,
];

const EMPTY_ERROR = [
  "    if self.head is None:",
  '        raise IndexError("delete from empty list")',
];

export const python: LangGen = {
  listClose: "",
  memberIndent: 4,

  node: (c) => L(
    "class Node:",
    "    def __init__(self, data):",
    "        self.data = data",
    c.dbl && "        self.prev = None  # previous node",
    "        self.next = None  # next node",
  ),

  listOpen: (c) => L(
    "class LinkedList:",
    "    def __init__(self):",
    "        self.head = None  # first node",
    c.tailPtr && "        self.tail = None  # last node",
    c.circ && "        # invariant: last.next is self.head",
  ),

  method(op, c) {
    const { dbl, circ, tailPtr } = c;
    switch (op) {
      case "build":
        return L(
          "def build(self, values):",
          tailPtr ? "    self.head = self.tail = None" : "    self.head = None",
          "    for v in values:",
          "        self.insert_at_tail(v)",
        );

      case "clear":
        return L(
          "def clear(self):",
          "    # Python's garbage collector frees nodes that",
          "    # nothing points to (rings included), so",
          "    # dropping the references is enough.",
          "    self.head = None",
          tailPtr && "    self.tail = None",
        );

      case "findTail":
        if (!tailPtr) return null;
        return L(
          "def find_tail(self):",
          "    # keep a pointer to the last node",
          "    self.tail = self.head",
          "    if self.tail is None:",
          "        return",
          `    while self.tail.next is not ${end(c)}:`,
          "        self.tail = self.tail.next",
        );

      case "insertHead":
        if (circ) {
          return L(
            "def insert_at_head(self, value):",
            "    new_node = Node(value)",
            "    if self.head is None:",
            "        new_node.next = new_node  # ring of one",
            tailPtr ? "        self.head = self.tail = new_node" : "        self.head = new_node",
            "        return",
            "    new_node.next = self.head",
            tailPtr ? "    last = self.tail  # O(1)" : walkToLast("last", c),
            "    last.next = new_node",
            "    self.head = new_node",
          );
        }
        return L(
          "def insert_at_head(self, value):",
          "    new_node = Node(value)",
          "    new_node.next = self.head",
          dbl && [
            "    if self.head is not None:",
            "        self.head.prev = new_node",
          ],
          "    self.head = new_node",
          tailPtr && [
            "    if self.tail is None:",
            "        self.tail = new_node",
          ],
        );

      case "insertTail":
        return L(
          "def insert_at_tail(self, value):",
          "    new_node = Node(value)",
          "    if self.head is None:",
          circ && "        new_node.next = new_node",
          tailPtr ? "        self.head = self.tail = new_node" : "        self.head = new_node",
          "        return",
          circ && "    new_node.next = self.head  # keep ring",
          tailPtr
            ? [
                dbl && "    new_node.prev = self.tail  # O(1)",
                dbl ? "    self.tail.next = new_node" : "    self.tail.next = new_node  # O(1)",
                "    self.tail = new_node",
              ]
            : [
                ...walkToLast("curr", c),
                "    curr.next = new_node",
              ],
        );

      case "insertAt":
        return L(
          "def insert_at(self, index, value):",
          "    # assumes 0 <= index <= size",
          "    if index == 0:",
          "        return self.insert_at_head(value)",
          "    curr = self.head",
          "    for i in range(1, index):  # i = 1 .. index-1",
          "        curr = curr.next",
          "    new_node = Node(value)",
          "    new_node.next = curr.next  # 1st",
          dbl && [
            "    new_node.prev = curr",
            "    if curr.next is not None:",
            "        curr.next.prev = new_node",
          ],
          "    curr.next = new_node       # 2nd",
          tailPtr && [
            "    if curr is self.tail:",
            "        self.tail = new_node",
          ],
        );

      case "deleteHead":
        if (circ) {
          return L(
            "def delete_head(self):",
            EMPTY_ERROR,
            "    if self.head.next is self.head:  # 1 node",
            tailPtr ? "        self.head = self.tail = None" : "        self.head = None",
            "        return",
            tailPtr ? "    last = self.tail" : walkToLast("last", c),
            "    temp = self.head",
            "    self.head = self.head.next",
            "    last.next = self.head",
            "    del temp  # free(temp): the GC reclaims it",
          );
        }
        return L(
          "def delete_head(self):",
          EMPTY_ERROR,
          "    temp = self.head",
          "    self.head = self.head.next",
          dbl && [
            "    if self.head is not None:",
            "        self.head.prev = None",
          ],
          tailPtr && [
            "    if self.head is None:",
            "        self.tail = None",
          ],
          "    del temp  # free(temp): the GC reclaims it",
        );

      case "deleteTail":
        if (dbl) { // doubly always keeps tail (keepsTail): O(1) via tail.prev
          return L(
            "def delete_tail(self):",
            EMPTY_ERROR,
            "    temp = self.tail  # O(1)",
            "    if temp.prev is None:",
            "        self.head = self.tail = None",
            "    else:",
            "        self.tail = temp.prev",
            "        self.tail.next = None",
            "    del temp  # free(temp): the GC reclaims it",
          );
        }
        return L(
          "def delete_tail(self):",
          EMPTY_ERROR,
          `    if self.head.next is ${end(c)}:  # 1 node`,
          tailPtr ? "        self.head = self.tail = None" : "        self.head = None",
          "        return",
          "    curr = self.head",
          `    while curr.next.next is not ${end(c)}:`,
          "        curr = curr.next",
          "    temp = curr.next",
          `    curr.next = ${end(c)}`,
          tailPtr && "    self.tail = curr",
          "    del temp  # free(temp): the GC reclaims it",
        );

      case "deleteAt":
        if (dbl) {
          return L(
            "def delete_at(self, index):",
            "    # assumes 0 <= index < size",
            "    if index == 0:",
            "        return self.delete_head()",
            "    curr = self.head",
            "    for i in range(1, index + 1):  # i = 1 .. index",
            "        curr = curr.next",
            "    curr.prev.next = curr.next",
            "    if curr.next is not None:",
            "        curr.next.prev = curr.prev",
            tailPtr && [
              "    else:",
              "        self.tail = curr.prev",
            ],
            "    del curr  # free(curr): the GC reclaims it",
          );
        }
        return L(
          "def delete_at(self, index):",
          "    # assumes 0 <= index < size",
          "    if index == 0:",
          "        return self.delete_head()",
          "    prev = self.head",
          "    for i in range(1, index):  # i = 1 .. index-1",
          "        prev = prev.next",
          "    temp = prev.next",
          "    prev.next = temp.next",
          tailPtr && [
            "    if temp is self.tail:",
            "        self.tail = prev",
          ],
          "    del temp  # free(temp): the GC reclaims it",
        );

      case "deleteValue":
        if (dbl) {
          return L(
            "def delete_value(self, value):",
            "    curr = self.head",
            "    while curr is not None:",
            "        if curr.data == value:",
            "            break",
            "        curr = curr.next",
            "    if curr is None:",
            "        return False  # not found",
            "    if curr.prev is not None:",
            "        curr.prev.next = curr.next",
            "    else:",
            "        self.head = curr.next",
            "    if curr.next is not None:",
            "        curr.next.prev = curr.prev",
            tailPtr && [
              "    else:",
              "        self.tail = curr.prev",
            ],
            "    del curr  # free(curr): the GC reclaims it",
            "    return True",
          );
        }
        return L(
          "def delete_value(self, value):",
          "    if self.head is None:",
          "        return False",
          "    if self.head.data == value:",
          "        self.delete_head()",
          "        return True",
          "    prev = self.head",
          `    while prev.next is not ${end(c)}:`,
          "        if prev.next.data == value:",
          "            break",
          "        prev = prev.next",
          `    if prev.next is ${end(c)}:`,
          "        return False  # not found",
          "    temp = prev.next",
          "    prev.next = temp.next",
          tailPtr && [
            "    if temp is self.tail:",
            "        self.tail = prev",
          ],
          "    del temp  # free(temp): the GC reclaims it",
          "    return True",
        );

      case "search":
        if (circ) {
          return L(
            "def search(self, value):",
            "    if self.head is None:",
            "        return -1",
            "    curr, i = self.head, 0",
            "    while True:  # do ... while curr is not head",
            "        if curr.data == value:",
            "            return i",
            "        curr, i = curr.next, i + 1",
            "        if curr is self.head:",
            "            break",
            "    return -1",
          );
        }
        return L(
          "def search(self, value):",
          "    curr, i = self.head, 0",
          "    while curr is not None:",
          "        if curr.data == value:",
          "            return i",
          "        curr, i = curr.next, i + 1",
          "    return -1",
        );

      case "reverse":
        if (circ) {
          return L(
            "def reverse(self):",
            "    if self.head is None:",
            "        return",
            tailPtr ? "    prev = self.tail  # last node" : [
              "    prev = self.head  # find the last node",
              "    while prev.next is not self.head:",
              "        prev = prev.next",
            ],
            "    curr = self.head",
            tailPtr && "    self.tail = self.head",
            "    while True:  # do ... while curr is not head",
            "        nxt = curr.next",
            "        curr.next = prev",
            "        prev = curr",
            "        curr = nxt",
            "        if curr is self.head:",
            "            break",
            "    self.head = prev",
          );
        }
        return L(
          "def reverse(self):",
          "    prev = None",
          "    curr = self.head",
          tailPtr && "    self.tail = self.head",
          "    while curr is not None:",
          "        nxt = curr.next   # save rest",
          "        curr.next = prev  # flip!",
          dbl && "        curr.prev = nxt",
          "        prev = curr",
          "        curr = nxt",
          "    self.head = prev",
        );

      case "middle":
        if (circ) {
          return L(
            "def find_middle(self):",
            "    if self.head is None:",
            "        return None",
            "    slow = fast = self.head",
            "    while (fast.next is not self.head and",
            "           fast.next.next is not self.head):",
            "        slow = slow.next       # +1",
            "        fast = fast.next.next  # +2",
            "    return slow",
          );
        }
        return L(
          "def find_middle(self):",
          "    slow = fast = self.head",
          "    while fast is not None and fast.next is not None:",
          "        slow = slow.next       # +1",
          "        fast = fast.next.next  # +2",
          "    return slow",
        );

      case "cycle":
        return L(
          "def detect_cycle(self):",
          "    slow = fast = self.head",
          "    while fast is not None and fast.next is not None:",
          "        slow = slow.next",
          "        fast = fast.next.next",
          "        if slow is fast:",
          "            break",
          "    if fast is None or fast.next is None:",
          "        return None  # they never met: no cycle",
          "    slow = self.head",
          "    while slow is not fast:  # 1 step each",
          "        slow = slow.next",
          "        fast = fast.next",
          "    return slow  # cycle start",
        );

      case "dedupe":
        return L(
          "def remove_duplicates(self):",
          "    if self.head is None:",
          "        return",
          "    seen = {self.head.data}",
          "    prev, curr = self.head, self.head.next",
          `    while curr is not ${end(c)}:`,
          "        if curr.data in seen:",
          "            prev.next = curr.next",
          dbl && [
            "            if curr.next is not None:",
            "                curr.next.prev = prev",
          ],
          tailPtr && [
            "            if curr is self.tail:",
            "                self.tail = prev",
          ],
          "            del curr  # free(curr): the GC reclaims it",
          "        else:",
          "            seen.add(curr.data)",
          "            prev = curr",
          "        curr = prev.next",
        );

      case "merge":
        if (circ) return null;
        return L(
          "@staticmethod",
          "def merge(a, b):  # a, b: heads of sorted lists",
          "    dummy = tail = Node(0)  # sentinel",
          "    while a is not None and b is not None:",
          "        if a.data <= b.data:",
          "            tail.next = a",
          "            a = a.next",
          "        else:",
          "            tail.next = b",
          "            b = b.next",
          dbl && "        tail.next.prev = tail",
          "        tail = tail.next",
          "    tail.next = a if a is not None else b",
          dbl && [
            "    if tail.next is not None:",
            "        tail.next.prev = tail",
          ],
          "    head = dummy.next",
          dbl && [
            "    if head is not None:",
            "        head.prev = None",
          ],
          "    return head  # dummy is garbage-collected",
        );

      case "bug":
        return L(
          "def insert_after_wrong(self, index, value):",
          "    # ✗ WRONG pointer order — don't copy this!",
          "    curr = self.head  # walk to node index-1",
          "    for i in range(1, index):",
          "        curr = curr.next",
          "    new_node = Node(value)",
          "    curr.next = new_node       # ✗ 1st: rest is lost",
          "    new_node.next = curr.next  # ✗ == new_node itself!",
          "    # correct order:",
          "    #   new_node.next = curr.next",
          "    #   curr.next = new_node",
        );
    }
  },
};
