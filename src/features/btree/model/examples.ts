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
