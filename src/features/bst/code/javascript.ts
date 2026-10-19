/**
 * JavaScript versions of every listing in ../pseudocode.ts (same structure and names). `delete`
 * is a reserved word in JS, so the delete listing is called remove().
 */
import { src, type Snippets } from "./snippet";

const BST_NODE = `
class Node {
  constructor(key) {
    this.key = key;
    this.left = null;
    this.right = null;
  }
}
`;

const AVL_NODE = `
class Node {
  constructor(key) {
    this.key = key;
    this.left = null;
    this.right = null;
    this.height = 1;                     // a leaf has height 1
    this.bf = 0;                         // balance factor h(left) - h(right)
  }
}

const h = (n) => (n ? n.height : 0);     // an empty subtree has height 0

function update(n) {
  n.height = 1 + Math.max(h(n.left), h(n.right));
  n.bf = h(n.left) - h(n.right);
}
`;

const REPLACE = `
// Put \`neu\` where \`old\` hangs under \`parent\`; returns the root.
function replace(root, parent, old, neu) {
  if (parent === null) return neu;       // old was the root
  if (parent.left === old) parent.left = neu;
  else parent.right = neu;
  return root;
}
`;

const traversal = (name: string, order: readonly ("left" | "visit" | "right")[]) => src(`
function ${name}(node, out = []) {
  if (node === null) return out;
${order.map((o) => (o === "visit" ? "  out.push(node.key);                   // visit(node)" : `  ${name}(node.${o}, out);`)).join("\n")}
  return out;
}
`);

const rotate = (dir: "Left" | "Right") => {
  // rotateRight: the left child y rises; rotateLeft mirrors it.
  const [inner, outer] = dir === "Right" ? ["right", "left"] : ["left", "right"];
  const pad = (code: string) => code.padEnd(41) + "// ";
  return src(`
function rotate${dir}(z) {
${pad(`  const y = z.${outer};`)}pivot
${pad(`  const T2 = y.${inner};`)}moves over to z
${pad(`  y.${inner} = z;`)}z goes down
  z.${outer} = T2;
  update(z);                             // z first: it is now below y
  update(y);
  return y;                              // new root of this subtree
}
`);
};

