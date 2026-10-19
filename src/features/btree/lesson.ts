import type { Lesson } from "@/lib/lesson";

/** Guided B-tree lesson; the action ids are implemented by BTreeVisualizer. */
export const BTREE_LESSON: Lesson = {
  id: "btree",
  title: "B-Trees",
  slides: [
    {
      title: "Why B-trees?",
      body:
        "Reading one disk page costs as much as thousands of comparisons, so an index must touch as few nodes as possible. " +
        "A B-tree packs many sorted keys into each node — one page — so billions of keys sit only **3–4 levels** deep. " +
        "That is why databases and file systems are built on them.",
      tryIt: [{ label: "Load the sample tree", action: "sample" }],
    },
    {
      title: "Order m: the rules",
      body:
        "Order **m**: a node has at most **m** children and **m − 1** sorted keys; every non-root node keeps at least **⌈m/2⌉ − 1**. " +
        "Child `i` holds exactly the keys between `key[i−1]` and `key[i]`. " +
        "All leaves sit on the **same level** — always.",
      tryIt: [
        { label: "Switch to order 5", action: "order5" },
        { label: "Back to order 3", action: "order3" },
      ],
    },
    {
      title: "Search",
      body:
        "In each node find the first key ≥ x: equal means found, otherwise follow the pointer just left of it. " +
        "Only one subtree can hold x, so a search reads **one node per level** — O(log n) pages.",
      tryIt: [
        { label: "Search for 55", action: "search55" },
        { label: "Search a missing key", action: "searchMiss" },
      ],
    },
    {
      title: "Insert and split",
      body:
        "A new key always goes into a **leaf**. A leaf that reaches m keys **splits**: the middle key moves up and the halves become siblings. " +
        "If the parent overflows the split climbs — a root split is the only way the tree grows taller.",
      tryIt: [
        { label: "Insert 36, 37 and watch the split", action: "split" },
        { label: "Insert sorted keys", action: "sorted" },
      ],
    },
    {
      title: "Delete: borrow or merge",
      body:
        "An internal key is replaced by its **predecessor** or **successor** from a leaf. " +
        "A node left below the minimum **borrows** a key through the parent from a richer sibling; " +
        "if neither sibling can spare one it **merges** with a sibling and their separator.",
      tryIt: [
        { label: "Delete a key that borrows", action: "borrow" },
        { label: "Delete a key that forces a merge", action: "merge" },
        { label: "Delete the root key", action: "internal" },
      ],
    },
    {
      title: "Height and cost",
      body:
        "Every non-root node has ≥ ⌈m/2⌉ children, so height ≤ log⌈m/2⌉((n+1)/2) + 1 levels. " +
        "Each operation touches O(1) nodes per level: **O(log n)** time, only O(log_m n) disk reads. " +
        "Merges can cascade to the root — the only way the tree gets shorter.",
      tryIt: [
        { label: "Merges cascade: delete 5", action: "cascade" },
        { label: "Big tree at order 7", action: "big" },
      ],
    },
    {
      title: "Pitfalls and real life",
      body:
        "Conventions differ: CLRS uses minimum degree **t** (max 2t − 1 keys), so ask which one is meant. " +
        "Databases mostly use the **B+ tree** (data only in linked leaves) — PostgreSQL, InnoDB, SQLite, NTFS, APFS. " +
        "A 2-3-4 tree is a B-tree of order 4; a red-black tree is its binary encoding.",
      tryIt: [{ label: "Order 4: a 2-3-4 tree", action: "order4" }],
    },
  ],
};
