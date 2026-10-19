/*
 * Real, runnable implementations of every heap operation the page animates — Python, C++17,
 * Java and JavaScript — written with the SAME structure and variable names as the pseudocode
 * (siftUp / siftDown, p, l, r, largest|smallest, top, end, old, key …).
 *
 * Like the pseudocode, each snippet is specialised to the heap kind: a max-heap compares with
 * > / >= and calls the chosen child `largest`, a min-heap uses < / <= and `smallest`.
 * Templates use $TOKENS that are filled in per kind (no `${}` so the code text stays literal).
 * Lines are kept short: the code panel is a narrow side column.
 *
 * Every snippet is verified by a scratchpad harness that compiles / runs it against the step
 * recorder's results. Pure TS (type-only imports), so the harness can load it under tsx.
 */
import type { CodeLang } from "@/components/visualizer";
import type { HeapKind, OpCode } from "../engine/types";

type Snippets = Record<CodeLang, string>;

const TOKENS: Record<HeapKind, Record<string, string>> = {
  max: { GE: ">=", GT: ">", LT: "<", ge: "≥", best: "largest", M: "Max", m: "max", order: "ascending" },
  min: { GE: "<=", GT: "<", LT: ">", ge: "≤", best: "smallest", M: "Min", m: "min", order: "descending" },
};

/** Longest names first, so `$MHeap` → "MaxHeap" and `is_$m_heap` → "is_max_heap". */
const TOKEN_RE = /\$(order|best|GE|GT|LT|ge|M|m)/g;

const fill = (src: string, kind: HeapKind) => src.replace(TOKEN_RE, (_, name: string) => TOKENS[kind][name]);

// ───────────────────────────────── Python ─────────────────────────────────

const PY_SIFT_UP = `
def sift_up(a, i):
    # move a[i] up while it beats its parent
    while i > 0:
        p = (i - 1) // 2
        if a[p] $GE a[i]:  # in order
            return
        a[i], a[p] = a[p], a[i]
        i = p
`;

const PY_SIFT_DOWN = `
def sift_down(a, i, n):
    # sink a[i] inside the heap a[0:n]
    while 2 * i + 1 < n:
        l, r = 2 * i + 1, 2 * i + 2
        $best = l
        if r < n and a[r] $GT a[l]:
            $best = r
        if a[i] $GE a[$best]:  # in order
            return
        a[i], a[$best] = a[$best], a[i]
        i = $best
`;

const PY_BUILD = `
def build_heap(a):
    n = len(a)
    # a[n // 2:] are leaves, already heaps
    for i in range(n // 2 - 1, -1, -1):
        sift_down(a, i, n)
`;

const PY: Record<OpCode, string> = {
  idle: `
def parent(i):
    return (i - 1) // 2


def left(i):
    return 2 * i + 1


def right(i):
    return 2 * i + 2


def is_$m_heap(a):
    # every parent $ge its children
    for i in range(1, len(a)):
        if a[parent(i)] $LT a[i]:
            return False
    return True
`,
  insert: `
def insert(a, key):
    a.append(key)  # a[n] ← key;  n ← n + 1
    sift_up(a, len(a) - 1)

${PY_SIFT_UP}`,
  extract: `
def extract_$m(a):
    if not a:
        raise IndexError("empty heap")
    top = a[0]
    # swap(a[0], a[n − 1]);  n ← n − 1
    a[0], a[-1] = a[-1], a[0]
    a.pop()
    sift_down(a, 0, len(a))
    return top

${PY_SIFT_DOWN}`,
  peek: `
def peek_$m(a):
    if not a:
        raise IndexError("empty heap")
    return a[0]  # the root, O(1)
`,
  delete: `
def delete_at(a, k):
    # swap(a[k], a[n − 1]);  n ← n − 1
    a[k], a[-1] = a[-1], a[k]
    removed = a.pop()
    n = len(a)
    if k == n:  # it was the last slot
        return removed
    if k > 0 and a[k] $GT a[(k - 1) // 2]:
        sift_up(a, k)
    else:
        sift_down(a, k, n)
    return removed

${PY_SIFT_UP}

${PY_SIFT_DOWN}`,
  update: `
def update_key(a, k, key):
    old = a[k]
    a[k] = key
    if key $GT old:  # can only go up
        sift_up(a, k)
    elif key $LT old:  # can only go down
        sift_down(a, k, len(a))

${PY_SIFT_UP}

${PY_SIFT_DOWN}`,
  build: `${PY_BUILD}

${PY_SIFT_DOWN}`,
  sort: `
def heap_sort(a):
    # sorts $order, in place
    build_heap(a)  # O(n)
    n = len(a)
    for end in range(n - 1, 0, -1):
        # the $m moves to its final slot
        a[0], a[end] = a[end], a[0]
        sift_down(a, 0, end)  # heap = a[0:end]

${PY_BUILD}

${PY_SIFT_DOWN}`,
};