export const JAVASCRIPT: Snippets = {
  "bst-insert": src(`${BST_NODE}
// Insert key; returns the (possibly new) root.
function insert(root, key) {
  if (root === null) return new Node(key);  // empty tree: new root
  let cur = root;
  let parent = null;
  while (cur !== null) {
    if (key === cur.key) return root;    // duplicate: keys are unique
    parent = cur;
    if (key < cur.key) cur = cur.left;
    else cur = cur.right;
  }
  // fell off the tree below parent: hang a new leaf there
  if (key < parent.key) parent.left = new Node(key);
  else parent.right = new Node(key);
  return root;
}
`),

  search: src(`
function search(root, key) {
  let cur = root;
  while (cur !== null) {
    if (key === cur.key) return cur;
    if (key < cur.key) cur = cur.left;   // the right side is too big
    else cur = cur.right;                // the left side is too small
  }
  return null;                           // fell off the tree: absent
}
`),

  "bst-delete": src(`${REPLACE}
// delete(root, key) — \`delete\` is reserved in JS, so: remove.
function remove(root, key) {
  let parent = null;
  let z = root;                          // z <- search(root, key)
  while (z !== null && z.key !== key) {
    parent = z;
    z = key < z.key ? z.left : z.right;
  }
  if (z === null) return root;           // absent
  if (z.left === null && z.right === null) {         // case 1: leaf
    root = replace(root, parent, z, null);
  } else if (z.left === null || z.right === null) {  // case 2: one child
    const child = z.left !== null ? z.left : z.right;
    root = replace(root, parent, z, child);
  } else {                                           // case 3: two children
    let sParent = z;
    let s = z.right;                     // successor: right once,
    while (s.left !== null) {            // then all the way left
      sParent = s;
      s = s.left;
    }
    if (s !== z.right) {
      sParent.left = s.right;            // s.right takes s's old place
      s.right = z.right;
    }
    s.left = z.left;
    root = replace(root, parent, z, s);
  }
  return root;
}
`),

  "avl-insert": src(`${AVL_NODE}${REPLACE}
function insert(root, key) {
  if (root === null) return new Node(key);
  const path = [];                       // root ... parent, for the walk back up
  let cur = root;
  let parent = null;
  while (cur !== null) {
    if (key === cur.key) return root;    // duplicate
    parent = cur;
    path.push(parent);
    if (key < cur.key) cur = cur.left;
    else cur = cur.right;
  }
  if (key < parent.key) parent.left = new Node(key);
  else parent.right = new Node(key);
  return retrace(root, path);            // for n <- parent ... root
}

// Walk back up path (root first): refresh heights, rotate where |bf| > 1.
function retrace(root, path) {
  for (let i = path.length - 1; i >= 0; i--) {
    let n = path[i];
    const oldHeight = n.height;
    const hL = h(n.left), hR = h(n.right);
    n.height = 1 + Math.max(hL, hR);
    n.bf = hL - hR;
    if (Math.abs(n.bf) > 1) {
      const top = rebalance(n);          // see rebalance()
      root = replace(root, i > 0 ? path[i - 1] : null, n, top);
      n = top;
    }
    if (n.height === oldHeight) break;   // height unchanged: ancestors are fine
  }
  return root;
}
`),

  "avl-delete": src(`
// delete(root, key) — \`delete\` is reserved in JS, so: remove.
function remove(root, key) {
  const path = [];                       // root ... z's parent
  let z = root;                          // z <- search(root, key)
  while (z !== null && z.key !== key) {
    path.push(z);
    z = key < z.key ? z.left : z.right;
  }
  if (z === null) return root;           // absent
  const parent = path.length ? path[path.length - 1] : null;
  if (z.left === null && z.right === null) {         // case 1: leaf
    root = replace(root, parent, z, null);
  } else if (z.left === null || z.right === null) {  // case 2: one child
    const child = z.left !== null ? z.left : z.right;
    root = replace(root, parent, z, child);
  } else {                                           // case 3: two children
    const below = [];                    // z.right ... s's parent
    let s = z.right;
    while (s.left !== null) {
      below.push(s);
      s = s.left;
    }
    if (s !== z.right) {
      below[below.length - 1].left = s.right;  // s.right takes s's old place
      s.right = z.right;
    }
    s.left = z.left;
    s.height = z.height;                 // s takes z's spot: its old
    s.bf = z.bf;                         // height & bf until the retrace
    root = replace(root, parent, z, s);
    path.push(s, ...below);              // their subtrees changed too
  }
  return retrace(root, path);            // for n <- lowest changed ... root
}
`),

  preorder: traversal("preorder", ["visit", "left", "right"]),
  inorder: traversal("inorder", ["left", "visit", "right"]),
  postorder: traversal("postorder", ["left", "right", "visit"]),

  levelorder: src(`
function levelOrder(root) {
  const out = [];
  const q = root ? [root] : [];          // a queue: push at the back, shift from the front
  while (q.length > 0) {
    const node = q.shift();
    out.push(node.key);                  // visit(node)
    if (node.left) q.push(node.left);
    if (node.right) q.push(node.right);
  }
  return out;
}
`),

  rebalance: src(`
function rebalance(z) {
  if (z.bf > 1) {                        // left-heavy
    if (z.left.bf < 0)                   // LR zig-zag
      z.left = rotateLeft(z.left);
    return rotateRight(z);               // LL
  }
  if (z.bf < -1) {                       // right-heavy
    if (z.right.bf > 0)                  // RL zig-zag
      z.right = rotateRight(z.right);
    return rotateLeft(z);                // RR
  }
  return z;                              // balanced
}
`),

  rotateRight: rotate("Right"),
  rotateLeft: rotate("Left"),
};
