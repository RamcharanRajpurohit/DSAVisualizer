/* C++17 listings — same statements, order and names as the pseudocode (new → newNode, free → delete). */
import { L, type Ctx, type LangGen } from "./shared";

const end = (c: Ctx) => (c.circ ? "head" : "nullptr");

/** Walk `name` from head to the last node (`name->next == END`). */
const walkToLast = (name: string, c: Ctx) => [
  `    Node* ${name} = head;`,
  `    while (${name}->next != ${end(c)})`,
  `        ${name} = ${name}->next;`,
];

const EMPTY_ERROR = [
  "    if (head == nullptr)",
  '        throw std::out_of_range("empty list");',
];

export const cpp: LangGen = {
  listClose: "};",
  memberIndent: 4,

  node: (c) => L(
    "struct Node {",
    "    int data;",
    c.dbl && "    Node* prev = nullptr;  // previous node",
    "    Node* next = nullptr;  // next node",
    "    explicit Node(int data) : data(data) {}",
    "};",
  ),

  listOpen: (c) => L(
    "class LinkedList {",
    "public:",
    "    Node* head = nullptr;  // first node",
    c.tailPtr && "    Node* tail = nullptr;  // last node",
    c.circ && "    // invariant: last->next == head",
    "    ~LinkedList() { clear(); }  // free every node",
  ),

  method(op, c) {
    const { dbl, circ, tailPtr } = c;
    switch (op) {
      case "build":
        return L(
          "void build(const std::vector<int>& values) {",
          tailPtr ? "    clear();  // head = tail = NULL (frees old nodes)" : "    clear();  // head = NULL (frees old nodes)",
          "    for (int v : values)",
          "        insertAtTail(v);",
          "}",
        );

      case "clear":
        return L(
          "void clear() {",
          circ && (tailPtr
            ? [
                "    if (tail != nullptr)",
                "        tail->next = nullptr;  // open the ring",
              ]
            : [
                "    if (head != nullptr) {  // open the ring",
                "        Node* last = head;",
                "        while (last->next != head)",
                "            last = last->next;",
                "        last->next = nullptr;",
                "    }",
              ]),
          "    while (head != nullptr) {",
          "        Node* temp = head;",
          "        head = head->next;",
          "        delete temp;",
          "    }",
          tailPtr && "    tail = nullptr;",
          "}",
        );

      case "findTail":
        if (!tailPtr) return null;
        return L(
          "void findTail() {  // keep a pointer to the last node",
          "    tail = head;",
          "    if (tail == nullptr)",
          "        return;",
          `    while (tail->next != ${end(c)})`,
          "        tail = tail->next;",
          "}",
        );

      case "insertHead":
        if (circ) {
          return L(
            "void insertAtHead(int value) {",
            "    Node* newNode = new Node(value);",
            "    if (head == nullptr) {",
            "        newNode->next = newNode;  // ring of one",
            tailPtr ? "        head = tail = newNode;" : "        head = newNode;",
            "        return;",
            "    }",
            "    newNode->next = head;",
            tailPtr ? "    Node* last = tail;  // O(1)" : walkToLast("last", c),
            "    last->next = newNode;",
            "    head = newNode;",
            "}",
          );
        }
        return L(
          "void insertAtHead(int value) {",
          "    Node* newNode = new Node(value);",
          "    newNode->next = head;",
          dbl && [
            "    if (head != nullptr)",
            "        head->prev = newNode;",
          ],
          "    head = newNode;",
          tailPtr && [
            "    if (tail == nullptr)",
            "        tail = newNode;",
          ],
          "}",
        );

      case "insertTail":
        return L(
          "void insertAtTail(int value) {",
          "    Node* newNode = new Node(value);",
          "    if (head == nullptr) {",
          circ && "        newNode->next = newNode;",
          tailPtr ? "        head = tail = newNode;" : "        head = newNode;",
          "        return;",
          "    }",
          circ && "    newNode->next = head;  // keep ring",
          tailPtr
            ? [
                "    tail->next = newNode;  // O(1)",
                dbl && "    newNode->prev = tail;",
                "    tail = newNode;",
              ]
            : [
                ...walkToLast("curr", c),
                "    curr->next = newNode;",
                dbl && "    newNode->prev = curr;",
              ],
          "}",
        );

      case "insertAt":
        return L(
          "void insertAt(int index, int value) {",
          "    // assumes 0 <= index <= size",
          "    if (index == 0)",
          "        return insertAtHead(value);",
          "    Node* curr = head;",
          "    for (int i = 1; i <= index - 1; i++)",
          "        curr = curr->next;",
          "    Node* newNode = new Node(value);",
          "    newNode->next = curr->next;  // 1st",
          dbl && [
            "    newNode->prev = curr;",
            "    if (curr->next != nullptr)",
            "        curr->next->prev = newNode;",
          ],
          "    curr->next = newNode;        // 2nd",
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
            "    if (head->next == head) {  // 1 node",
            "        delete head;",
            tailPtr ? "        head = tail = nullptr;" : "        head = nullptr;",
            "        return;",
            "    }",
            tailPtr ? "    Node* last = tail;" : walkToLast("last", c),
            "    Node* temp = head;",
            "    head = head->next;",
            "    last->next = head;",
            "    delete temp;",
            "}",
          );
        }
        return L(
          "void deleteHead() {",
          EMPTY_ERROR,
          "    Node* temp = head;",
          "    head = head->next;",
          dbl && [
            "    if (head != nullptr)",
            "        head->prev = nullptr;",
          ],
          tailPtr && [
            "    if (head == nullptr)",
            "        tail = nullptr;",
          ],
          "    delete temp;",
          "}",
        );

      case "deleteTail":
        if (dbl && tailPtr) {
          return L(
            "void deleteTail() {",
            EMPTY_ERROR,
            "    Node* temp = tail;  // O(1)",
            "    if (temp->prev == nullptr) {",
            "        head = tail = nullptr;",
            "    } else {",
            "        tail = temp->prev;",
            "        tail->next = nullptr;",
            "    }",
            "    delete temp;",
            "}",
          );
        }
        if (dbl) {
          return L(
            "void deleteTail() {",
            EMPTY_ERROR,
            "    Node* curr = head;",
            "    while (curr->next != nullptr)",
            "        curr = curr->next;",
            "    if (curr->prev == nullptr)",
            "        head = nullptr;",
            "    else",
            "        curr->prev->next = nullptr;",
            "    delete curr;",
            "}",
          );
        }
        return L(
          "void deleteTail() {",
          EMPTY_ERROR,
          `    if (head->next == ${end(c)}) {  // 1 node`,
          "        delete head;",
          tailPtr ? "        head = tail = nullptr;" : "        head = nullptr;",
          "        return;",
          "    }",
          "    Node* curr = head;",
          `    while (curr->next->next != ${end(c)})`,
          "        curr = curr->next;",
          "    Node* temp = curr->next;",
          `    curr->next = ${end(c)};`,
          tailPtr && "    tail = curr;",
          "    delete temp;",
          "}",
        );

      case "deleteAt":
        if (dbl) {
          return L(
            "void deleteAt(int index) {",
            "    // assumes 0 <= index < size",
            "    if (index == 0)",
            "        return deleteHead();",
            "    Node* curr = head;",
            "    for (int i = 1; i <= index; i++)",
            "        curr = curr->next;",
            "    curr->prev->next = curr->next;",
            "    if (curr->next != nullptr)",
            "        curr->next->prev = curr->prev;",
            tailPtr && [
              "    else",
              "        tail = curr->prev;",
            ],
            "    delete curr;",
            "}",
          );
        }
        return L(
          "void deleteAt(int index) {",
          "    // assumes 0 <= index < size",
          "    if (index == 0)",
          "        return deleteHead();",
          "    Node* prev = head;",
          "    for (int i = 1; i <= index - 1; i++)",
          "        prev = prev->next;",
          "    Node* temp = prev->next;",
          "    prev->next = temp->next;",
          tailPtr && [
            "    if (temp == tail)",
            "        tail = prev;",
          ],
          "    delete temp;",
          "}",
        );

      case "deleteValue":
        if (dbl) {
          return L(
            "bool deleteValue(int value) {",
            "    Node* curr = head;",
            "    while (curr != nullptr) {",
            "        if (curr->data == value)",
            "            break;",
            "        curr = curr->next;",
            "    }",
            "    if (curr == nullptr)",
            "        return false;  // not found",
            "    if (curr->prev != nullptr)",
            "        curr->prev->next = curr->next;",
            "    else",
            "        head = curr->next;",
            "    if (curr->next != nullptr)",
            "        curr->next->prev = curr->prev;",
            tailPtr && [
              "    else",
              "        tail = curr->prev;",
            ],
            "    delete curr;",
            "    return true;",
            "}",
          );
        }
        return L(
          "bool deleteValue(int value) {",
          "    if (head == nullptr)",
          "        return false;",
          "    if (head->data == value) {",
          "        deleteHead();",
          "        return true;",
          "    }",
          "    Node* prev = head;",
          `    while (prev->next != ${end(c)}) {`,
          "        if (prev->next->data == value)",
          "            break;",
          "        prev = prev->next;",
          "    }",
          `    if (prev->next == ${end(c)})`,
          "        return false;  // not found",
          "    Node* temp = prev->next;",
          "    prev->next = temp->next;",
          tailPtr && [
            "    if (temp == tail)",
            "        tail = prev;",
          ],
          "    delete temp;",
          "    return true;",
          "}",
        );

      case "search":
        if (circ) {
          return L(
            "int search(int value) const {",
            "    if (head == nullptr)",
            "        return -1;",
            "    Node* curr = head;",
            "    int i = 0;",
            "    do {",
            "        if (curr->data == value)",
            "            return i;",
            "        curr = curr->next; i++;",
            "    } while (curr != head);",
            "    return -1;",
            "}",
          );
        }
        return L(
          "int search(int value) const {",
          "    Node* curr = head;",
          "    int i = 0;",
          "    while (curr != nullptr) {",
          "        if (curr->data == value)",
          "            return i;",
          "        curr = curr->next; i++;",
          "    }",
          "    return -1;",
          "}",
        );

      case "reverse":
        if (circ) {
          return L(
            "void reverse() {",
            "    if (head == nullptr)",
            "        return;",
            tailPtr ? "    Node* prev = tail;  // last node" : [
              "    Node* prev = head;  // find the last node",
              "    while (prev->next != head)",
              "        prev = prev->next;",
            ],
            "    Node* curr = head;",
            tailPtr && "    tail = head;",
            "    do {",
            "        Node* next = curr->next;",
            "        curr->next = prev;",
            "        prev = curr;",
            "        curr = next;",
            "    } while (curr != head);",
            "    head = prev;",
            "}",
          );
        }
        return L(
          "void reverse() {",
          "    Node* prev = nullptr;",
          "    Node* curr = head;",
          tailPtr && "    tail = head;",
          "    while (curr != nullptr) {",
          "        Node* next = curr->next;  // save rest",
          "        curr->next = prev;        // flip!",
          dbl && "        curr->prev = next;",
          "        prev = curr;",
          "        curr = next;",
          "    }",
          "    head = prev;",
          "}",
        );

      case "middle":
        if (circ) {
          return L(
            "Node* findMiddle() const {",
            "    if (head == nullptr)",
            "        return nullptr;",
            "    Node* slow = head;",
            "    Node* fast = head;",
            "    while (fast->next != head &&",
            "           fast->next->next != head) {",
            "        slow = slow->next;        // +1",
            "        fast = fast->next->next;  // +2",
            "    }",
            "    return slow;",
            "}",
          );
        }
        return L(
          "Node* findMiddle() const {",
          "    Node* slow = head;",
          "    Node* fast = head;",
          "    while (fast != nullptr && fast->next != nullptr) {",
          "        slow = slow->next;        // +1",
          "        fast = fast->next->next;  // +2",
          "    }",
          "    return slow;",
          "}",
        );

      case "cycle":
        return L(
          "Node* detectCycle() const {",
          "    Node* slow = head;",
          "    Node* fast = head;",
          "    while (fast != nullptr && fast->next != nullptr) {",
          "        slow = slow->next;",
          "        fast = fast->next->next;",
          "        if (slow == fast)",
          "            break;",
          "    }",
          "    if (fast == nullptr || fast->next == nullptr)",
          "        return nullptr;  // they never met: no cycle",
          "    slow = head;",
          "    while (slow != fast) {  // 1 step each",
          "        slow = slow->next;",
          "        fast = fast->next;",
          "    }",
          "    return slow;  // cycle start",
          "}",
        );

      case "dedupe":
        return L(
          "void removeDuplicates() {  // needs <unordered_set>",
          "    if (head == nullptr)",
          "        return;",
          "    std::unordered_set<int> seen{head->data};",
          "    Node* prev = head;",
          "    Node* curr = head->next;",
          `    while (curr != ${end(c)}) {`,
          "        if (seen.count(curr->data)) {",
          "            prev->next = curr->next;",
          dbl && [
            "            if (curr->next != nullptr)",
            "                curr->next->prev = prev;",
          ],
          tailPtr && [
            "            if (curr == tail)",
            "                tail = prev;",
          ],
          "            delete curr;",
          "        } else {",
          "            seen.insert(curr->data);",
          "            prev = curr;",
          "        }",
          "        curr = prev->next;",
          "    }",
          "}",
        );

      case "merge":
        if (circ) return null;
        return L(
          "// a, b: heads of two sorted lists",
          "static Node* merge(Node* a, Node* b) {",
          "    Node dummy(0);  // sentinel on the stack",
          "    Node* tail = &dummy;",
          "    while (a != nullptr && b != nullptr) {",
          "        if (a->data <= b->data) {",
          "            tail->next = a; a = a->next;",
          "        } else {",
          "            tail->next = b; b = b->next;",
          "        }",
          dbl && "        tail->next->prev = tail;",
          "        tail = tail->next;",
          "    }",
          "    tail->next = (a != nullptr) ? a : b;",
          dbl && [
            "    if (tail->next != nullptr)",
            "        tail->next->prev = tail;",
          ],
          "    Node* head = dummy.next;",
          dbl && [
            "    if (head != nullptr)",
            "        head->prev = nullptr;",
          ],
          "    return head;  // dummy is freed automatically",
          "}",
        );

      case "bug":
        return L(
          "// ✗ WRONG pointer order — don't copy this!",
          "void insertAfterWrong(int index, int value) {",
          "    Node* curr = head;  // walk to node index-1",
          "    for (int i = 1; i <= index - 1; i++)",
          "        curr = curr->next;",
          "    Node* newNode = new Node(value);",
          "    curr->next = newNode;        // ✗ 1st: rest is lost",
          "    newNode->next = curr->next;  // ✗ == newNode itself!",
          "    // correct order:",
          "    //   newNode->next = curr->next;",
          "    //   curr->next = newNode;",
          "}",
        );
    }
  },
};
