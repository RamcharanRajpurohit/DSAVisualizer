/**
 * Pseudocode for each B-tree operation. Lines are tagged so the engine can highlight
 * them by name (`at("overflow")`) instead of by fragile line numbers.
 */

export type OpKind = "insert" | "search" | "delete";

type Src<T extends string> = readonly (readonly [T | "", string])[];

function listing<T extends string>(src: Src<T>) {
  const code = src.map(([, text]) => text);
  const at = {} as Record<T, number>;
  src.forEach(([tag], i) => {
    if (tag) at[tag as T] = i + 1;
  });
  return { code, at };
}

const INSERT = listing([
  ["sig", "insert(T, k):"],
  ["empty", "  if T is empty:"],
  ["emptyRoot", "    T.root ← leaf [k]; return"],
  ["start", "  x ← T.root"],
  ["loop", "  loop:                 // walk down"],
  ["index", "    i ← #keys in x below k"],
  ["dup", "    if x.key[i] = k: return"],
  ["leafBrk", "    if x is a leaf: break"],
  ["down", "    x ← x.child[i]"],
  ["place", "  insert k into x at i"],
  ["overflow", "  while x.n > maxKeys:  // overflow"],
  ["median", "    m ← middle key of x"],
  ["divide", "    right ← keys after m (+kids)"],
  ["keepLeft", "    x keeps keys before m"],
  ["isRoot", "    if x is the root:"],
  ["newRoot", "      T.root ← [m] over (x, right)"],
  ["grow", "      return            // taller"],
  ["toParent", "    push m into parent p, link right"],
  ["climb", "    x ← p               // may overflow"],
] as const);

const SEARCH = listing([
  ["sig", "search(x, k):"],
  ["index", "  i ← #keys in x below k"],
  ["hit", "  if i < x.n and x.key[i] = k:"],
  ["found", "    return (x, i)        // found"],
  ["leaf", "  if x is a leaf:"],
  ["miss", "    return NOT FOUND"],
  ["down", "  return search(x.child[i], k)"],
] as const);

const DELETE = listing([
  ["sig", "delete(T, k):"],
  ["find", "  x, i ← search(T.root, k)"],
  ["missing", "  if not found: return"],
  ["isLeaf", "  if x is a leaf:"],
  ["leafDel", "    remove x.key[i]      // leaf case"],
  ["internal", "  else:                  // internal"],
  ["pred", "    r ← max of left subtree (pred)"],
  ["succ", "     or min of right subtree (succ)"],
  ["replace", "    x.key[i] ← r; remove r from leaf"],
  ["toLeaf", "    x ← that leaf"],
  ["under", "  while x ≠ root and x.n < min:"],
  ["parent", "    p ← parent(x)"],
  ["canL", "    if left sibling L.n > min:"],
  ["borrowL", "      sep ↓ into x, L.max ↑ into p"],
  ["doneL", "      break          // borrow-left"],
  ["canR", "    if right sibling R.n > min:"],
  ["borrowR", "      sep ↓ into x, R.min ↑ into p"],
  ["doneR", "      break          // borrow-right"],
  ["merge", "    merge x + sep + sibling"],
  ["up", "    x ← p             // p lost a key"],
  ["shrink", "  if root is empty and has a child:"],
  ["newRoot", "    T.root ← root.child[0] // shorter"],
] as const);

export const CODE = { insert: INSERT, search: SEARCH, delete: DELETE } as const;

export type CodeTag<K extends OpKind> = keyof (typeof CODE)[K]["at"];

export const OP_TITLE: Record<OpKind, string> = {
  insert: "insert",
  search: "search",
  delete: "delete",
};
