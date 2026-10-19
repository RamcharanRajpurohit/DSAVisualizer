/**
 * Undo / redo of whole operations (USFCA-style skip back). Pure: no React, no Konva.
 *
 * Each entry is a snapshot of the tree's SHAPE (its pre-order key list — for a BST that list
 * rebuilds exactly the same shape with plain inserts), the rotation counter and the label of the
 * operation that produced it.
 */

export interface TreeSnapshot {
  /** Pre-order keys: re-inserting them in this order rebuilds the exact shape. */
  keys: readonly number[];
  rotations: number;
  /** The operation that produced this state, e.g. "Insert 42". */
  label: string;
}

export interface HistoryInfo {
  canUndo: boolean;
  canRedo: boolean;
  /** Operation an Undo would revert. */
  undoLabel: string | null;
  /** Operation a Redo would re-apply. */
  redoLabel: string | null;
  /** 1-based position and number of states (for a small "3 / 7" readout). */
  position: number;
  total: number;
}

export const EMPTY_HISTORY: HistoryInfo = { canUndo: false, canRedo: false, undoLabel: null, redoLabel: null, position: 0, total: 0 };

export const sameKeys = (a: readonly number[], b: readonly number[]): boolean =>
  a.length === b.length && a.every((x, i) => x === b[i]);

export class TreeHistory {
  private items: TreeSnapshot[] = [];
  private at = -1;

  constructor(private readonly limit = 100) {}

  get current(): TreeSnapshot | undefined { return this.items[this.at]; }

  /** Start over with a single state (page load, shared link). */
  reset(s: TreeSnapshot): void {
    this.items = [s];
    this.at = 0;
  }

  /** Record the state after an operation. Dropped when the shape did not change (e.g. a duplicate insert). */
  push(s: TreeSnapshot): boolean {
    const cur = this.current;
    if (cur && sameKeys(cur.keys, s.keys)) return false;
    this.items.splice(this.at + 1);
    this.items.push(s);
    if (this.items.length > this.limit) this.items.shift();
    this.at = this.items.length - 1;
    return true;
  }

  undo(): TreeSnapshot | undefined {
    if (this.at <= 0) return undefined;
    return this.items[--this.at];
  }

  redo(): TreeSnapshot | undefined {
    if (this.at >= this.items.length - 1) return undefined;
    return this.items[++this.at];
  }

  info(): HistoryInfo {
    const canUndo = this.at > 0;
    const canRedo = this.at < this.items.length - 1;
    return {
      canUndo,
      canRedo,
      undoLabel: canUndo ? this.items[this.at].label : null,
      redoLabel: canRedo ? this.items[this.at + 1].label : null,
      position: this.at + 1,
      total: this.items.length,
    };
  }
}