// ───────────────────────────────── C++17 ─────────────────────────────────

const CPP_SIFT_UP = `
void siftUp(std::vector<int>& a, int i) {
    while (i > 0) {
        int p = (i - 1) / 2;
        if (a[p] $GE a[i]) return;  // in order
        std::swap(a[i], a[p]);
        i = p;
    }
}
`;

const CPP_SIFT_DOWN = `
// sink a[i] inside the heap a[0 .. n-1]
void siftDown(std::vector<int>& a, int i, int n) {
    while (2 * i + 1 < n) {
        int l = 2 * i + 1, r = 2 * i + 2;
        int $best = l;
        if (r < n && a[r] $GT a[l]) $best = r;
        if (a[i] $GE a[$best]) return;  // in order
        std::swap(a[i], a[$best]);
        i = $best;
    }
}
`;

const CPP_BUILD = `
void buildHeap(std::vector<int>& a) {
    int n = (int)a.size();
    // a[n/2 .. n-1] are leaves, already heaps
    for (int i = n / 2 - 1; i >= 0; i--)
        siftDown(a, i, n);
}
`;

const CPP_INC = "#include <utility>\n#include <vector>\n";
const CPP_INC_THROW = "#include <stdexcept>\n#include <utility>\n#include <vector>\n";

const CPP: Record<OpCode, string> = {
  idle: `
#include <vector>

int parent(int i) { return (i - 1) / 2; }
int left(int i) { return 2 * i + 1; }
int right(int i) { return 2 * i + 2; }

// every parent $ge its children
bool is$MHeap(const std::vector<int>& a) {
    for (int i = 1; i < (int)a.size(); i++)
        if (a[parent(i)] $LT a[i]) return false;
    return true;
}
`,
  insert: `
${CPP_INC}${CPP_SIFT_UP}
void insert(std::vector<int>& a, int key) {
    a.push_back(key);  // a[n] ← key;  n ← n + 1
    siftUp(a, (int)a.size() - 1);
}
`,
  extract: `
${CPP_INC_THROW}${CPP_SIFT_DOWN}
int extract$M(std::vector<int>& a) {
    if (a.empty())
        throw std::out_of_range("empty heap");
    int top = a[0];
    // swap(a[0], a[n − 1]);  n ← n − 1
    std::swap(a[0], a.back());
    a.pop_back();
    siftDown(a, 0, (int)a.size());
    return top;
}
`,
  peek: `
#include <stdexcept>
#include <vector>

int peek$M(const std::vector<int>& a) {
    if (a.empty())
        throw std::out_of_range("empty heap");
    return a[0];  // the root, O(1)
}
`,
  delete: `
${CPP_INC}${CPP_SIFT_UP}${CPP_SIFT_DOWN}
int deleteAt(std::vector<int>& a, int k) {
    // swap(a[k], a[n − 1]);  n ← n − 1
    std::swap(a[k], a.back());
    int removed = a.back();
    a.pop_back();
    int n = (int)a.size();
    if (k == n) return removed;  // was the last slot
    if (k > 0 && a[k] $GT a[(k - 1) / 2])
        siftUp(a, k);
    else
        siftDown(a, k, n);
    return removed;
}
`,
  update: `
${CPP_INC}${CPP_SIFT_UP}${CPP_SIFT_DOWN}
void updateKey(std::vector<int>& a, int k, int key) {
    int old = a[k];
    a[k] = key;
    if (key $GT old)  // can only go up
        siftUp(a, k);
    else if (key $LT old)  // can only go down
        siftDown(a, k, (int)a.size());
}
`,
  build: `
${CPP_INC}${CPP_SIFT_DOWN}${CPP_BUILD}`,
  sort: `
${CPP_INC}${CPP_SIFT_DOWN}${CPP_BUILD}
// sorts $order, in place
void heapSort(std::vector<int>& a) {
    buildHeap(a);  // O(n)
    int n = (int)a.size();
    for (int end = n - 1; end >= 1; end--) {
        // the $m moves to its final slot
        std::swap(a[0], a[end]);
        siftDown(a, 0, end);  // heap = a[0 .. end-1]
    }
}
`,
};

