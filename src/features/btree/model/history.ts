/**
 * Undo / redo of whole operations as a list of settled tree snapshots (pure and immutable,
 * so it can live in React state and be tested under tsx).
 *
 * `entries[index]` is the tree on screen. Undo / redo only move `index`; committing a new state
 * after an undo drops the redo branch, like every editor.
 */
export interface HistoryItem<T> {
  state: T;
  /** The operation that produced this state ("Insert 36, 37", "Order 5", …). */
  label: string;
}

export interface UndoHistory<T> {
  entries: readonly HistoryItem<T>[];
  index: number;
}

export const emptyHistory = <T,>(): UndoHistory<T> => ({ entries: [], index: -1 });

export const currentItem = <T,>(h: UndoHistory<T>): HistoryItem<T> | undefined => h.entries[h.index];
export const canUndo = <T,>(h: UndoHistory<T>) => h.index > 0;
export const canRedo = <T,>(h: UndoHistory<T>) => h.index >= 0 && h.index < h.entries.length - 1;

/**
 * Record `state` as the result of `label`. Nothing changes when it equals the current state
 * (a search, a duplicate insert, or the settle after an undo / redo itself).
 */
export function commit<T>(
  h: UndoHistory<T>, state: T, label: string, same: (a: T, b: T) => boolean, limit = 100,
): UndoHistory<T> {
  const cur = currentItem(h);
  if (cur && same(cur.state, state)) return h;
  const entries = [...h.entries.slice(0, h.index + 1), { state, label }];
  const drop = Math.max(0, entries.length - limit);
  return { entries: entries.slice(drop), index: entries.length - 1 - drop };
}

/** Move one step back; `undone` is the operation being reverted. */
export function undo<T>(h: UndoHistory<T>): { history: UndoHistory<T>; target: HistoryItem<T>; undone: HistoryItem<T> } | null {
  if (!canUndo(h)) return null;
  return { history: { ...h, index: h.index - 1 }, target: h.entries[h.index - 1], undone: h.entries[h.index] };
}

/** Move one step forward; `target.label` is the operation being re-applied. */
export function redo<T>(h: UndoHistory<T>): { history: UndoHistory<T>; target: HistoryItem<T> } | null {
  if (!canRedo(h)) return null;
  return { history: { ...h, index: h.index + 1 }, target: h.entries[h.index + 1] };
}
