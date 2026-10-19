/**
 * Java versions of every listing in ../pseudocode.ts (same structure and names). The functions
 * are methods of your tree class; Node is a (nested) class next to them.
 */
import { src, type Snippets } from "./snippet";

const BST_NODE = `
class Node {
    int key;
    Node left, right;
    Node(int key) { this.key = key; }
}
`;

const AVL_NODE = `
import java.util.*;

class Node {
    int key;
    Node left, right;
    int height = 1;                             // a leaf has height 1
    int bf = 0;                                 // balance factor h(left) - h(right)
    Node(int key) { this.key = key; }
}

int h(Node n) { return n != null ? n.height : 0; }  // empty subtree: 0

void update(Node n) {
    n.height = 1 + Math.max(h(n.left), h(n.right));
    n.bf = h(n.left) - h(n.right);
}
`;

const REPLACE = `
// Put \`neu\` where \`old\` hangs under \`parent\`; returns the root.
Node replace(Node root, Node parent, Node old, Node neu) {
    if (parent == null) return neu;             // old was the root
    if (parent.left == old) parent.left = neu;
    else parent.right = neu;
    return root;
}
`;

const traversal = (name: string, order: readonly ("left" | "visit" | "right")[]) => src(`
import java.util.*;

void ${name}(Node node, List<Integer> out) {
    if (node == null) return;
${order.map((o) => (o === "visit" ? "    out.add(node.key);                          // visit(node)" : `    ${name}(node.${o}, out);`)).join("\n")}
}
`);

const rotate = (dir: "Left" | "Right") => {
  // rotateRight: the left child y rises; rotateLeft mirrors it.
  const [inner, outer] = dir === "Right" ? ["right", "left"] : ["left", "right"];
  const pad = (code: string) => code.padEnd(48) + "// ";
  return src(`
Node rotate${dir}(Node z) {
${pad(`    Node y = z.${outer};`)}pivot
${pad(`    Node T2 = y.${inner};`)}moves over to z
${pad(`    y.${inner} = z;`)}z goes down
    z.${outer} = T2;
    update(z);                                  // z first: it is now below y
    update(y);
    return y;                                   // new root of this subtree
}
`);
};

