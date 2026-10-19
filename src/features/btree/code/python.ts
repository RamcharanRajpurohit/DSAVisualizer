/** Python implementation, split so each operation's tab shows the shared class plus that operation. */
import type { LangParts } from "./types";

export const PYTHON: LangParts = {
  head: `from bisect import bisect_left


class Node:
    def __init__(self, leaf=True):
        self.leaf = leaf
        self.keys = []      # sorted; at most m - 1 of them
        self.children = []  # len(keys) + 1 subtrees when internal


class BTree:
    def __init__(self, m):
        self.m = m                          # order: at most m children per node
        self.max_keys = m - 1
        self.min_keys = (m + 1) // 2 - 1    # ceil(m/2) - 1, for every node but the root
        self.root = Node()

    @staticmethod
    def rank(x, k):
        # i <- #keys in x below k: the child to follow / where k belongs
        return bisect_left(x.keys, k)
`,

  search: `
    def search(self, x, k):
        i = self.rank(x, k)
        if i < len(x.keys) and x.keys[i] == k:
            return x, i                         # found
        if x.leaf:
            return None                         # NOT FOUND
        return self.search(x.children[i], k)    # exactly one subtree can hold k
`,

  insert: `
    def insert(self, k):
        if not self.root.keys:                  # empty tree: the root becomes leaf [k]
            self.root.keys.append(k)
            return
        x, path = self.root, []                 # path: (parent, child index) on the way down
        while True:                             # walk down
            i = self.rank(x, k)
            if i < len(x.keys) and x.keys[i] == k:
                return                          # already present
            if x.leaf:
                break
            path.append((x, i))
            x = x.children[i]
        x.keys.insert(i, k)                     # insert k into x at i
        while len(x.keys) > self.max_keys:      # overflow: split around the median
            mid = len(x.keys) // 2
            med = x.keys[mid]                   # the middle key moves up
            right = Node(x.leaf)
            right.keys = x.keys[mid + 1:]       # keys after med (+ their children)
            if not x.leaf:
                right.children = x.children[mid + 1:]
                x.children = x.children[:mid + 1]
            x.keys = x.keys[:mid]               # x keeps the keys before med
            if not path:                        # x is the root
                self.root = Node(leaf=False)
                self.root.keys = [med]
                self.root.children = [x, right]
                return                          # the tree grew one level taller
            p, j = path.pop()
            p.keys.insert(j, med)               # push med into the parent ...
            p.children.insert(j + 1, right)     # ... and link the new right node
            x = p                               # the parent may overflow now
`,

  delete: `
    def delete(self, k):
        x, path = self.root, []                 # path: (parent, child index) on the way down
        while True:                             # x, i <- search(T.root, k), remembering the path
            i = self.rank(x, k)
            if i < len(x.keys) and x.keys[i] == k:
                break
            if x.leaf:
                return                          # not found
            path.append((x, i))
            x = x.children[i]
        if x.leaf:
            x.keys.pop(i)                       # leaf case: just remove it
        else:                                   # internal: replace k by its predecessor or successor
            # prefer the side whose leaf can spare a key (then no repair is needed)
            use_pred = (len(self.replacement_path(x, i, True)[1].keys) > self.min_keys
                        or len(self.replacement_path(x, i, False)[1].keys) <= self.min_keys)
            steps, leaf = self.replacement_path(x, i, use_pred)
            x.keys[i] = leaf.keys.pop() if use_pred else leaf.keys.pop(0)   # r moves up
            path += steps
            x = leaf                            # that leaf lost a key
        while path and len(x.keys) < self.min_keys:    # underflow (x is not the root)
            p, j = path.pop()                   # x is p.children[j]
            L = p.children[j - 1] if j > 0 else None
            R = p.children[j + 1] if j + 1 < len(p.children) else None
            if L and len(L.keys) > self.min_keys:       # borrow from the left sibling
                x.keys.insert(0, p.keys[j - 1])         # separator comes down into x
                p.keys[j - 1] = L.keys.pop()            # L's largest key goes up
                if not x.leaf:
                    x.children.insert(0, L.children.pop())
                break
            if R and len(R.keys) > self.min_keys:       # borrow from the right sibling
                x.keys.append(p.keys[j])                # separator comes down into x
                p.keys[j] = R.keys.pop(0)               # R's smallest key goes up
                if not x.leaf:
                    x.children.append(R.children.pop(0))
                break
            a = j - 1 if L else j               # merge children a and a+1 with their separator
            left, right = p.children[a], p.children[a + 1]
            left.keys += [p.keys.pop(a)] + right.keys
            left.children += right.children
            p.children.pop(a + 1)
            x = p                               # p lost a key: check it next
        if not self.root.keys and not self.root.leaf:
            self.root = self.root.children[0]   # empty root: the tree gets one level shorter

    def replacement_path(self, x, i, pred):
        # walk to the leaf holding the predecessor (right-most) or successor (left-most) of x.keys[i]
        j = i if pred else i + 1
        steps, y = [(x, j)], x.children[j]
        while not y.leaf:
            j = len(y.children) - 1 if pred else 0
            steps.append((y, j))
            y = y.children[j]
        return steps, y
`,
  tail: "",
};
