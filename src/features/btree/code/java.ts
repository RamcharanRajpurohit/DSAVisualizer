/** Java implementation, split so each operation's tab shows the shared class plus that operation. */
import type { LangParts } from "./types";

export const JAVA: LangParts = {
  head: `import java.util.ArrayList;
import java.util.List;

class BTree {
    static class Node {
        boolean leaf;
        List<Integer> keys = new ArrayList<>();   // sorted; at most m - 1 of them
        List<Node> children = new ArrayList<>();  // keys.size() + 1 subtrees when internal
        Node(boolean leaf) { this.leaf = leaf; }
    }

    /** One step of a root-to-node walk: from node we went into node.children[i]. */
    record Step(Node node, int i) {}

    final int m, maxKeys, minKeys;  // order m: at most m children per node
    Node root = new Node(true);

    BTree(int m) {
        this.m = m;
        this.maxKeys = m - 1;
        this.minKeys = (m + 1) / 2 - 1;   // ceil(m/2) - 1, for every node but the root
    }

    // i <- #keys in x below k: the child to follow / where k belongs
    static int rank(Node x, int k) {
        int i = 0;
        while (i < x.keys.size() && x.keys.get(i) < k) i++;
        return i;
    }
`,

  search: `
    /** The node holding k and its index, or null when k is not in the tree. */
    Step search(Node x, int k) {
        int i = rank(x, k);
        if (i < x.keys.size() && x.keys.get(i) == k) return new Step(x, i);   // found
        if (x.leaf) return null;                                             // NOT FOUND
        return search(x.children.get(i), k);      // exactly one subtree can hold k
    }
`,

  insert: `
    void insert(int k) {
        if (root.keys.isEmpty()) {                // empty tree: the root becomes leaf [k]
            root.keys.add(k);
            return;
        }
        Node x = root;
        List<Step> path = new ArrayList<>();      // (parent, child index) on the way down
        int i;
        while (true) {                            // walk down
            i = rank(x, k);
            if (i < x.keys.size() && x.keys.get(i) == k) return;   // already present
            if (x.leaf) break;
            path.add(new Step(x, i));
            x = x.children.get(i);
        }
        x.keys.add(i, k);                         // insert k into x at i
        while (x.keys.size() > maxKeys) {         // overflow: split around the median
            int mid = x.keys.size() / 2;
            int med = x.keys.get(mid);            // the middle key moves up
            Node right = new Node(x.leaf);
            right.keys.addAll(x.keys.subList(mid + 1, x.keys.size()));   // keys after med
            if (!x.leaf) {                        // ... and their children
                right.children.addAll(x.children.subList(mid + 1, x.children.size()));
                x.children.subList(mid + 1, x.children.size()).clear();
            }
            x.keys.subList(mid, x.keys.size()).clear();   // x keeps the keys before med
            if (path.isEmpty()) {                 // x is the root
                root = new Node(false);
                root.keys.add(med);
                root.children.add(x);
                root.children.add(right);
                return;                           // the tree grew one level taller
            }
            Step up = path.remove(path.size() - 1);
            Node p = up.node();
            int j = up.i();
            p.keys.add(j, med);                   // push med into the parent ...
            p.children.add(j + 1, right);         // ... and link the new right node
            x = p;                                // the parent may overflow now
        }
    }
`,

  delete: `
    void delete(int k) {
        Node x = root;
        List<Step> path = new ArrayList<>();      // (parent, child index) on the way down
        int i;
        while (true) {                            // x, i <- search(T.root, k), remembering the path
            i = rank(x, k);
            if (i < x.keys.size() && x.keys.get(i) == k) break;
            if (x.leaf) return;                   // not found
            path.add(new Step(x, i));
            x = x.children.get(i);
        }
        if (x.leaf) {
            x.keys.remove(i);                     // leaf case: just remove it
        } else {                                  // internal: replace k by its pred or succ
            // prefer the side whose leaf can spare a key (then no repair is needed)
            boolean usePred = leafOf(replacementPath(x, i, true)).keys.size() > minKeys
                           || leafOf(replacementPath(x, i, false)).keys.size() <= minKeys;
            List<Step> steps = replacementPath(x, i, usePred);
            Node leaf = leafOf(steps);
            int r = usePred ? leaf.keys.remove(leaf.keys.size() - 1) : leaf.keys.remove(0);
            x.keys.set(i, r);                     // r moves up into k's slot
            path.addAll(steps);
            x = leaf;                             // that leaf lost a key
        }
        while (!path.isEmpty() && x.keys.size() < minKeys) {   // underflow (x is not the root)
            Step up = path.remove(path.size() - 1);
            Node p = up.node();
            int j = up.i();                       // x is p.children[j]
            Node L = j > 0 ? p.children.get(j - 1) : null;
            Node R = j + 1 < p.children.size() ? p.children.get(j + 1) : null;
            if (L != null && L.keys.size() > minKeys) {          // borrow from the left sibling
                x.keys.add(0, p.keys.get(j - 1));                // separator comes down into x
                p.keys.set(j - 1, L.keys.remove(L.keys.size() - 1));   // L's largest key goes up
                if (!x.leaf) x.children.add(0, L.children.remove(L.children.size() - 1));
                break;
            }
            if (R != null && R.keys.size() > minKeys) {          // borrow from the right sibling
                x.keys.add(p.keys.get(j));                       // separator comes down into x
                p.keys.set(j, R.keys.remove(0));                 // R's smallest key goes up
                if (!x.leaf) x.children.add(R.children.remove(0));
                break;
            }
            int a = L != null ? j - 1 : j;        // merge children a and a+1 with their separator
            Node left = p.children.get(a), right = p.children.get(a + 1);
            left.keys.add(p.keys.remove(a));
            left.keys.addAll(right.keys);
            left.children.addAll(right.children);
            p.children.remove(a + 1);
            x = p;                                // p lost a key: check it next
        }
        if (root.keys.isEmpty() && !root.leaf) {
            root = root.children.get(0);          // empty root: the tree gets one level shorter
        }
    }

    // Walk to the leaf holding the predecessor (right-most) or successor (left-most) of x.keys[i].
    List<Step> replacementPath(Node x, int i, boolean pred) {
        List<Step> steps = new ArrayList<>();
        int j = pred ? i : i + 1;
        steps.add(new Step(x, j));
        Node y = x.children.get(j);
        while (!y.leaf) {
            j = pred ? y.children.size() - 1 : 0;
            steps.add(new Step(y, j));
            y = y.children.get(j);
        }
        return steps;
    }

    static Node leafOf(List<Step> steps) {
        Step last = steps.get(steps.size() - 1);
        return last.node().children.get(last.i());
    }
`,
  tail: "}\n",
};
