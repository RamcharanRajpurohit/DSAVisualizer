/**
 * Share-link format for the B-tree page (pure, testable under tsx).
 *
 *   ?m=3&t=40-20_60-10_30_50_70&del=succ
 *
 * m   order (one of the orders the page offers)
 * t   exact structure, level by level (see shape.ts) — rebuilds the very same shape
 * del replacement rule for internal keys: pred | succ (omitted = smart)
 *
 * Anything invalid is ignored on its own; the page then falls back to its default example.
 */
import type { ReplaceStrategy } from "./btree";
import { decodeShape, encodeShape, shapeProblems, type Snapshot } from "./shape";

export interface SharedSetup {
  order?: number;
  snapshot?: Snapshot;
  strategy?: ReplaceStrategy;
}

const DEL: Record<string, ReplaceStrategy> = { pred: "predecessor", succ: "successor", smart: "auto" };
const DEL_TEXT: Record<ReplaceStrategy, string | undefined> = { predecessor: "pred", successor: "succ", auto: undefined };

export function parseShare(
  get: (key: string) => string | null,
  { orders, defaultOrder, maxKeys }: { orders: readonly number[]; defaultOrder: number; maxKeys: number },
): SharedSetup {
  const out: SharedSetup = {};
  const mText = get("m");
  if (mText != null && /^\d{1,2}$/.test(mText) && orders.includes(Number(mText))) out.order = Number(mText);
  const shape = decodeShape(get("t"), { maxKeys });
  if (shape && (mText == null || out.order !== undefined)) {
    const order = out.order ?? defaultOrder;
    if (shapeProblems(order, shape).length === 0) out.snapshot = { order, shape };
  }
  const del = get("del");
  if (del && Object.hasOwn(DEL, del)) out.strategy = DEL[del];
  return out;
}

export const shareParams = (s: Snapshot, strategy: ReplaceStrategy) => ({
  m: s.order,
  t: encodeShape(s.shape),
  del: DEL_TEXT[strategy],
});
