import type { HeapKind, OpCode } from "./types";

/** A pseudocode listing whose lines can be looked up by tag (so recorders never hard-code numbers). */
export interface Listing {
  readonly title: string;
  readonly lines: readonly string[];
  /** 1-based line number of a tagged line. */
  at(tag: string): number;
  has(tag: string): boolean;
}

type Row = string | readonly [tag: string, text: string];

function listing(title: string, rows: readonly Row[]): Listing {
  const lines: string[] = [];
  const tags = new Map<string, number>();
  for (const row of rows) {
    if (typeof row === "string") lines.push(row);
    else {
      tags.set(row[0], lines.length + 1);
      lines.push(row[1]);
    }
  }
  return {
    title,
    lines,
    at(tag) {
      const n = tags.get(tag);
      if (n === undefined) throw new Error(`pseudocode "${title}" has no line tagged "${tag}"`);
      return n;
    },
    has: (tag) => tags.has(tag),
  };
}

const sym = (k: HeapKind) =>
  k === "max"
    ? { gt: ">", lt: "<", ge: "≥", best: "largest", M: "Max", word: "maximum" }
    : { gt: "<", lt: ">", ge: "≤", best: "smallest", M: "Min", word: "minimum" };

function siftUpRows(k: HeapKind): Row[] {
  const s = sym(k);
  return [
    ["suHead", "siftUp(i):"],
    ["suLoop", "  while i > 0:"],
    ["suParent", "    p ← ⌊(i − 1) / 2⌋"],
    ["suCheck", `    if a[p] ${s.ge} a[i]: return`],
    ["suSwap", "    swap(a[i], a[p])"],
    ["suMove", "    i ← p"],
  ];
}

function siftDownRows(k: HeapKind): Row[] {
  const s = sym(k);
  return [
    ["sdHead", "siftDown(i):"],
    ["sdLoop", "  while 2i + 1 < n:"],
    ["sdKids", "    l ← 2i + 1;  r ← 2i + 2"],
    ["sdPickL", `    ${s.best} ← l`],
    ["sdPickR", `    if r < n and a[r] ${s.gt} a[l]:`],
    ["sdPickR2", `      ${s.best} ← r`],
    ["sdCheck", `    if a[i] ${s.ge} a[${s.best}]: return`],
    ["sdSwap", `    swap(a[i], a[${s.best}])`],
    ["sdMove", `    i ← ${s.best}`],
  ];
}

function make(op: OpCode, k: HeapKind): Listing {
  const s = sym(k);
  switch (op) {
    case "idle":
      return listing("Heap basics", [
        "// complete binary tree, stored level",
        "// by level in an array a[0 … n−1]",
        ["parent", "parent(i) = ⌊(i − 1) / 2⌋"],
        ["left", "left(i)   = 2i + 1"],
        ["right", "right(i)  = 2i + 2"],
        "",
        ["prop", `// ${k}-heap: a[parent(i)] ${s.ge} a[i]`],
        ["root", `// ⇒ a[0] is the ${s.word}`],
      ]);
    case "insert":
      return listing("insert + siftUp", [
        ["head", "insert(key):"],
        ["append", "  a[n] ← key"],
        ["grow", "  n ← n + 1"],
        ["call", "  siftUp(n − 1)"],
        "",
        ...siftUpRows(k),
      ]);
    case "extract":
      return listing(`extract${s.M} + siftDown`, [
        ["head", `extract${s.M}():`],
        ["empty", '  if n = 0: error "empty"'],
        ["top", "  top ← a[0]"],
        ["swap", "  swap(a[0], a[n − 1])"],
        ["shrink", "  n ← n − 1"],
        ["call", "  siftDown(0)"],
        ["ret", "  return top"],
        "",
        ...siftDownRows(k),
      ]);
    case "peek":
      return listing(`peek${s.M}`, [
        ["head", `peek${s.M}():`],
        ["empty", '  if n = 0: error "empty"'],
        ["ret", "  return a[0]       // O(1)"],
      ]);
    case "delete":
      return listing("deleteAt + sift", [
        ["head", "deleteAt(k):"],
        ["swap", "  swap(a[k], a[n − 1])"],
        ["shrink", "  n ← n − 1"],
        ["last", "  if k = n: return"],
        ["up", `  if k > 0 and a[k] ${s.gt} a[parent(k)]:`],
        ["callUp", "    siftUp(k)"],
        ["callDown", "  else: siftDown(k)"],
        "",
        ...siftUpRows(k),
        "",
        ...siftDownRows(k),
      ]);
    case "update":
      return listing("updateKey + sift", [
        ["head", "updateKey(k, key):"],
        ["set", "  old ← a[k];  a[k] ← key"],
        ["up", `  if key ${s.gt} old: siftUp(k)`],
        ["down", `  else if key ${s.lt} old: siftDown(k)`],
        "",
        ...siftUpRows(k),
        "",
        ...siftDownRows(k),
      ]);
    case "build":
      return listing("buildHeap (Floyd)", [
        ["head", "buildHeap(a):"],
        ["n", "  n ← length(a)"],
        ["leaves", "  // a[⌊n/2⌋ … n−1] are leaves"],
        ["loop", "  for i ← ⌊n/2⌋ − 1 downto 0:"],
        ["call", "    siftDown(i)"],
        "",
        ...siftDownRows(k),
      ]);
    case "sort":
      return listing("heapSort", [
        ["head", "heapSort(a):"],
        ["build", "  buildHeap(a)       // O(n)"],
        ["loop", "  for end ← n − 1 downto 1:"],
        ["swap", "    swap(a[0], a[end])"],
        ["shrink", "    n ← end"],
        ["call", "    siftDown(0)     // O(log n)"],
        "",
        ...siftDownRows(k),
      ]);
  }
}

const cache = new Map<string, Listing>();

/** Pseudocode for an operation, specialised to min / max comparisons (memoised: stable identity). */
export function listingFor(op: OpCode, kind: HeapKind): Listing {
  const key = `${op}:${kind}`;
  let l = cache.get(key);
  if (!l) cache.set(key, (l = make(op, kind)));
  return l;
}
