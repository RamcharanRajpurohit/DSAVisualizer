/** C++17 implementation, split so each operation's tab shows the shared class plus that operation. */
import type { LangParts } from "./types";

export const CPP: LangParts = {
  head: `#include <algorithm>
#include <utility>
#include <vector>

struct Node {
    bool leaf;
    std::vector<int> keys;          // sorted; at most m - 1 of them
    std::vector<Node*> children;    // keys.size() + 1 subtrees when internal
    explicit Node(bool leaf = true) : leaf(leaf) {}
};

class BTree {
public:
    int m, maxKeys, minKeys;        // order m: at most m children per node
    Node* root;

    explicit BTree(int m)
        : m(m), maxKeys(m - 1), minKeys((m + 1) / 2 - 1), root(new Node()) {}
    // minKeys = ceil(m/2) - 1, for every node but the root

    // i <- #keys in x below k: the child to follow / where k belongs
    static int rank(const Node* x, int k) {
        return std::lower_bound(x->keys.begin(), x->keys.end(), k) - x->keys.begin();
    }
`,

  search: `
    // Returns {node, index} of k, or {nullptr, -1} when k is not in the tree.
    std::pair<Node*, int> search(Node* x, int k) const {
        int i = rank(x, k);
        if (i < (int)x->keys.size() && x->keys[i] == k) return {x, i};   // found
        if (x->leaf) return {nullptr, -1};                                // NOT FOUND
        return search(x->children[i], k);         // exactly one subtree can hold k
    }
`,

  insert: `
    void insert(int k) {
        if (root->keys.empty()) {                 // empty tree: the root becomes leaf [k]
            root->keys.push_back(k);
            return;
        }
        Node* x = root;
        std::vector<std::pair<Node*, int>> path;  // (parent, child index) on the way down
        int i;
        for (;;) {                                // walk down
            i = rank(x, k);
            if (i < (int)x->keys.size() && x->keys[i] == k) return;   // already present
            if (x->leaf) break;
            path.push_back({x, i});
            x = x->children[i];
        }
        x->keys.insert(x->keys.begin() + i, k);   // insert k into x at i
        while ((int)x->keys.size() > maxKeys) {   // overflow: split around the median
            int mid = x->keys.size() / 2;
            int med = x->keys[mid];               // the middle key moves up
            Node* right = new Node(x->leaf);
            right->keys.assign(x->keys.begin() + mid + 1, x->keys.end());   // keys after med
            if (!x->leaf) {                       // ... and their children
                right->children.assign(x->children.begin() + mid + 1, x->children.end());
                x->children.resize(mid + 1);
            }
            x->keys.resize(mid);                  // x keeps the keys before med
            if (path.empty()) {                   // x is the root
                root = new Node(false);
                root->keys = {med};
                root->children = {x, right};
                return;                           // the tree grew one level taller
            }
            auto [p, j] = path.back();
            path.pop_back();
            p->keys.insert(p->keys.begin() + j, med);              // push med into the parent ...
            p->children.insert(p->children.begin() + j + 1, right); // ... and link the right node
            x = p;                                // the parent may overflow now
        }
    }
`,

  delete: `
    void remove(int k) {                          // "delete" is a C++ keyword
        Node* x = root;
        std::vector<std::pair<Node*, int>> path;  // (parent, child index) on the way down
        int i;
        for (;;) {                                // x, i <- search(T.root, k), remembering the path
            i = rank(x, k);
            if (i < (int)x->keys.size() && x->keys[i] == k) break;
            if (x->leaf) return;                  // not found
            path.push_back({x, i});
            x = x->children[i];
        }
        if (x->leaf) {
            x->keys.erase(x->keys.begin() + i);   // leaf case: just remove it
        } else {                                  // internal: replace k by its pred or succ
            // prefer the side whose leaf can spare a key (then no repair is needed)
            bool usePred = (int)replacementPath(x, i, true).second->keys.size() > minKeys ||
                           (int)replacementPath(x, i, false).second->keys.size() <= minKeys;
            auto [steps, leaf] = replacementPath(x, i, usePred);
            if (usePred) {                        // r moves up into k's slot
                x->keys[i] = leaf->keys.back();
                leaf->keys.pop_back();
            } else {
                x->keys[i] = leaf->keys.front();
                leaf->keys.erase(leaf->keys.begin());
            }
            path.insert(path.end(), steps.begin(), steps.end());
            x = leaf;                             // that leaf lost a key
        }
        while (!path.empty() && (int)x->keys.size() < minKeys) {   // underflow (x is not the root)
            auto [p, j] = path.back();            // x is p->children[j]
            path.pop_back();
            Node* L = j > 0 ? p->children[j - 1] : nullptr;
            Node* R = j + 1 < (int)p->children.size() ? p->children[j + 1] : nullptr;
            if (L && (int)L->keys.size() > minKeys) {         // borrow from the left sibling
                x->keys.insert(x->keys.begin(), p->keys[j - 1]);   // separator comes down
                p->keys[j - 1] = L->keys.back();                  // L's largest key goes up
                L->keys.pop_back();
                if (!x->leaf) {
                    x->children.insert(x->children.begin(), L->children.back());
                    L->children.pop_back();
                }
                break;
            }
            if (R && (int)R->keys.size() > minKeys) {         // borrow from the right sibling
                x->keys.push_back(p->keys[j]);                    // separator comes down
                p->keys[j] = R->keys.front();                     // R's smallest key goes up
                R->keys.erase(R->keys.begin());
                if (!x->leaf) {
                    x->children.push_back(R->children.front());
                    R->children.erase(R->children.begin());
                }
                break;
            }
            int a = L ? j - 1 : j;                // merge children a and a+1 with their separator
            Node* left = p->children[a];
            Node* right = p->children[a + 1];
            left->keys.push_back(p->keys[a]);
            left->keys.insert(left->keys.end(), right->keys.begin(), right->keys.end());
            left->children.insert(left->children.end(), right->children.begin(), right->children.end());
            p->keys.erase(p->keys.begin() + a);
            p->children.erase(p->children.begin() + a + 1);
            delete right;
            x = p;                                // p lost a key: check it next
        }
        if (root->keys.empty() && !root->leaf) {  // empty root: the tree gets one level shorter
            Node* old = root;
            root = root->children[0];
            delete old;
        }
    }

    // Walk to the leaf holding the predecessor (right-most) or successor (left-most) of x->keys[i].
    std::pair<std::vector<std::pair<Node*, int>>, Node*> replacementPath(Node* x, int i, bool pred) {
        int j = pred ? i : i + 1;
        std::vector<std::pair<Node*, int>> steps{{x, j}};
        Node* y = x->children[j];
        while (!y->leaf) {
            j = pred ? (int)y->children.size() - 1 : 0;
            steps.push_back({y, j});
            y = y->children[j];
        }
        return {steps, y};
    }
`,
  tail: "};\n",
};
