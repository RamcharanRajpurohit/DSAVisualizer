/**
 * Python versions of every listing in ../pseudocode.ts — same structure and variable names, so
 * each pseudocode line maps onto a line or two here. Verified by the scratchpad harness (it runs
 * these exact strings against the TS model). Keep relative imports only.
 */
import { src, type Snippets } from "./snippet";

const BST_NODE = `
class Node:
    def __init__(self, key):
        self.key = key
        self.left = None
        self.right = None
`;

const AVL_NODE = `
class Node:
    def __init__(self, key):
        self.key = key
        self.left = None
        self.right = None
        self.height = 1                # a leaf has height 1
        self.bf = 0                    # balance factor h(left) - h(right)


def h(n):
    return n.height if n else 0        # an empty subtree has height 0


def update(n):
    n.height = 1 + max(h(n.left), h(n.right))
    n.bf = h(n.left) - h(n.right)
`;

const REPLACE = `
def replace(root, parent, old, new):
    """Put \`new\` where \`old\` hangs under \`parent\`; returns the root."""
    if parent is None:
        return new                     # old was the root
    if parent.left is old:
        parent.left = new
    else:
        parent.right = new
    return root
`;

const traversal = (name: string, order: readonly ("left" | "visit" | "right")[]) => src(`
def ${name}(node, out):
    if node is None:
        return
${order.map((o) => (o === "visit" ? "    out.append(node.key)           # visit(node)" : `    ${name}(node.${o}, out)`)).join("\n")}


# usage: out = []; ${name}(root, out)
`);

export const PYTHON: Snippets = {
  "bst-insert": src(`${BST_NODE}

def insert(root, key):
    """Insert key; returns the (possibly new) root."""
    if root is None:
        return Node(key)               # empty tree: the new node is the root
    cur = root
    while cur is not None:
        if key == cur.key:
            return root                # duplicate: keys are unique
        parent = cur
        if key < cur.key:
            cur = cur.left
        else:
            cur = cur.right
    # fell off the tree below parent: hang a new leaf there
    if key < parent.key:
        parent.left = Node(key)
    else:
        parent.right = Node(key)
    return root
`),

  search: src(`
def search(root, key):
    cur = root
    while cur is not None:
        if key == cur.key:
            return cur
        if key < cur.key:
            cur = cur.left             # everything on the right is too big
        else:
            cur = cur.right            # everything on the left is too small
    return None                        # fell off the tree: key is absent
`),

  "bst-delete": src(`${REPLACE}

def delete(root, key):
    # z <- search(root, key), remembering z's parent
    parent, z = None, root
    while z is not None and z.key != key:
        parent = z
        z = z.left if key < z.key else z.right
    if z is None:
        return root                            # absent
    if z.left is None and z.right is None:     # case 1: leaf
        root = replace(root, parent, z, None)
    elif z.left is None or z.right is None:    # case 2: one child
        child = z.left if z.left is not None else z.right
        root = replace(root, parent, z, child)
    else:                                      # case 3: two children
        s_parent, s = z, z.right               # successor: right once,
        while s.left is not None:              # then all the way left
            s_parent, s = s, s.left
        if s is not z.right:
            s_parent.left = s.right            # s.right takes s's old place
            s.right = z.right
        s.left = z.left
        root = replace(root, parent, z, s)
    return root
`),

  "avl-insert": src(`${AVL_NODE}
${REPLACE}

def insert(root, key):
    if root is None:
        return Node(key)
    path = []                          # root ... parent, for the walk back up
    cur = root
    while cur is not None:
        if key == cur.key:
            return root                # duplicate
        parent = cur
        path.append(parent)
        if key < cur.key:
            cur = cur.left
        else:
            cur = cur.right
    if key < parent.key:
        parent.left = Node(key)
    else:
        parent.right = Node(key)
    return retrace(root, path)         # for n <- parent ... root


def retrace(root, path):
    """Walk back up path (root first): refresh heights, rotate where |bf| > 1."""
    for i in range(len(path) - 1, -1, -1):
        n = path[i]
        old_height = n.height
        hL, hR = h(n.left), h(n.right)
        n.height = 1 + max(hL, hR)
        n.bf = hL - hR
        if abs(n.bf) > 1:
            top = rebalance(n)         # see rebalance()
            root = replace(root, path[i - 1] if i > 0 else None, n, top)
            n = top
        if n.height == old_height:
            break                      # height unchanged: ancestors are fine
    return root
`),

  "avl-delete": src(`
def delete(root, key):
    # z <- search(root, key), remembering the path down to it
    path, z = [], root
    while z is not None and z.key != key:
        path.append(z)
        z = z.left if key < z.key else z.right
    if z is None:
        return root                            # absent
    parent = path[-1] if path else None
    if z.left is None and z.right is None:     # case 1: leaf
        root = replace(root, parent, z, None)
    elif z.left is None or z.right is None:    # case 2: one child
        child = z.left if z.left is not None else z.right
        root = replace(root, parent, z, child)
    else:                                      # case 3: two children
        below = []                             # z.right ... s's parent
        s = z.right
        while s.left is not None:
            below.append(s)
            s = s.left
        if s is not z.right:
            below[-1].left = s.right           # s.right takes s's old place
            s.right = z.right
        s.left = z.left
        s.height, s.bf = z.height, z.bf        # s takes z's spot (old height & bf)
        root = replace(root, parent, z, s)
        path += [s] + below                    # their subtrees changed too
    return retrace(root, path)                 # for n <- lowest changed ... root
`),

  preorder: traversal("preorder", ["visit", "left", "right"]),
  inorder: traversal("inorder", ["left", "visit", "right"]),
  postorder: traversal("postorder", ["left", "right", "visit"]),

  levelorder: src(`
from collections import deque


def level_order(root):
    out = []
    q = deque([root] if root else [])
    while q:
        node = q.popleft()
        out.append(node.key)           # visit(node)
        if node.left:
            q.append(node.left)
        if node.right:
            q.append(node.right)
    return out
`),

  rebalance: src(`
def rebalance(z):
    if z.bf > 1:                       # left-heavy
        if z.left.bf < 0:              # LR zig-zag
            z.left = rotate_left(z.left)
        return rotate_right(z)         # LL
    if z.bf < -1:                      # right-heavy
        if z.right.bf > 0:             # RL zig-zag
            z.right = rotate_right(z.right)
        return rotate_left(z)          # RR
    return z                           # balanced
`),

  rotateRight: src(`
def rotate_right(z):
    y = z.left                         # pivot
    T2 = y.right                       # moves over to z
    y.right = z                        # z goes down
    z.left = T2
    update(z)                          # z first: it is now below y
    update(y)
    return y                           # new root of this subtree
`),

  rotateLeft: src(`
def rotate_left(z):
    y = z.right                        # pivot
    T2 = y.left                        # moves over to z
    y.left = z                         # z goes down
    z.right = T2
    update(z)                          # z first: it is now below y
    update(y)
    return y                           # new root of this subtree
`),
};