export const JAVA: Snippets = {
  "bst-insert": src(`${BST_NODE}
// Insert key; returns the (possibly new) root.
Node insert(Node root, int key) {
    if (root == null) return new Node(key);     // empty tree: new root
    Node cur = root, parent = null;
    while (cur != null) {
        if (key == cur.key) return root;        // duplicate: keys are unique
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
Node search(Node root, int key) {
    Node cur = root;
    while (cur != null) {
        if (key == cur.key) return cur;
        if (key < cur.key) cur = cur.left;      // the right side is too big
        else cur = cur.right;                   // the left side is too small
    }
    return null;                                // fell off the tree: absent
}
`),

  "bst-delete": src(`${REPLACE}
Node delete(Node root, int key) {
    Node parent = null, z = root;               // z <- search(root, key)
    while (z != null && z.key != key) {
        parent = z;
        z = key < z.key ? z.left : z.right;
    }
    if (z == null) return root;                 // absent
    if (z.left == null && z.right == null) {           // case 1: leaf
        root = replace(root, parent, z, null);
    } else if (z.left == null || z.right == null) {    // case 2: one child
        Node child = z.left != null ? z.left : z.right;
        root = replace(root, parent, z, child);
    } else {                                           // case 3: two children
        Node sParent = z, s = z.right;          // successor: right once,
        while (s.left != null) {                // then all the way left
            sParent = s;
            s = s.left;
        }
        if (s != z.right) {
            sParent.left = s.right;             // s.right takes s's old place
            s.right = z.right;
        }
        s.left = z.left;
        root = replace(root, parent, z, s);
    }
    return root;
}
`),

  "avl-insert": src(`${AVL_NODE}${REPLACE}
Node insert(Node root, int key) {
    if (root == null) return new Node(key);
    List<Node> path = new ArrayList<>();        // root ... parent, for the walk back up
    Node cur = root, parent = null;
    while (cur != null) {
        if (key == cur.key) return root;        // duplicate
        parent = cur;
        path.add(parent);
        if (key < cur.key) cur = cur.left;
        else cur = cur.right;
    }
    if (key < parent.key) parent.left = new Node(key);
    else parent.right = new Node(key);
    return retrace(root, path);                 // for n <- parent ... root
}

// Walk back up path (root first): refresh heights, rotate where |bf| > 1.
Node retrace(Node root, List<Node> path) {
    for (int i = path.size() - 1; i >= 0; i--) {
        Node n = path.get(i);
        int oldHeight = n.height;
        int hL = h(n.left), hR = h(n.right);
        n.height = 1 + Math.max(hL, hR);
        n.bf = hL - hR;
        if (Math.abs(n.bf) > 1) {
            Node top = rebalance(n);            // see rebalance()
            root = replace(root, i > 0 ? path.get(i - 1) : null, n, top);
            n = top;
        }
        if (n.height == oldHeight) break;       // height unchanged: ancestors are fine
    }
    return root;
}
`),

  "avl-delete": src(`
Node delete(Node root, int key) {
    List<Node> path = new ArrayList<>();        // root ... z's parent
    Node z = root;                              // z <- search(root, key)
    while (z != null && z.key != key) {
        path.add(z);
        z = key < z.key ? z.left : z.right;
    }
    if (z == null) return root;                 // absent
    Node parent = path.isEmpty() ? null : path.get(path.size() - 1);
    if (z.left == null && z.right == null) {           // case 1: leaf
        root = replace(root, parent, z, null);
    } else if (z.left == null || z.right == null) {    // case 2: one child
        Node child = z.left != null ? z.left : z.right;
        root = replace(root, parent, z, child);
    } else {                                           // case 3: two children
        List<Node> below = new ArrayList<>();   // z.right ... s's parent
        Node s = z.right;
        while (s.left != null) {
            below.add(s);
            s = s.left;
        }
        if (s != z.right) {
            below.get(below.size() - 1).left = s.right;  // s.right takes s's old place
            s.right = z.right;
        }
        s.left = z.left;
        s.height = z.height;                    // s takes z's spot: its old
        s.bf = z.bf;                            // height & bf until the retrace
        root = replace(root, parent, z, s);
        path.add(s);                            // their subtrees changed too
        path.addAll(below);
    }
    return retrace(root, path);                 // for n <- lowest changed ... root
}
`),

  preorder: traversal("preorder", ["visit", "left", "right"]),
  inorder: traversal("inorder", ["left", "visit", "right"]),
  postorder: traversal("postorder", ["left", "right", "visit"]),

  levelorder: src(`
import java.util.*;

List<Integer> levelOrder(Node root) {
    List<Integer> out = new ArrayList<>();
    Deque<Node> q = new ArrayDeque<>();
    if (root != null) q.add(root);
    while (!q.isEmpty()) {
        Node node = q.poll();
        out.add(node.key);                      // visit(node)
        if (node.left != null) q.add(node.left);
        if (node.right != null) q.add(node.right);
    }
    return out;
}
`),

  rebalance: src(`
Node rebalance(Node z) {
    if (z.bf > 1) {                             // left-heavy
        if (z.left.bf < 0)                      // LR zig-zag
            z.left = rotateLeft(z.left);
        return rotateRight(z);                  // LL
    }
    if (z.bf < -1) {                            // right-heavy
        if (z.right.bf > 0)                     // RL zig-zag
            z.right = rotateRight(z.right);
        return rotateLeft(z);                   // RR
    }
    return z;                                   // balanced
}
`),

  rotateRight: rotate("Right"),
  rotateLeft: rotate("Left"),
};
