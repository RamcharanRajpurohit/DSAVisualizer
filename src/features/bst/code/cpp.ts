/**
 * C++17 versions of every listing in ../pseudocode.ts (same structure and names). `delete` is a
 * C++ keyword, so the delete listing is called erase() — like std::map::erase.
 */
import { src, type Snippets } from "./snippet";

const BST_NODE = `
struct Node {
    int key;
    Node* left = nullptr;
    Node* right = nullptr;
    explicit Node(int k) : key(k) {}
};
`;

const AVL_NODE = `
#include <algorithm>
#include <cstdlib>
#include <vector>

struct Node {
    int key;
    Node* left = nullptr;
    Node* right = nullptr;
    int height = 1;                             // a leaf has height 1
    int bf = 0;                                 // balance factor h(left) - h(right)
    explicit Node(int k) : key(k) {}
};

int h(Node* n) { return n != nullptr ? n->height : 0; }  // empty subtree: 0

void update(Node* n) {
    n->height = 1 + std::max(h(n->left), h(n->right));
    n->bf = h(n->left) - h(n->right);
}
`;

const REPLACE = `
// Put \`neu\` where \`old\` hangs under \`parent\`; returns the root.
Node* replace(Node* root, Node* parent, Node* old, Node* neu) {
    if (parent == nullptr) return neu;          // old was the root
    if (parent->left == old) parent->left = neu;
    else parent->right = neu;
    return root;
}
`;

const traversal = (name: string, order: readonly ("left" | "visit" | "right")[]) => src(`
#include <vector>

void ${name}(Node* node, std::vector<int>& out) {
    if (node == nullptr) return;
${order.map((o) => (o === "visit" ? "    out.push_back(node->key);                   // visit(node)" : `    ${name}(node->${o}, out);`)).join("\n")}
}
`);

const rotate = (dir: "Left" | "Right") => {
  // rotateRight: the left child y rises; rotateLeft mirrors it.
  const [inner, outer] = dir === "Right" ? ["right", "left"] : ["left", "right"];
  const pad = (code: string) => code.padEnd(48) + "// ";
  return src(`
Node* rotate${dir}(Node* z) {
${pad(`    Node* y = z->${outer};`)}pivot
${pad(`    Node* T2 = y->${inner};`)}moves over to z
${pad(`    y->${inner} = z;`)}z goes down
    z->${outer} = T2;
    update(z);                                  // z first: it is now below y
    update(y);
    return y;                                   // new root of this subtree
}
`);
};

