/* Share links: ?kind=doubly&tail=1&values=12,7,33 reopens the page with exactly that list. */
import { VALUE_MAX, VALUE_MIN } from "@/config/input";
import { listParam, parseListParam, type ShareParams } from "@/lib/share";
import { DEFAULT_VALUES } from "./constants";
import { listFrom, MAX_NODES } from "./engine";
import type { ListKind, ListState } from "./engine/types";

const KINDS: readonly ListKind[] = ["singly", "doubly", "circular"];

export function toShareParams(list: ListState): ShareParams {
  return {
    kind: list.kind,
    tail: list.tailPtr ? 1 : 0,
    // "none" keeps an empty list distinguishable from a link without values.
    values: list.nodes.length ? listParam(list.nodes.map((x) => x.value)) : "none",
  };
}

/** The list a share link describes, or null when the URL has none of our params. Bad values are ignored. */
export function fromShareParams(p: URLSearchParams): ListState | null {
  const k = p.get("kind");
  const t = p.get("tail");
  const v = p.get("values");
  if (k === null && t === null && v === null) return null;
  const kind = KINDS.find((x) => x === k) ?? "singly";
  const tailPtr = t === "1" || t === "true";
  let values: number[] = [];
  if (v?.trim() !== "none") {
    values = parseListParam(v, { min: VALUE_MIN, max: VALUE_MAX, limit: MAX_NODES });
    if (!values.length) values = [...DEFAULT_VALUES];
  }
  return listFrom(values, kind, tailPtr);
}