// ───────────────────────────────── Java ─────────────────────────────────

const JAVA_SIFT_UP = `
static void siftUp(List<Integer> a, int i) {
    while (i > 0) {
        int p = (i - 1) / 2;
        if (a.get(p) $GE a.get(i)) return;  // in order
        Collections.swap(a, i, p);
        i = p;
    }
}
`;

const JAVA_SIFT_DOWN = `
// sink a[i] inside the heap a[0 .. n-1]
static void siftDown(List<Integer> a, int i, int n) {
    while (2 * i + 1 < n) {
        int l = 2 * i + 1, r = 2 * i + 2;
        int $best = l;
        if (r < n && a.get(r) $GT a.get(l))
            $best = r;
        if (a.get(i) $GE a.get($best))
            return;  // in order
        Collections.swap(a, i, $best);
        i = $best;
    }
}
`;

const JAVA_BUILD = `
static void buildHeap(List<Integer> a) {
    int n = a.size();
    // a[n/2 .. n-1] are leaves, already heaps
    for (int i = n / 2 - 1; i >= 0; i--)
        siftDown(a, i, n);
}
`;

const JAVA_NOTE = "// import java.util.*;  (a is an ArrayList)\n";

const JAVA: Record<OpCode, string> = {
  idle: `
${JAVA_NOTE}
static int parent(int i) { return (i - 1) / 2; }
static int left(int i) { return 2 * i + 1; }
static int right(int i) { return 2 * i + 2; }

// every parent $ge its children
static boolean is$MHeap(List<Integer> a) {
    for (int i = 1; i < a.size(); i++)
        if (a.get(parent(i)) $LT a.get(i)) return false;
    return true;
}
`,
  insert: `
${JAVA_NOTE}
static void insert(List<Integer> a, int key) {
    a.add(key);  // a[n] ← key;  n ← n + 1
    siftUp(a, a.size() - 1);
}
${JAVA_SIFT_UP}`,
  extract: `
${JAVA_NOTE}
static int extract$M(List<Integer> a) {
    if (a.isEmpty())
        throw new NoSuchElementException("empty heap");
    int top = a.get(0);
    // swap(a[0], a[n − 1]);  n ← n − 1
    Collections.swap(a, 0, a.size() - 1);
    a.remove(a.size() - 1);
    siftDown(a, 0, a.size());
    return top;
}
${JAVA_SIFT_DOWN}`,
  peek: `
${JAVA_NOTE}
static int peek$M(List<Integer> a) {
    if (a.isEmpty())
        throw new NoSuchElementException("empty heap");
    return a.get(0);  // the root, O(1)
}
`,
  delete: `
${JAVA_NOTE}
static int deleteAt(List<Integer> a, int k) {
    // swap(a[k], a[n − 1]);  n ← n − 1
    Collections.swap(a, k, a.size() - 1);
    int removed = a.remove(a.size() - 1);
    int n = a.size();
    if (k == n) return removed;  // was the last slot
    if (k > 0 && a.get(k) $GT a.get((k - 1) / 2))
        siftUp(a, k);
    else
        siftDown(a, k, n);
    return removed;
}
${JAVA_SIFT_UP}${JAVA_SIFT_DOWN}`,
  update: `
${JAVA_NOTE}
static void updateKey(List<Integer> a, int k, int key) {
    int old = a.get(k);
    a.set(k, key);
    if (key $GT old)  // can only go up
        siftUp(a, k);
    else if (key $LT old)  // can only go down
        siftDown(a, k, a.size());
}
${JAVA_SIFT_UP}${JAVA_SIFT_DOWN}`,
  build: `
${JAVA_NOTE}${JAVA_BUILD}${JAVA_SIFT_DOWN}`,
  sort: `
${JAVA_NOTE}
// sorts $order, in place
static void heapSort(List<Integer> a) {
    buildHeap(a);  // O(n)
    int n = a.size();
    for (int end = n - 1; end >= 1; end--) {
        // the $m moves to its final slot
        Collections.swap(a, 0, end);
        siftDown(a, 0, end);  // heap = a[0 .. end-1]
    }
}
${JAVA_BUILD}${JAVA_SIFT_DOWN}`,
};

