/* Reading shared-link parameters (pure; bad values come back as null so callers fall back gracefully). */
import { CAP_MAX, CAP_MIN } from "./util";

/** A whole number in [min, max], or null. */
export function intParam(p: URLSearchParams, key: string, min: number, max: number): number | null {
  const v = p.get(key)?.trim();
  if (!v || !/^\d+$/.test(v)) return null;
  const n = Number(v);
  return n >= min && n <= max ? n : null;
}

export const capParam = (p: URLSearchParams) => intParam(p, "cap", CAP_MIN, CAP_MAX);

/** Comma list of whole numbers 0–999 (anything else is dropped), at most `limit` of them. */
export const valuesParam = (p: URLSearchParams, key: string, limit: number) =>
  (p.get(key) ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter((x) => /^\d+$/.test(x))
    .map(Number)
    .filter((n) => n <= 999)
    .slice(0, limit);

/** Query values for a shared link (the ShareParams shape). */
export type LinkParams = Record<string, string | number>;
