/** JavaScript implementation, split so each operation's tab shows the shared class plus that operation. */
import type { LangParts } from "./types";

export const JAVASCRIPT: LangParts = {
  head: `class Node {
  constructor(leaf = true) {
    this.leaf = leaf;
    this.keys = [];      // sorted; at most m - 1 of them
    this.children = [];  // keys.length + 1 subtrees when internal
  }
}

class BTree {
  constructor(m) {
    this.m = m;                           // order: at most m children per node
    this.maxKeys = m - 1;
    this.minKeys = Math.ceil(m / 2) - 1;  // for every node but the root
    this.root = new Node();
  }

  // i <- #keys in x below k: the child to follow / where k belongs
  static rank(x, k) {
    let i = 0;
    while (i < x.keys.length && x.keys[i] < k) i++;
    return i;
  }
`,

  search: `
  // Returns [node, index] of k, or null when k is not in the tree.
  search(x, k) {
    const i = BTree.rank(x, k);
    if (i < x.keys.length && x.keys[i] === k) return [x, i];  // found
    if (x.leaf) return null;                                   // NOT FOUND
    return this.search(x.children[i], k);   // exactly one subtree can hold k
  }
`,

  insert: `
  insert(k) {
    if (this.root.keys.length === 0) {      // empty tree: the root becomes leaf [k]
      this.root.keys.push(k);
      return;
    }
    let x = this.root, i;
    const path = [];                        // [parent, child index] on the way down
    for (;;) {                              // walk down
      i = BTree.rank(x, k);
      if (i < x.keys.length && x.keys[i] === k) return;   // already present
      if (x.leaf) break;
      path.push([x, i]);
      x = x.children[i];
    }
    x.keys.splice(i, 0, k);                 // insert k into x at i
    while (x.keys.length > this.maxKeys) {  // overflow: split around the median
      const mid = Math.floor(x.keys.length / 2);
      const med = x.keys[mid];              // the middle key moves up
      const right = new Node(x.leaf);
      right.keys = x.keys.slice(mid + 1);   // keys after med (+ their children)
      if (!x.leaf) right.children = x.children.splice(mid + 1);
      x.keys = x.keys.slice(0, mid);        // x keeps the keys before med
      if (path.length === 0) {              // x is the root
        this.root = new Node(false);
        this.root.keys = [med];
        this.root.children = [x, right];
        return;                             // the tree grew one level taller
      }
      const [p, j] = path.pop();
      p.keys.splice(j, 0, med);             // push med into the parent ...
      p.children.splice(j + 1, 0, right);   // ... and link the new right node
      x = p;                                // the parent may overflow now
    }
  }
`,

  delete: `
  delete(k) {
    let x = this.root, i;
    const path = [];                        // [parent, child index] on the way down
    for (;;) {                              // x, i <- search(T.root, k), remembering the path
      i = BTree.rank(x, k);
      if (i < x.keys.length && x.keys[i] === k) break;
      if (x.leaf) return;                   // not found
      path.push([x, i]);
      x = x.children[i];
    }
    if (x.leaf) {
      x.keys.splice(i, 1);                  // leaf case: just remove it
    } else {                                // internal: replace k by its pred or succ
      // prefer the side whose leaf can spare a key (then no repair is needed)
      const usePred = this.replacementPath(x, i, true).leaf.keys.length > this.minKeys ||
                      this.replacementPath(x, i, false).leaf.keys.length <= this.minKeys;
      const { steps, leaf } = this.replacementPath(x, i, usePred);
      x.keys[i] = usePred ? leaf.keys.pop() : leaf.keys.shift();   // r moves up into k's slot
      path.push(...steps);
      x = leaf;                             // that leaf lost a key
    }
    while (path.length > 0 && x.keys.length < this.minKeys) {   // underflow (x is not the root)
      const [p, j] = path.pop();            // x is p.children[j]
      const L = j > 0 ? p.children[j - 1] : null;
      const R = j + 1 < p.children.length ? p.children[j + 1] : null;
      if (L && L.keys.length > this.minKeys) {         // borrow from the left sibling
        x.keys.unshift(p.keys[j - 1]);                 // separator comes down into x
        p.keys[j - 1] = L.keys.pop();                  // L's largest key goes up
        if (!x.leaf) x.children.unshift(L.children.pop());
        break;
      }
      if (R && R.keys.length > this.minKeys) {         // borrow from the right sibling
        x.keys.push(p.keys[j]);                        // separator comes down into x
        p.keys[j] = R.keys.shift();                    // R's smallest key goes up
        if (!x.leaf) x.children.push(R.children.shift());
        break;
      }
      const a = L ? j - 1 : j;              // merge children a and a+1 with their separator
      const left = p.children[a], right = p.children[a + 1];
      left.keys.push(p.keys[a], ...right.keys);
      left.children.push(...right.children);
      p.keys.splice(a, 1);
      p.children.splice(a + 1, 1);
      x = p;                                // p lost a key: check it next
    }
    if (this.root.keys.length === 0 && !this.root.leaf) {
      this.root = this.root.children[0];    // empty root: the tree gets one level shorter
    }
  }

  // Walk to the leaf holding the predecessor (right-most) or successor (left-most) of x.keys[i].
  replacementPath(x, i, pred) {
    let j = pred ? i : i + 1;
    const steps = [[x, j]];
    let y = x.children[j];
    while (!y.leaf) {
      j = pred ? y.children.length - 1 : 0;
      steps.push([y, j]);
      y = y.children[j];
    }
    return { steps, leaf: y };
  }
`,
  tail: "}\n",
};