// ───────────────────────────────── JavaScript ─────────────────────────────────

const JS_SIFT_UP = `
// move a[i] up while it beats its parent
function siftUp(a, i) {
  while (i > 0) {
    const p = Math.floor((i - 1) / 2);
    if (a[p] $GE a[i]) return; // in order
    [a[i], a[p]] = [a[p], a[i]];
    i = p;
  }
}
`;

const JS_SIFT_DOWN = `
// sink a[i] inside the heap a[0 .. n-1]
function siftDown(a, i, n) {
  while (2 * i + 1 < n) {
    const l = 2 * i + 1, r = 2 * i + 2;
    let $best = l;
    if (r < n && a[r] $GT a[l]) $best = r;
    if (a[i] $GE a[$best]) return; // in order
    [a[i], a[$best]] = [a[$best], a[i]];
    i = $best;
  }
}
`;

const JS_BUILD = `
function buildHeap(a) {
  const n = a.length;
  // a[n/2 .. n-1] are leaves, already heaps
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--)
    siftDown(a, i, n);
}
`;

const JS: Record<OpCode, string> = {
  idle: `
const parent = (i) => Math.floor((i - 1) / 2);
const left = (i) => 2 * i + 1;
const right = (i) => 2 * i + 2;

// every parent $ge its children
function is$MHeap(a) {
  for (let i = 1; i < a.length; i++)
    if (a[parent(i)] $LT a[i]) return false;
  return true;
}
`,
  insert: `
function insert(a, key) {
  a.push(key); // a[n] ← key;  n ← n + 1
  siftUp(a, a.length - 1);
}
${JS_SIFT_UP}`,
  extract: `
function extract$M(a) {
  if (a.length === 0) throw new Error("empty heap");
  const top = a[0];
  const last = a.length - 1;
  // swap(a[0], a[n − 1]);  n ← n − 1
  [a[0], a[last]] = [a[last], a[0]];
  a.pop();
  siftDown(a, 0, a.length);
  return top;
}
${JS_SIFT_DOWN}`,
  peek: `
function peek$M(a) {
  if (a.length === 0) throw new Error("empty heap");
  return a[0]; // the root, O(1)
}
`,
  delete: `
function deleteAt(a, k) {
  const last = a.length - 1;
  // swap(a[k], a[n − 1]);  n ← n − 1
  [a[k], a[last]] = [a[last], a[k]];
  const removed = a.pop();
  const n = a.length;
  if (k === n) return removed; // was the last slot
  if (k > 0 && a[k] $GT a[Math.floor((k - 1) / 2)])
    siftUp(a, k);
  else
    siftDown(a, k, n);
  return removed;
}
${JS_SIFT_UP}${JS_SIFT_DOWN}`,
  update: `
function updateKey(a, k, key) {
  const old = a[k];
  a[k] = key;
  if (key $GT old) siftUp(a, k); // can only go up
  else if (key $LT old) siftDown(a, k, a.length);
}
${JS_SIFT_UP}${JS_SIFT_DOWN}`,
  build: `${JS_BUILD}${JS_SIFT_DOWN}`,
  sort: `
// sorts $order, in place
function heapSort(a) {
  buildHeap(a); // O(n)
  const n = a.length;
  for (let end = n - 1; end >= 1; end--) {
    // the $m moves to its final slot
    [a[0], a[end]] = [a[end], a[0]];
    siftDown(a, 0, end); // heap = a[0 .. end-1]
  }
}
${JS_BUILD}${JS_SIFT_DOWN}`,
};

const SOURCES: Record<CodeLang, Record<OpCode, string>> = { python: PY, cpp: CPP, java: JAVA, javascript: JS };

const tidy = (s: string) => s.replace(/\n{3,}/g, "\n\n").trim() + "\n";

const cache = new Map<string, Snippets>();

/** Python / C++ / Java / JS code for an operation, specialised to min / max (memoised: stable identity). */
export function implementationsFor(op: OpCode, kind: HeapKind): Snippets {
  const key = `${op}:${kind}`;
  let s = cache.get(key);
  if (!s) {
    s = {
      python: tidy(fill(SOURCES.python[op], kind)),
      cpp: tidy(fill(SOURCES.cpp[op], kind)),
      java: tidy(fill(SOURCES.java[op], kind)),
      javascript: tidy(fill(SOURCES.javascript[op], kind)),
    };
    cache.set(key, s);
  }
  return s;
}
