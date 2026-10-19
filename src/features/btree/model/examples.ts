/**
 * Exact example trees for the lesson's "Try it" buttons (order 3), so each button shows the
 * case it promises regardless of what the visitor built before. Verified by a test script.
 */
import { decodeShape, type Snapshot } from "./shape";

const tree = (text: string): Snapshot => {
  const shape = decodeShape(text);
  if (!shape) throw new Error(`bad example tree ${text}`);
  return { order: 3, shape };
};

/** The page's sample: SAMPLE keys inserted in order — a perfect tree, every node at the minimum. */
export const SAMPLE_TREE = tree("40-20_60-10_30_50_70-5_15_25_35_45_55_65_75");
/** Sample + 36: leaf [35, 36] can lend. Delete 25 → borrow from the right; delete 40 → predecessor 36, no repair. */
export const BORROW_TREE = tree("40-20_60-10_30_50_70-5_15_25_35.36_45_55_65_75");
/** Sample + 36, 37: parent [30, 36] can afford to lose a key. Delete 35 → a single merge. */
export const MERGE_TREE = tree("40-20_60-10_30.36_50_70-5_15_25_35_37_45_55_65_75");

/**
 * /btree/insertion (order 3). Insert 25 → fits in leaf [30]; insert 62 → leaf [60, 65] splits and
 * 62 rises into [55]; insert 98 → splits climb leaf → [85, 95] → root, and the tree grows to height 4.
 */
export const INSERT_TREE = tree("40.70-20_55_85.95-10_30_50_60.65_80_90_97.99");
/**
 * /btree/deletion (order 3). Delete 10 → borrow from the right sibling [30, 35]; delete 70 → merge
 * [50] + separator 60; delete 40 → internal key, replaced by its predecessor 35 with no repair.
 */
export const DELETE_TREE = tree("40-20_60.80-10_30.35_50_70_90");