export const CPP: Snippets = {
  "bst-insert": src(`${BST_NODE}
// Insert key; returns the (possibly new) root.
Node* insert(Node* root, int key) {
    if (root == nullptr) return new Node(key);  // empty tree: new root
    Node* cur = root;
    Node* parent = nullptr;
    while (cur != nullptr) {
        if (key == cur->key) return root;       // duplicate: keys are unique
        parent = cur;
        if (key < cur->key) cur = cur->left;
        else cur = cur->right;
    }
    // fell off the tree below parent: hang a new leaf there
    if (key < parent->key) parent->left = new Node(key);
    else parent->right = new Node(key);
    return root;
}
`),

  search: src(`
Node* search(Node* root, int key) {
    Node* cur = root;
    while (cur != nullptr) {
        if (key == cur->key) return cur;
        if (key < cur->key) cur = cur->left;    // the right side is too big
        else cur = cur->right;                  // the left side is too small
    }
    return nullptr;                             // fell off the tree: absent
}
`),

  "bst-delete": src(`${REPLACE}
// delete(root, key) — \`delete\` is a C++ keyword, so: erase.
Node* erase(Node* root, int key) {
    Node* parent = nullptr;
    Node* z = root;                             // z <- search(root, key)
    while (z != nullptr && z->key != key) {
        parent = z;
        z = key < z->key ? z->left : z->right;
    }
    if (z == nullptr) return root;              // absent
    if (z->left == nullptr && z->right == nullptr) {         // case 1: leaf
        root = replace(root, parent, z, nullptr);
    } else if (z->left == nullptr || z->right == nullptr) {  // case 2: one child
        Node* child = z->left != nullptr ? z->left : z->right;
        root = replace(root, parent, z, child);
    } else {                                                 // case 3: two children
        Node* sParent = z;
        Node* s = z->right;                     // successor: right once,
        while (s->left != nullptr) {            // then all the way left
            sParent = s;
            s = s->left;
        }
        if (s != z->right) {
            sParent->left = s->right;           // s->right takes s's old place
            s->right = z->right;
        }
        s->left = z->left;
        root = replace(root, parent, z, s);
    }
    delete z;                                   // free the unlinked node
    return root;
}
`),

  "avl-insert": src(`${AVL_NODE}${REPLACE}
Node* rebalance(Node* z);                       // see rebalance()
Node* retrace(Node* root, const std::vector<Node*>& path);

Node* insert(Node* root, int key) {
    if (root == nullptr) return new Node(key);
    std::vector<Node*> path;                    // root ... parent, for the walk back up
    Node* cur = root;
    Node* parent = nullptr;
    while (cur != nullptr) {
        if (key == cur->key) return root;       // duplicate
        parent = cur;
        path.push_back(parent);
        if (key < cur->key) cur = cur->left;
        else cur = cur->right;
    }
    if (key < parent->key) parent->left = new Node(key);
    else parent->right = new Node(key);
    return retrace(root, path);                 // for n <- parent ... root
}

// Walk back up path (root first): refresh heights, rotate where |bf| > 1.
Node* retrace(Node* root, const std::vector<Node*>& path) {
    for (int i = static_cast<int>(path.size()) - 1; i >= 0; i--) {
        Node* n = path[i];
        int oldHeight = n->height;
        int hL = h(n->left), hR = h(n->right);
        n->height = 1 + std::max(hL, hR);
        n->bf = hL - hR;
        if (std::abs(n->bf) > 1) {
            Node* top = rebalance(n);
            root = replace(root, i > 0 ? path[i - 1] : nullptr, n, top);
            n = top;
        }
        if (n->height == oldHeight) break;      // height unchanged: ancestors are fine
    }
    return root;
}
`),

  "avl-delete": src(`
// delete(root, key) — \`delete\` is a C++ keyword, so: erase.
Node* erase(Node* root, int key) {
    std::vector<Node*> path;                    // root ... z's parent
    Node* z = root;                             // z <- search(root, key)
    while (z != nullptr && z->key != key) {
        path.push_back(z);
        z = key < z->key ? z->left : z->right;
    }
    if (z == nullptr) return root;              // absent
    Node* parent = path.empty() ? nullptr : path.back();
    if (z->left == nullptr && z->right == nullptr) {         // case 1: leaf
        root = replace(root, parent, z, nullptr);
    } else if (z->left == nullptr || z->right == nullptr) {  // case 2: one child
        Node* child = z->left != nullptr ? z->left : z->right;
        root = replace(root, parent, z, child);
    } else {                                                 // case 3: two children
        std::vector<Node*> below;               // z->right ... s's parent
        Node* s = z->right;
        while (s->left != nullptr) {
            below.push_back(s);
            s = s->left;
        }
        if (s != z->right) {
            below.back()->left = s->right;      // s->right takes s's old place
            s->right = z->right;
        }
        s->left = z->left;
        s->height = z->height;                  // s takes z's spot: its old
        s->bf = z->bf;                          // height & bf until the retrace
        root = replace(root, parent, z, s);
        path.push_back(s);                      // their subtrees changed too
        path.insert(path.end(), below.begin(), below.end());
    }
    delete z;                                   // free the unlinked node
    return retrace(root, path);                 // for n <- lowest changed ... root
}
`),

  preorder: traversal("preorder", ["visit", "left", "right"]),
  inorder: traversal("inorder", ["left", "visit", "right"]),
  postorder: traversal("postorder", ["left", "right", "visit"]),

  levelorder: src(`
#include <queue>
#include <vector>

std::vector<int> levelOrder(Node* root) {
    std::vector<int> out;
    std::queue<Node*> q;
    if (root != nullptr) q.push(root);
    while (!q.empty()) {
        Node* node = q.front();
        q.pop();
        out.push_back(node->key);               // visit(node)
        if (node->left != nullptr) q.push(node->left);
        if (node->right != nullptr) q.push(node->right);
    }
    return out;
}
`),

  rebalance: src(`
Node* rotateLeft(Node* z);                      // see rotateLeft()
Node* rotateRight(Node* z);                     // see rotateRight()

Node* rebalance(Node* z) {
    if (z->bf > 1) {                            // left-heavy
        if (z->left->bf < 0)                    // LR zig-zag
            z->left = rotateLeft(z->left);
        return rotateRight(z);                  // LL
    }
    if (z->bf < -1) {                           // right-heavy
        if (z->right->bf > 0)                   // RL zig-zag
            z->right = rotateRight(z->right);
        return rotateLeft(z);                   // RR
    }
    return z;                                   // balanced
}
`),

  rotateRight: rotate("Right"),
  rotateLeft: rotate("Left"),
};
