/*
 * Share links for the heap page: ?kind=min&a=7,12,9,…&detail=0
 *   kind   — "max" | "min" (anything else → max)
 *   a      — the heap's backing array in index order (so the exact tree shape comes back), or "empty"
 *   detail — 0 = compact sift-down steps (default: detailed)
 * Bad or missing values fall back to the page defaults.
 */
import { VALUE_MAX, VALUE_MIN } from "@/config/input";
import { listParam, parseListParam, type ShareParams } from "@/lib/share";
import { CAPACITY } from "./constants";
import type { HeapKind } from "./engine/types";

export interface HeapShare {
  kind: HeapKind;
  /** null = no usable array in the link (use the default example). */
  values: number[] | null;
  detailed: boolean;
}

export function heapShareParams(kind: HeapKind, values: readonly number[], detailed: boolean): ShareParams {
  return { kind, a: values.length ? listParam(values) : "empty", detail: detailed ? undefined : 0 };
}

/** Null when the URL carries no heap parameters at all. */
export function parseHeapShare(params: URLSearchParams): HeapShare | null {
  const k = params.get("kind");
  const a = params.get("a");
  const d = params.get("detail");
  if (k === null && a === null && d === null) return null;
  let values: number[] | null = null;
  if (a === "empty") values = [];
  else if (a !== null) {
    const parsed = parseListParam(a, { min: VALUE_MIN, max: VALUE_MAX, limit: CAPACITY });
    values = parsed.length ? parsed : null;
  }
  return { kind: k === "min" ? "min" : "max", values, detailed: d !== "0" };
}
